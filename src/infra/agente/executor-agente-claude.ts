import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import type { Page } from "playwright";
import { z } from "zod";
import type { ArmazemArtefatos } from "#aplicacao/portas/armazem-artefatos.ts";
import { ErroMaxTurnos, ErroTimeoutLlm } from "#aplicacao/portas/erros.ts";
import type {
  EntradaAgente,
  ExecutorAgente,
  ResultadoAgente,
} from "#aplicacao/portas/executor-agente.ts";
import type { Registrador } from "#aplicacao/portas/registrador.ts";
import { extrairJson } from "#infra/llm/gerador-estruturado-claude.ts";
import type { ExecutarClaude } from "#infra/llm/processo-claude.ts";
import { carregarPrompt } from "#infra/llm/prompts.ts";
import { escreverAtomico } from "#infra/sistema/escrita-atomica.ts";
import { FormularioPlaywright } from "#infra/conectores/base/formulario-playwright.ts";

/**
 * Ferramentas liberadas ao agente (verificadas no @playwright/mcp 0.0.83, 2026-10-10). Ficam de fora a
 * execução de script (`browser_evaluate`, `browser_run_code_unsafe`), cookies, storage, rede, rotas e
 * `browser_press_key`: Enter num campo dispara o envio implícito do formulário, que o agente nunca faz.
 */
export const FERRAMENTAS_AGENTE = [
  "mcp__playwright__browser_navigate",
  "mcp__playwright__browser_navigate_back",
  "mcp__playwright__browser_snapshot",
  "mcp__playwright__browser_click",
  "mcp__playwright__browser_type",
  "mcp__playwright__browser_fill_form",
  "mcp__playwright__browser_select_option",
  "mcp__playwright__browser_check",
  "mcp__playwright__browser_uncheck",
  "mcp__playwright__browser_file_upload",
  "mcp__playwright__browser_tabs",
  "mcp__playwright__browser_wait_for",
  "mcp__playwright__browser_hover",
  "mcp__playwright__browser_handle_dialog",
  "mcp__playwright__browser_take_screenshot",
  "mcp__outbox-segredos__email_cadastro",
  "mcp__outbox-segredos__preencher_senha",
  "mcp__outbox-segredos__preencher_dado_sensivel",
  "mcp__outbox-segredos__preencher_resposta_protegida",
] as const;

const esquemaSaidaAgente = z.object({
  status: z.enum(["PRONTO_PARA_REVISAO", "SEM_FORMULARIO", "BLOQUEADO", "EASY_APPLY"]),
  seletorEnviar: z.string().min(1).optional(),
  motorDetectado: z.string().optional(),
  passos: z.array(z.string()).default([]),
  perguntasRespondidasNaHora: z
    .array(z.object({ rotulo: z.string(), valor: z.string() }))
    .default([]),
  observacoes: z.string().optional(),
});
type SaidaAgente = z.infer<typeof esquemaSaidaAgente>;

export interface OpcoesExecutorAgente {
  readonly executar: ExecutarClaude;
  readonly paginaMaisRecente: () => Promise<Page | null>;
  /** Garante o navegador do Outbox aberto (o Playwright MCP conecta-se a ele por CDP). */
  readonly garantirNavegador: () => Promise<unknown>;
  readonly endpointCdp: string;
  readonly raiz: string;
  readonly pastaTmp: string;
  readonly pastaPrompts: string;
  readonly modelo: string;
  readonly artefatos: ArmazemArtefatos;
  readonly registrador: Registrador;
}

/** Fallback agêntico: `claude -p` com Playwright MCP (via CDP) e `outbox-segredos`, sem envio final. */
export class ExecutorAgenteClaude implements ExecutorAgente {
  private readonly opcoes: OpcoesExecutorAgente;

  constructor(opcoes: OpcoesExecutorAgente) {
    this.opcoes = opcoes;
  }

  async preencher(
    entrada: EntradaAgente,
    ctx: { aguardarUsuario(mensagem: string): Promise<void> },
    sinal: AbortSignal,
  ): Promise<ResultadoAgente> {
    await this.opcoes.garantirNavegador();
    const pastaTrabalho = join(this.opcoes.pastaTmp, `agente-${String(entrada.vaga.id)}`);
    mkdirSync(pastaTrabalho, { recursive: true });
    // O Playwright MCP só envia arquivos de dentro do workspace: os PDFs são copiados para lá.
    const copiar = (origem: string | undefined): string | undefined => {
      if (!origem || !existsSync(origem)) return undefined;
      const destino = join(pastaTrabalho, basename(origem));
      copyFileSync(origem, destino);
      return destino;
    };
    const pdfCurriculo = copiar(entrada.pacote.pdfCurriculo) ?? entrada.pacote.pdfCurriculo;
    const pdfCarta = copiar(entrada.pacote.pdfCarta);
    const configMcp = this.escreverConfigMcp(pastaTrabalho, entrada);
    const prompt = this.montarPrompt(entrada, pdfCurriculo, pdfCarta);

    let turnosRestantes = entrada.saldo.turnos;
    let msRestantes = entrada.saldo.ms;
    let sessao: string | null = null;
    let mensagem = prompt;
    const passos: string[] = [];

    while (turnosRestantes > 0 && msRestantes > 0) {
      const args = [
        "-p",
        "--output-format",
        "json",
        "--model",
        this.opcoes.modelo,
        "--max-turns",
        String(turnosRestantes),
        "--mcp-config",
        configMcp,
        "--strict-mcp-config",
        "--tools",
        "",
        "--allowedTools",
        FERRAMENTAS_AGENTE.join(","),
        ...(sessao ? ["--resume", sessao] : []),
      ];
      const inicio = Date.now();
      let resultado;
      try {
        resultado = await this.opcoes.executar({
          args,
          entrada: mensagem,
          cwd: pastaTrabalho,
          timeoutMs: msRestantes,
          sinal,
        });
      } catch (erro) {
        if (erro instanceof ErroMaxTurnos || erro instanceof ErroTimeoutLlm) {
          return this.finalizar(
            entrada,
            { tipo: "teto", passos },
            { erro: (erro as Error).message },
          );
        }
        throw erro;
      }
      msRestantes -= Date.now() - inicio;
      turnosRestantes -= Math.max(1, resultado.turnos);
      sessao = resultado.sessaoId || sessao;
      let saida: SaidaAgente;
      try {
        saida = extrairJson(resultado.resultado, esquemaSaidaAgente);
      } catch {
        mensagem = "Responda agora somente com o JSON final pedido, no bloco ```json.";
        continue;
      }
      passos.push(...saida.passos);
      switch (saida.status) {
        case "BLOQUEADO":
          await ctx.aguardarUsuario(
            `O agente parou${saida.observacoes ? ` (${saida.observacoes})` : ""}. Resolva no navegador e pressione Enter`,
          );
          mensagem =
            "O usuário resolveu o bloqueio. Continue de onde parou, seguindo as mesmas regras.";
          continue;
        case "SEM_FORMULARIO":
          return this.finalizar(entrada, { tipo: "sem_formulario", passos }, saida);
        case "EASY_APPLY":
          return this.finalizar(entrada, { tipo: "easy_apply", passos }, saida);
        case "PRONTO_PARA_REVISAO": {
          const pagina = await this.opcoes.paginaMaisRecente();
          if (!pagina) return this.finalizar(entrada, { tipo: "sem_formulario", passos }, saida);
          const formulario = new FormularioPlaywright(pagina, {
            rota: "agente",
            seletorEnviar: saida.seletorEnviar ?? null,
            confirmacao: null,
          });
          return this.finalizar(
            entrada,
            {
              tipo: "pronto",
              formulario,
              passos,
              perguntasRespondidasNaHora: saida.perguntasRespondidasNaHora,
              ...(saida.motorDetectado ? { motorDetectado: saida.motorDetectado } : {}),
            },
            saida,
          );
        }
      }
    }
    return this.finalizar(entrada, { tipo: "teto", passos }, { motivo: "saldo esgotado" });
  }

  private finalizar(
    entrada: EntradaAgente,
    resultado: ResultadoAgente,
    bruto: unknown,
  ): ResultadoAgente {
    try {
      this.opcoes.artefatos.gravarJson(entrada.vaga.id, "agente.json", {
        tipo: resultado.tipo,
        passos: resultado.passos,
        saida: bruto,
      });
    } catch (erro) {
      this.opcoes.registrador.avisar("não foi possível gravar agente.json", { erro });
    }
    return resultado;
  }

  private escreverConfigMcp(pastaTrabalho: string, entrada: EntradaAgente): string {
    const caminho = join(pastaTrabalho, "mcp-agente.json");
    const config = {
      mcpServers: {
        playwright: {
          command: process.execPath,
          args: [
            join(this.opcoes.raiz, "node_modules", "@playwright", "mcp", "cli.js"),
            "--cdp-endpoint",
            this.opcoes.endpointCdp,
          ],
        },
        "outbox-segredos": {
          command: process.execPath,
          args: [join(this.opcoes.raiz, "src", "interfaces", "mcp", "outbox-segredos.ts")],
          env: {
            OUTBOX_VAGA_ID: String(entrada.vaga.id),
            OUTBOX_HOSTS_PERMITIDOS: entrada.hostsPermitidos.join(","),
          },
        },
      },
    };
    escreverAtomico(caminho, JSON.stringify(config, null, 2));
    return caminho;
  }

  private montarPrompt(
    entrada: EntradaAgente,
    pdfCurriculo: string,
    pdfCarta: string | undefined,
  ): string {
    const { pacote, vaga } = entrada;
    const { cidade, uf, pais, ...contato } = pacote.contato;
    const respostas = pacote.respostas
      .map((r) =>
        r.sensivel
          ? `- ${r.rotulo}: [protegida ${r.chaveProtegida ?? "sem-chave"}]`
          : `- ${r.rotulo}: ${r.valor ?? ""}`,
      )
      .join("\n");
    const contexto = entrada.contextoFalha
      ? `o conector parou no passo "${entrada.contextoFalha.passo}" (${entrada.contextoFalha.erro}) na URL ${entrada.contextoFalha.url}`
      : "nenhum";
    return carregarPrompt(this.opcoes.pastaPrompts, "agente-candidatura", {
      url: entrada.urlCandidatura,
      motor: vaga.motor,
      idioma: pacote.idioma,
      contextoFalha: contexto,
      contato: JSON.stringify(contato),
      localidade: [cidade, uf, pais].filter(Boolean).join(", "),
      pdfCurriculo,
      pdfCarta: pdfCarta ?? "não há",
      carta: pacote.carta ?? "não há",
      respostas: respostas || "(nenhuma)",
    }).texto;
  }
}

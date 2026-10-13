import { mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { z, type ZodType } from "zod";
import { ErroLlm } from "#aplicacao/portas/erros.ts";
import type { GeradorEstruturado, PedidoGeracao } from "#aplicacao/portas/gerador-estruturado.ts";
import { escreverAtomico } from "../sistema/escrita-atomica.ts";
import { carregarPrompt } from "./prompts.ts";
import type { ExecutarClaude, ResultadoClaude } from "./processo-claude.ts";

export interface OpcoesGerador {
  readonly pastaPrompts: string;
  /** Pasta vazia usada como cwd (não carrega CLAUDE.md nem skills do repositório). */
  readonly cwd: string;
  readonly modelo: string;
  readonly timeoutMs: number;
  readonly executar: ExecutarClaude;
}

const INSTRUCAO_SAIDA =
  "# Formato da resposta\n\nResponda somente com um JSON válido para o JSON Schema abaixo, dentro de um " +
  "bloco cercado por três crases com a linguagem json. Não escreva nada fora do bloco.";

/** Extrai o JSON do primeiro bloco ```json (ou do texto inteiro) e valida com o schema. */
export function extrairJson<T>(texto: string, schema: ZodType<T>): T {
  const bloco = /```(?:json)?\s*\n([\s\S]*?)\n\s*```/i.exec(texto)?.[1] ?? texto.trim();
  let json: unknown;
  try {
    json = JSON.parse(bloco);
  } catch (erro) {
    throw new ErroLlm(`a resposta não é um JSON válido: ${(erro as Error).message}`, {
      cause: erro,
    });
  }
  const resultado = schema.safeParse(json);
  if (!resultado.success) {
    const problema = resultado.error.issues[0];
    const caminho = (problema?.path ?? []).map(String).join(".");
    throw new ErroLlm(
      `o JSON não respeita o schema em ${caminho || "raiz"}: ${problema?.message ?? ""}`,
      {
        cause: resultado.error,
      },
    );
  }
  return resultado.data;
}

/** `GeradorEstruturado` sobre o Claude Code headless (`claude -p`), com 1 retry de formato via `--resume`. */
export class GeradorEstruturadoClaude implements GeradorEstruturado {
  private readonly opcoes: OpcoesGerador;

  constructor(opcoes: OpcoesGerador) {
    this.opcoes = opcoes;
  }

  async gerar<T>(pedido: PedidoGeracao<T>, sinal: AbortSignal): Promise<T> {
    const prompt = carregarPrompt(
      this.opcoes.pastaPrompts,
      pedido.tarefa,
      pedido.variaveis,
      pedido.conteudoNaoConfiavel ?? {},
    );
    const schemaJson = JSON.stringify(
      z.toJSONSchema(pedido.schema, { io: "input", unrepresentable: "any" }),
    );
    const entrada = `${prompt.texto}\n\n${INSTRUCAO_SAIDA}\n\n${schemaJson}\n`;
    const args = this.argumentos(pedido.arquivosLeitura ?? []);
    mkdirSync(this.opcoes.cwd, { recursive: true });

    const inicio = Date.now();
    const primeira = await this.opcoes.executar({
      args,
      entrada,
      cwd: this.opcoes.cwd,
      timeoutMs: this.opcoes.timeoutMs,
      sinal,
    });
    this.registrar(pedido, prompt.versao, args, entrada, primeira, Date.now() - inicio);
    try {
      return extrairJson(primeira.resultado, pedido.schema);
    } catch (erro) {
      const correcao =
        `A resposta anterior não é um JSON válido para o schema. Erro: ${(erro as Error).message}. ` +
        "Responda somente com o JSON corrigido, no bloco ```json.";
      const argsRetry = [...args, "--resume", primeira.sessaoId];
      const inicioRetry = Date.now();
      const segunda = await this.opcoes.executar({
        args: argsRetry,
        entrada: correcao,
        cwd: this.opcoes.cwd,
        timeoutMs: this.opcoes.timeoutMs,
        sinal,
      });
      this.registrar(pedido, prompt.versao, argsRetry, correcao, segunda, Date.now() - inicioRetry);
      return extrairJson(segunda.resultado, pedido.schema);
    }
  }

  private argumentos(arquivos: readonly string[]): string[] {
    const base = ["-p", "--output-format", "json", "--model", this.opcoes.modelo];
    if (arquivos.length === 0) return [...base, "--max-turns", "1", "--tools", ""];
    const dirs = [...new Set(arquivos.map((a) => dirname(a)))];
    return [
      ...base,
      "--max-turns",
      "3",
      "--tools",
      "Read",
      "--allowedTools",
      "Read",
      ...dirs.flatMap((d) => ["--add-dir", d]),
    ];
  }

  private registrar<T>(
    pedido: PedidoGeracao<T>,
    versaoPrompt: number,
    args: readonly string[],
    prompt: string,
    resultado: ResultadoClaude,
    duracaoMs: number,
  ): void {
    if (!pedido.pastaLog) return;
    try {
      mkdirSync(pedido.pastaLog, { recursive: true });
      const n = readdirSync(pedido.pastaLog).filter((a) => a.endsWith(".json")).length + 1;
      escreverAtomico(
        join(pedido.pastaLog, `${String(n).padStart(2, "0")}-${pedido.tarefa}.json`),
        JSON.stringify(
          {
            tarefa: pedido.tarefa,
            versaoPrompt,
            args,
            prompt,
            stdout: resultado.stdout,
            stderr: resultado.stderr,
            duracaoMs,
          },
          null,
          2,
        ),
      );
    } catch {
      // O log da chamada é auxiliar: falha ao gravá-lo não interrompe a geração.
    }
  }
}

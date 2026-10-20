import { join } from "node:path";
import { z } from "zod";
import { versaoDoPacote } from "#interfaces/compartilhado/versao.ts";
import { AssinadorArquivos } from "#interfaces/http/arquivos.ts";
import { esquemaSaude } from "#interfaces/http/contrato.ts";
import { GerenciadorExecucoes } from "#interfaces/http/execucoes.ts";
import { ArmazemTokens, formatarCodigo, Pareamento } from "#interfaces/http/pareamento.ts";
import { criarApp, iniciarServidor } from "#interfaces/http/servidor.ts";
import { cores } from "../apresentacao/cores.ts";
import { validarEntrada, type ContextoComando } from "../contexto.ts";

const esquema = z.object({ semNavegador: z.boolean().default(false) });

type EstadoPorta = "livre" | "camaleao" | "outro";

/** Quem está na porta: nada (conexão recusada), outro agente do Camaleão ou outro processo. */
async function sondarPorta(porta: number): Promise<EstadoPorta> {
  try {
    const resposta = await fetch(`http://127.0.0.1:${String(porta)}/saude`, {
      signal: AbortSignal.timeout(2000),
    });
    const corpo: unknown = await resposta.json().catch(() => null);
    return esquemaSaude.safeParse(corpo).success ? "camaleao" : "outro";
  } catch (erro) {
    const codigo = (erro as { cause?: { code?: string } }).cause?.code;
    return codigo === "ECONNREFUSED" ? "livre" : "outro";
  }
}

function aguardarCancelamento(sinal: AbortSignal): Promise<void> {
  return new Promise((resolver) => {
    if (sinal.aborted) resolver();
    else
      sinal.addEventListener(
        "abort",
        () => {
          resolver();
        },
        { once: true },
      );
  });
}

async function abrirPadrao(caminho: string): Promise<unknown> {
  const { default: open } = await import("open");
  return open(caminho);
}

/**
 * `camaleao agente [--sem-navegador]`: servidor local do site em 127.0.0.1, até o Ctrl+C. Abre o site
 * numa janela própria do navegador do Camaleão, já pareada pelo fragmento `#parear=<código>` (o
 * fragmento não sai do navegador). Com a porta já ocupada por outro agente, só reabre o site.
 */
export async function comandoAgente(ctx: ContextoComando, bruto: unknown): Promise<number> {
  const { semNavegador } = validarEntrada(esquema, bruto);
  const container = ctx.container();
  const { porta, origensPermitidas } = container.config.agente;
  const site = origensPermitidas.at(-1) ?? "http://localhost:5173";
  const abrirSite = async (url: string): Promise<void> => {
    if (semNavegador) return;
    try {
      await container.abrirJanelaNavegador(url);
    } catch (erro) {
      container.registrarErro("não foi possível abrir o site no navegador do Camaleão", erro);
      ctx.saida.erro(cores.amarelo(`Abra o site manualmente: ${site}`));
    }
  };

  const estado = await sondarPorta(porta);
  if (estado === "camaleao") {
    ctx.saida.escrever(`O Camaleão já está rodando em http://127.0.0.1:${String(porta)}.`);
    await abrirSite(site);
    return 0;
  }
  if (estado === "outro") {
    ctx.saida.erro(
      cores.vermelho(
        `erro: porta ${String(porta)} ocupada por outro processo; ajuste agente.porta no config.yaml`,
      ),
    );
    return 1;
  }

  let anunciar = false;
  const tokens = new ArmazemTokens(join(container.caminhos.dadosDir, "agente", "tokens.json"));
  const pareamento = new Pareamento({
    tokens,
    aoNovoCodigo: (codigo) => {
      if (anunciar) ctx.saida.escrever(`Código de pareamento: ${formatarCodigo(codigo)}`);
    },
  });
  const execucoes = new GerenciadorExecucoes({
    registrarErro: (mensagem, erro) => {
      container.registrarErro(mensagem, erro);
    },
  });
  const app = criarApp(container, {
    porta,
    origensPermitidas,
    versao: versaoDoPacote(),
    pareamento,
    tokens,
    execucoes,
    arquivos: new AssinadorArquivos({
      pastas: [container.caminhos.vagasDir, container.caminhos.masterDir],
    }),
    abrir: abrirPadrao,
  });
  const servidor = await iniciarServidor(app, porta);
  const pararVigia = pareamento.vigiarExpiracao();
  try {
    ctx.saida.escrever(cores.verde(`Camaleão rodando em http://127.0.0.1:${String(porta)}`));
    ctx.saida.escrever(`Código de pareamento: ${formatarCodigo(pareamento.codigoAtual())}`);
    ctx.saida.escrever(`Site: ${site}`);
    ctx.saida.escrever("Deixe este terminal aberto enquanto usa o site. Ctrl+C encerra.");
    anunciar = true;
    await abrirSite(`${site}/#parear=${pareamento.codigoAtual()}`);
    await aguardarCancelamento(ctx.sinal);
    await execucoes.encerrarTodas();
  } finally {
    pararVigia();
    await servidor.fechar();
  }
  return 0;
}

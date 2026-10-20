// Monta o app do agente local sobre um container (real ou com casos de uso trocados) e lê o stream SSE.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Container } from "#composicao";
import { AssinadorArquivos } from "#interfaces/http/arquivos.ts";
import type { EventoExecucao } from "#interfaces/http/contrato.ts";
import { GerenciadorExecucoes } from "#interfaces/http/execucoes.ts";
import { ArmazemTokens, Pareamento } from "#interfaces/http/pareamento.ts";
import { criarApp } from "#interfaces/http/servidor.ts";

export const ORIGEM_SITE = "https://camaleao.exemplo";

export interface OpcoesAgenteTeste {
  readonly porta?: number;
  readonly agora?: () => number;
}

export function montarAgente(container: Container, opcoes: OpcoesAgenteTeste = {}) {
  const porta = opcoes.porta ?? 4321;
  const pasta = mkdtempSync(join(tmpdir(), "camaleao-agente-http-"));
  const arquivoTokens = join(pasta, "tokens.json");
  const tokens = new ArmazemTokens(arquivoTokens);
  const codigos: string[] = [];
  const pareamento = new Pareamento({
    tokens,
    ...(opcoes.agora ? { agora: opcoes.agora } : {}),
    aoNovoCodigo: (c) => codigos.push(c),
  });
  const erros: unknown[] = [];
  const execucoes = new GerenciadorExecucoes({ registrarErro: (_m, e) => erros.push(e) });
  const arquivos = new AssinadorArquivos({
    pastas: [container.caminhos.vagasDir, container.caminhos.masterDir],
    ...(opcoes.agora ? { agora: opcoes.agora } : {}),
  });
  const abertos: string[] = [];
  const app = criarApp(container, {
    porta,
    origensPermitidas: ["http://localhost:5173", ORIGEM_SITE],
    versao: "1.0.0",
    pareamento,
    tokens,
    execucoes,
    arquivos,
    abrir: (caminho) => {
      abertos.push(caminho);
      return Promise.resolve();
    },
  });
  let token = "";
  const requisitar = (caminho: string, init: RequestInit = {}) =>
    app.request(caminho, {
      ...init,
      headers: {
        host: `127.0.0.1:${String(porta)}`,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(init.body !== undefined && typeof init.body === "string"
          ? { "content-type": "application/json" }
          : {}),
        ...(init.headers as Record<string, string> | undefined),
      },
    });
  return {
    app,
    porta,
    tokens,
    arquivoTokens,
    codigos,
    pareamento,
    execucoes,
    arquivos,
    abertos,
    erros,
    requisitar,
    /** Pareia com o código atual e passa a mandar o token em toda requisição. */
    async parear(): Promise<string> {
      const resposta = await requisitar("/pareamento", {
        method: "POST",
        body: JSON.stringify({ codigo: codigos.at(-1) }),
      });
      token = ((await resposta.json()) as { token: string }).token;
      return token;
    },
    semToken(): void {
      token = "";
    },
    post: (caminho: string, corpo: unknown = {}) =>
      requisitar(caminho, { method: "POST", body: JSON.stringify(corpo) }),
  };
}

/** Eventos `data:` de um `text/event-stream`, na ordem, até o servidor fechar. */
export async function* lerEventos(resposta: Response): AsyncGenerator<EventoExecucao> {
  if (!resposta.body) return;
  const leitor = resposta.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await leitor.read();
    if (done) return;
    buffer += value;
    for (let fim = buffer.indexOf("\n\n"); fim >= 0; fim = buffer.indexOf("\n\n")) {
      const bloco = buffer.slice(0, fim);
      buffer = buffer.slice(fim + 2);
      const dados = bloco
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n");
      if (dados) yield JSON.parse(dados) as EventoExecucao;
    }
  }
}

/** Lê eventos até um que satisfaça `parar` (inclusive), sem fechar o stream; ao fim do stream, para. */
export async function ate(
  eventos: AsyncGenerator<EventoExecucao>,
  parar: (evento: EventoExecucao) => boolean = () => false,
): Promise<EventoExecucao[]> {
  const lidos: EventoExecucao[] = [];
  for (;;) {
    const { value, done } = await eventos.next();
    if (done) return lidos;
    lidos.push(value);
    if (parar(value)) return lidos;
  }
}

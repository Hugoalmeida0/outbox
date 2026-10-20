// Agente simulado para os testes do site: rotas por "MÉTODO /caminho" e streams de eventos controlados.
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import type { EventoExecucao } from "@contrato";
import { ClienteAgente } from "../agente/cliente.ts";
import { ProvedorConexao } from "../agente/conexao.tsx";

export const SAUDE = { app: "camaleao", versao: "1.0.0", versaoContrato: 1 } as const;
export const CURRICULO_OK = {
  masterExiste: true,
  masterAtualizadoEm: "2026-10-20T10:00:00-03:00",
  perfilValido: true,
  errosPerfil: [],
};

export type Resposta = Response | (() => Response | Promise<Response>);
export interface Chamada {
  readonly metodo: string;
  readonly caminho: string;
  readonly corpo: unknown;
  readonly cabecalhos: Headers;
}

export function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Stream SSE que o teste alimenta com `emitir` e fecha com `fechar`. */
export function streamFalso() {
  let controlador: ReadableStreamDefaultController<Uint8Array> | null = null;
  const pendentes: string[] = [];
  const codificar = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controlador = c;
      for (const p of pendentes) c.enqueue(codificar.encode(p));
    },
  });
  return {
    resposta: () => new Response(stream, { headers: { "Content-Type": "text/event-stream" } }),
    emitir(evento: EventoExecucao) {
      const bloco = `data: ${JSON.stringify(evento)}\n\n`;
      if (controlador) controlador.enqueue(codificar.encode(bloco));
      else pendentes.push(bloco);
    },
    fechar() {
      controlador?.close();
    },
  };
}

export function agenteFalso(rotas: Record<string, Resposta>) {
  const chamadas: Chamada[] = [];
  const buscar: typeof fetch = async (entrada, init = {}) => {
    const url = new URL(
      typeof entrada === "string" ? entrada : entrada instanceof URL ? entrada.href : entrada.url,
    );
    const metodo = (init.method ?? "GET").toUpperCase();
    const caminho = `${url.pathname}${url.search}`;
    let corpo: unknown = init.body;
    if (typeof init.body === "string") corpo = JSON.parse(init.body);
    chamadas.push({ metodo, caminho, corpo, cabecalhos: new Headers(init.headers) });
    const rota = rotas[`${metodo} ${caminho}`] ?? rotas[`${metodo} ${url.pathname}`];
    if (rota === undefined)
      return json({ mensagem: `rota não simulada: ${metodo} ${caminho}` }, 404);
    return typeof rota === "function" ? rota() : rota.clone();
  };
  return { buscar, chamadas };
}

export const offline: typeof fetch = () => Promise.reject(new TypeError("Failed to fetch"));

/** Renderiza dentro do provedor de conexão, com o cliente sobre o `fetch` simulado. */
export function renderizar(
  elemento: ReactElement,
  buscar: typeof fetch,
  opcoes: { readonly rota?: string } = {},
) {
  return render(
    <MemoryRouter initialEntries={[opcoes.rota ?? "/"]}>
      <ProvedorConexao
        criarCliente={(aoPerderPareamento) =>
          new ClienteAgente({ baseUrl: "http://127.0.0.1:4321", fetch: buscar, aoPerderPareamento })
        }
      >
        {elemento}
      </ProvedorConexao>
    </MemoryRouter>,
  );
}

const TODOS_STATUS = [
  "NOVA",
  "PRONTA",
  "ERRO_PREPARO",
  "DESCARTADA",
  "DUPLICADA",
  "MANUAL",
  "PULADA",
  "ENVIADA",
  "PENDENTE_TESTE",
  "EM_PROCESSO",
  "OFERTA",
  "RECUSADA",
] as const;

export function statusCom(contagens: Partial<Record<(typeof TODOS_STATUS)[number], number>> = {}) {
  return {
    contagens: Object.fromEntries(TODOS_STATUS.map((s) => [s, contagens[s] ?? 0])),
    linhas: [],
    aguardandoVoce: { manuais: [], pendentesTeste: [] },
  };
}

export const TOKEN = "k".repeat(43);

/** Rotas de um agente pareado e vazio, para as telas renderizarem. */
export function rotasBase(): Record<string, Resposta> {
  return {
    "GET /saude": () => json(SAUDE),
    "GET /curriculo": () => json(CURRICULO_OK),
    "GET /status": () => json(statusCom()),
    "GET /execucoes/ativas": () => json({ execucoes: [] }),
  };
}

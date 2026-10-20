// Proteções do agente local (ADR-0025). Qualquer página aberta no navegador consegue chamar 127.0.0.1:
// o Host barra DNS rebinding, o CORS só libera as origens do site e o token prova o pareamento.
import type { MiddlewareHandler } from "hono";
import type { ArmazemTokens } from "./pareamento.ts";

export interface OpcoesSeguranca {
  readonly porta: number;
  readonly origensPermitidas: readonly string[];
}

const CABECALHOS_FIXOS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
} as const;

/**
 * Host, origem, CORS (com preflight de rede privada) e cabeçalhos fixos, nesta ordem, em toda rota.
 * Requisição sem `Origin` (navegação, `curl`) passa daqui e depende do token nas rotas protegidas.
 */
export function protegerAgente(opcoes: OpcoesSeguranca): MiddlewareHandler {
  const hosts = new Set([`127.0.0.1:${String(opcoes.porta)}`, `localhost:${String(opcoes.porta)}`]);
  const origens = new Set(opcoes.origensPermitidas);
  return async (c, next) => {
    for (const [nome, valor] of Object.entries(CABECALHOS_FIXOS)) c.header(nome, valor);
    if (!hosts.has((c.req.header("host") ?? "").toLowerCase())) {
      return c.json({ mensagem: "host não permitido" }, 403);
    }
    const origem = c.req.header("origin");
    if (origem !== undefined && !origens.has(origem)) {
      return c.json({ mensagem: "origem não permitida" }, 403);
    }
    if (origem !== undefined) {
      c.header("Access-Control-Allow-Origin", origem);
      c.header("Vary", "Origin");
      c.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
      c.header("Access-Control-Allow-Methods", "GET, POST, PUT");
    }
    if (c.req.method === "OPTIONS") {
      if (origem === undefined) return c.json({ mensagem: "origem não permitida" }, 403);
      c.header("Access-Control-Allow-Private-Network", "true");
      c.header("Access-Control-Max-Age", "600");
      return c.body(null, 204);
    }
    await next();
    for (const [nome, valor] of Object.entries(CABECALHOS_FIXOS)) c.res.headers.set(nome, valor);
  };
}

const PORTADOR = /^Bearer ([A-Za-z0-9_-]{20,200})$/;

/** Rotas protegidas: `Authorization: Bearer <token>` com o hash em `dados/agente/tokens.json`. */
export function exigirToken(tokens: ArmazemTokens): MiddlewareHandler {
  return async (c, next) => {
    const token = PORTADOR.exec(c.req.header("authorization") ?? "")?.[1];
    if (token === undefined || !tokens.valido(token)) {
      return c.json({ mensagem: "pareamento necessário" }, 401);
    }
    await next();
  };
}

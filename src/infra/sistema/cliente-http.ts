import type { ZodType } from "zod";
import { ErroHttp } from "#aplicacao/portas/erros.ts";

/** Cliente HTTP usado por conectores, resolvedores e extração (interface interna da infra). */
export interface ClienteHttp {
  obterJson<T>(url: string, schema: ZodType<T>, sinal: AbortSignal): Promise<T>;
  obterTexto(url: string, sinal: AbortSignal): Promise<string>;
}

export interface OpcoesClienteHttp {
  readonly timeoutMs?: number;
  /** Esperas entre tentativas para 429/5xx (padrão: 500 ms e 1500 ms). */
  readonly esperasMs?: readonly number[];
}

const esperar = (ms: number, sinal: AbortSignal): Promise<void> =>
  new Promise((resolver, rejeitar) => {
    const temporizador = setTimeout(resolver, ms);
    sinal.addEventListener(
      "abort",
      () => {
        clearTimeout(temporizador);
        rejeitar(sinal.reason instanceof Error ? sinal.reason : new Error("abortado"));
      },
      { once: true },
    );
  });

function esperaRetryAfter(resposta: Response, padrao: number): number {
  const cabecalho = resposta.headers.get("retry-after");
  const segundos = cabecalho === null ? Number.NaN : Number(cabecalho);
  return Number.isFinite(segundos) ? Math.min(segundos * 1000, 10_000) : padrao;
}

/** `fetch` nativo com timeout, novas tentativas com backoff para 429/5xx e validação Zod. */
export class ClienteHttpFetch implements ClienteHttp {
  private readonly timeoutMs: number;
  private readonly esperasMs: readonly number[];

  constructor(opcoes: OpcoesClienteHttp = {}) {
    this.timeoutMs = opcoes.timeoutMs ?? 15_000;
    this.esperasMs = opcoes.esperasMs ?? [500, 1500];
  }

  async obterJson<T>(url: string, schema: ZodType<T>, sinal: AbortSignal): Promise<T> {
    const texto = await this.obterTexto(url, sinal);
    let json: unknown;
    try {
      json = JSON.parse(texto);
    } catch (erro) {
      throw new ErroHttp(`resposta não é JSON: ${url}`, undefined, { cause: erro });
    }
    const resultado = schema.safeParse(json);
    if (!resultado.success) {
      throw new ErroHttp(
        `resposta inesperada de ${url}: ${resultado.error.issues[0]?.message ?? ""}`,
        undefined,
        {
          cause: resultado.error,
        },
      );
    }
    return resultado.data;
  }

  async obterTexto(url: string, sinal: AbortSignal): Promise<string> {
    for (let tentativa = 0; ; tentativa++) {
      let resposta: Response;
      try {
        resposta = await fetch(url, {
          headers: {
            "user-agent": "Camaleao/1.0 (uso pessoal)",
            accept: "application/json, text/html;q=0.9",
          },
          signal: AbortSignal.any([sinal, AbortSignal.timeout(this.timeoutMs)]),
        });
      } catch (erro) {
        throw new ErroHttp(`falha de rede em ${url}: ${(erro as Error).message}`, undefined, {
          cause: erro,
        });
      }
      const repetivel = resposta.status === 429 || resposta.status >= 500;
      const espera = this.esperasMs[tentativa];
      if (repetivel && espera !== undefined) {
        await esperar(esperaRetryAfter(resposta, espera), sinal);
        continue;
      }
      if (!resposta.ok) {
        const limiteGithub =
          resposta.status === 403 && resposta.headers.get("x-ratelimit-remaining") === "0";
        const detalhe = limiteGithub
          ? " (limite de requisições do GitHub atingido; tente mais tarde)"
          : "";
        throw new ErroHttp(`HTTP ${resposta.status} em ${url}${detalhe}`, resposta.status);
      }
      return resposta.text();
    }
  }
}

// Serve fixtures HTML por padrão de URL e nega todo o resto (testes sem rede, arquitetura.md §11.1).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Route } from "playwright";

export const PASTA_FIXTURES = fileURLToPath(new URL("../fixtures/", import.meta.url));

export function lerFixture(caminho: string): string {
  return readFileSync(`${PASTA_FIXTURES}${caminho}`, "utf8");
}

export interface RespostaFixture {
  readonly arquivo?: string;
  readonly html?: string;
  readonly json?: unknown;
  readonly status?: number;
}

export type MapaFixtures = readonly (readonly [string | RegExp, RespostaFixture])[];

/** Cria o interceptador do Playwright; `requisicoes` registra as URLs pedidas. */
export function servirFixtures(
  mapa: MapaFixtures,
  requisicoes: string[] = [],
): (rota: Route) => Promise<void> {
  return async (rota) => {
    const url = rota.request().url();
    requisicoes.push(url);
    const entrada = mapa.find(([padrao]) =>
      typeof padrao === "string" ? url === padrao || url.startsWith(padrao) : padrao.test(url),
    );
    if (!entrada) {
      await rota.abort();
      return;
    }
    const [, resposta] = entrada;
    if (resposta.json !== undefined) {
      await rota.fulfill({
        status: resposta.status ?? 200,
        contentType: "application/json",
        body: JSON.stringify(resposta.json),
      });
      return;
    }
    const corpo = resposta.html ?? (resposta.arquivo ? lerFixture(resposta.arquivo) : "");
    await rota.fulfill({
      status: resposta.status ?? 200,
      contentType: "text/html; charset=utf-8",
      body: corpo,
    });
  };
}

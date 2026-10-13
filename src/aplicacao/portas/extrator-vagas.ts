import type { Motor } from "#dominio/vagas/motores.ts";
import type { VagaExtraida } from "#dominio/vagas/vaga-extraida.ts";

export interface ResultadoExtracao {
  /** Dados estruturados (API do conector ou JSON-LD); `null` quando não houver. */
  readonly estruturada: VagaExtraida | null;
  /** Texto visível da página, para o fallback por LLM. */
  readonly textoPagina: string;
}

/** Extração estrutural da vaga. Lança `ErroExtracao` ou `ErroHttp`. */
export interface ExtratorVagas {
  extrair(url: string, motor: Motor, sinal: AbortSignal): Promise<ResultadoExtracao>;
}

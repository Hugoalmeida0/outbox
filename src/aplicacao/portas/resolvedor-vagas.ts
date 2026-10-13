import type { Motor } from "#dominio/vagas/motores.ts";
import type { MotivoDe, Rota } from "#dominio/vagas/status.ts";
import type { UrlCanonica } from "#dominio/vagas/vaga.ts";

export interface Resolucao {
  readonly motor: Motor;
  readonly urlResolvida: string;
  readonly canonica: UrlCanonica;
  readonly rota: Rota;
  readonly manual?: { readonly motivo: MotivoDe<"MANUAL">; readonly destino?: string };
}

/**
 * Transforma a URL de entrada na URL do ATS onde a candidatura acontece.
 * Lança `ErroResolucao` ou `ErroAgregadorExigeLogin`.
 */
export interface ResolvedorVagas {
  resolver(canonica: UrlCanonica, motor: Motor, sinal: AbortSignal): Promise<Resolucao>;
}

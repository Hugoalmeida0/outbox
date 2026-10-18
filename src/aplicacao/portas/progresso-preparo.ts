import type { Vaga } from "#dominio/vagas/vaga.ts";

/** Passos demorados de uma vaga no `preparar` (rede, navegador headless ou LLM). */
export type EtapaPreparo =
  "resolver" | "extrair" | "analisar" | "gerar_curriculo" | "gerar_carta" | "responder_campos";

export type EventoPreparo =
  | { readonly tipo: "inicio"; readonly total: number; readonly paralelo: number }
  | { readonly tipo: "etapa"; readonly vaga: Vaga; readonly etapa: EtapaPreparo }
  /** A vaga saiu do lote: `vaga` traz o status final; `erro` só quando virou ERRO_PREPARO. */
  | { readonly tipo: "concluida"; readonly vaga: Vaga; readonly erro: string | null };

/**
 * Andamento do `preparar` para quem acompanha. Cada vaga faz várias chamadas ao LLM e leva minutos, então
 * a interface precisa saber o que está em curso. Implementada pela interface (CLI). Nunca lança.
 */
export interface ProgressoPreparo {
  emitir(evento: EventoPreparo): void;
}

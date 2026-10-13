import { z } from "zod";

/** Dados mínimos da vaga obtidos por API, JSON-LD ou LLM. */
export const esquemaVagaExtraida = z.object({
  empresa: z.string().min(1),
  cargo: z.string().min(1),
  descricao: z.string().min(1),
  localidade: z.string().min(1).optional(),
  publicadaEm: z.string().min(1).optional(),
  regimeTexto: z.string().min(1).optional(),
  urlCandidatura: z.string().min(1).optional(),
});
export type VagaExtraida = z.infer<typeof esquemaVagaExtraida>;

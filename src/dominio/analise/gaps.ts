import { z } from "zod";

/** Termos que o usuário declarou não possuir (`curriculo/gaps.yaml`); nunca são perguntados de novo. */
export const esquemaGapsNegados = z.object({
  negados: z.array(z.string()).default([]),
});
export type GapsNegados = z.infer<typeof esquemaGapsNegados>;

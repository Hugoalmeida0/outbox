import { z } from "zod";

/** Registro versionado de falha de conector ou de vaga resolvida pelo agente sem conector. */
export const esquemaRegistroFalha = z.object({
  tipo: z.enum(["falha_conector", "sem_conector"]),
  conector: z.string().nullable(),
  versaoConector: z.string().nullable(),
  motor: z.string(),
  dominio: z.string(),
  url: z.string(),
  idVaga: z.number().int(),
  data: z.string(),
  passo: z.string().nullable(),
  seletor: z.string().nullable(),
  erro: z.string().nullable(),
  stack: z.string().nullable(),
  resultadoAgente: z.string().nullable(),
  passosAgente: z.array(z.string()).default([]),
  snapshot: z.string(),
  resolvida: z.boolean().default(false),
});
export type RegistroFalha = z.infer<typeof esquemaRegistroFalha>;

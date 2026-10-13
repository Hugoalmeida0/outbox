import { z } from "zod";
import { esquemaIdiomaCurriculo } from "./master.ts";

const esquemaBulletGerado = z.object({
  texto: z.string().min(1),
  origem: z.array(z.string()),
});

/** Currículo camaleão devolvido pelo LLM: só textos e referências (ids) ao master. */
export const esquemaCurriculoGerado = z.object({
  idioma: esquemaIdiomaCurriculo,
  titulo: z.string().min(1),
  resumo: z.string().min(1),
  experiencias: z.array(
    z.object({
      id: z.string(),
      cargoTraducao: z.string().min(1).optional(),
      bullets: z.array(esquemaBulletGerado),
    }),
  ),
  projetos: z.array(z.object({ id: z.string(), bullets: z.array(esquemaBulletGerado) })).default([]),
  skills: z.array(z.string()).default([]),
  formacao: z.array(z.string()).default([]),
  certificacoes: z.array(z.string()).default([]),
});
export type CurriculoGerado = z.infer<typeof esquemaCurriculoGerado>;

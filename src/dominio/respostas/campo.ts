import { z } from "zod";

export const TIPOS_CAMPO = [
  "texto",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "arquivo",
  "numero",
  "data",
  "email",
  "telefone",
] as const;
export type TipoCampo = (typeof TIPOS_CAMPO)[number];

export const CATEGORIAS_CAMPO = [
  "padrao",
  "documento",
  "curriculo",
  "carta",
  "salario",
  "diversidade",
  "consentimento",
  "pergunta",
] as const;
export type CategoriaCampo = (typeof CATEGORIAS_CAMPO)[number];

/** Categorias cujo valor é sensível (arquitetura.md §12.2): nunca vão ao LLM nem ao log. */
export const CATEGORIAS_SENSIVEIS: ReadonlySet<CategoriaCampo> = new Set([
  "documento",
  "salario",
  "diversidade",
]);

/** Campo de formulário de candidatura. */
export const esquemaCampo = z.object({
  id: z.string().min(1),
  rotulo: z.string(),
  tipo: z.enum(TIPOS_CAMPO),
  obrigatorio: z.boolean(),
  opcoes: z.array(z.string()).optional(),
  categoria: z.enum(CATEGORIAS_CAMPO),
});
export type Campo = z.infer<typeof esquemaCampo>;

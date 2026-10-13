import { z } from "zod";
import { CATEGORIAS_CAMPO, TIPOS_CAMPO } from "./campo.ts";

/** Resposta sugerida para um campo. `sensivel` é verdadeiro para documento, salário e diversidade. */
export const esquemaRespostaSugerida = z.object({
  campoId: z.string().optional(),
  rotulo: z.string(),
  categoria: z.enum(CATEGORIAS_CAMPO),
  tipoCampo: z.enum(TIPOS_CAMPO).optional(),
  valor: z.string().nullable(),
  fonte: z.string().regex(/^(perfil|codigo|gerada|banco:r-\d{4})$/),
  confianca: z.enum(["alta", "baixa"]),
  especificaDaVaga: z.boolean(),
  sensivel: z.boolean(),
  /** Chave `p<n>` das respostas sensíveis, usada pelo agente via `preencher_resposta_protegida`. */
  chaveProtegida: z
    .string()
    .regex(/^p\d+$/)
    .optional(),
});
export type RespostaSugerida = z.infer<typeof esquemaRespostaSugerida>;

export const esquemaRespostasSalvas = z.array(esquemaRespostaSugerida);

export const esquemaContato = z.object({
  nome: z.string(),
  titulo: z.string(),
  email: z.string(),
  telefone: z.string(),
  cidade: z.string(),
  uf: z.string().optional(),
  pais: z.string(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  portfolio: z.string().optional(),
});
export type Contato = z.infer<typeof esquemaContato>;

/** Tudo o que o `aplicar` usa para uma vaga. Não contém o perfil (os sensíveis já estão nas respostas). */
export interface PacoteCandidatura {
  readonly vagaId: number;
  readonly idioma: "pt" | "en";
  readonly pdfCurriculo: string;
  readonly pdfCarta?: string;
  readonly carta?: string;
  readonly respostas: readonly RespostaSugerida[];
  readonly contato: Contato;
}

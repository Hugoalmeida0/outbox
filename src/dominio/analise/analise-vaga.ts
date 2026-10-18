import { z } from "zod";
import { NIVEIS_IDIOMA } from "../curriculo/master.ts";

export const SENIORIDADES = [
  "estagio",
  "junior",
  "pleno",
  "senior",
  "especialista",
  "lideranca",
] as const;
export type Senioridade = (typeof SENIORIDADES)[number];

export const MODELOS_TRABALHO = ["remoto", "hibrido", "presencial"] as const;
export type ModeloTrabalho = (typeof MODELOS_TRABALHO)[number];

export const REGIMES = ["clt", "pj", "contractor"] as const;
export type Regime = (typeof REGIMES)[number];

export const GRUPOS_AFIRMATIVOS = [
  "mulheres",
  "pessoas_negras",
  "pcd",
  "lgbtqia",
  "pessoas_50_mais",
  "indigenas",
  "outro",
] as const;
export type GrupoAfirmativo = (typeof GRUPOS_AFIRMATIVOS)[number];

export const esquemaRequisito = z.object({
  texto: z.string().min(1),
  termo: z.string().min(1),
  obrigatorio: z.boolean(),
  status: z.enum(["coberto", "parcial", "ausente"]),
  evidencias: z.array(z.string()).default([]),
  /** Preenchido quando o requisito é um idioma: o código decide o `status` pelo master, não o LLM. */
  idiomaExigido: z.object({ idioma: z.string().min(1), nivel: z.enum(NIVEIS_IDIOMA) }).optional(),
});
export type Requisito = z.infer<typeof esquemaRequisito>;

export const esquemaKeyword = z.object({
  termo: z.string().min(1),
  tipo: z.enum(["tecnologia", "certificacao", "pratica", "dominio"]),
});
export type Keyword = z.infer<typeof esquemaKeyword>;

/**
 * Análise estruturada da vaga feita pelo LLM. O prompt pede de 10 a 30 keywords; o schema aceita de 1 a 40
 * para não reprovar vagas curtas (decisão registrada em docs/progresso.md).
 */
export const esquemaAnaliseVaga = z.object({
  idioma: z.enum(["pt", "en", "outro"]),
  senioridade: z.enum([...SENIORIDADES, "nao_informada"]),
  modelo: z.enum([...MODELOS_TRABALHO, "nao_informado"]),
  cidade: z.string().min(1).optional(),
  regime: z.enum([...REGIMES, "nao_informado"]),
  afirmativa: z.object({
    exclusiva: z.boolean(),
    grupos: z.array(z.enum(GRUPOS_AFIRMATIVOS)).default([]),
  }),
  requisitos: z.array(esquemaRequisito).default([]),
  keywords: z.array(esquemaKeyword).min(1).max(40),
  comoCandidatar: z
    .object({ tipo: z.enum(["link", "email", "outro"]), valor: z.string().min(1) })
    .optional(),
});
export type AnaliseVaga = z.infer<typeof esquemaAnaliseVaga>;

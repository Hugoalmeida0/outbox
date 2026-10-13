import { z } from "zod";

/** Identificador estável em kebab-case ASCII, usado como lastro entre currículo gerado e master. */
export const esquemaId = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, "use kebab-case ASCII (a-z, 0-9 e hífen)");

const anoMes = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "use AAAA-MM");

export const IDIOMAS_CURRICULO = ["pt", "en"] as const;
export const esquemaIdiomaCurriculo = z.enum(IDIOMAS_CURRICULO);
export type IdiomaCurriculo = z.infer<typeof esquemaIdiomaCurriculo>;

export const CATEGORIAS_SKILL = [
  "linguagem",
  "framework",
  "ferramenta",
  "cloud",
  "banco",
  "pratica",
  "soft",
] as const;
export type CategoriaSkill = (typeof CATEGORIAS_SKILL)[number];

export const NIVEIS_IDIOMA = ["basico", "intermediario", "avancado", "fluente", "nativo"] as const;
export type NivelIdioma = (typeof NIVEIS_IDIOMA)[number];

export const esquemaPessoal = z.object({
  nome: z.string().min(1),
  titulo: z.string().min(1),
  email: z.string().min(3),
  telefone: z.string().min(1),
  cidade: z.string().min(1),
  uf: z.string().min(1).optional(),
  pais: z.string().min(1),
  linkedin: z.string().min(1).optional(),
  github: z.string().min(1).optional(),
  portfolio: z.string().min(1).optional(),
});
export type Pessoal = z.infer<typeof esquemaPessoal>;

export const esquemaBulletExperiencia = z.object({
  id: esquemaId,
  texto: z.string().min(1),
  skills: z.array(esquemaId).default([]),
});

export const esquemaExperiencia = z.object({
  id: esquemaId,
  empresa: z.string().min(1),
  cargo: z.string().min(1),
  inicio: anoMes,
  fim: anoMes.nullable(),
  local: z.string().min(1).optional(),
  bullets: z.array(esquemaBulletExperiencia).min(1),
});
export type Experiencia = z.infer<typeof esquemaExperiencia>;

export const esquemaProjeto = z.object({
  id: esquemaId,
  nome: z.string().min(1),
  descricao: z.string().min(1),
  url: z.string().min(1).optional(),
  skills: z.array(esquemaId).default([]),
  bullets: z.array(z.object({ id: esquemaId, texto: z.string().min(1) })).default([]),
});
export type Projeto = z.infer<typeof esquemaProjeto>;

export const esquemaFormacao = z.object({
  id: esquemaId,
  instituicao: z.string().min(1),
  curso: z.string().min(1),
  grau: z.string().min(1),
  inicio: z.string().min(4),
  fim: z.string().min(4).nullable(),
});
export type Formacao = z.infer<typeof esquemaFormacao>;

export const esquemaCertificacao = z.object({
  id: esquemaId,
  nome: z.string().min(1),
  emissor: z.string().min(1),
  ano: z.number().int(),
  url: z.string().min(1).optional(),
});
export type Certificacao = z.infer<typeof esquemaCertificacao>;

export const esquemaSkill = z.object({
  id: esquemaId,
  nome: z.string().min(1),
  aliases: z.array(z.string().min(1)).default([]),
  categoria: z.enum(CATEGORIAS_SKILL),
  anos: z.number().nonnegative().optional(),
  nivel: z.enum(["basico", "intermediario", "avancado"]).optional(),
  origem: z.enum(["master", "aprendido"]).default("master"),
  evidencia: z.string().min(1).optional(),
  aprendidoEm: z.string().optional(),
  vagaOrigem: z.number().int().optional(),
});
export type SkillMaster = z.infer<typeof esquemaSkill>;

export const esquemaIdiomaFalado = z.object({
  idioma: z.string().min(1),
  nivel: z.enum(NIVEIS_IDIOMA),
});

const esquemaMasterBase = z.object({
  idioma: esquemaIdiomaCurriculo,
  pessoal: esquemaPessoal,
  resumo: z.string().min(1),
  experiencias: z.array(esquemaExperiencia).default([]),
  projetos: z.array(esquemaProjeto).default([]),
  formacao: z.array(esquemaFormacao).default([]),
  certificacoes: z.array(esquemaCertificacao).default([]),
  skills: z.array(esquemaSkill).default([]),
  idiomas: z.array(esquemaIdiomaFalado).default([]),
});

/** Coleta todos os ids declarados no master, na ordem em que aparecem. */
export function idsDoMaster(master: z.infer<typeof esquemaMasterBase>): string[] {
  return [
    ...master.experiencias.flatMap((e) => [e.id, ...e.bullets.map((b) => b.id)]),
    ...master.projetos.flatMap((p) => [p.id, ...p.bullets.map((b) => b.id)]),
    ...master.formacao.map((f) => f.id),
    ...master.certificacoes.map((c) => c.id),
    ...master.skills.map((s) => s.id),
  ];
}

/** Currículo master: fonte única e verdadeira do candidato (`curriculo/master.yaml`). */
export const esquemaMaster = esquemaMasterBase.superRefine((master, ctx) => {
  const vistos = new Set<string>();
  for (const id of idsDoMaster(master)) {
    if (vistos.has(id)) {
      ctx.addIssue({ code: "custom", message: `id duplicado: ${id}`, path: ["ids"] });
    }
    vistos.add(id);
  }
  const skills = new Set(master.skills.map((s) => s.id));
  const referencias = [
    ...master.experiencias.flatMap((e) => e.bullets.flatMap((b) => b.skills)),
    ...master.projetos.flatMap((p) => p.skills),
  ];
  for (const ref of referencias) {
    if (!skills.has(ref)) {
      ctx.addIssue({ code: "custom", message: `skill referenciada não existe: ${ref}`, path: ["skills"] });
    }
  }
});
export type Master = z.infer<typeof esquemaMaster>;

/** Schema enviado ao LLM no `importar` (sem refinamentos, que não têm representação em JSON Schema). */
export const esquemaMasterImportado = esquemaMasterBase;

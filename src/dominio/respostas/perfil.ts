import { z } from "zod";
import { MODELOS_TRABALHO, REGIMES, SENIORIDADES } from "../analise/analise-vaga.ts";

export const GENEROS = [
  "mulher_cis",
  "mulher_trans",
  "homem_cis",
  "homem_trans",
  "nao_binario",
  "outro",
] as const;
export const RACAS = ["branca", "preta", "parda", "amarela", "indigena"] as const;

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use AAAA-MM-DD");

export const esquemaDocumentos = z.object({
  cpf: z.string().min(11).optional(),
  rg: z.string().min(1).optional(),
  dataNascimento: dataIso.optional(),
});
export type Documentos = z.infer<typeof esquemaDocumentos>;

export const esquemaEndereco = z.object({
  logradouro: z.string().min(1).optional(),
  numero: z.string().min(1).optional(),
  complemento: z.string().min(1).optional(),
  bairro: z.string().min(1).optional(),
  cidade: z.string().min(1),
  uf: z.string().min(1).optional(),
  cep: z.string().min(1).optional(),
  pais: z.string().min(1),
});
export type Endereco = z.infer<typeof esquemaEndereco>;

export const esquemaSalario = z.object({
  clt_brl_mensal: z.number().nonnegative(),
  pj_brl_mensal: z.number().nonnegative(),
  usd_anual: z.number().nonnegative(),
  /** Salário atual ou último, em texto livre (ex.: "7000 CLT + VR/VA"). Ausente, o campo fica vazio. */
  atual: z.string().min(1).optional(),
});
export type TabelaSalario = z.infer<typeof esquemaSalario>;

export const esquemaDiversidade = z.object({
  genero: z.enum(GENEROS).optional(),
  raca: z.enum(RACAS).optional(),
  pcd: z.boolean().optional(),
  lgbtqia: z.boolean().optional(),
});
export type Diversidade = z.infer<typeof esquemaDiversidade>;

/**
 * Opt-ins e consentimentos dos formulários, decididos por código. Chave ausente = aceitar. O tratamento de
 * dados obrigatório é sempre aceito (sem ele não há candidatura).
 */
export const esquemaConsentimentos = z.object({
  /** Política de privacidade, LGPD/GDPR, termos de uso. */
  tratamentoDados: z.boolean().optional(),
  /** Manter os dados para vagas futuras (banco de talentos). */
  reterDados: z.boolean().optional(),
  /** Compartilhar o currículo com parceiros ou terceiros. */
  compartilharParceiros: z.boolean().optional(),
  /** Gravar ou transcrever entrevistas (inclusive com IA). */
  transcricaoIa: z.boolean().optional(),
  /** Receber comunicações (e-mail, SMS, WhatsApp, redes sociais, marketing). */
  comunicacoes: z.boolean().optional(),
  /** Uso dos dados de diversidade. `false` responde "prefiro não informar" nos campos de diversidade. */
  diversidade: z.boolean().optional(),
});
export type Consentimentos = z.infer<typeof esquemaConsentimentos>;
export type TipoConsentimento = keyof Consentimentos;

export const esquemaPreferencias = z.object({
  modelos: z.array(z.enum(MODELOS_TRABALHO)).min(1),
  cidades: z.array(z.string().min(1)).default([]),
  senioridades: z.array(z.enum(SENIORIDADES)).min(1),
  regimes: z.array(z.enum(REGIMES)).min(1),
});
export type Preferencias = z.infer<typeof esquemaPreferencias>;

/** Dados fixos do candidato (`curriculo/perfil.yaml`). Contém dados sensíveis: nunca vai inteiro ao LLM. */
export const esquemaPerfil = z.object({
  documentos: esquemaDocumentos.default({}),
  endereco: esquemaEndereco,
  /** Opcional: sem a tabela, os campos de pretensão ficam vazios (nunca vão ao LLM) e a revisão os destaca. */
  salario: esquemaSalario.optional(),
  disponibilidade: z.object({
    avisoPrevioDias: z.number().int().nonnegative(),
    inicioImediato: z.boolean(),
    viagens: z.boolean(),
    mudanca: z.boolean(),
  }),
  autorizacaoTrabalho: z.object({
    brasil: z.boolean(),
    precisaSponsorship: z.boolean(),
    paisesAutorizados: z.array(z.string()).default([]),
  }),
  diversidade: esquemaDiversidade.optional(),
  consentimentos: esquemaConsentimentos.default({}),
  preferencias: esquemaPreferencias,
  comoSoube: z.string().min(1),
});
export type Perfil = z.infer<typeof esquemaPerfil>;

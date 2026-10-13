import { z } from "zod";

export const TIPOS_RESPOSTA = ["texto", "sim_nao", "opcao", "numero"] as const;
export type TipoResposta = (typeof TIPOS_RESPOSTA)[number];

export const esquemaEntradaBanco = z.object({
  id: z.string().regex(/^r-\d{4}$/, "use r-0001"),
  pergunta: z.string().min(1),
  variantes: z.array(z.string()).default([]),
  idioma: z.enum(["pt", "en"]),
  tipo: z.enum(TIPOS_RESPOSTA),
  resposta: z.string(),
  atualizadaEm: z.string().min(1),
});
export type EntradaBanco = z.infer<typeof esquemaEntradaBanco>;

/** Banco de respostas reaproveitáveis (`curriculo/respostas.yaml`), que cresce com as revisões. */
export const esquemaBancoRespostas = z.array(esquemaEntradaBanco);
export type BancoRespostas = z.infer<typeof esquemaBancoRespostas>;

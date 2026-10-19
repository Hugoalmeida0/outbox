import { z } from "zod";
import { esquemaAnaliseVaga } from "#dominio/analise/analise-vaga.ts";
import { esquemaCampo } from "#dominio/respostas/campo.ts";

/** `analise.json`: a análise do LLM mais o que o preparo calcula sobre ela. */
export const esquemaArquivoAnalise = esquemaAnaliseVaga.extend({
  aderencia: z
    .object({
      score: z.number(),
      detalhes: z.object({
        cobertura: z.number(),
        senioridade: z.number(),
        modeloLocalidade: z.number(),
        regime: z.number(),
      }),
    })
    .optional(),
  alertas: z.array(z.string()).default([]),
  destinoEmail: z.string().optional(),
});
export type ArquivoAnalise = z.infer<typeof esquemaArquivoAnalise>;

/** `campos.json`: campos do formulário lidos no preparo. */
export const esquemaArquivoCampos = z.array(esquemaCampo);

export const ALERTA_PDF_LONGO = "pdf_mais_de_1_pagina";
export const ALERTA_ATS_CAIU =
  "score ATS do currículo ajustado ficou abaixo do currículo genérico (veja as keywords no PDF)";
export const ALERTA_CAMALEAO_FALHOU =
  "camaleão falhou (lastro): foi usado o currículo genérico do master";

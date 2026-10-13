import { z } from "zod";

/**
 * Schema da configuração: fonte única dos valores padrão (ADR-015). `config.yaml` local é opcional e
 * sobrescreve só as chaves presentes. `prefault` aplica os padrões internos quando o bloco falta.
 */
export const esquemaConfig = z.object({
  navegador: z
    .object({
      executavel: z.enum(["auto", "chrome", "chromium"]).default("auto"),
      portaCdp: z.number().int().min(1024).max(65535).default(9333),
    })
    .prefault({}),
  llm: z
    .object({
      modeloTexto: z.string().min(1).default("sonnet"),
      modeloAgente: z.string().min(1).default("sonnet"),
      timeoutTextoSeg: z.number().int().positive().default(180),
    })
    .prefault({}),
  agente: z
    .object({
      maxTurnos: z.number().int().positive().default(40),
      timeoutMin: z.number().positive().default(10),
    })
    .prefault({}),
  preparar: z
    .object({
      paralelo: z.number().int().min(1).max(8).default(2),
      maxTentativas: z.number().int().min(1).default(3),
    })
    .prefault({}),
  aderencia: z
    .object({
      scoreMinimo: z.number().int().min(0).max(100).default(60),
    })
    .prefault({}),
  carta: z
    .object({
      maxPalavras: z.number().int().positive().default(200),
    })
    .prefault({}),
  gupy: z
    .object({
      anexoPorCandidatura: z.boolean().default(true),
    })
    .prefault({}),
  notificacao: z
    .object({
      toast: z.boolean().default(true),
    })
    .prefault({}),
});

export type Config = z.infer<typeof esquemaConfig>;

export const CONFIG_PADRAO: Config = esquemaConfig.parse({});

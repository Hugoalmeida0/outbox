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
      modeloTexto: z.string().min(1).default("claude-haiku-5-5"),
      modeloTailoring: z.string().min(1).default("claude-sonnet-5-5"),
      modeloAgente: z.string().min(1).default("claude-haiku-5-5"),
      modeloAgenteReserva: z.string().min(1).default("claude-sonnet-5-5"),
      maxTokensThinking: z.number().int().min(0).default(0),
      timeoutTextoSeg: z.number().int().positive().default(180),
    })
    .prefault({}),
  agente: z
    .object({
      maxTurnos: z.number().int().positive().default(40),
      timeoutMin: z.number().positive().default(10),
      /** Porta do agente local (`camaleao agente`), sempre em 127.0.0.1. */
      porta: z.number().int().min(1024).max(65535).default(4321),
      /**
       * Origens do site que podem chamar o agente (CORS). A última é a que `camaleao agente` abre; inclua
       * a URL do seu site publicado na Vercel.
       */
      origensPermitidas: z
        .array(
          z
            .url({ protocol: /^https?$/, error: "use uma origem http(s), como https://site.com" })
            .transform((u) => new URL(u).origin),
        )
        .min(1)
        .default(["http://127.0.0.1:5173", "http://localhost:5173"]),
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

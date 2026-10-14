import { z } from "zod";
import type { ResumoPreparo } from "#aplicacao/casos-de-uso/preparar-vagas.ts";
import { formatarResumoPreparo } from "../apresentacao/resumo-preparo.ts";
import { validarEntrada, type ContextoComando } from "../contexto.ts";
import { ProgressoTerminal } from "../progresso-terminal.ts";

const esquema = z.object({
  forcar: z.boolean().default(false),
  reavaliar: z.boolean().default(false),
  paralelo: z.coerce
    .number({ error: "deve ser um número" })
    .int("deve ser inteiro")
    .min(1, "vai de 1 a 8")
    .max(8, "vai de 1 a 8")
    .optional(),
});

/** `outbox preparar [--forcar] [--paralelo <n>] [--reavaliar]`. */
export async function comandoPreparar(ctx: ContextoComando, bruto: unknown): Promise<number> {
  const { forcar, reavaliar, paralelo } = validarEntrada(esquema, bruto);
  const container = ctx.container();
  const trava = container.adquirirTrava("preparar");
  const progresso = new ProgressoTerminal({ saida: ctx.saida });
  let resumo: ResumoPreparo;
  try {
    resumo = await container.casos.prepararVagas(
      { forcar, reavaliar, ...(paralelo !== undefined ? { paralelo } : {}) },
      progresso,
      ctx.sinal,
    );
  } finally {
    progresso.encerrar();
    trava.liberar();
  }
  ctx.saida.escrever(formatarResumoPreparo(resumo));
  return resumo.interrompido === "cancelado" ? 130 : 0;
}

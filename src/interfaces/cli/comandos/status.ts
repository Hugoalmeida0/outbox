import { z } from "zod";
import { TODOS_STATUS, type Status } from "#dominio/vagas/status.ts";
import { formatarStatus } from "../apresentacao/status.ts";
import { validarEntrada, type ContextoComando } from "../contexto.ts";

const esquema = z.object({
  status: z
    .string()
    .transform((s) => s.trim().toUpperCase())
    .refine((s): s is Status => (TODOS_STATUS as readonly string[]).includes(s), {
      message: `use um destes: ${TODOS_STATUS.join(", ")}`,
    })
    .optional(),
});

/** `outbox status [--status <STATUS>]`. */
export function comandoStatus(ctx: ContextoComando, bruto: unknown): number {
  const { status } = validarEntrada(esquema, bruto);
  const dados = ctx.container().casos.listarStatus(status ? { status } : {});
  ctx.saida.escrever(formatarStatus(dados, status));
  return 0;
}

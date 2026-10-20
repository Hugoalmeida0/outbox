import { z } from "zod";
import { STATUS_DE_RETORNO } from "#aplicacao/casos-de-uso/registrar-retorno.ts";
import { ETAPAS } from "#dominio/vagas/status.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { cores } from "../apresentacao/cores.ts";
import { validarEntrada, type ContextoComando } from "../contexto.ts";

const esquema = z.object({
  id: z.coerce
    .number({ error: "deve ser um número" })
    .int("deve ser inteiro")
    .positive("deve ser positivo"),
  status: z
    .string()
    .transform((s) => s.trim().toUpperCase())
    .pipe(z.enum(STATUS_DE_RETORNO, { message: `use um destes: ${STATUS_DE_RETORNO.join(", ")}` })),
  etapa: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(z.enum(ETAPAS, { message: `use uma destas: ${ETAPAS.join(", ")}` }))
    .optional(),
  nota: z.string().trim().min(1).optional(),
});

/** `camaleao retorno <id> <status> [--etapa <etapa>] [--nota <texto>]`. */
export function comandoRetorno(ctx: ContextoComando, bruto: unknown): number {
  const { id, status, etapa, nota } = validarEntrada(esquema, bruto);
  ctx.container().casos.registrarRetorno({
    id: id as IdVaga,
    status,
    ...(etapa ? { etapa } : {}),
    ...(nota ? { nota } : {}),
  });
  ctx.saida.escrever(cores.verde(`vaga #${String(id)}: ${status}${etapa ? ` (${etapa})` : ""}`));
  return 0;
}

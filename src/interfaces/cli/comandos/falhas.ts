import { formatarFalhas } from "../apresentacao/falhas.ts";
import type { ContextoComando } from "../contexto.ts";

/** `outbox falhas`. */
export function comandoFalhas(ctx: ContextoComando): number {
  ctx.saida.escrever(formatarFalhas(ctx.container().casos.listarFalhas()));
  return 0;
}

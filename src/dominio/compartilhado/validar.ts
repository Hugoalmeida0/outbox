import type { ZodType } from "zod";
import { ErroValidacao } from "./erros.ts";

/** Valida `dado` com `schema`, lançando `ErroValidacao` com o caminho do primeiro problema. */
export function validar<T>(schema: ZodType<T>, dado: unknown, contexto: string): T {
  const resultado = schema.safeParse(dado);
  if (!resultado.success) throw ErroValidacao.deZod(resultado.error, contexto);
  return resultado.data;
}

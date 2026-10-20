import type { ZodError, ZodType } from "zod";
import { ErroValidacao } from "./erros.ts";

/** Problema de validação de um campo, com o caminho no formato `secao.campo` (`""` para a raiz). */
export interface ProblemaCampo {
  readonly caminho: string;
  readonly mensagem: string;
}

/** Todos os problemas de um `ZodError`, um por campo. */
export function problemasDoZod(erro: ZodError): ProblemaCampo[] {
  return erro.issues.map((p) => ({ caminho: p.path.map(String).join("."), mensagem: p.message }));
}

/** Valida `dado` com `schema`, lançando `ErroValidacao` com o caminho do primeiro problema. */
export function validar<T>(schema: ZodType<T>, dado: unknown, contexto: string): T {
  const resultado = schema.safeParse(dado);
  if (!resultado.success) throw ErroValidacao.deZod(resultado.error, contexto);
  return resultado.data;
}

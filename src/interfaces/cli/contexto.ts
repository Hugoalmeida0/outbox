import type { ZodType } from "zod";
import type { Container } from "#composicao";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";

/** Saída de texto da CLI (stdout e stderr); os testes capturam as linhas. */
export interface Saida {
  escrever(texto: string): void;
  erro(texto: string): void;
}

/** O que cada comando recebe: container sob demanda, saída e cancelamento. */
export interface ContextoComando {
  /** Criado no primeiro acesso: `--help` e erros de parse não abrem banco nem leem config. */
  readonly container: () => Container;
  readonly saida: Saida;
  readonly sinal: AbortSignal;
  /** Aborta o comando (usado quando o usuário cancela um prompt com Ctrl+C). */
  readonly cancelar: () => void;
}

/** Valida argumentos e opções da CLI; a falha vira `ErroUsuario` (código de saída 2). */
export function validarEntrada<T>(schema: ZodType<T>, valor: unknown): T {
  const resultado = schema.safeParse(valor);
  if (resultado.success) return resultado.data;
  const problema = resultado.error.issues[0];
  const campo = (problema?.path ?? []).map(String).join(".");
  throw new ErroUsuario(`${campo ? `${campo}: ` : ""}${problema?.message ?? "entrada inválida"}`, {
    cause: resultado.error,
  });
}

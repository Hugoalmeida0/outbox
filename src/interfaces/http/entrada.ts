import type { Context } from "hono";
import type { ZodType } from "zod";
import { ErroEntradaInvalida, ErroUsuario } from "#dominio/compartilhado/erros.ts";
import { problemasDoZod } from "#dominio/compartilhado/validar.ts";

/** Valida a entrada de uma rota; a falha vira `ErroEntradaInvalida` (422, com o campo de cada problema). */
export function validar<T>(schema: ZodType<T>, valor: unknown): T {
  const resultado = schema.safeParse(valor);
  if (resultado.success) return resultado.data;
  const problemas = problemasDoZod(resultado.error);
  const [primeiro] = problemas;
  const mensagem = primeiro
    ? `${primeiro.caminho ? `${primeiro.caminho}: ` : ""}${primeiro.mensagem}`
    : "entrada inválida";
  throw new ErroEntradaInvalida(mensagem, problemas, { cause: resultado.error });
}

/** Corpo JSON da requisição; vazio vale `{}` (o site manda POST sem corpo nas ações sem opções). */
export async function lerJson(c: Context): Promise<unknown> {
  const texto = await c.req.text();
  if (texto.trim() === "") return {};
  try {
    return JSON.parse(texto) as unknown;
  } catch (erro) {
    throw new ErroUsuario("corpo JSON inválido", { cause: erro });
  }
}

/** Id positivo de vaga no caminho da rota. */
export function idDaRota(c: Context): number {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) throw new ErroUsuario("id da vaga inválido");
  return id;
}

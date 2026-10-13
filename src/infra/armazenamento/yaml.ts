import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { parse, parseDocument, type Document } from "yaml";
import type { ZodType } from "zod";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import { escreverAtomico } from "../sistema/escrita-atomica.ts";

function validarOuFalhar<T>(schema: ZodType<T>, dado: unknown, arquivo: string): T {
  const resultado = schema.safeParse(dado);
  if (!resultado.success) {
    const problema = resultado.error.issues[0];
    const caminho = (problema?.path ?? []).map(String).join(".");
    throw new ErroUsuario(
      `${arquivo}: ${caminho || "raiz"}: ${problema?.message ?? "valor inválido"}`,
      {
        cause: resultado.error,
      },
    );
  }
  return resultado.data;
}

/** Lê e valida um YAML; arquivo ausente ou inválido vira `ErroUsuario` com o campo problemático. */
export function lerYaml<T>(caminho: string, schema: ZodType<T>): T {
  const arquivo = basename(caminho);
  if (!existsSync(caminho)) throw new ErroUsuario(`${arquivo} não encontrado em ${caminho}`);
  let dado: unknown;
  try {
    dado = parse(readFileSync(caminho, "utf8"));
  } catch (erro) {
    throw new ErroUsuario(`${arquivo} não é um YAML válido: ${(erro as Error).message}`, {
      cause: erro,
    });
  }
  return validarOuFalhar(schema, dado, arquivo);
}

/** Edita um YAML preservando comentários e ordem; valida o resultado antes de gravar de forma atômica. */
export function editarYaml<T>(
  caminho: string,
  schema: ZodType<T>,
  mutar: (doc: Document) => void,
): T {
  const documento = parseDocument(readFileSync(caminho, "utf8"));
  if (documento.errors.length > 0) {
    throw new ErroUsuario(
      `${basename(caminho)} não é um YAML válido: ${documento.errors[0]?.message ?? ""}`,
    );
  }
  mutar(documento);
  const valido = validarOuFalhar(schema, documento.toJS(), basename(caminho));
  escreverAtomico(caminho, documento.toString());
  return valido;
}

import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import {
  isMap,
  isNode,
  isScalar,
  isSeq,
  parse,
  parseDocument,
  type Document,
  type YAMLMap,
} from "yaml";
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

/** Lê um YAML sem validar; erro de sintaxe vira `ErroUsuario`. */
export function lerYamlBruto(caminho: string): unknown {
  try {
    return parse(readFileSync(caminho, "utf8")) as unknown;
  } catch (erro) {
    throw new ErroUsuario(`${basename(caminho)} não é um YAML válido: ${(erro as Error).message}`, {
      cause: erro,
    });
  }
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/** Troca o nó por um novo com o valor, levando os comentários e o estilo (flow) do antigo. */
function novoNo(doc: Document, antigo: unknown, valor: unknown): unknown {
  const novo = doc.createNode(valor);
  if (isNode(antigo)) {
    if (antigo.comment) novo.comment = antigo.comment;
    if (antigo.commentBefore) novo.commentBefore = antigo.commentBefore;
    if ((isSeq(antigo) || isMap(antigo)) && (isSeq(novo) || isMap(novo)) && antigo.flow)
      novo.flow = true;
  }
  return novo;
}

function mesclarMapa(doc: Document, mapa: YAMLMap, valor: Record<string, unknown>): void {
  for (const par of [...mapa.items]) {
    const chave = isScalar(par.key) ? String(par.key.value) : String(par.key);
    if (valor[chave] === undefined) mapa.delete(par.key);
  }
  for (const [chave, v] of Object.entries(valor)) {
    if (v === undefined) continue;
    const atual = mapa.get(chave, true);
    if (isMap(atual) && ehObjeto(v)) mesclarMapa(doc, atual, v);
    else if (isScalar(atual) && !ehObjeto(v) && !Array.isArray(v)) atual.value = v;
    else mapa.set(chave, novoNo(doc, atual, v));
  }
}

/**
 * Substitui o conteúdo do documento por `valor`, preservando comentários e a ordem das chaves que
 * continuam; chaves ausentes em `valor` saem do documento.
 */
export function mesclarNoDocumento(doc: Document, valor: Record<string, unknown>): void {
  if (isMap(doc.contents)) mesclarMapa(doc, doc.contents, valor);
  else doc.contents = doc.createNode(valor);
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

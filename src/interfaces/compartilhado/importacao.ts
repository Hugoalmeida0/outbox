// Leitura do currículo a importar, comum à CLI (`camaleao importar`) e ao site (upload).
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";

export const EXTENSOES_CURRICULO = [".pdf", ".docx", ".md", ".txt"] as const;

async function textoDocx(caminho: string): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  const { value } = await mammoth.extractRawText({ path: caminho });
  return value;
}

/** Recusa extensões fora de `.pdf`, `.docx`, `.md` e `.txt`; devolve a extensão em minúsculas. */
export function validarExtensao(nome: string): string {
  const extensao = extname(nome).toLowerCase();
  if (!(EXTENSOES_CURRICULO as readonly string[]).includes(extensao)) {
    throw new ErroUsuario(
      `formato não suportado (${extensao || "sem extensão"}); use ${EXTENSOES_CURRICULO.join(", ")}`,
    );
  }
  return extensao;
}

/** PDF fica para o LLM ler; `.docx` vira texto pelo mammoth (carregado sob demanda); o resto é texto. */
export async function lerCurriculo(caminho: string): Promise<{ ehPdf: boolean; texto?: string }> {
  const extensao = validarExtensao(caminho);
  if (extensao === ".pdf") return { ehPdf: true };
  const texto = extensao === ".docx" ? await textoDocx(caminho) : readFileSync(caminho, "utf8");
  return { ehPdf: false, texto };
}

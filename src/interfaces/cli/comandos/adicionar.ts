import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import { formatarAdicao } from "../apresentacao/adicao.ts";
import { validarEntrada, type ContextoComando } from "../contexto.ts";

const esquema = z.object({
  urls: z.array(z.string()).default([]),
  arquivo: z.string().min(1).optional(),
});

/** Linhas de URL de um arquivo, ignorando vazias e comentários (`#`). */
export function urlsDoArquivo(conteudo: string): string[] {
  return conteudo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "" && !l.startsWith("#"));
}

/** `camaleao adicionar [urls...] [-a <arquivo>]`. */
export function comandoAdicionar(ctx: ContextoComando, bruto: unknown): number {
  const { urls, arquivo } = validarEntrada(esquema, bruto);
  const todas = [...urls];
  if (arquivo !== undefined) {
    if (!existsSync(arquivo)) throw new ErroUsuario(`arquivo não encontrado: ${arquivo}`);
    todas.push(...urlsDoArquivo(readFileSync(arquivo, "utf8")));
  }
  if (todas.length === 0)
    throw new ErroUsuario("informe ao menos uma URL (argumentos ou -a <arquivo>)");
  const itens = ctx.container().casos.adicionarVagas(todas);
  ctx.saida.escrever(formatarAdicao(itens));
  return itens.every((i) => i.resultado === "invalida") ? 2 : 0;
}

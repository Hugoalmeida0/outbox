import { existsSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { z } from "zod";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import { cores } from "../apresentacao/cores.ts";
import { validarEntrada, type ContextoComando } from "../contexto.ts";

const EXTENSOES = [".pdf", ".docx", ".md", ".txt"] as const;

const esquema = z.object({
  arquivo: z.string().min(1, "informe o arquivo do currículo"),
  sobrescrever: z.boolean().default(false),
});

async function textoDocx(caminho: string): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  const { value } = await mammoth.extractRawText({ path: caminho });
  return value;
}

/** `outbox importar <arquivo> [--sobrescrever]`. */
export async function comandoImportar(ctx: ContextoComando, bruto: unknown): Promise<number> {
  const { arquivo, sobrescrever } = validarEntrada(esquema, bruto);
  const caminho = resolve(arquivo);
  if (!existsSync(caminho)) throw new ErroUsuario(`arquivo não encontrado: ${arquivo}`);
  const extensao = extname(caminho).toLowerCase();
  if (!(EXTENSOES as readonly string[]).includes(extensao)) {
    throw new ErroUsuario(
      `formato não suportado (${extensao || "sem extensão"}); use ${EXTENSOES.join(", ")}`,
    );
  }
  const ehPdf = extensao === ".pdf";
  const texto = ehPdf
    ? undefined
    : extensao === ".docx"
      ? await textoDocx(caminho)
      : readFileSync(caminho, "utf8");

  const container = ctx.container();
  ctx.saida.escrever("Convertendo o currículo no master com o Claude (pode levar alguns minutos)…");
  const resultado = await container.casos.importarCurriculo(
    {
      caminhoArquivo: caminho,
      ehPdf,
      ...(texto !== undefined ? { texto } : {}),
      sobrescrever,
      pastaLog: join(container.caminhos.logsDir, "llm"),
    },
    ctx.sinal,
  );
  const { master } = resultado;
  const rel = (c: string): string => relative(container.caminhos.raiz, c);
  ctx.saida.escrever(
    cores.verde(
      `master criado em ${rel(container.caminhos.master)}: ${String(master.experiencias.length)} experiência(s), ` +
        `${String(master.skills.length)} skill(s).`,
    ),
  );
  if (resultado.backup) ctx.saida.escrever(`Backup do master anterior: ${rel(resultado.backup)}`);
  for (const criado of resultado.criados)
    ctx.saida.escrever(`Criado a partir do exemplo: ${rel(criado)}`);
  ctx.saida.escrever(
    "Próximos passos: revise o master, preencha curriculo/perfil.yaml e faça os logins com `outbox navegador`.",
  );
  return 0;
}

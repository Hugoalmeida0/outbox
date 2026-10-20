import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { z } from "zod";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import { lerCurriculo, validarExtensao } from "#interfaces/compartilhado/importacao.ts";
import { cores } from "../apresentacao/cores.ts";
import { validarEntrada, type ContextoComando } from "../contexto.ts";

const esquema = z.object({
  arquivo: z.string().min(1, "informe o arquivo do currículo"),
  sobrescrever: z.boolean().default(false),
});

/** `camaleao importar <arquivo> [--sobrescrever]`. */
export async function comandoImportar(ctx: ContextoComando, bruto: unknown): Promise<number> {
  const { arquivo, sobrescrever } = validarEntrada(esquema, bruto);
  const caminho = resolve(arquivo);
  if (!existsSync(caminho)) throw new ErroUsuario(`arquivo não encontrado: ${arquivo}`);
  validarExtensao(caminho);
  const { ehPdf, texto } = await lerCurriculo(caminho);

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
    "Próximos passos: revise o master, preencha curriculo/perfil.yaml e faça os logins com `camaleao navegador`.",
  );
  return 0;
}

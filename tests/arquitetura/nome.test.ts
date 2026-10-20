// Renomeação para Camaleão (ADR-0026): o nome antigo só sobrevive na compatibilidade com instalações
// anteriores e nas referências às specs históricas, que não são renomeadas.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const ALVOS = [
  "src",
  "tests",
  "scripts",
  "prompts",
  "bin",
  "docs",
  "apps/web/src",
  "README.md",
  "config.exemplo.yaml",
  "package.json",
  ".github",
];
const IGNORADOS = new Set(["node_modules", "fixtures", "__snapshots__", "adr", "dist"]);
const TEXTO = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".md",
  ".yaml",
  ".yml",
  ".json",
  ".sql",
  ".css",
]);
/** Arquivos que precisam do nome antigo: fallback de variáveis, migração do banco e seus testes. */
const COMPATIBILIDADE = new Set([
  "src/infra/config/variaveis.ts",
  "src/infra/config/variaveis.test.ts",
  "src/infra/banco/banco-legado.ts",
  "tests/integracao/cli.test.ts",
  "tests/arquitetura/nome.test.ts",
]);

function arquivos(caminho: string): string[] {
  const absoluto = join(RAIZ, caminho);
  let info;
  try {
    info = statSync(absoluto);
  } catch {
    return [];
  }
  if (info.isFile()) return TEXTO.has(extname(caminho)) ? [caminho] : [];
  return readdirSync(absoluto)
    .filter((nome) => !IGNORADOS.has(nome))
    .flatMap((nome) => arquivos(join(caminho, nome)));
}

describe("nome do produto", () => {
  it("nenhuma ocorrência do nome antigo fora da compatibilidade e das specs históricas", () => {
    const ocorrencias = ALVOS.flatMap(arquivos)
      .map((a) => relative(RAIZ, join(RAIZ, a)).replace(/\\/g, "/"))
      .filter((a) => !COMPATIBILIDADE.has(a))
      .flatMap((a) =>
        readFileSync(join(RAIZ, a), "utf8")
          .split("\n")
          .map((linha, i) => ({ a, i, linha: linha.replaceAll("spec-outbox", "") }))
          .filter(({ linha }) => /outbox/i.test(linha))
          .map(({ a, i }) => `${a}:${String(i + 1)}`),
      );
    expect(ocorrencias).toEqual([]);
  });
});

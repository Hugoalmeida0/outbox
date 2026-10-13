// Verifica as fronteiras de camada (arquitetura.md §11.3) aplicando a configuração real do ESLint
// a trechos sintéticos em cada camada. As regras com tipos são desligadas: só importa no-restricted-imports.
import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({
  cwd: new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
  overrideConfig: tseslint.configs.disableTypeChecked,
});

async function violaFronteira(arquivo: string, importacao: string): Promise<boolean> {
  const [resultado] = await eslint.lintText(`import "${importacao}";\n`, { filePath: arquivo });
  return (resultado?.messages ?? []).some((m) => m.ruleId === "no-restricted-imports");
}

describe("fronteiras de camada", () => {
  it.each([
    ["src/dominio/vagas/x.ts", "node:fs"],
    ["src/dominio/vagas/x.ts", "playwright"],
    ["src/dominio/vagas/x.ts", "#aplicacao/portas/relogio.ts"],
    ["src/dominio/vagas/x.ts", "#infra/banco/conexao.ts"],
    ["src/dominio/vagas/x.ts", "../../aplicacao/portas/relogio.ts"],
    ["src/aplicacao/casos-de-uso/x.ts", "node:path"],
    ["src/aplicacao/casos-de-uso/x.ts", "#infra/banco/conexao.ts"],
    ["src/aplicacao/casos-de-uso/x.ts", "#interfaces/cli/principal.ts"],
    ["src/aplicacao/casos-de-uso/x.ts", "#composicao"],
    ["src/aplicacao/casos-de-uso/x.ts", "yaml"],
    ["src/infra/banco/x.ts", "#interfaces/cli/principal.ts"],
    ["src/infra/banco/x.ts", "#composicao"],
    ["src/interfaces/cli/x.ts", "#infra/banco/conexao.ts"],
  ])("%s não pode importar %s", async (arquivo, importacao) => {
    expect(await violaFronteira(arquivo, importacao)).toBe(true);
  });

  it.each([
    ["src/dominio/vagas/x.ts", "zod"],
    ["src/dominio/vagas/x.ts", "#dominio/curriculo/master.ts"],
    ["src/dominio/vagas/x.ts", "./status.ts"],
    ["src/dominio/vagas/x.ts", "../compartilhado/texto.ts"],
    ["src/aplicacao/casos-de-uso/x.ts", "#dominio/vagas/status.ts"],
    ["src/aplicacao/casos-de-uso/x.ts", "#aplicacao/portas/relogio.ts"],
    ["src/infra/banco/x.ts", "node:sqlite"],
    ["src/infra/banco/x.ts", "#aplicacao/portas/repositorio-vagas.ts"],
    ["src/interfaces/cli/x.ts", "#composicao"],
    ["src/interfaces/cli/x.ts", "commander"],
    ["src/composicao.ts", "#infra/banco/conexao.ts"],
  ])("%s pode importar %s", async (arquivo, importacao) => {
    expect(await violaFronteira(arquivo, importacao)).toBe(false);
  });
});

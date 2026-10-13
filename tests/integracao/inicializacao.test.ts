// AC31: comandos de consulta não carregam playwright, mammoth nem node-notifier (inicialização rápida).
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const ESPIAO = fileURLToPath(new URL("../apoio/espiar-modulos.ts", import.meta.url));
const PROIBIDOS =
  /[\\/]node_modules[\\/](playwright|playwright-core|mammoth|node-notifier|@inquirer)[\\/]/;

function carregar(...args: string[]): { codigo: number; carregados: string[] } {
  const raiz = mkdtempSync(join(tmpdir(), "outbox-init-"));
  const processo = spawnSync(
    process.execPath,
    ["--disable-warning=ExperimentalWarning", ESPIAO, raiz, ...args],
    {
      cwd: RAIZ,
      encoding: "utf8",
      timeout: 60_000,
    },
  );
  expect(processo.status, processo.stderr).toBe(0);
  return JSON.parse(processo.stdout) as { codigo: number; carregados: string[] };
}

describe("inicialização preguiçosa (AC31)", () => {
  it.each([["status"], ["falhas"], ["retorno", "1", "OFERTA"]])(
    "`%s` não carrega dependências pesadas",
    (...args) => {
      const { carregados } = carregar(...args);
      expect(carregados.some((u) => u.includes("/node_modules/commander/"))).toBe(true);
      expect(carregados.filter((u) => PROIBIDOS.test(u))).toEqual([]);
    },
  );
});

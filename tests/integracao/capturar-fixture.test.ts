import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import { lerArgumentos, montarFixture } from "#scripts/capturar-fixture.ts";

const SCRIPT = fileURLToPath(new URL("../../scripts/capturar-fixture.ts", import.meta.url));

describe("capturar-fixture", () => {
  it("valida os argumentos", () => {
    expect(
      lerArgumentos([
        "https://jobs.lever.co/acme/1/apply",
        "lever",
        "formulario",
        "--sobrescrever",
      ]),
    ).toEqual({
      url: "https://jobs.lever.co/acme/1/apply",
      motor: "lever",
      nome: "formulario",
      sobrescrever: true,
    });
    expect(() => lerArgumentos(["https://x.com"])).toThrow(ErroUsuario);
    expect(() => lerArgumentos(["ftp://x.com", "lever", "a"])).toThrow(/URL inválida/);
    expect(() => lerArgumentos(["https://x.com", "Lever", "a"])).toThrow(/kebab-case/);
    expect(() => lerArgumentos(["https://x.com", "lever", "../fora"])).toThrow(/kebab-case/);
  });

  it("monta o HTML sanitizado com a origem no topo", () => {
    const html =
      "<html><body><script>rastreio()</script><p>Ana Exemplo da Silva</p>" +
      "<input name='email' value='ana.exemplo@example.com'></body></html>";
    const fixture = montarFixture(html, "https://a.com/x--y", "2026-10-10T13:00:00-03:00", [
      "Ana Exemplo da Silva",
      "ana.exemplo@example.com",
    ]);
    expect(fixture.split("\n")[0]).toBe(
      "<!-- origem: https://a.com/x%2D%2Dy | capturada em 2026-10-10T13:00:00-03:00 -->",
    );
    expect(fixture).not.toContain("rastreio");
    expect(fixture).not.toContain("Ana Exemplo da Silva");
    expect(fixture).not.toContain("ana.exemplo@example.com");
  });

  it("sem argumentos, o script sai com 2 e mostra o uso sem abrir navegador", () => {
    const r = spawnSync(process.execPath, ["--disable-warning=ExperimentalWarning", SCRIPT], {
      encoding: "utf8",
      timeout: 30_000,
    });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("uso: npm run capturar-fixture -- <url> <motor> <nome>");
  });
});

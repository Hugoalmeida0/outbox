// AC13: o build não faz requisição a domínio externo (fontes empacotadas, sem CDN). Roda depois do
// `npm run build`. Strings de URL que não são requisições (namespaces SVG, links de erro do React) passam.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const DIST = resolve(process.cwd(), "dist");
const TEXTO = new Set([".html", ".js", ".css", ".svg", ".json", ".webmanifest"]);
/**
 * Hosts que aparecem como texto no bundle, nunca como destino de rede: namespaces, links de documentação
 * em mensagens de erro do React e do Zod, o agente local e o exemplo do campo de links. Na Vercel, a CSP
 * (`connect-src 'self' http://127.0.0.1:* http://localhost:*`) barra qualquer outro destino.
 */
const SO_TEXTO = new Set([
  "www.w3.org",
  "react.dev",
  "reactjs.org",
  "reactrouter.com",
  "github.com",
  "developer.mozilla.org",
  "bugs.webkit.org",
  "json-schema.org",
  "job-boards.greenhouse.io",
  "127.0.0.1",
  "localhost",
]);

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });
}

describe("build do site (AC13)", () => {
  it("existe (rode `npm run build` antes)", () => {
    expect(existsSync(join(DIST, "index.html"))).toBe(true);
  });

  it("HTML e CSS não apontam para fora; o JS só cita hosts conhecidos como texto", () => {
    const externos = arquivos(DIST)
      .filter((a) => TEXTO.has(extname(a)))
      .flatMap((a) => {
        const conteudo = readFileSync(a, "utf8");
        const hosts = [...conteudo.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1] ?? "");
        const permitidos = extname(a) === ".js" ? SO_TEXTO : new Set(["www.w3.org"]);
        return hosts.filter((h) => !permitidos.has(h)).map((h) => `${h} em ${a}`);
      });
    expect([...new Set(externos)]).toEqual([]);
  });

  it("fontes Poppins e Nunito vêm do próprio site", () => {
    const fontes = readdirSync(join(DIST, "assets")).filter((a) => /\.woff2?$/.test(a));
    expect(fontes.some((f) => f.startsWith("poppins"))).toBe(true);
    expect(fontes.some((f) => f.startsWith("nunito"))).toBe(true);
  });
});

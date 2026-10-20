// AC13: os pares de texto e fundo do site passam no contraste AA nos dois temas.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "src/tema/tokens.css"), "utf8");

function bloco(texto: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const m of texto.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    if (m[1] && m[2]) tokens[m[1]] = m[2];
  }
  return tokens;
}

const claro = bloco(css.split("@media")[0] ?? "");
const escuro = { ...claro, ...bloco(css.split("@media")[1] ?? "") };

function luminancia(hex: string): number {
  const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return ((l1 ?? 0) + 0.05) / ((l2 ?? 0) + 0.05);
}

/** [texto, fundo, mínimo]: 4.5 para texto normal; 3 para o rótulo dos botões (Poppins Bold 19 px). */
const PARES: readonly (readonly [string, string, number])[] = [
  ["texto", "fundo", 4.5],
  ["texto", "superficie", 4.5],
  ["texto", "superficie-2", 4.5],
  ["texto-suave", "fundo", 4.5],
  ["texto-suave", "superficie", 4.5],
  ["acento-texto", "fundo", 4.5],
  ["acento-texto", "superficie", 4.5],
  ["erro-texto", "superficie", 4.5],
  ["erro-texto", "superficie-2", 4.5],
  ["texto-destaque", "destaque", 4.5],
  ["texto-sucesso", "sucesso", 4.5],
  ["texto-primaria", "primaria", 3],
];

describe("tokens da marca (AC13)", () => {
  it("usa exatamente a paleta do Canva", () => {
    expect(claro).toMatchObject({
      coral: "#ff6b5b",
      petroleo: "#1f4e5f",
      sol: "#ffc94d",
      menta: "#9ed9c3",
      creme: "#fff6ec",
    });
    expect(escuro.fundo).toBe("#1f4e5f");
    expect(escuro.texto).toBe("#fff6ec");
  });

  it.each([
    ["claro", claro],
    ["escuro", escuro],
  ])("tema %s passa AA em todos os pares usados", (_tema, tokens) => {
    const falhas = PARES.flatMap(([texto, fundo, minimo]) => {
      const a = tokens[texto];
      const b = tokens[fundo];
      if (!a || !b) return [`${texto}/${fundo}: token ausente`];
      const valor = contraste(a, b);
      return valor >= minimo
        ? []
        : [`${texto} sobre ${fundo}: ${valor.toFixed(2)} < ${String(minimo)}`];
    });
    expect(falhas).toEqual([]);
  });
});

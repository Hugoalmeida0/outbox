import { describe, expect, it } from "vitest";
import { umMaster, umPerfil } from "#testes/apoio/builders.ts";
import { listaPii } from "./pii.ts";
import { redigirPii, sanitizarHtml } from "./sanitizar.ts";

const pii = listaPii(umMaster().pessoal, umPerfil());

describe("listaPii", () => {
  it("inclui nome, contato, documentos e endereço, com e sem máscara, do mais longo ao mais curto", () => {
    expect(pii).toEqual(
      expect.arrayContaining([
        "Ana Exemplo da Silva",
        "Silva",
        "ana.exemplo@example.com",
        "+55 11 90000-0000",
        "5511900000000",
        "123.456.789-09",
        "12345678909",
        "15/06/1995",
        "1995-06-15",
        "Rua Exemplo Fictícia",
        "01000-000",
        "github.com/ana-exemplo",
      ]),
    );
    expect(pii).not.toContain("Ana");
    expect(pii[0]!.length).toBeGreaterThanOrEqual(pii[pii.length - 1]!.length);
  });

  it("devolve lista vazia sem dados", () => {
    expect(listaPii()).toEqual([]);
  });
});

describe("sanitizarHtml", () => {
  const html = `<html><head><script>var token = "segredo";</script><noscript>x</noscript></head><body>
    <label for="nome">Nome</label><input id="nome" name="nome" value="Ana Exemplo da Silva">
    <input type="hidden" name="csrf" value='abc123'>
    <input type="checkbox" checked name="aceite">
    <select name="pais"><option value="BR" selected>Brasil</option></select>
    <textarea name="carta">Meu CPF é 123.456.789-09</textarea>
    <div contenteditable="true">rascunho pessoal</div>
    <p>Contato: ANA.EXEMPLO@EXAMPLE.COM</p>
  </body></html>`;

  const limpo = sanitizarHtml(html, pii);

  it("remove scripts, valores, seleções e conteúdos editáveis", () => {
    expect(limpo).not.toMatch(/<script|segredo|<noscript/);
    expect(limpo).not.toContain("abc123");
    expect(limpo).not.toMatch(/\schecked|\sselected/);
    expect(limpo).toContain('<textarea name="carta"></textarea>');
    expect(limpo).toContain('<div contenteditable="true"></div>');
    expect(limpo).toContain('<option value="BR">Brasil</option>');
  });

  it("não deixa nenhuma PII", () => {
    for (const item of pii) expect(limpo.toLowerCase()).not.toContain(item.toLowerCase());
    expect(limpo).toContain("[REDACTED]");
  });

  it("redige texto sem diferenciar caixa e escapando regex", () => {
    expect(redigirPii("Fale com A.B (c)", ["a.b (c)"])).toBe("Fale com [REDACTED]");
    expect(redigirPii("nada", [""])).toBe("nada");
  });
});

import { describe, expect, it } from "vitest";
import { z } from "zod";
import { contemTermo, escaparRegex, normalizarTexto, paraKebab } from "./texto.ts";
import { validar } from "./validar.ts";
import { ErroOutbox, ErroTransicaoInvalida, ErroUsuario, ErroValidacao } from "./erros.ts";

describe("texto", () => {
  it.each([
    ["Node.js e React!", "node js e react"],
    ["  São   Paulo  ", "sao paulo"],
    ["C# e C++", "c# e c++"],
    ["Microsserviços", "microsservicos"],
  ])("normaliza %s", (entrada, esperado) => {
    expect(normalizarTexto(entrada)).toBe(esperado);
  });

  it("procura termos como sequência de palavras inteiras", () => {
    expect(contemTermo("trabalho com node js", "node js")).toBe(true);
    expect(contemTermo("trabalho com nodejs", "node")).toBe(false);
    expect(contemTermo("c# e java", "c")).toBe(false);
    expect(contemTermo("algo", "")).toBe(false);
  });

  it("gera kebab-case e escapa regex", () => {
    expect(paraKebab("Apache Kafka")).toBe("apache-kafka");
    expect(paraKebab("C#")).toBe("csharp");
    expect(escaparRegex("a.b*c")).toBe("a\\.b\\*c");
  });
});

describe("erros e validação", () => {
  it("converte ZodError em ErroValidacao com o caminho", () => {
    const schema = z.object({ pessoal: z.object({ nome: z.string() }) });
    expect(() => validar(schema, { pessoal: {} }, "master")).toThrow(ErroValidacao);
    try {
      validar(schema, { pessoal: {} }, "master");
    } catch (erro) {
      expect((erro as ErroValidacao).caminho).toBe("master.pessoal.nome");
    }
    expect(validar(schema, { pessoal: { nome: "x" } }, "master")).toEqual({
      pessoal: { nome: "x" },
    });
  });

  it("mantém nome, código e hierarquia", () => {
    const erro = new ErroUsuario("arquivo não encontrado");
    expect(erro).toBeInstanceOf(ErroOutbox);
    expect(erro.name).toBe("ErroUsuario");
    expect(erro.codigo).toBe("usuario");
    const transicao = new ErroTransicaoInvalida("ENVIADA", "PRONTA", []);
    expect(transicao.message).toContain("nenhuma");
  });
});

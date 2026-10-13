import { ZodError, z } from "zod";
import { describe, expect, it } from "vitest";
import { ErroTransicaoInvalida, ErroValidacao } from "./erros.ts";

describe("ErroValidacao", () => {
  it("sem caminho mostra só o detalhe", () => {
    expect(new ErroValidacao("", "valor ausente").message).toBe("valor ausente");
    expect(new ErroValidacao("perfil.cpf", "curto").message).toBe("perfil.cpf: curto");
  });

  it("deZod usa o primeiro problema e o caminho, ou um texto padrão", () => {
    const resultado = z.object({ cpf: z.string().min(11, "curto") }).safeParse({ cpf: "1" });
    expect(resultado.success).toBe(false);
    if (!resultado.success)
      expect(ErroValidacao.deZod(resultado.error, "perfil").message).toBe("perfil.cpf: curto");
    expect(ErroValidacao.deZod(new ZodError([]), "").message).toBe("valor inválido");
  });
});

describe("ErroTransicaoInvalida", () => {
  it("lista as transições aceitas ou diz que não há nenhuma", () => {
    expect(new ErroTransicaoInvalida("NOVA", "OFERTA", ["PRONTA"]).message).toBe(
      "transição NOVA → OFERTA não permitida. Aceitas a partir de NOVA: PRONTA",
    );
    expect(new ErroTransicaoInvalida("RECUSADA", "OFERTA", []).message).toContain("nenhuma");
  });
});

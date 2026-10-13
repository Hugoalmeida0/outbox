import { describe, expect, it } from "vitest";
import type { ChaveDocumento, ChavePadrao } from "./classificar-campo.ts";
import type { Contato } from "./pacote.ts";
import { formatarData, valorDocumento, valorPadrao } from "./valor-codigo.ts";

const contato: Contato = {
  nome: "Ana Exemplo da Silva",
  titulo: "Dev",
  email: "ana.exemplo@example.com",
  telefone: "+55 11 90000-0000",
  cidade: "São Paulo",
  uf: "SP",
  pais: "Brasil",
  linkedin: "https://www.linkedin.com/in/ana",
  github: "https://github.com/ana",
};

describe("valorPadrao", () => {
  it.each<[ChavePadrao, string | null]>([
    ["nome", "Ana Exemplo da Silva"],
    ["primeiroNome", "Ana"],
    ["sobrenome", "Exemplo da Silva"],
    ["email", "ana.exemplo@example.com"],
    ["telefone", "+55 11 90000-0000"],
    ["linkedin", "https://www.linkedin.com/in/ana"],
    ["github", "https://github.com/ana"],
    ["portfolio", "https://github.com/ana"],
    ["cidade", "São Paulo"],
    ["pais", "Brasil"],
  ])("%s → %s", (chave, esperado) => {
    expect(valorPadrao(chave, contato)).toBe(esperado);
  });

  it("sem os opcionais devolve null; portfólio próprio tem prioridade sobre o GitHub", () => {
    const minimo: Contato = {
      nome: "Ana",
      titulo: "",
      email: "a@x.com",
      telefone: "1",
      cidade: "SP",
      pais: "BR",
    };
    expect(valorPadrao("sobrenome", minimo)).toBeNull();
    expect(valorPadrao("linkedin", minimo)).toBeNull();
    expect(valorPadrao("github", minimo)).toBeNull();
    expect(valorPadrao("portfolio", minimo)).toBeNull();
    expect(valorPadrao("portfolio", { ...contato, portfolio: "https://ana.dev" })).toBe(
      "https://ana.dev",
    );
  });
});

describe("valorDocumento", () => {
  const documentos = { cpf: "123.456.789-09", rg: "12.345.678-9", dataNascimento: "1995-06-15" };
  const endereco = {
    logradouro: "Rua Exemplo",
    numero: "100",
    complemento: "Ap 1",
    bairro: "Centro",
    cidade: "São Paulo",
    cep: "01000-000",
    pais: "Brasil",
  };

  it.each<[ChaveDocumento, string]>([
    ["cpf", "123.456.789-09"],
    ["rg", "12.345.678-9"],
    ["dataNascimento", "15/06/1995"],
    ["logradouro", "Rua Exemplo"],
    ["numero", "100"],
    ["complemento", "Ap 1"],
    ["bairro", "Centro"],
    ["cep", "01000-000"],
  ])("%s → %s", (chave, esperado) => {
    expect(valorDocumento(chave, "texto", documentos, endereco)).toBe(esperado);
  });

  it.each<ChaveDocumento>([
    "cpf",
    "rg",
    "dataNascimento",
    "logradouro",
    "numero",
    "complemento",
    "bairro",
    "cep",
  ])("%s ausente → null", (chave) => {
    expect(valorDocumento(chave, "texto", {}, { cidade: "SP", pais: "BR" })).toBeNull();
  });

  it("data no formato do campo: ISO para input date, dd/mm/aaaa para texto", () => {
    expect(valorDocumento("dataNascimento", "data", documentos, endereco)).toBe("1995-06-15");
    expect(formatarData("1995-06-15", "texto")).toBe("15/06/1995");
    expect(formatarData("1995", "texto")).toBe("//1995");
  });
});

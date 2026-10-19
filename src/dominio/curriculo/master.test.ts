import { describe, expect, it } from "vitest";
import { umMaster } from "#testes/apoio/builders.ts";
import { esquemaMaster } from "./master.ts";

describe("esquemaMaster: campos opcionais do currículo de 1 página", () => {
  it("aceita um master sem nenhum dos campos novos", () => {
    expect(esquemaMaster.safeParse(umMaster()).success).toBe(true);
  });

  it("aceita modalidade, contexto, mes, prioridadeCorte e nuncaListar", () => {
    const base = umMaster();
    const master = {
      ...base,
      pessoal: { ...base.pessoal, modalidade: "Remoto" },
      nuncaListar: ["PHP"],
      experiencias: base.experiencias.map((e) => ({ ...e, contexto: "Contexto", prioridadeCorte: 10 })),
      certificacoes: [
        { id: "cert-a", nome: "A", emissor: "Emissor", ano: 2024, mes: 5, prioridadeCorte: 3 },
      ],
    };
    expect(esquemaMaster.safeParse(master).success).toBe(true);
  });

  it.each([0, 11, 1.5])("rejeita prioridadeCorte %s", (valor) => {
    const base = umMaster();
    const master = {
      ...base,
      experiencias: base.experiencias.map((e) => ({ ...e, prioridadeCorte: valor })),
    };
    expect(esquemaMaster.safeParse(master).success).toBe(false);
  });

  it("rejeita mes fora de 1 a 12", () => {
    const master = {
      ...umMaster(),
      certificacoes: [{ id: "cert-a", nome: "A", emissor: "E", ano: 2024, mes: 13 }],
    };
    expect(esquemaMaster.safeParse(master).success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { criarLeitorVariaveis } from "./variaveis.ts";

describe("lerVariavel", () => {
  it("prefere CAMALEAO_<X> e não avisa", () => {
    const avisos: string[] = [];
    const ler = criarLeitorVariaveis({ CAMALEAO_LOG: "depurar", OUTBOX_LOG: "erro" }, (m) =>
      avisos.push(m),
    );
    expect(ler("LOG")).toBe("depurar");
    expect(avisos).toEqual([]);
  });

  it("cai em OUTBOX_<X> quando falta o novo, avisando uma vez por variável", () => {
    const avisos: string[] = [];
    const ler = criarLeitorVariaveis(
      { OUTBOX_LOG: "avisar", OUTBOX_CLAUDE_BIN: "falso.mjs", CAMALEAO_CLAUDE_BIN: "" },
      (m) => avisos.push(m),
    );
    expect(ler("LOG")).toBe("avisar");
    expect(ler("LOG")).toBe("avisar");
    expect(ler("CLAUDE_BIN")).toBe("falso.mjs");
    expect(avisos).toEqual([
      "OUTBOX_LOG está obsoleta; use CAMALEAO_LOG",
      "OUTBOX_CLAUDE_BIN está obsoleta; use CAMALEAO_CLAUDE_BIN",
    ]);
  });

  it("ausente nos dois nomes devolve undefined", () => {
    expect(criarLeitorVariaveis({}, () => undefined)("LOG")).toBeUndefined();
  });
});

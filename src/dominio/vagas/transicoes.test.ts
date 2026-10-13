import { describe, expect, it } from "vitest";
import { TRANSICOES_VALIDAS, validarTransicao } from "./transicoes.ts";
import { ErroTransicaoInvalida } from "../compartilhado/erros.ts";
import { TODOS_STATUS } from "./status.ts";

describe("validarTransicao", () => {
  it.each([
    ["NOVA", "PRONTA", {}],
    ["NOVA", "DESCARTADA", { motivo: "aderencia_baixa" }],
    ["ERRO_PREPARO", "ERRO_PREPARO", { motivo: "llm_falhou" }],
    ["PRONTA", "PRONTA", {}],
    ["PRONTA", "MANUAL", { motivo: "escolha_usuario" }],
    ["PULADA", "NOVA", {}],
    ["MANUAL", "ENVIADA", {}],
    ["ENVIADA", "EM_PROCESSO", { etapa: "tecnica" }],
    ["EM_PROCESSO", "EM_PROCESSO", { etapa: "final" }],
    ["PENDENTE_TESTE", "RECUSADA", {}],
  ] as const)("aceita %s → %s", (de, para, opcoes) => {
    expect(() => validarTransicao(de, para, opcoes)).not.toThrow();
  });

  it.each([
    ["NOVA", "ENVIADA", {}, "não permitida"],
    ["DESCARTADA", "PRONTA", {}, "não permitida"],
    ["NOVA", "DESCARTADA", {}, "exige motivo"],
    ["NOVA", "DESCARTADA", { motivo: "url_ja_enviada" }, "inválido"],
    ["PRONTA", "ENVIADA", { motivo: "manual" }, "não aceita motivo"],
    ["ENVIADA", "EM_PROCESSO", {}, "exige etapa"],
    ["ENVIADA", "EM_PROCESSO", { etapa: "inventada" }, "exige etapa"],
  ] as const)("recusa %s → %s (%s)", (de, para, opcoes, trecho) => {
    expect(() => validarTransicao(de, para, opcoes)).toThrow(ErroTransicaoInvalida);
    expect(() => validarTransicao(de, para, opcoes)).toThrow(trecho);
  });

  it("informa as transições aceitas no erro", () => {
    try {
      validarTransicao("ENVIADA", "PRONTA");
      expect.fail("deveria lançar");
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroTransicaoInvalida);
      expect((erro as ErroTransicaoInvalida).aceitas).toEqual([
        "EM_PROCESSO",
        "OFERTA",
        "RECUSADA",
      ]);
    }
  });

  it("define transições para todos os status", () => {
    expect(Object.keys(TRANSICOES_VALIDAS).sort()).toEqual([...TODOS_STATUS].sort());
  });
});

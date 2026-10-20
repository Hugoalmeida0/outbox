import { describe, expect, it } from "vitest";
import { TRANSICOES_VALIDAS, transicionar, validarTransicao } from "./transicoes.ts";
import type { IdVaga } from "../vaga.ts";
import { ErroTransicaoInvalida } from "#dominio/compartilhado/erros.ts";
import { TODOS_STATUS } from "../status.ts";

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

describe("transicionar", () => {
  it("recusa transição inválida antes de chegar ao repositório", () => {
    expect(() => transicionar({ status: "ENVIADA", enviadaEm: "x" }, "PRONTA")).toThrow(
      ErroTransicaoInvalida,
    );
  });

  it("registra o envio só na primeira saída para o ATS", () => {
    expect(transicionar({ status: "PRONTA", enviadaEm: null }, "ENVIADA").registraEnvio).toBe(true);
    expect(
      transicionar({ status: "PRONTA", enviadaEm: null }, "PENDENTE_TESTE").registraEnvio,
    ).toBe(true);
    expect(
      transicionar({ status: "PENDENTE_TESTE", enviadaEm: "2026-01-01" }, "ENVIADA").registraEnvio,
    ).toBe(false);
  });

  it("guarda a etapa na vaga só em EM_PROCESSO, mas sempre no evento", () => {
    const emProcesso = transicionar({ status: "ENVIADA", enviadaEm: "x" }, "EM_PROCESSO", {
      etapa: "tecnica",
      nota: "entrevista",
    });
    expect(emProcesso).toMatchObject({
      etapa: "tecnica",
      etapaAtual: "tecnica",
      nota: "entrevista",
    });
    const oferta = transicionar({ status: "ENVIADA", enviadaEm: "x" }, "OFERTA", {
      etapa: "final",
    });
    expect(oferta).toMatchObject({
      de: "ENVIADA",
      para: "OFERTA",
      etapa: "final",
      etapaAtual: null,
    });
  });

  it("leva motivo e duplicadaDe para a gravação", () => {
    const t = transicionar({ status: "NOVA", enviadaEm: null }, "DESCARTADA", {
      motivo: "duplicada_antiga",
      duplicadaDe: 7 as IdVaga,
    });
    expect(t).toMatchObject({ motivo: "duplicada_antiga", duplicadaDe: 7, nota: null });
  });
});

import { describe, expect, it } from "vitest";
import { umaAnalise, umMaster, umPerfil } from "#testes/apoio/builders.ts";
import { ALERTA_AFIRMATIVA, calcularAderencia, recalcularComGaps } from "./aderencia.ts";
import { gruposDoPerfil, idadeEm } from "./grupos.ts";
import { gapsDaAnalise, sanearAnalise } from "./validar-analise.ts";
import type { Requisito } from "./analise-vaga.ts";

const perfil = umPerfil();
const HOJE = "2026-10-10";

function calcular(
  analise = umaAnalise(),
  diversidade = perfil.diversidade,
  nascimento = perfil.documentos.dataNascimento,
) {
  return calcularAderencia(analise, perfil.preferencias, diversidade, nascimento, HOJE);
}

const req = (status: Requisito["status"], obrigatorio = true): Requisito => ({
  texto: "x",
  termo: `t-${status}-${String(obrigatorio)}`,
  obrigatorio,
  status,
  evidencias: [],
});

describe("calcularAderencia", () => {
  it("dá 100 quando tudo casa", () => {
    expect(calcular()).toMatchObject({
      score: 100,
      detalhes: { cobertura: 60, senioridade: 15, modeloLocalidade: 15, regime: 10 },
    });
  });

  it("cobertura considera só obrigatórios e meio ponto para parciais", () => {
    const analise = umaAnalise({
      requisitos: [req("coberto"), req("parcial"), req("ausente"), req("ausente", false)],
    });
    expect(calcular(analise).detalhes.cobertura).toBe(30);
  });

  it("cobertura usa todos quando não há obrigatórios e vale 60 sem requisitos", () => {
    expect(
      calcular(umaAnalise({ requisitos: [req("coberto", false), req("ausente", false)] })).detalhes
        .cobertura,
    ).toBe(30);
    expect(calcular(umaAnalise({ requisitos: [] })).detalhes.cobertura).toBe(60);
  });

  it.each([
    ["nao_informada", 15],
    ["senior", 15],
    ["especialista", 7],
    ["junior", 7],
    ["estagio", 0],
  ] as const)("senioridade %s vale %i", (senioridade, pontos) => {
    expect(calcular(umaAnalise({ senioridade })).detalhes.senioridade).toBe(pontos);
  });

  it.each([
    [{ modelo: "nao_informado" }, 15],
    [{ modelo: "remoto" }, 15],
    [{ modelo: "hibrido", cidade: "são paulo" }, 15],
    [{ modelo: "hibrido", cidade: "Recife" }, 0],
    [{ modelo: "hibrido" }, 0],
    [{ modelo: "presencial", cidade: "São Paulo" }, 0],
  ] as const)("modelo %o vale %i", (campos, pontos) => {
    expect(calcular(umaAnalise(campos)).detalhes.modeloLocalidade).toBe(pontos);
  });

  it.each([
    ["nao_informado", 10],
    ["pj", 10],
    ["contractor", 0],
  ] as const)("regime %s vale %i", (regime, pontos) => {
    expect(calcular(umaAnalise({ regime })).detalhes.regime).toBe(pontos);
  });

  it("elimina afirmativa exclusiva fora dos grupos quando o perfil informa", () => {
    const analise = umaAnalise({ afirmativa: { exclusiva: true, grupos: ["pessoas_negras"] } });
    expect(calcular(analise, { genero: "mulher_cis", raca: "branca" })).toMatchObject({
      score: 0,
      eliminacao: "afirmativa_inelegivel",
    });
  });

  it("não elimina e alerta quando falta dado no perfil", () => {
    const analise = umaAnalise({ afirmativa: { exclusiva: true, grupos: ["pessoas_negras"] } });
    const r = calcular(analise, { genero: "mulher_cis" });
    expect(r.eliminacao).toBeUndefined();
    expect(r.alertas).toEqual([ALERTA_AFIRMATIVA]);
  });

  it("não elimina quando o perfil pertence a algum grupo", () => {
    const analise = umaAnalise({ afirmativa: { exclusiva: true, grupos: ["mulheres", "pcd"] } });
    expect(calcular(analise).score).toBe(100);
  });

  it("recalcula com gaps confirmados", () => {
    const analise = umaAnalise({
      requisitos: [
        { texto: "Kafka", termo: "Kafka", obrigatorio: true, status: "ausente", evidencias: [] },
      ],
    });
    expect(calcular(analise).detalhes.cobertura).toBe(0);
    expect(calcular(recalcularComGaps(analise, new Set(["kafka"]))).detalhes.cobertura).toBe(60);
  });
});

describe("grupos e idade", () => {
  it("calcula idade considerando o aniversário", () => {
    expect(idadeEm("1976-10-11", "2026-10-10")).toBe(49);
    expect(idadeEm("1976-10-10", "2026-10-10")).toBe(50);
    expect(idadeEm("inválida", "2026-10-10")).toBe(0);
  });

  it("deriva grupos do perfil", () => {
    expect(
      [
        ...gruposDoPerfil(
          { genero: "mulher_trans", raca: "parda", pcd: true, lgbtqia: true },
          "1970-01-01",
          HOJE,
        ),
      ].sort(),
    ).toEqual(["lgbtqia", "mulheres", "pcd", "pessoas_50_mais", "pessoas_negras"]);
    expect([...gruposDoPerfil({ raca: "indigena" }, undefined, HOJE)]).toEqual(["indigenas"]);
    expect(gruposDoPerfil(undefined, undefined, HOJE).size).toBe(0);
  });
});

describe("sanearAnalise e gapsDaAnalise", () => {
  const master = umMaster();

  it("marca como ausente requisito com evidência inexistente", () => {
    const analise = umaAnalise({
      requisitos: [
        {
          texto: "Go",
          termo: "Go",
          obrigatorio: true,
          status: "coberto",
          evidencias: ["go-inventado"],
        },
      ],
    });
    expect(sanearAnalise(analise, master).requisitos[0]).toMatchObject({
      status: "ausente",
      evidencias: [],
    });
  });

  it("lista gaps ausentes, normalizados, sem repetidos nem negados", () => {
    const analise = umaAnalise({
      requisitos: [
        { texto: "Kafka", termo: "Kafka", obrigatorio: true, status: "ausente", evidencias: [] },
        {
          texto: "Kafka streams",
          termo: "kafka",
          obrigatorio: false,
          status: "ausente",
          evidencias: [],
        },
        { texto: "Go", termo: "Go", obrigatorio: true, status: "ausente", evidencias: [] },
        { texto: "React", termo: "React", obrigatorio: true, status: "coberto", evidencias: [] },
      ],
    });
    expect(gapsDaAnalise(analise, ["go"])).toEqual([{ termo: "Kafka", termoNormalizado: "kafka" }]);
  });
});

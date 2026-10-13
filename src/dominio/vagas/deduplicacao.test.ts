import { describe, expect, it } from "vitest";
import { umaVaga } from "#testes/apoio/builders.ts";
import { decidirDeduplicacaoChave, decidirDeduplicacaoUrl } from "./deduplicacao.ts";
import { chaveDedup, normalizarCargo } from "./chave.ts";
import type { IdVaga } from "./vaga.ts";

const id = (n: number): IdVaga => n as IdVaga;

describe("decidirDeduplicacaoUrl", () => {
  it.each([
    [null, "criar"],
    ["NOVA", "ignorar_na_fila"],
    ["PRONTA", "ignorar_na_fila"],
    ["ERRO_PREPARO", "ignorar_na_fila"],
    ["ENVIADA", "criar_duplicada"],
    ["PENDENTE_TESTE", "criar_duplicada"],
    ["OFERTA", "criar_duplicada"],
    ["PULADA", "reabrir"],
    ["DESCARTADA", "reabrir"],
    ["MANUAL", "ignorar_status"],
    ["DUPLICADA", "ignorar_status"],
  ] as const)("existente %s → %s", (status, tipo) => {
    const existente = status === null ? null : umaVaga({ id: id(10), status });
    expect(decidirDeduplicacaoUrl(existente).tipo).toBe(tipo);
  });
});

describe("decidirDeduplicacaoChave", () => {
  it("descarta a pendente mais antiga quando a chave coincide", () => {
    const x = umaVaga({ id: id(2), publicadaEm: "2026-10-05" });
    const y = umaVaga({ id: id(1), status: "PRONTA", publicadaEm: "2026-09-01" });
    expect(decidirDeduplicacaoChave(x, [y])).toEqual([
      { tipo: "descartar", id: id(1), duplicadaDe: id(2) },
    ]);
  });

  it("descarta a nova quando ela é a mais antiga", () => {
    const x = umaVaga({ id: id(3), publicadaEm: "2026-08-01" });
    const y = umaVaga({ id: id(1), status: "NOVA", publicadaEm: "2026-09-01" });
    expect(decidirDeduplicacaoChave(x, [y])).toEqual([
      { tipo: "descartar", id: id(3), duplicadaDe: id(1) },
    ]);
  });

  it("aplica o repost de vaga já enviada", () => {
    const x = umaVaga({ id: id(4), publicadaEm: "2026-10-05" });
    const y = umaVaga({ id: id(1), status: "ENVIADA", publicadaEm: "2026-09-01" });
    expect(decidirDeduplicacaoChave(x, [y])).toEqual([]);
  });

  it("aplica o repost quando falta data de publicação", () => {
    const x = umaVaga({ id: id(4) });
    const y = umaVaga({ id: id(1), status: "EM_PROCESSO", publicadaEm: "2026-09-01" });
    expect(decidirDeduplicacaoChave(x, [y])).toEqual([]);
  });

  it("descarta a nova mais antiga que a enviada", () => {
    const x = umaVaga({ id: id(5), publicadaEm: "2026-08-01" });
    const y = umaVaga({ id: id(1), status: "ENVIADA", publicadaEm: "2026-09-01" });
    expect(decidirDeduplicacaoChave(x, [y])).toEqual([
      { tipo: "descartar", id: id(5), duplicadaDe: id(1) },
    ]);
  });

  it("ignora puladas, descartadas, manuais e duplicadas", () => {
    const x = umaVaga({ id: id(6) });
    const outras = (["PULADA", "DESCARTADA", "MANUAL", "DUPLICADA"] as const).map((status, i) =>
      umaVaga({ id: id(20 + i), status, publicadaEm: "2030-01-01" }),
    );
    expect(decidirDeduplicacaoChave(x, outras)).toEqual([]);
  });

  it("desempata datas iguais pelo id mais novo", () => {
    const x = umaVaga({ id: id(9), adicionadaEm: "2026-10-01T10:00:00-03:00" });
    const y = umaVaga({ id: id(8), status: "NOVA", adicionadaEm: "2026-10-01T10:00:00-03:00" });
    expect(decidirDeduplicacaoChave(x, [y])).toEqual([
      { tipo: "descartar", id: id(8), duplicadaDe: id(9) },
    ]);
  });
});

describe("chaveDedup", () => {
  it.each([
    ["Desenvolvedor(a) Backend", "desenvolvedor backend"],
    ["Desenvolvedor/a Sênior", "desenvolvedor senior"],
    ["Software Engineer (m/f/d)", "software engineer"],
    ["Engenheira de Dados (todos os gêneros)", "engenheira de dados"],
  ])("normaliza o cargo %s", (cargo, esperado) => {
    expect(normalizarCargo(cargo)).toBe(esperado);
  });

  it("combina empresa, cargo e localidade", () => {
    expect(chaveDedup("Nubank", "Desenvolvedor(a) Sênior", "São Paulo")).toBe(
      "nubank|desenvolvedor senior|sao paulo",
    );
    expect(chaveDedup("Nubank", "Dev", null)).toBe("nubank|dev|");
  });
});

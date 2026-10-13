import { describe, expect, it } from "vitest";
import type { GrupoAfirmativo } from "./analise-vaga.ts";
import { gruposDoPerfil, idadeEm, perfilInformaGrupo } from "./grupos.ts";

describe("idadeEm", () => {
  it("conta o aniversário só quando ele já passou no ano", () => {
    expect(idadeEm("1976-06-15", "2026-06-14")).toBe(49);
    expect(idadeEm("1976-06-15", "2026-06-15")).toBe(50);
    expect(idadeEm("1976-06-15", "2026-07-01T10:00:00-03:00")).toBe(50);
    expect(idadeEm("1976-12-31", "2026-01-01")).toBe(49);
  });

  it("data inválida conta como 0", () => {
    expect(idadeEm("sem-data", "2026-10-10")).toBe(0);
    expect(idadeEm("1976-06", "2026-10-10")).toBe(0);
  });
});

describe("gruposDoPerfil", () => {
  it("deriva todos os grupos do perfil", () => {
    expect(
      [
        ...gruposDoPerfil(
          { genero: "mulher_trans", raca: "parda", pcd: true, lgbtqia: true },
          "1970-01-01",
          "2026-10-10",
        ),
      ].sort(),
    ).toEqual(["lgbtqia", "mulheres", "pcd", "pessoas_50_mais", "pessoas_negras"]);
    expect(
      [
        ...gruposDoPerfil({ genero: "mulher_cis", raca: "indigena" }, undefined, "2026-10-10"),
      ].sort(),
    ).toEqual(["indigenas", "mulheres"]);
    expect([...gruposDoPerfil({ raca: "preta" }, "2000-01-01", "2026-10-10")]).toEqual([
      "pessoas_negras",
    ]);
    expect(gruposDoPerfil(undefined, undefined, "2026-10-10").size).toBe(0);
    expect(
      gruposDoPerfil(
        { genero: "homem_cis", raca: "branca", pcd: false, lgbtqia: false },
        undefined,
        "2026-10-10",
      ).size,
    ).toBe(0);
  });
});

describe("perfilInformaGrupo", () => {
  it.each<[GrupoAfirmativo, boolean, boolean]>([
    ["mulheres", true, false],
    ["pessoas_negras", true, false],
    ["indigenas", true, false],
    ["pcd", true, false],
    ["lgbtqia", true, false],
    ["pessoas_50_mais", true, false],
    ["outro", false, false],
  ])("%s: informado=%s, vazio=%s", (grupo, comDado, semDado) => {
    expect(
      perfilInformaGrupo(
        grupo,
        { genero: "homem_cis", raca: "branca", pcd: false, lgbtqia: false },
        "1990-01-01",
      ),
    ).toBe(comDado);
    expect(perfilInformaGrupo(grupo, {}, undefined)).toBe(semDado);
  });
});

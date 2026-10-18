import { describe, expect, it } from "vitest";
import { normalizarEmpresa } from "./vaga-extraida.ts";

describe("normalizarEmpresa", () => {
  it.each([
    ["Stone - Linkedin", "Stone"],
    ["Blip Global ", "Blip Global"],
    ["Acme (Indeed)", "Acme"],
    ["Acme | Vagas.com", "Acme"],
    ["  CI&T  ", "CI&T"],
    ["Linkedin", "Linkedin"],
    ["Jobsity", "Jobsity"],
    ["Grupo  Boticário", "Grupo Boticário"],
  ])("%s vira %s", (nome, esperado) => {
    expect(normalizarEmpresa(nome)).toBe(esperado);
  });
});

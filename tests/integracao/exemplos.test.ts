import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { esquemaMaster } from "#dominio/curriculo/master.ts";
import { esquemaPerfil } from "#dominio/respostas/perfil.ts";
import { esquemaBancoRespostas } from "#dominio/respostas/banco.ts";
import { esquemaGapsNegados } from "#dominio/analise/gaps.ts";

function lerExemplo(nome: string): unknown {
  return parse(readFileSync(new URL(`../../curriculo.exemplo/${nome}`, import.meta.url), "utf8"));
}

describe("curriculo.exemplo", () => {
  it.each([
    ["master.yaml", esquemaMaster],
    ["perfil.yaml", esquemaPerfil],
    ["respostas.yaml", esquemaBancoRespostas],
    ["gaps.yaml", esquemaGapsNegados],
  ] as const)("%s valida no schema", (arquivo, schema) => {
    const resultado = schema.safeParse(lerExemplo(arquivo));
    expect(resultado.success, JSON.stringify(resultado.error?.issues)).toBe(true);
  });

  it("master acusa ids duplicados e skills inexistentes", () => {
    const master = lerExemplo("master.yaml") as {
      skills: { id: string }[];
      experiencias: { bullets: { skills: string[] }[] }[];
    };
    const duplicado = { ...master, skills: [...master.skills, master.skills[0]] };
    expect(esquemaMaster.safeParse(duplicado).success).toBe(false);
    const referenciaQuebrada = structuredClone(master);
    referenciaQuebrada.experiencias[0]!.bullets[0]!.skills = ["inexistente"];
    expect(esquemaMaster.safeParse(referenciaQuebrada).success).toBe(false);
  });
});

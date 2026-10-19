// Regras R7 a R11 do lastro e a normalização de números (R4 e R9).
import { describe, expect, it } from "vitest";
import { umaAnalise, umCurriculoGerado, umMaster } from "#testes/apoio/builders.ts";
import { validarLastro } from "./lastro.ts";
import { aplicarNuncaListar, paraPrompt } from "./nunca-listar.ts";
import { normalizarNumero, numerosDe } from "./numeros.ts";

const master = umMaster();
const analise = umaAnalise();

function comBullet(texto: string, origem = ["exp-aurora-b1"]) {
  const base = umCurriculoGerado();
  return {
    ...base,
    experiencias: [{ id: "exp-aurora", bullets: [{ texto, origem }] }, base.experiencias[1]!],
  };
}

function regras(gerado = umCurriculoGerado(), m = master): string[] {
  return validarLastro(gerado, m, analise).map((v) => v.regra);
}

describe("R7: placeholders", () => {
  it.each(["[QUANTIFICAR]", "TODO", "XX%", "lorem ipsum", "Lorem"])("rejeita %s", (placeholder) => {
    expect(regras(comBullet(`Liderei a migração ${placeholder} de serviços.`))).toContain("R7");
    expect(regras({ ...umCurriculoGerado(), resumo: `Desenvolvedora ${placeholder}.` })).toContain("R7");
  });

  it("não confunde a palavra 'todo' do português com TODO", () => {
    const gerado = comBullet("Liderei a migração de todo o fluxo de pagamentos em todo o monólito.");
    expect(regras(gerado)).not.toContain("R7");
    expect(regras({ ...umCurriculoGerado(), resumo: "Atuo em todo o ciclo de vida." })).toEqual([]);
  });
});

describe("R8: primeira pessoa explícita", () => {
  it.each(["Eu liderei a migração.", "I led the migration.", "  eu liderei."])("rejeita %s", (texto) => {
    expect(regras(comBullet(texto))).toContain("R8");
  });

  it("aceita verbo no passado e palavras que começam com 'i' ou 'eu'", () => {
    expect(regras(comBullet("Liderei a migração."))).toEqual([]);
    expect(regras(comBullet("Implementei integrações e euforia de testes."))).toEqual([]);
  });
});

describe("R9: números no título e no resumo", () => {
  it("rejeita número que não consta do texto do master", () => {
    const v = validarLastro({ ...umCurriculoGerado(), resumo: "Mais de 10 anos de experiência." }, master, analise);
    expect(v).toEqual([{ regra: "R9", detalhe: 'número "10" sem lastro em resumo' }]);
    expect(regras({ ...umCurriculoGerado(), titulo: "Desenvolvedora 10x" })).toContain("R9");
  });

  it("aceita números do master em outra grafia", () => {
    const m = umMaster({ resumo: "Atendi 1.497 clientes com 98,34% de satisfação e 50% a 80% de ganho." });
    const gerado = {
      ...umCurriculoGerado(),
      resumo: "Atendi 1497 clientes, 98.34% de satisfação, ganho de 50–80%.",
    };
    expect(regras(gerado, m)).toEqual([]);
  });
});

describe("R10: dados que não pertencem ao currículo", () => {
  it.each([
    "CPF 123.456.789-09",
    "CEP 29010-120",
    "Data de nascimento: 01/01/1990",
    "Estado civil: solteira",
    "casado",
  ])("rejeita %s", (texto) => {
    expect(regras({ ...umCurriculoGerado(), resumo: texto })).toContain("R10");
    expect(regras(comBullet(`Liderei ${texto}.`))).toContain("R10");
  });
});

describe("R11: nuncaListar", () => {
  const comNunca = umMaster({ nuncaListar: ["Node.js"] });

  it("rejeita o termo proibido no resumo, no título e nos bullets", () => {
    const base = umCurriculoGerado();
    expect(regras({ ...base, resumo: "Especialista em Node.js." }, comNunca)).toContain("R11");
    expect(regras({ ...base, titulo: "Desenvolvedora Node.js" }, comNunca)).toContain("R11");
    expect(
      regras(comBullet("Liderei a migração de 12 serviços Node.js para TypeScript, reduzindo incidentes em 40%."), comNunca),
    ).toContain("R11");
  });

  it("não acusa quando o termo não aparece", () => {
    expect(regras(umCurriculoGerado(), umMaster({ nuncaListar: ["PHP"] }))).toEqual([]);
  });
});

describe("normalização de números", () => {
  it.each([
    ["1.497", "1497"],
    ["1,497", "1497"],
    ["1.000.000", "1000000"],
    ["98,34", "98.34"],
    ["98.34", "98.34"],
    ["1.497,50", "1497.50"],
    ["1,497.50", "1497.50"],
    ["70", "70"],
    ["0,500", "0.500"],
    ["2,5", "2.5"],
  ])("%s vira %s", (entrada, esperado) => {
    expect(normalizarNumero(entrada)).toBe(esperado);
  });

  it("separa faixas e ignora %, ~ e +", () => {
    expect(numerosDe("50% a 80%")).toEqual(["50", "80"]);
    expect(numerosDe("50–80%")).toEqual(["50", "80"]);
    expect(numerosDe("~70 e +300, 1.497 itens.")).toEqual(["70", "300", "1497"]);
  });
});

describe("aplicarNuncaListar", () => {
  it("devolve o mesmo master quando não há termos", () => {
    expect(aplicarNuncaListar(master)).toBe(master);
  });

  it("remove a skill (por id, nome ou alias), as referências a ela e expande os termos proibidos", () => {
    const filtrado = aplicarNuncaListar(umMaster({ nuncaListar: ["ts"] }));
    expect(filtrado.skills.map((s) => s.id)).not.toContain("typescript");
    for (const e of filtrado.experiencias) {
      for (const b of e.bullets) expect(b.skills).not.toContain("typescript");
    }
    expect(filtrado.nuncaListar).toEqual(["ts", "TypeScript", "TS"]);
  });

  it("paraPrompt remove o campo nuncaListar", () => {
    const filtrado = aplicarNuncaListar(umMaster({ nuncaListar: ["PHP"] }));
    expect(paraPrompt(filtrado)).not.toHaveProperty("nuncaListar");
  });
});

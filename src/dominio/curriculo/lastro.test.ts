import { describe, expect, it } from "vitest";
import { umaAnalise, umCurriculoGerado, umMaster } from "#testes/apoio/builders.ts";
import { validarLastro } from "./lastro.ts";

const master = umMaster();
const analise = umaAnalise();

function regras(gerado = umCurriculoGerado()): string[] {
  return validarLastro(gerado, master, analise).map((v) => v.regra);
}

describe("validarLastro", () => {
  it("aprova um currículo com lastro completo", () => {
    expect(validarLastro(umCurriculoGerado(), master, analise)).toEqual([]);
  });

  it("R1: exige todas as experiências do master, sem extras, com bullets", () => {
    const base = umCurriculoGerado();
    expect(regras({ ...base, experiencias: base.experiencias.slice(0, 1) })).toContain("R1");
    expect(
      regras({ ...base, experiencias: [...base.experiencias, { id: "exp-falsa", bullets: [{ texto: "x", origem: [] }] }] }),
    ).toContain("R1");
    expect(
      regras({ ...base, experiencias: [{ id: "exp-aurora", bullets: [] }, base.experiencias[1]!] }),
    ).toContain("R1");
  });

  it("R2: exige origem não vazia e do mesmo item", () => {
    const base = umCurriculoGerado();
    const semOrigem = { ...base, experiencias: [{ id: "exp-aurora", bullets: [{ texto: "Fiz algo.", origem: [] }] }, base.experiencias[1]!] };
    expect(regras(semOrigem)).toEqual(["R2"]);
    const outraExperiencia = {
      ...base,
      experiencias: [{ id: "exp-aurora", bullets: [{ texto: "Checkout em React.", origem: ["exp-horizonte-b1"] }] }, base.experiencias[1]!],
    };
    expect(regras(outraExperiencia)).toEqual(["R2"]);
  });

  it("R3: rejeita skills fora do master", () => {
    expect(regras({ ...umCurriculoGerado(), skills: ["typescript", "kafka"] })).toEqual(["R3"]);
  });

  it("R4: rejeita números que não estão na origem", () => {
    const base = umCurriculoGerado();
    const inflado = {
      ...base,
      experiencias: [
        { id: "exp-aurora", bullets: [{ texto: "Migrei 30 serviços, reduzindo incidentes em 40%.", origem: ["exp-aurora-b1"] }] },
        base.experiencias[1]!,
      ],
    };
    expect(validarLastro(inflado, master, analise)).toEqual([{ regra: "R4", detalhe: 'número "30" sem lastro em exp-aurora' }]);
  });

  it("R4: compara números sem separadores de milhar", () => {
    const m = umMaster({
      experiencias: [
        { id: "exp-a", empresa: "A", cargo: "Dev", inicio: "2020-01", fim: null, bullets: [{ id: "exp-a-b1", texto: "Atendi 1000 clientes.", skills: [] }] },
      ],
    });
    const gerado = umCurriculoGerado({ experiencias: [{ id: "exp-a", bullets: [{ texto: "Atendi 1.000 clientes.", origem: ["exp-a-b1"] }] }] });
    expect(validarLastro(gerado, m, analise)).toEqual([]);
  });

  it("R5: rejeita tecnologia da vaga sem lastro, em bullet, título ou resumo", () => {
    const base = umCurriculoGerado();
    const comKafka = {
      ...base,
      titulo: "Desenvolvedora Kafka",
      resumo: "Experiência com Kafka.",
      experiencias: [
        { id: "exp-aurora", bullets: [{ texto: "Migrei 12 serviços Node.js para Kafka.", origem: ["exp-aurora-b1"] }] },
        base.experiencias[1]!,
      ],
    };
    const v = validarLastro(comKafka, master, analise);
    expect(v.map((x) => x.regra)).toEqual(["R5", "R5", "R5"]);
  });

  it("R5: aceita aliases do master e ignora práticas e domínios", () => {
    const base = umCurriculoGerado();
    const ok = { ...base, resumo: "Desenvolvedora TS com microsserviços." };
    const analiseTs = umaAnalise({ keywords: [{ termo: "TS", tipo: "tecnologia" }, { termo: "microsserviços", tipo: "pratica" }] });
    expect(validarLastro(ok, master, analiseTs)).toEqual([]);
  });

  it("R6: rejeita projetos, formação e certificações inexistentes", () => {
    const gerado = umCurriculoGerado({
      projetos: [{ id: "proj-falso", bullets: [] }],
      formacao: ["form-falsa"],
      certificacoes: ["cert-falsa"],
    });
    expect(regras(gerado)).toEqual(["R6", "R6", "R6"]);
  });

  it("valida bullets de projetos existentes", () => {
    const gerado = umCurriculoGerado({
      projetos: [{ id: "proj-financas", bullets: [{ texto: "Frontend em React.", origem: ["proj-financas-b1"] }] }],
    });
    expect(validarLastro(gerado, master, analise)).toEqual([]);
  });

  it("acusa experiência repetida", () => {
    const base = umCurriculoGerado();
    expect(regras({ ...base, experiencias: [...base.experiencias, base.experiencias[0]!] })).toContain("R1");
  });
});

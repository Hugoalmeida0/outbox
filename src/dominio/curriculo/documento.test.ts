import { describe, expect, it } from "vitest";
import { umCurriculoGerado, umMaster } from "#testes/apoio/builders.ts";
import { formatarPeriodo, montarCarta, montarDocumento, paraTexto } from "./documento.ts";
import { nomeArquivo } from "./nome-arquivo.ts";
import { scoreAts } from "./score-ats.ts";

const master = umMaster();

describe("montarDocumento", () => {
  it("monta o master genérico com todas as seções, em ordem cronológica reversa", () => {
    const doc = montarDocumento(master, null, "pt");
    expect(doc.secoes.map((s) => s.titulo)).toEqual([
      "Resumo",
      "Experiência",
      "Projetos",
      "Formação",
      "Certificações",
      "Competências",
      "Idiomas",
    ]);
    const exp = doc.secoes.find((s) => s.tipo === "experiencia");
    expect(exp?.tipo === "experiencia" && exp.itens.map((i) => i.empresa)).toEqual(["Fintech Aurora", "Loja Horizonte"]);
    expect(doc.contato).toEqual([
      "São Paulo/SP",
      "ana.exemplo@example.com",
      "+55 11 90000-0000",
      "https://www.linkedin.com/in/ana-exemplo",
      "https://github.com/ana-exemplo",
    ]);
  });

  it("puxa empresa, cargo e datas do master e só traduz o cargo em outro idioma", () => {
    const gerado = umCurriculoGerado({
      experiencias: [
        { id: "exp-aurora", cargoTraducao: "Senior Developer", bullets: [{ texto: "Led migration.", origem: ["exp-aurora-b1"] }] },
        { id: "exp-horizonte", cargoTraducao: "Mid-level Developer", bullets: [{ texto: "Built checkout.", origem: ["exp-horizonte-b1"] }] },
      ],
    });
    const pt = montarDocumento(master, gerado, "pt");
    const en = montarDocumento(master, gerado, "en");
    const itensPt = pt.secoes.find((s) => s.tipo === "experiencia");
    const itensEn = en.secoes.find((s) => s.tipo === "experiencia");
    expect(itensPt?.tipo === "experiencia" && itensPt.itens[0]?.cargo).toBe("Desenvolvedora Sênior");
    expect(itensEn?.tipo === "experiencia" && itensEn.itens[0]).toMatchObject({
      cargo: "Senior Developer",
      empresa: "Fintech Aurora",
      periodo: "Mar 2022 – Present",
      bullets: ["Led migration."],
    });
    expect(en.secoes.map((s) => s.titulo)).toContain("Skills");
    expect(paraTexto(en)).toContain("English — Advanced");
  });

  it("usa a formação do master quando o gerado não lista nenhuma", () => {
    const doc = montarDocumento(master, umCurriculoGerado({ formacao: [] }), "pt");
    expect(paraTexto(doc)).toContain("Ciência da Computação — Universidade de São Paulo");
  });

  it("agrupa skills do gerado por categoria na ordem de relevância", () => {
    const doc = montarDocumento(master, umCurriculoGerado({ skills: ["react", "typescript", "nodejs"] }), "pt");
    const comp = doc.secoes.find((s) => s.tipo === "competencias");
    expect(comp?.tipo === "competencias" && comp.grupos).toEqual([
      { categoria: "Frameworks", itens: ["React", "Node.js"] },
      { categoria: "Linguagens", itens: ["TypeScript"] },
    ]);
  });
});

describe("formatação", () => {
  it.each([
    ["2022-03", null, "pt", "mar/2022 – atual"],
    ["2019-01", "2022-02", "pt", "jan/2019 – fev/2022"],
    ["2022-03", null, "en", "Mar 2022 – Present"],
  ] as const)("período %s–%s em %s", (inicio, fim, idioma, esperado) => {
    expect(formatarPeriodo(inicio, fim, idioma)).toBe(esperado);
  });

  it.each([
    ["Ana Exemplo da Silva", "CV", "Ana_Silva_CV.pdf"],
    ["José Ávila", "Carta", "Jose_Avila_Carta.pdf"],
    ["Madonna", "CV", "Madonna_CV.pdf"],
  ] as const)("nome de arquivo para %s", (nome, tipo, esperado) => {
    expect(nomeArquivo(nome, tipo)).toBe(esperado);
  });

  it("monta a carta em parágrafos com o cabeçalho do contato", () => {
    const carta = montarCarta({ ...master.pessoal }, "Olá.\n\nGostaria de participar.\n", "pt");
    expect(carta.paragrafos).toEqual(["Olá.", "Gostaria de participar."]);
    expect(carta.contato[0]).toBe("São Paulo/SP");
  });
});

describe("scoreAts", () => {
  it("conta keywords presentes, aceitando aliases do master", () => {
    const keywords = [
      { termo: "TS", tipo: "tecnologia" as const },
      { termo: "React", tipo: "tecnologia" as const },
      { termo: "Kafka", tipo: "tecnologia" as const },
      { termo: "C#", tipo: "tecnologia" as const },
    ];
    expect(scoreAts("Trabalho com TypeScript e ReactJS em C.", keywords, master)).toBe(50);
  });

  it("devolve null sem keywords", () => {
    expect(scoreAts("qualquer", [], master)).toBeNull();
  });
});

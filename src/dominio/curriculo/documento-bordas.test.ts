// Casos de borda do documento: master sem opcionais, tradução, projetos e itens que o LLM inventou.
import { describe, expect, it } from "vitest";
import { umCurriculoGerado, umMaster } from "#testes/apoio/builders.ts";
import { formatarPeriodo, linhaContato, montarDocumento, paraTexto } from "./documento.ts";
import { nomeArquivo } from "./nome-arquivo.ts";

describe("montarDocumento: bordas", () => {
  it("em inglês traduz idiomas e omite a descrição do projeto; ignora ids que não existem no master", () => {
    const master = umMaster({
      projetos: [
        {
          id: "proj-site",
          nome: "Site Pessoal",
          descricao: "Portfólio.",
          url: "https://ana.dev",
          skills: ["react"],
          bullets: [{ id: "proj-site-b1", texto: "Feito em React." }],
        },
      ],
      formacao: [
        { id: "form-pos", instituicao: "FIAP", curso: "Arquitetura", grau: "MBA", inicio: "2024", fim: null },
      ],
      idiomas: [
        { idioma: "Português", nivel: "nativo" },
        { idioma: "Klingon", nivel: "basico" },
      ],
    });
    const gerado = umCurriculoGerado({
      idioma: "en",
      projetos: [
        { id: "proj-site", bullets: [{ texto: "Built in React.", origem: ["proj-site-b1"] }] },
        { id: "proj-inventado", bullets: [{ texto: "x", origem: [] }] },
      ],
      formacao: [],
      certificacoes: ["cert-inexistente"],
      skills: ["react", "skill-inventada"],
    });
    const doc = montarDocumento(master, gerado, "en");
    const projetos = doc.secoes.find((s) => s.tipo === "projetos");
    expect(projetos?.tipo === "projetos" && projetos.itens).toEqual([
      { nome: "Site Pessoal", url: "https://ana.dev", bullets: ["Built in React."] },
    ]);
    const listas = doc.secoes.flatMap((s) => (s.tipo === "lista" ? [s.itens] : []));
    expect(listas).toContainEqual(["Arquitetura — FIAP (MBA), 2024–present"]);
    expect(listas).toContainEqual(["Portuguese — Native", expect.stringMatching(/^Klingon — /)]);
    expect(doc.secoes.map((s) => s.titulo)).not.toContain("Certifications");
    const competencias = doc.secoes.find((s) => s.tipo === "competencias");
    expect(competencias?.tipo === "competencias" && competencias.grupos.flatMap((g) => g.itens)).toEqual(["React"]);

    const texto = paraTexto(doc);
    expect(texto).toContain("Site Pessoal (https://ana.dev)");
    expect(texto).not.toContain("Portfólio.");
  });

  it("master mínimo: sem experiências, projetos, certificações, skills nem idiomas", () => {
    const doc = montarDocumento(
      umMaster({ experiencias: [], projetos: [], certificacoes: [], skills: [], idiomas: [], formacao: [] }),
      null,
      "pt",
    );
    expect(doc.secoes.map((s) => s.tipo)).toEqual(["resumo"]);
  });

  it("texto da experiência sem local e projeto do master genérico com descrição", () => {
    const texto = paraTexto(montarDocumento(umMaster(), null, "pt"));
    expect(texto).toContain("Desenvolvedora Pleno — Loja Horizonte (jan/2019 – fev/2022)");
    expect(texto).toContain("Aplicativo pessoal de controle de gastos.");
  });
});

describe("formatação", () => {
  it("período com mês fora da tabela e contato sem UF", () => {
    expect(formatarPeriodo("2020-13", null, "pt")).toBe("13/2020 – atual");
    expect(
      linhaContato({ cidade: "Lisboa", email: "a@x.com", telefone: "1", portfolio: "https://a.dev" }),
    ).toEqual(["Lisboa", "a@x.com", "1", "https://a.dev"]);
  });

  it("nome de arquivo sem nome aproveitável cai para Curriculo", () => {
    expect(nomeArquivo("***", "CV")).toBe("Curriculo_CV.pdf");
    expect(nomeArquivo("Ana", "Carta")).toBe("Ana_Carta.pdf");
  });
});

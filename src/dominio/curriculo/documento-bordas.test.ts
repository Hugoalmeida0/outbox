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
    expect(projetos?.tipo === "projetos" && projetos.itens).toMatchObject([
      { nome: "Site Pessoal", url: "https://ana.dev", bullets: ["Built in React."] },
    ]);
    expect(projetos?.tipo === "projetos" && projetos.itens[0]).not.toHaveProperty("descricao");
    const formacao = doc.secoes.find((s) => s.tipo === "formacao");
    expect(formacao?.tipo === "formacao" && formacao.itens).toEqual([
      { curso: "Arquitetura", detalhe: "FIAP (MBA) · 2024 – present" },
    ]);
    const idiomas = doc.secoes.flatMap((s) => (s.tipo === "competencias" ? [s.idiomas] : []));
    expect(idiomas[0]?.itens).toEqual(["Portuguese (Native)", "Klingon (Basic)"]);
    expect(doc.secoes.map((s) => s.titulo)).not.toContain("CERTIFICATIONS & AWARDS");
    const competencias = doc.secoes.find((s) => s.tipo === "competencias");
    expect(competencias?.tipo === "competencias" && competencias.grupos.flatMap((g) => g.itens)).toEqual(["React"]);

    const texto = paraTexto(doc);
    expect(texto).toContain("Site Pessoal · ana.dev");
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
    expect(texto).toContain("Loja Horizonte\nDesenvolvedora Pleno · jan/2019 – fev/2022");
    expect(texto).toContain("Gestor de Finanças — Aplicativo pessoal de controle de gastos.");
  });
});

describe("formatação", () => {
  it("período com mês fora da tabela e contato sem UF", () => {
    expect(formatarPeriodo("2020-13", null, "pt")).toBe("13/2020 – atual");
    expect(linhaContato({ cidade: "Lisboa", email: "a@x.com", telefone: "1" })).toEqual([
      "Lisboa",
      "a@x.com",
      "1",
    ]);
  });

  it("contato: cidade, UF, país, modalidade, e-mail, telefone e LinkedIn em texto puro", () => {
    expect(
      linhaContato({
        cidade: "Vitória",
        uf: "ES",
        pais: "Brasil",
        modalidade: "Remoto ou híbrido no ES",
        email: "a@x.com",
        telefone: "1",
        linkedin: "https://www.linkedin.com/in/ana/",
      }),
    ).toEqual([
      "Vitória, ES, Brasil",
      "Remoto ou híbrido no ES",
      "a@x.com",
      "1",
      "linkedin.com/in/ana",
    ]);
  });

  it("nome de arquivo sem nome aproveitável cai para Curriculo", () => {
    expect(nomeArquivo("***", "CV")).toBe("Curriculo_CV.pdf");
    expect(nomeArquivo("Ana", "Carta")).toBe("Ana_Carta.pdf");
  });
});

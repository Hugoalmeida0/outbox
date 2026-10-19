// Etapas isoladas (fakes de porta e SQLite :memory:): caminhos que os casos de uso não exercitam sozinhos.
import { describe, expect, it } from "vitest";
import type { Campo } from "#dominio/respostas/campo.ts";
import { esquemaRespostasSalvas } from "#dominio/respostas/pacote.ts";
import type { IdVaga, Vaga } from "#dominio/vagas/vaga.ts";
import { umaAnalise, umCurriculoGerado, umMaster } from "#testes/apoio/builders.ts";
import { criarAmbienteAplicacao, type AmbienteAplicacao } from "#testes/apoio/deps-aplicacao.ts";
import { InteracaoRoteirizada } from "#testes/apoio/fakes/basicos.ts";
import {
  ALERTA_ATS_CAIU,
  ALERTA_PDF_LONGO,
  esquemaArquivoAnalise,
} from "../compartilhado/artefatos.ts";
import { gerarCurriculo } from "./gerar-curriculo.ts";
import { montarPacote } from "./montar-pacote.ts";
import { resolverVaga } from "./resolver-vaga.ts";
import { gerarCartaAvulsa, responderCampos, salvarRespostas } from "./responder-campos.ts";
import { rodadaGaps } from "./rodada-gaps.ts";

const sinal = () => new AbortController().signal;

function vagaPronta(amb: AmbienteAplicacao, url: string, extra: Partial<Vaga> = {}): Vaga {
  const vaga = amb.inserirVaga(url);
  amb.vagas.atualizar(vaga.id, { empresa: "Acme", cargo: "Dev", idioma: "pt", ...extra });
  amb.vagas.transicionar(vaga.id, "PRONTA");
  return amb.vagas.buscar(vaga.id) ?? vaga;
}

describe("gerarCurriculo", () => {
  it("em inglês, sem descrição salva, pede 1 página; 2ª tentativa válida é aceita", async () => {
    const amb = criarAmbienteAplicacao({
      master: umMaster({
        experiencias: [{ ...umMaster().experiencias[0]!, inicio: "2024-01", fim: null }],
      }),
    });
    const vaga = vagaPronta(amb, "https://job-boards.greenhouse.io/acme/jobs/1");
    amb.gerador.quando(
      "tailoring",
      umCurriculoGerado({
        skills: ["kafka"],
        experiencias: [
          { id: "exp-aurora", bullets: [{ texto: "Liderei.", origem: ["exp-aurora-b1"] }] },
        ],
      }),
      umCurriculoGerado({
        idioma: "en",
        experiencias: [
          {
            id: "exp-aurora",
            bullets: [
              { texto: "Led the migration of 12 Node.js services.", origem: ["exp-aurora-b1"] },
            ],
          },
        ],
      }),
    );
    const saida = await gerarCurriculo(
      amb.deps(),
      vaga,
      { ...umaAnalise({ idioma: "en" }), alertas: [] },
      sinal(),
    );
    const [primeiro] = amb.gerador.pedidosDe("tailoring");
    expect(primeiro?.variaveis).toMatchObject({ idioma: "en", metaPaginas: "1 página" });
    expect(primeiro?.conteudoNaoConfiavel?.descricao).toBe("Dev Acme");
    expect(saida.camaleaoFalhou).toBe(false);
    expect(amb.vagas.buscar(vaga.id)?.camaleaoFalhou).toBeNull();
  });

  it("PDF que não cabe em 1 página gera alerta na análise, fica no piso de fonte e registra o que sobrou", async () => {
    const amb = criarAmbienteAplicacao();
    const vaga = vagaPronta(amb, "https://job-boards.greenhouse.io/acme/jobs/1");
    amb.artefatos.gravarJson(vaga.id, "analise.json", { ...umaAnalise(), alertas: ["anterior"] });
    amb.artefatos.gravarTextoMaster("Ana TypeScript");
    amb.gerador.sempre("tailoring", umCurriculoGerado());
    amb.renderizador.paginas = 3;
    const saida = await gerarCurriculo(amb.deps(), vaga, { ...umaAnalise(), alertas: [] }, sinal());
    expect(saida.paginas).toBe(3);
    expect(amb.gerador.pedidosDe("tailoring")[0]?.variaveis.metaPaginas).toBe("1 página");
    const renders = amb.renderizador.curriculos;
    expect(renders[0]?.doc.tamanhoBase).toBe(9.5);
    expect(renders.at(-1)?.doc.tamanhoBase).toBe(8.8);
    expect(Math.min(...renders.map((r) => r.doc.tamanhoBase))).toBe(8.8);
    expect(amb.registrador.entradas.some((e) => e.nivel === "avisar")).toBe(true);
    expect(amb.artefatos.lerJson(vaga.id, "analise.json", esquemaArquivoAnalise)?.alertas).toEqual([
      "anterior",
      ALERTA_PDF_LONGO,
    ]);
  });

  it("score ATS abaixo do genérico: refaz 1x pedindo as keywords perdidas e fica com a melhor", async () => {
    const amb = criarAmbienteAplicacao();
    const vaga = vagaPronta(amb, "https://job-boards.greenhouse.io/acme/jobs/1");
    amb.artefatos.gravarTextoMaster("Ana TypeScript AWS");
    const analise = {
      ...umaAnalise({
        keywords: [
          { termo: "TypeScript", tipo: "tecnologia" },
          { termo: "AWS", tipo: "tecnologia" },
        ],
      }),
      alertas: [],
    };
    amb.gerador.quando(
      "tailoring",
      umCurriculoGerado({ skills: [] }),
      umCurriculoGerado({ skills: ["aws"] }),
    );
    const saida = await gerarCurriculo(amb.deps(), vaga, analise, sinal());
    const pedidos = amb.gerador.pedidosDe("tailoring");
    expect(pedidos).toHaveLength(2);
    expect(pedidos[0]?.variaveis.keywordsFaltantes).toBe("nenhuma");
    expect(pedidos[1]?.variaveis.keywordsFaltantes).toBe("AWS");
    expect(saida).toMatchObject({ atsAntes: 100, atsDepois: 100 });
  });

  it("score ATS ainda abaixo depois de refazer: mantém a versão e alerta na revisão", async () => {
    const amb = criarAmbienteAplicacao();
    const vaga = vagaPronta(amb, "https://job-boards.greenhouse.io/acme/jobs/1");
    amb.artefatos.gravarJson(vaga.id, "analise.json", { ...umaAnalise(), alertas: [] });
    amb.artefatos.gravarTextoMaster("Ana TypeScript AWS");
    const analise = {
      ...umaAnalise({
        keywords: [
          { termo: "TypeScript", tipo: "tecnologia" },
          { termo: "AWS", tipo: "tecnologia" },
        ],
      }),
      alertas: [],
    };
    amb.gerador.sempre("tailoring", umCurriculoGerado({ skills: [] }));
    const saida = await gerarCurriculo(amb.deps(), vaga, analise, sinal());
    expect(amb.gerador.pedidosDe("tailoring")).toHaveLength(2);
    expect(saida).toMatchObject({ atsAntes: 100, atsDepois: 50 });
    expect(
      amb.artefatos.lerJson(vaga.id, "analise.json", esquemaArquivoAnalise)?.alertas,
    ).toContain(ALERTA_ATS_CAIU);
  });
});

describe("responderCampos", () => {
  const salario: Campo = {
    id: "sal",
    rotulo: "Pretensão salarial",
    tipo: "texto",
    obrigatorio: true,
    categoria: "salario",
  };
  const faixa: Campo = {
    id: "faixa",
    rotulo: "Faixa salarial",
    tipo: "select",
    obrigatorio: true,
    opcoes: ["A combinar"],
    categoria: "salario",
  };
  const pergunta: Campo = {
    id: "q1",
    rotulo: "Por que nós?",
    tipo: "textarea",
    obrigatorio: true,
    categoria: "pergunta",
  };
  const outra: Campo = {
    id: "q2",
    rotulo: "Conte um desafio",
    tipo: "textarea",
    obrigatorio: false,
    categoria: "pergunta",
  };
  const cartaArquivo: Campo = {
    id: "cl",
    rotulo: "Cover letter",
    tipo: "arquivo",
    obrigatorio: false,
    categoria: "carta",
  };

  it("sem pedido do LLM, o salário usa o regime da análise com confiança baixa; faixa sem número fica nula", async () => {
    const amb = criarAmbienteAplicacao();
    const vaga = vagaPronta(amb, "https://job-boards.greenhouse.io/acme/jobs/1", {
      cargo: null,
      empresa: null,
    });
    amb.gerador.sempre("responder-perguntas", { respostas: [], salarios: [] });
    const saida = await responderCampos(
      amb.deps(),
      { vaga, analise: { ...umaAnalise({ regime: "pj" }), alertas: [] } },
      [salario, faixa],
      sinal(),
    );
    expect(saida.respostas).toMatchObject([
      { campoId: "sal", valor: "20000", fonte: "codigo", confianca: "baixa", sensivel: true },
      { campoId: "faixa", valor: null, confianca: "baixa" },
    ]);
    expect(amb.gerador.pedidosDe("responder-perguntas")[0]?.variaveis).toMatchObject({
      cargo: "a vaga",
      empresa: "a empresa",
    });
  });

  it("contractor sem análise pede USD; fonte do banco só vale se existir; sem resposta, fica nula", async () => {
    const amb = criarAmbienteAplicacao();
    amb.curriculo.banco = [
      {
        id: "r-0001",
        pergunta: "Por que nós?",
        variantes: [],
        idioma: "pt",
        tipo: "texto",
        resposta: "Produto",
        atualizadaEm: "2026-01-01",
      },
    ];
    const vaga = vagaPronta(amb, "https://job-boards.greenhouse.io/acme/jobs/1");
    amb.gerador.sempre("responder-perguntas", {
      respostas: [
        { campoId: "q1", valor: "Produto", fonte: "banco:r-0001" },
        { campoId: "sal", valor: "x", fonte: "banco:r-9999" },
      ],
      salarios: [{ campoId: "sal", regime: "contractor", periodo: "anual", moeda: "USD" }],
    });
    const saida = await responderCampos(
      amb.deps(),
      { vaga, analise: null },
      [salario, pergunta, outra],
      sinal(),
    );
    expect(saida.respostas).toMatchObject([
      { campoId: "sal", valor: "60000", confianca: "alta" },
      { campoId: "q1", valor: "Produto", fonte: "banco:r-0001" },
      { campoId: "q2", valor: null, fonte: "gerada", confianca: "baixa" },
    ]);
    expect(amb.gerador.pedidosDe("responder-perguntas")[0]?.variaveis).toMatchObject({
      idioma: "en",
      analise: "{}",
    });
  });

  it("cache: pergunta já respondida em outra vaga não volta ao LLM; só avisa quando há chamada", async () => {
    const amb = criarAmbienteAplicacao();
    const memoria = new Map<string, string>();
    const cache = {
      buscar: (k: string) => memoria.get(k) ?? null,
      gravar: (k: string, v: string) => void memoria.set(k, v),
    };
    const vaga = vagaPronta(amb, "https://job-boards.greenhouse.io/acme/jobs/1");
    const analise = { ...umaAnalise(), alertas: [] };
    amb.gerador.sempre("responder-perguntas", {
      respostas: [
        { campoId: "q1", valor: "Produto", confianca: "alta" },
        { campoId: "q2", valor: "Migração", confianca: "alta", especificaDaVaga: true },
      ],
      salarios: [],
    });
    const avisos: number[] = [];
    const contexto = { vaga, analise, aoConsultarLlm: (n: number) => void avisos.push(n) };
    await responderCampos({ ...amb.deps(), cache }, contexto, [pergunta, outra], sinal());
    expect(avisos).toEqual([2]);
    // Específica da vaga não entra no cache.
    expect(memoria.size).toBe(1);

    const segunda = await responderCampos(
      { ...amb.deps(), cache },
      contexto,
      [{ ...pergunta, id: "outro-id" }],
      sinal(),
    );
    expect(segunda.respostas).toMatchObject([{ campoId: "outro-id", valor: "Produto" }]);
    expect(amb.gerador.pedidosDe("responder-perguntas")).toHaveLength(1);
    expect(avisos).toEqual([2]);
  });

  it("empresa atual por código, anexo desconhecido sem resposta e consentimento sem opção reconhecível vai ao LLM", async () => {
    const amb = criarAmbienteAplicacao({
      master: umMaster({
        experiencias: [
          { ...umMaster().experiencias[0]!, empresa: "Grupo Aurora — Unidade Sul", fim: null },
        ],
      }),
    });
    const vaga = vagaPronta(amb, "https://job-boards.greenhouse.io/acme/jobs/1");
    amb.gerador.sempre("responder-perguntas", {
      respostas: [{ campoId: "lgpd", valor: "Li o documento", confianca: "alta" }],
      salarios: [],
    });
    const saida = await responderCampos(
      amb.deps(),
      { vaga, analise: { ...umaAnalise(), alertas: [] } },
      [
        {
          id: "emp",
          rotulo: "Current company",
          tipo: "texto",
          obrigatorio: true,
          categoria: "pergunta",
        },
        {
          id: "laudo",
          rotulo: "Laudo médico",
          tipo: "arquivo",
          obrigatorio: false,
          categoria: "anexo",
        },
        {
          id: "lgpd",
          rotulo: "Consinto com o tratamento dos meus dados pessoais",
          tipo: "select",
          obrigatorio: true,
          opcoes: ["Li o documento"],
          categoria: "pergunta",
        },
      ],
      sinal(),
    );
    expect(saida.respostas).toMatchObject([
      { campoId: "emp", valor: "Grupo Aurora", fonte: "codigo" },
      { campoId: "lgpd", valor: "Li o documento", fonte: "gerada" },
    ]);
    const campos = JSON.parse(
      String(amb.gerador.pedidosDe("responder-perguntas")[0]?.variaveis.campos),
    ) as { campoId: string }[];
    expect(campos.map((c) => c.campoId)).toEqual(["lgpd"]);
  });

  it("carta em campo de arquivo vira PDF; carta avulsa vazia não grava nada", async () => {
    const amb = criarAmbienteAplicacao();
    const vaga = vagaPronta(amb, "https://job-boards.greenhouse.io/acme/jobs/1");
    amb.gerador.quando("responder-perguntas", {
      respostas: [{ campoId: "cl", valor: "Prezados, quero a vaga." }],
      salarios: [],
    });
    const saida = await responderCampos(
      amb.deps(),
      { vaga, analise: { ...umaAnalise(), alertas: [] } },
      [cartaArquivo],
      sinal(),
    );
    expect(saida).toMatchObject({
      carta: "Prezados, quero a vaga.",
      pdfCarta: "/dados/vagas/00001/Ana_Silva_Carta.pdf",
    });
    expect(amb.renderizador.cartas).toHaveLength(1);

    amb.gerador.quando("responder-perguntas", { respostas: [], salarios: [] });
    expect(await gerarCartaAvulsa(amb.deps(), { vaga, analise: null }, sinal())).toBeUndefined();
    expect(amb.artefatos.existe(vaga.id, "carta.md")).toBe(false);
  });

  it("valor por código fora das opções do select vira pergunta para o LLM", async () => {
    const amb = criarAmbienteAplicacao();
    const vaga = vagaPronta(amb, "https://jobs.lever.co/acme/1");
    const select = (id: string, rotulo: string, opcoes: string[]): Campo => ({
      id,
      rotulo,
      tipo: "select",
      obrigatorio: true,
      opcoes,
      categoria: "pergunta",
    });
    amb.gerador.sempre("responder-perguntas", {
      respostas: [{ campoId: "familia", valor: "Não" }],
      salarios: [],
    });
    const saida = await responderCampos(
      amb.deps(),
      { vaga, analise: null },
      [
        select("pais", "País", ["Argentina", "Brazil"]),
        select("familia", "Seus pais?", ["Sim", "Não"]),
      ],
      sinal(),
    );
    expect(saida.respostas).toMatchObject([
      { campoId: "pais", categoria: "padrao", valor: "Brasil", fonte: "codigo" },
      { campoId: "familia", categoria: "pergunta", valor: "Não", fonte: "gerada" },
    ]);
    const campos = JSON.parse(
      String(amb.gerador.pedidosDe("responder-perguntas")[0]?.variaveis.campos),
    ) as { campoId: string }[];
    expect(campos.map((c) => c.campoId)).toEqual(["familia"]);
  });

  it("salário atual vem do perfil, é sensível e nunca usa a pretensão", async () => {
    const amb = criarAmbienteAplicacao();
    const vaga = vagaPronta(amb, "https://jobs.lever.co/acme/1");
    const atual: Campo = {
      id: "atual",
      rotulo: "Please share your current or last salary and benefits",
      tipo: "texto",
      obrigatorio: false,
      categoria: "pergunta",
    };
    const semDado = await responderCampos(amb.deps(), { vaga, analise: null }, [atual], sinal());
    expect(semDado.respostas).toMatchObject([
      { campoId: "atual", categoria: "salario_atual", valor: null, sensivel: true },
    ]);
    amb.curriculo.perfil = {
      ...amb.curriculo.perfil,
      salario: { ...amb.curriculo.perfil.salario, atual: "7000 CLT + VR" },
    };
    const comDado = await responderCampos(amb.deps(), { vaga, analise: null }, [atual], sinal());
    expect(comDado.respostas[0]?.valor).toBe("7000 CLT + VR");
    expect(amb.gerador.pedidosDe("responder-perguntas")).toHaveLength(0);
  });

  it("salvarRespostas mescla por campo e numera as chaves protegidas a partir da maior", () => {
    const amb = criarAmbienteAplicacao();
    const vaga = { id: 1 as IdVaga };
    const base = {
      categoria: "documento" as const,
      fonte: "codigo" as const,
      confianca: "alta" as const,
      especificaDaVaga: false,
    };
    amb.artefatos.gravarJson(1, "respostas.json", [
      { ...base, campoId: "cpf", rotulo: "CPF", valor: "1", sensivel: true, chaveProtegida: "p4" },
    ]);
    const todas = salvarRespostas(amb.artefatos, vaga, {
      respostas: [
        { ...base, campoId: "rg", rotulo: "RG", valor: "2", sensivel: true },
        { ...base, rotulo: "Sem id", valor: "3", sensivel: false },
      ],
    });
    expect(todas.map((r) => [r.campoId ?? r.rotulo, r.chaveProtegida])).toEqual([
      ["cpf", "p4"],
      ["rg", "p5"],
      ["Sem id", undefined],
    ]);
    expect(amb.artefatos.lerJson(1, "respostas.json", esquemaRespostasSalvas)).toHaveLength(3);
  });
});

describe("resolverVaga", () => {
  it("URL resolvida já enviada vira DUPLICADA url_ja_enviada; já descartada é reaberta nesta vaga", async () => {
    const amb = criarAmbienteAplicacao();
    const enviada = vagaPronta(
      amb,
      "https://jobs.lever.co/acme/0f8e4c7a-1111-2222-3333-444455556666",
    );
    amb.vagas.transicionar(enviada.id, "ENVIADA");
    const viaLinkedin = amb.inserirVaga("https://www.linkedin.com/jobs/view/1");
    amb.resolvedor.definir(viaLinkedin.urlCanonica, {
      motor: "lever",
      urlResolvida: enviada.urlCanonica,
      canonica: enviada.urlCanonica,
      rota: "conector",
    });
    expect(await resolverVaga(amb.deps(), viaLinkedin, sinal())).toEqual({ tipo: "duplicada" });
    expect(amb.vagas.buscar(viaLinkedin.id)).toMatchObject({
      status: "DUPLICADA",
      motivo: "url_ja_enviada",
      duplicadaDe: enviada.id,
    });

    const descartada = vagaPronta(
      amb,
      "https://jobs.ashbyhq.com/acme/0f8e4c7a-1111-2222-3333-444455556666",
    );
    amb.vagas.transicionar(descartada.id, "PULADA");
    const outra = amb.inserirVaga("https://www.linkedin.com/jobs/view/2");
    amb.resolvedor.definir(outra.urlCanonica, {
      motor: "ashby",
      urlResolvida: descartada.urlCanonica,
      canonica: descartada.urlCanonica,
      rota: "conector",
    });
    const r = await resolverVaga(amb.deps(), outra, sinal());
    expect(r.tipo).toBe("resolvida");
    expect(amb.vagas.buscar(outra.id)).toMatchObject({
      motor: "ashby",
      rota: "conector",
      urlCanonica: descartada.urlCanonica,
    });
  });
});

describe("montarPacote", () => {
  it("Gupy sem anexo por candidatura usa o PDF genérico; carta em PDF e idioma inglês entram no pacote", () => {
    const amb = criarAmbienteAplicacao();
    const vaga = vagaPronta(amb, "https://acme.gupy.io/jobs/1", { idioma: "en" });
    amb.artefatos.gravarTexto(vaga.id, "pdf-carta", "%PDF");
    const pacote = montarPacote({ ...amb.deps(), gupyAnexoPorCandidatura: false }, vaga);
    expect(pacote).toMatchObject({
      idioma: "en",
      pdfCurriculo: "/dados/master/Ana_Silva_CV.pdf",
      pdfCarta: "/dados/vagas/00001/Ana_Silva_Carta.pdf",
    });
    expect(pacote.carta).toBeUndefined();
    expect(montarPacote({ ...amb.deps(), gupyAnexoPorCandidatura: true }, vaga).pdfCurriculo).toBe(
      "/dados/vagas/00001/Ana_Silva_CV.pdf",
    );
  });
});

describe("rodadaGaps", () => {
  it("consolida por termo, evita id de skill repetido, usa evidência padrão e ignora vaga que saiu de PRONTA", async () => {
    const amb = criarAmbienteAplicacao({
      master: umMaster({
        skills: [
          ...umMaster().skills,
          {
            id: "docker",
            nome: "Docker Swarm",
            aliases: [],
            categoria: "ferramenta",
            origem: "master",
          },
        ],
      }),
    });
    const a = vagaPronta(amb, "https://job-boards.greenhouse.io/acme/jobs/1");
    const b = vagaPronta(amb, "https://job-boards.greenhouse.io/acme/jobs/2");
    for (const v of [a, b])
      amb.vagas.inserirGaps(v.id, [{ termo: "Docker", termoNormalizado: "docker" }]);
    amb.vagas.transicionar(b.id, "PULADA");
    amb.interacao = new InteracaoRoteirizada([true, 2, "   "]);
    const refeitas = await rodadaGaps({ ...amb.deps(), paralelo: 1 }, [a.id, b.id], sinal());
    expect(amb.interacao.perguntas[0]).toBe("A vaga pede Docker (2 vagas). Você tem?");
    expect(amb.curriculo.master?.skills.at(-1)).toMatchObject({
      id: "docker-2",
      evidencia: "confirmado na revisão em 2026-10-10",
    });
    expect(refeitas).toEqual([]);
  });

  it("com o sinal abortado não pergunta nada", async () => {
    const amb = criarAmbienteAplicacao();
    const a = vagaPronta(amb, "https://job-boards.greenhouse.io/acme/jobs/1");
    amb.vagas.inserirGaps(a.id, [{ termo: "Go", termoNormalizado: "go" }]);
    const controle = new AbortController();
    controle.abort();
    expect(await rodadaGaps({ ...amb.deps(), paralelo: 1 }, [a.id], controle.signal)).toEqual([]);
    expect(amb.interacao.perguntas).toEqual([]);
  });
});

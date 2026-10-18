import { describe, expect, it } from "vitest";
import type { Campo } from "#dominio/respostas/campo.ts";
import { esquemaRespostasSalvas } from "#dominio/respostas/pacote.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import {
  ErroAgregadorExigeLogin,
  ErroExtracao,
  ErroLimiteUso,
  ErroLlm,
  ErroResolucao,
} from "../portas/erros.ts";
import { esquemaArquivoAnalise } from "../compartilhado/artefatos.ts";
import { umaAnalise, umCurriculoGerado } from "#testes/apoio/builders.ts";
import { criarAmbienteAplicacao, type AmbienteAplicacao } from "#testes/apoio/deps-aplicacao.ts";
import { CatalogoConectoresFake, ConectorFake } from "#testes/apoio/fakes/formularios.ts";
import { motivoDoErro, prepararVagas } from "./preparar-vagas.ts";

const URL_GH = "https://job-boards.greenhouse.io/acme/jobs/1";
const sinal = () => new AbortController().signal;

const CAMPOS: Campo[] = [
  { id: "first_name", rotulo: "First Name", tipo: "texto", obrigatorio: true, categoria: "padrao" },
  { id: "resume", rotulo: "Resume/CV", tipo: "arquivo", obrigatorio: true, categoria: "curriculo" },
  { id: "cpf", rotulo: "CPF", tipo: "texto", obrigatorio: true, categoria: "documento" },
  {
    id: "q1",
    rotulo: "Por que você quer trabalhar aqui?",
    tipo: "textarea",
    obrigatorio: true,
    categoria: "pergunta",
  },
  { id: "carta", rotulo: "Cover Letter", tipo: "arquivo", obrigatorio: false, categoria: "carta" },
  {
    id: "salario",
    rotulo: "Pretensão salarial",
    tipo: "select",
    obrigatorio: true,
    opcoes: ["Até R$ 10.000", "R$ 10.001 a R$ 20.000", "Acima de R$ 20.000"],
    categoria: "salario",
  },
  {
    id: "gender",
    rotulo: "Gender",
    tipo: "select",
    obrigatorio: false,
    opcoes: ["Woman", "Man", "Decline to self-identify"],
    categoria: "diversidade",
  },
  {
    id: "lgpd",
    rotulo: "Li e concordo com a política de privacidade",
    tipo: "checkbox",
    obrigatorio: true,
    categoria: "consentimento",
  },
];

function roteiroPadrao(amb: AmbienteAplicacao): void {
  amb.gerador
    .sempre("analisar-vaga", umaAnalise())
    .sempre("tailoring", umCurriculoGerado())
    .sempre("responder-perguntas", {
      respostas: [
        { campoId: "q1", valor: "Admiro o produto.", fonte: "gerada" },
        { campoId: "carta", valor: "Prezados,\n\nQuero a vaga.", fonte: "gerada" },
        { campoId: "carta", valor: "Carta avulsa.", fonte: "gerada" },
      ],
      salarios: [{ campoId: "salario", regime: "clt", periodo: "mensal", moeda: "BRL" }],
    });
}

function ambienteComConector(campos: Campo[] | null = CAMPOS) {
  const conector = new ConectorFake("greenhouse");
  conector.campos = campos;
  const amb = criarAmbienteAplicacao({ catalogo: new CatalogoConectoresFake(conector) });
  roteiroPadrao(amb);
  return { amb, conector };
}

describe("prepararVagas", () => {
  it("leva a vaga a PRONTA com currículo, ATS, respostas por código e LLM e notifica", async () => {
    const { amb } = ambienteComConector();
    const vaga = amb.inserirVaga(URL_GH);
    const resumo = await prepararVagas(amb.deps(), { forcar: false, reavaliar: false }, sinal());
    expect(resumo).toMatchObject({
      processadas: 1,
      contagens: { PRONTA: 1 },
      erros: [],
      interrompido: null,
    });
    const final = amb.vagas.buscar(vaga.id);
    expect(final).toMatchObject({
      status: "PRONTA",
      empresa: "Empresa X",
      aderencia: 100,
      idioma: "pt",
      camaleaoFalhou: null,
    });
    expect(final?.atsDepois).toBeGreaterThanOrEqual(final?.atsAntes ?? 0);
    expect(final?.chaveDedup).toBe("empresa x|desenvolvedora senior|remoto");
    expect(amb.renderizador.curriculos.map((c) => c.destino)).toEqual([
      "/dados/master/Ana_Silva_CV.pdf",
      "/dados/vagas/00001/Ana_Silva_CV.pdf",
    ]);
    expect(amb.renderizador.cartas).toHaveLength(1);

    const respostas =
      amb.artefatos.lerJson(vaga.id, "respostas.json", esquemaRespostasSalvas) ?? [];
    const porId = Object.fromEntries(respostas.map((r) => [r.campoId, r]));
    expect(porId.first_name).toMatchObject({ valor: "Ana", fonte: "codigo", sensivel: false });
    expect(porId.cpf).toMatchObject({
      valor: "123.456.789-09",
      sensivel: true,
      chaveProtegida: "p1",
    });
    expect(porId.salario).toMatchObject({
      valor: "R$ 10.001 a R$ 20.000",
      sensivel: true,
      confianca: "alta",
    });
    expect(porId.gender).toMatchObject({ valor: "Woman", sensivel: true });
    expect(porId.lgpd).toMatchObject({ valor: "Sim", categoria: "consentimento" });
    expect(porId.q1).toMatchObject({ valor: "Admiro o produto.", fonte: "gerada" });
    expect(porId.resume).toBeUndefined();
    expect(amb.artefatos.lerTexto(vaga.id, "carta.md")).toContain("Quero a vaga.");
    expect(amb.notificador.notificacoes).toEqual([
      {
        titulo: "Outbox",
        mensagem: "Outbox: preparar concluído. 1 prontas, 0 descartadas, 0 com erro, 0 manuais.",
      },
    ]);
  });

  it("informa o início, as etapas e a conclusão de cada vaga, com empresa e cargo assim que extraídos", async () => {
    const { amb } = ambienteComConector();
    const vaga = amb.inserirVaga(URL_GH);
    await prepararVagas(amb.deps(), { forcar: false, reavaliar: false }, sinal());
    expect(amb.progresso.eventos[0]).toEqual({ tipo: "inicio", total: 1, paralelo: 1 });
    expect(amb.progresso.daVaga(vaga.id)).toEqual([
      "resolver",
      "extrair",
      "analisar",
      "gerar_curriculo",
      "responder_campos",
      "PRONTA",
    ]);
    const etapas = amb.progresso.eventos.filter((e) => e.tipo === "etapa");
    expect(etapas[0]?.vaga.empresa).toBeNull();
    expect(etapas.at(-1)?.vaga).toMatchObject({ empresa: "Empresa X", status: "NOVA" });
  });

  it("nunca envia documentos, salário, diversidade nem endereço ao LLM (AC11)", async () => {
    const { amb } = ambienteComConector();
    amb.inserirVaga(URL_GH);
    await prepararVagas(amb.deps(), { forcar: false, reavaliar: false }, sinal());
    const enviado = JSON.stringify(
      amb.gerador.pedidos.map((p) => ({ v: p.variaveis, c: p.conteudoNaoConfiavel })),
    );
    for (const proibido of [
      "123.456.789-09",
      "12.345.678-9",
      "1995-06-15",
      "15000",
      "20000",
      "60000",
      "mulher_cis",
      "Rua Exemplo Fictícia",
      "01000-000",
    ]) {
      expect(enviado).not.toContain(proibido);
    }
    expect(amb.gerador.pedidosDe("analisar-vaga")[0]?.conteudoNaoConfiavel?.descricao).toContain(
      "TypeScript",
    );
  });

  it("descarta abaixo do mínimo, processa com --forcar e elimina afirmativa inelegível mesmo forçando (AC6)", async () => {
    const { amb } = ambienteComConector();
    amb.gerador.sempre(
      "analisar-vaga",
      umaAnalise({
        senioridade: "estagio",
        modelo: "presencial",
        regime: "contractor",
        requisitos: [
          { texto: "Go", termo: "Go", obrigatorio: true, status: "ausente", evidencias: [] },
        ],
      }),
    );
    const baixa = amb.inserirVaga(URL_GH);
    await prepararVagas(amb.deps(), { forcar: false, reavaliar: false }, sinal());
    expect(amb.vagas.buscar(baixa.id)).toMatchObject({
      status: "DESCARTADA",
      motivo: "aderencia_baixa",
      aderencia: 0,
    });
    expect(
      amb.artefatos.lerJson(baixa.id, "analise.json", esquemaArquivoAnalise)?.aderencia?.detalhes,
    ).toEqual({ cobertura: 0, senioridade: 0, modeloLocalidade: 0, regime: 0 });

    const forcada = amb.inserirVaga("https://job-boards.greenhouse.io/acme/jobs/2");
    await prepararVagas(amb.deps(), { forcar: true, reavaliar: false }, sinal());
    expect(amb.vagas.buscar(forcada.id)?.status).toBe("PRONTA");

    amb.gerador.sempre(
      "analisar-vaga",
      umaAnalise({ afirmativa: { exclusiva: true, grupos: ["pessoas_negras"] } }),
    );
    amb.curriculo.perfil = {
      ...amb.curriculo.perfil,
      diversidade: { genero: "mulher_cis", raca: "branca" },
    };
    const afirmativa = amb.inserirVaga("https://job-boards.greenhouse.io/acme/jobs/3");
    await prepararVagas(amb.deps(), { forcar: true, reavaliar: false }, sinal());
    expect(amb.vagas.buscar(afirmativa.id)).toMatchObject({
      status: "DESCARTADA",
      motivo: "afirmativa_inelegivel",
    });
  });

  it("reavalia descartadas com gaps confirmados sem chamar o LLM de análise (AC6)", async () => {
    const { amb } = ambienteComConector(null);
    amb.gerador.sempre(
      "analisar-vaga",
      umaAnalise({
        requisitos: [
          { texto: "Kafka", termo: "Kafka", obrigatorio: true, status: "ausente", evidencias: [] },
        ],
      }),
    );
    const vaga = amb.inserirVaga(URL_GH);
    await prepararVagas(amb.deps(), { forcar: false, reavaliar: false }, sinal());
    expect(amb.vagas.buscar(vaga.id)?.status).toBe("DESCARTADA");
    amb.vagas.responderGaps("kafka", "sim");
    amb.gerador.sempre("analisar-vaga", umaAnalise());
    const resumo = await prepararVagas(amb.deps(), { forcar: false, reavaliar: true }, sinal());
    expect(resumo.reavaliadas).toBe(1);
    expect(amb.vagas.buscar(vaga.id)?.status).toBe("PRONTA");
  });

  it("descarta a duplicata mais antiga pela chave (AC7)", async () => {
    const { amb } = ambienteComConector(null);
    const antiga = amb.inserirVaga(URL_GH);
    const nova = amb.inserirVaga("https://www.carreiras-acme.com/vaga/1");
    amb.resolvedor.definir("https://www.carreiras-acme.com/vaga/1", {
      motor: "dominio:carreiras-acme.com",
      urlResolvida: "https://www.carreiras-acme.com/vaga/1",
      canonica: "https://www.carreiras-acme.com/vaga/1" as never,
      rota: "agente",
    });
    amb.extrator.definir(URL_GH, {
      estruturada: {
        empresa: "Empresa X",
        cargo: "Desenvolvedora Sênior",
        descricao: "d",
        localidade: "Remoto",
        publicadaEm: "2026-09-01",
      },
      textoPagina: "d",
    });
    amb.extrator.definir("https://www.carreiras-acme.com/vaga/1", {
      estruturada: {
        empresa: "Empresa X",
        cargo: "Desenvolvedora Sênior",
        descricao: "d",
        localidade: "Remoto",
        publicadaEm: "2026-10-01",
      },
      textoPagina: "d",
    });
    amb.config = { ...amb.config, paralelo: 1 };
    await prepararVagas(amb.deps(), { forcar: false, reavaliar: false }, sinal());
    expect(amb.vagas.buscar(antiga.id)).toMatchObject({
      status: "DESCARTADA",
      motivo: "duplicada_antiga",
      duplicadaDe: nova.id,
    });
    expect(amb.vagas.buscar(nova.id)?.status).toBe("PRONTA");
  });

  it("vira DUPLICADA quando a URL resolvida já está na fila", async () => {
    const { amb } = ambienteComConector(null);
    const direta = amb.inserirVaga(
      "https://jobs.lever.co/acme/0f8e4c7a-1111-2222-3333-444455556666",
    );
    const viaLinkedin = amb.inserirVaga("https://www.linkedin.com/jobs/view/123");
    amb.resolvedor.definir("https://www.linkedin.com/jobs/view/123", {
      motor: "lever",
      urlResolvida: direta.urlCanonica,
      canonica: direta.urlCanonica,
      rota: "conector",
    });
    amb.config = { ...amb.config, paralelo: 1 };
    await prepararVagas(amb.deps(), { forcar: false, reavaliar: false }, sinal());
    expect(amb.vagas.buscar(viaLinkedin.id)).toMatchObject({
      status: "DUPLICADA",
      motivo: "mesma_vaga_na_fila",
      duplicadaDe: direta.id,
    });
  });

  it("Easy Apply e issue com e-mail viram MANUAL com currículo e carta (AC4)", async () => {
    const { amb } = ambienteComConector(null);
    const easy = amb.inserirVaga("https://www.linkedin.com/jobs/view/9");
    amb.resolvedor.definir("https://www.linkedin.com/jobs/view/9", {
      motor: "linkedin",
      urlResolvida: "https://www.linkedin.com/jobs/view/9",
      canonica: "https://www.linkedin.com/jobs/view/9" as never,
      rota: "manual",
      manual: { motivo: "easy_apply" },
    });
    const issue = amb.inserirVaga("https://github.com/backend-br/vagas/issues/77");
    amb.resolvedor.definir("https://github.com/backend-br/vagas/issues/77", {
      motor: "github",
      urlResolvida: "https://github.com/backend-br/vagas/issues/77",
      canonica: "https://github.com/backend-br/vagas/issues/77" as never,
      rota: "a_definir",
    });
    amb.gerador.quando(
      "analisar-vaga",
      umaAnalise(),
      umaAnalise({ comoCandidatar: { tipo: "email", valor: "vagas@acme.com" } }),
    );
    amb.config = { ...amb.config, paralelo: 1 };
    await prepararVagas(amb.deps(), { forcar: false, reavaliar: false }, sinal());
    expect(amb.vagas.buscar(easy.id)).toMatchObject({ status: "MANUAL", motivo: "easy_apply" });
    expect(amb.vagas.buscar(issue.id)).toMatchObject({
      status: "MANUAL",
      motivo: "candidatura_por_email",
    });
    expect(
      amb.artefatos.lerJson(issue.id, "analise.json", esquemaArquivoAnalise)?.destinoEmail,
    ).toBe("vagas@acme.com");
    expect(amb.progresso.daVaga(easy.id)).toEqual([
      "resolver",
      "extrair",
      "analisar",
      "gerar_curriculo",
      "gerar_carta",
      "MANUAL",
    ]);
    expect(amb.artefatos.lerTexto(easy.id, "carta.md")).toBeTruthy();
    expect(amb.artefatos.existe(issue.id, "carta.md")).toBe(true);
    expect(
      amb.renderizador.curriculos.some((c) =>
        c.destino.includes(String(issue.id).padStart(5, "0")),
      ),
    ).toBe(true);
  });

  it("issue com link resolve de novo e segue para o ATS", async () => {
    const { amb } = ambienteComConector(null);
    const issue = amb.inserirVaga("https://github.com/frontendbr/vagas/issues/5");
    amb.resolvedor.definir("https://github.com/frontendbr/vagas/issues/5", {
      motor: "github",
      urlResolvida: "https://github.com/frontendbr/vagas/issues/5",
      canonica: "https://github.com/frontendbr/vagas/issues/5" as never,
      rota: "a_definir",
    });
    amb.gerador.sempre(
      "analisar-vaga",
      umaAnalise({
        comoCandidatar: {
          tipo: "link",
          valor: "https://jobs.lever.co/acme/0f8e4c7a-1111-2222-3333-444455556666",
        },
      }),
    );
    await prepararVagas(amb.deps(), { forcar: false, reavaliar: false }, sinal());
    expect(amb.vagas.buscar(issue.id)).toMatchObject({
      status: "PRONTA",
      motor: "lever",
      rota: "conector",
    });
  });

  it("usa o LLM para extrair quando não há estrutura (AC5)", async () => {
    const { amb } = ambienteComConector(null);
    const vaga = amb.inserirVaga(URL_GH);
    amb.extrator.definir(URL_GH, { estruturada: null, textoPagina: "Empresa Beta busca QA" });
    amb.gerador.quando("extrair-vaga", {
      empresa: "Empresa Beta",
      cargo: "Analista de QA",
      descricao: "QA com Cypress",
    });
    await prepararVagas(amb.deps(), { forcar: false, reavaliar: false }, sinal());
    expect(amb.vagas.buscar(vaga.id)).toMatchObject({
      empresa: "Empresa Beta",
      cargo: "Analista de QA",
    });
    expect(amb.gerador.pedidosDe("extrair-vaga")[0]?.conteudoNaoConfiavel?.textoPagina).toBe(
      "Empresa Beta busca QA",
    );
  });

  it("faz 1 retry com as violações e usa o master genérico se o lastro continuar falhando (AC8)", async () => {
    const { amb } = ambienteComConector(null);
    const ruim = umCurriculoGerado({ skills: ["kafka"] });
    amb.gerador.quando("tailoring", ruim, ruim);
    const vaga = amb.inserirVaga(URL_GH);
    await prepararVagas(amb.deps(), { forcar: false, reavaliar: false }, sinal());
    const pedidos = amb.gerador.pedidosDe("tailoring");
    expect(pedidos.map((p) => p.variaveis.correcoes)).toEqual([
      "nenhuma",
      "R3: skill inexistente: kafka",
    ]);
    expect(amb.vagas.buscar(vaga.id)).toMatchObject({ status: "PRONTA", camaleaoFalhou: "lastro" });
    expect(
      amb.artefatos.lerJson(vaga.id, "analise.json", esquemaArquivoAnalise)?.alertas.join(),
    ).toMatch(/camaleão falhou/);
    expect(amb.renderizador.curriculos.at(-1)?.doc.titulo).toBe("Desenvolvedora Full Stack");
  });

  it("converte falhas por vaga em ERRO_PREPARO, incrementa tentativas e respeita o limite (AC30)", async () => {
    const { amb } = ambienteComConector(null);
    const a = amb.inserirVaga(URL_GH);
    const b = amb.inserirVaga("https://job-boards.greenhouse.io/acme/jobs/2");
    const c = amb.inserirVaga("https://job-boards.greenhouse.io/acme/jobs/3");
    amb.extrator.definir(
      "https://job-boards.greenhouse.io/acme/jobs/2",
      new ErroExtracao("página fora do ar"),
    );
    amb.resolvedor.definir(
      "https://job-boards.greenhouse.io/acme/jobs/3",
      new ErroAgregadorExigeLogin(),
    );
    const resumo = await prepararVagas(amb.deps(), { forcar: false, reavaliar: false }, sinal());
    expect(amb.vagas.buscar(a.id)?.status).toBe("PRONTA");
    expect(amb.vagas.buscar(b.id)).toMatchObject({
      status: "ERRO_PREPARO",
      motivo: "extracao_falhou",
      tentativasPreparo: 1,
    });
    expect(amb.vagas.buscar(c.id)).toMatchObject({
      status: "ERRO_PREPARO",
      motivo: "agregador_exige_login",
    });
    expect(resumo.erros.map((e) => e.motivo).sort()).toEqual([
      "agregador_exige_login",
      "extracao_falhou",
    ]);
    expect(amb.progresso.eventos[0]).toEqual({ tipo: "inicio", total: 3, paralelo: 2 });
    expect(amb.progresso.daVaga(b.id)).toEqual([
      "resolver",
      "extrair",
      "ERRO_PREPARO: página fora do ar",
    ]);

    amb.vagas.atualizar(b.id, { tentativasPreparo: 3 });
    const segundo = await prepararVagas(amb.deps(), { forcar: false, reavaliar: false }, sinal());
    expect(segundo.processadas).toBe(1);
  });

  it("para no limite de uso: não inicia novas, mantém NOVA e notifica (AC20)", async () => {
    const { amb } = ambienteComConector(null);
    amb.gerador.quando("analisar-vaga", umaAnalise(), new ErroLimiteUso());
    amb.config = { ...amb.config, paralelo: 1 };
    const ids = [1, 2, 3, 4].map(
      (n) => amb.inserirVaga(`https://job-boards.greenhouse.io/acme/jobs/${n}`).id,
    );
    const resumo = await prepararVagas(amb.deps(), { forcar: false, reavaliar: false }, sinal());
    expect(resumo.interrompido).toBe("limite");
    expect(ids.map((id) => amb.vagas.buscar(id)?.status)).toEqual([
      "PRONTA",
      "NOVA",
      "NOVA",
      "NOVA",
    ]);
    expect(amb.vagas.buscar(ids[1] as IdVaga)?.tentativasPreparo).toBe(0);
    expect(amb.notificador.notificacoes[0]?.mensagem).toBe(
      "Outbox: limite de uso do Claude atingido. 3 vagas aguardando novo `preparar`.",
    );
  });

  it("cancelamento deixa as vagas em andamento no status anterior (AC26)", async () => {
    const { amb } = ambienteComConector(null);
    const controle = new AbortController();
    amb.gerador.sempre("analisar-vaga", () => {
      controle.abort();
      return umaAnalise();
    });
    const vaga = amb.inserirVaga(URL_GH);
    const resumo = await prepararVagas(
      amb.deps(),
      { forcar: false, reavaliar: false },
      controle.signal,
    );
    expect(resumo.interrompido).toBe("cancelado");
    expect(amb.vagas.buscar(vaga.id)).toMatchObject({ status: "NOVA", tentativasPreparo: 0 });
    expect(amb.progresso.eventos.filter((e) => e.tipo === "concluida")).toEqual([]);
    expect(amb.notificador.notificacoes).toEqual([]);
  });

  it("sem vagas, não renderiza nada nem notifica", async () => {
    const { amb } = ambienteComConector();
    expect(
      await prepararVagas(amb.deps(), { forcar: false, reavaliar: false }, sinal()),
    ).toMatchObject({ processadas: 0 });
    expect(amb.renderizador.curriculos).toEqual([]);
    expect(amb.notificador.notificacoes).toEqual([]);
    expect(amb.progresso.eventos).toEqual([]);
  });

  it("mapeia erros em motivos", () => {
    expect(motivoDoErro(new ErroResolucao("x"))).toBe("resolucao_falhou");
    expect(motivoDoErro(new ErroLlm("x"))).toBe("llm_falhou");
    expect(motivoDoErro(new Error("x"))).toBe("extracao_falhou");
  });
});

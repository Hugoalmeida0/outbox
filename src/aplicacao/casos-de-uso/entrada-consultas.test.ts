import { describe, expect, it } from "vitest";
import { transicionarVaga } from "#aplicacao/compartilhado/transicionar-vaga.ts";
import { ErroTransicaoInvalida, ErroUsuario, ErroValidacao } from "#dominio/compartilhado/erros.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { umMaster, umaAtualizacao } from "#testes/apoio/builders.ts";
import { criarAmbienteAplicacao } from "#testes/apoio/deps-aplicacao.ts";
import { ArmazemCurriculoMemoria } from "#testes/apoio/fakes/armazens.ts";
import { GeradorEstruturadoRoteirizado } from "#testes/apoio/fakes/llm.ts";
import { abrirNavegador } from "./abrir-navegador.ts";
import { adicionarVagas } from "./adicionar-vagas.ts";
import { importarCurriculo } from "./importar-curriculo.ts";
import { listarFalhas } from "./listar-falhas.ts";
import { listarStatus } from "./listar-status.ts";
import { registrarRetorno } from "./registrar-retorno.ts";
import { garantirMasterGenerico, renderizarMaster } from "./renderizar-master.ts";

const sinal = new AbortController().signal;

describe("importarCurriculo", () => {
  it("lê PDF pelo LLM, grava o master e cria os auxiliares", async () => {
    const curriculo = new ArmazemCurriculoMemoria(null);
    curriculo.auxiliaresCriados = ["perfil.yaml"];
    const gerador = new GeradorEstruturadoRoteirizado().quando("importar-curriculo", umMaster());
    const r = await importarCurriculo(
      { curriculo, gerador },
      { caminhoArquivo: "C:/cv.pdf", ehPdf: true, sobrescrever: false },
      sinal,
    );
    expect(r).toMatchObject({ criados: ["perfil.yaml"] });
    expect(r.backup).toBeUndefined();
    expect(curriculo.master?.pessoal.nome).toBe("Ana Exemplo da Silva");
    const pedido = gerador.pedidos[0];
    expect(pedido?.arquivosLeitura).toEqual(["C:/cv.pdf"]);
    expect(pedido?.variaveis.fonte).toContain("C:/cv.pdf");
  });

  it("envia texto de .docx/.md como conteúdo não confiável e faz backup ao sobrescrever", async () => {
    const curriculo = new ArmazemCurriculoMemoria(umMaster());
    const gerador = new GeradorEstruturadoRoteirizado().quando("importar-curriculo", umMaster());
    const r = await importarCurriculo(
      { curriculo, gerador },
      { caminhoArquivo: "cv.md", ehPdf: false, texto: "# Ana", sobrescrever: true },
      sinal,
    );
    expect(r.backup).toMatch(/bak/);
    expect(gerador.pedidos[0]?.conteudoNaoConfiavel?.curriculo).toBe("# Ana");
    expect(gerador.pedidos[0]?.arquivosLeitura).toBeUndefined();
  });

  it("recusa sem --sobrescrever antes de chamar o LLM, texto vazio e master inválido", async () => {
    const gerador = new GeradorEstruturadoRoteirizado();
    await expect(
      importarCurriculo(
        { curriculo: new ArmazemCurriculoMemoria(umMaster()), gerador },
        { caminhoArquivo: "x.pdf", ehPdf: true, sobrescrever: false },
        sinal,
      ),
    ).rejects.toThrow(/use --sobrescrever/);
    await expect(
      importarCurriculo(
        { curriculo: new ArmazemCurriculoMemoria(null), gerador },
        { caminhoArquivo: "x.txt", ehPdf: false, texto: " ", sobrescrever: false },
        sinal,
      ),
    ).rejects.toBeInstanceOf(ErroUsuario);
    expect(gerador.pedidos).toHaveLength(0);
    const master = umMaster();
    const duplicado = { ...master, skills: [...master.skills, master.skills[0]] };
    const geradorRuim = new GeradorEstruturadoRoteirizado().quando("importar-curriculo", duplicado);
    await expect(
      importarCurriculo(
        { curriculo: new ArmazemCurriculoMemoria(null), gerador: geradorRuim },
        { caminhoArquivo: "x.pdf", ehPdf: true, sobrescrever: false },
        sinal,
      ),
    ).rejects.toBeInstanceOf(ErroValidacao);
  });
});

describe("adicionarVagas (AC3)", () => {
  it("cria, ignora a da fila, cria duplicada da enviada, reabre pulada e ignora manual", () => {
    const amb = criarAmbienteAplicacao();
    const deps = { vagas: amb.vagas };
    const [nova] = adicionarVagas(deps, {
      urls: [
        "https://jobs.lever.co/acme/0f8e4c7a-1111-2222-3333-444455556666/apply?lever-source=x",
      ],
    });
    expect(nova).toMatchObject({ resultado: "adicionada", id: 1 });
    expect(amb.vagas.buscar(1 as IdVaga)).toMatchObject({
      canal: "lever",
      motor: "lever",
      status: "NOVA",
    });

    const [repetida] = adicionarVagas(deps, {
      urls: ["https://jobs.lever.co/acme/0f8e4c7a-1111-2222-3333-444455556666"],
    });
    expect(repetida).toMatchObject({ resultado: "ja_na_fila", id: 1 });

    transicionarVaga(amb.vagas, 1 as IdVaga, "PRONTA");
    transicionarVaga(amb.vagas, 1 as IdVaga, "ENVIADA");
    const [dup] = adicionarVagas(deps, {
      urls: ["https://jobs.lever.co/acme/0f8e4c7a-1111-2222-3333-444455556666"],
    });
    expect(dup).toMatchObject({ resultado: "duplicada", id: 2 });
    expect(amb.vagas.buscar(2 as IdVaga)).toMatchObject({
      status: "DUPLICADA",
      motivo: "url_ja_enviada",
      duplicadaDe: 1,
    });

    const [outra] = adicionarVagas(deps, { urls: ["https://boards.greenhouse.io/acme/jobs/9"] });
    transicionarVaga(amb.vagas, outra!.id!, "PRONTA");
    transicionarVaga(amb.vagas, outra!.id!, "PULADA");
    amb.vagas.atualizar(outra!.id!, umaAtualizacao({ tentativasPreparo: 2 }));
    expect(
      adicionarVagas(deps, { urls: ["https://job-boards.greenhouse.io/acme/jobs/9"] })[0],
    ).toMatchObject({ resultado: "reaberta" });
    expect(amb.vagas.buscar(outra!.id!)).toMatchObject({ status: "NOVA", tentativasPreparo: 0 });

    const [manual] = adicionarVagas(deps, { urls: ["https://www.linkedin.com/jobs/view/1"] });
    transicionarVaga(amb.vagas, manual!.id!, "MANUAL", { motivo: "easy_apply" });
    expect(
      adicionarVagas(deps, { urls: ["https://www.linkedin.com/jobs/view/1/"] })[0],
    ).toMatchObject({ resultado: "ignorada", status: "MANUAL" });
    expect(adicionarVagas(deps, { urls: ["não é url"] })[0]).toMatchObject({
      resultado: "invalida",
    });
  });
});

describe("renderizarMaster e abrirNavegador", () => {
  it("gera o master genérico e só regera quando o master muda", async () => {
    const amb = criarAmbienteAplicacao();
    const deps = amb.deps();
    expect(await renderizarMaster(deps, sinal)).toEqual({
      pdf: "/dados/master/Ana-Silva-Curriculo.pdf",
      paginas: 1,
    });
    expect(amb.artefatos.textoMaster).toContain("Ana Exemplo da Silva");
    amb.artefatos.geradoEm = "2026-10-05T00:00:00-03:00";
    amb.curriculo.atualizado = "2026-10-01T00:00:00-03:00";
    await garantirMasterGenerico(deps, sinal);
    expect(amb.renderizador.curriculos).toHaveLength(1);
    amb.curriculo.atualizado = "2026-10-09T00:00:00-03:00";
    await garantirMasterGenerico(deps, sinal);
    expect(amb.renderizador.curriculos).toHaveLength(2);
  });

  it("abre o navegador do Camaleão", async () => {
    let aberto = false;
    await abrirNavegador({
      navegador: { abrirParaLogin: () => ((aberto = true), Promise.resolve()) },
    });
    expect(aberto).toBe(true);
  });
});

describe("listarStatus, registrarRetorno e listarFalhas (AC21)", () => {
  it("conta por status, filtra e mostra o que aguarda o usuário", () => {
    const amb = criarAmbienteAplicacao();
    const a = amb.inserirVaga("https://github.com/backend-br/vagas/issues/1");
    const b = amb.inserirVaga("https://empresa.gupy.io/jobs/2");
    amb.inserirVaga("https://empresa.gupy.io/jobs/3");
    transicionarVaga(amb.vagas, a.id, "MANUAL", { motivo: "candidatura_por_email" });
    amb.artefatos.gravarJson(a.id, "analise.json", {
      idioma: "pt",
      senioridade: "nao_informada",
      modelo: "nao_informado",
      regime: "nao_informado",
      afirmativa: { exclusiva: false, grupos: [] },
      requisitos: [],
      keywords: [{ termo: "x", tipo: "pratica" }],
      alertas: [],
      destinoEmail: "vagas@acme.com",
    });
    transicionarVaga(amb.vagas, b.id, "PRONTA");
    transicionarVaga(amb.vagas, b.id, "PENDENTE_TESTE");
    const dados = listarStatus(amb.deps(), {});
    expect(dados.contagens).toMatchObject({ MANUAL: 1, PENDENTE_TESTE: 1, NOVA: 1, ENVIADA: 0 });
    expect(dados.linhas).toHaveLength(3);
    expect(dados.aguardandoVoce.manuais[0]).toMatchObject({ id: a.id, destino: "vagas@acme.com" });
    expect(dados.aguardandoVoce.pendentesTeste.map((l) => l.id)).toEqual([b.id]);
    expect(listarStatus(amb.deps(), { status: "NOVA" }).linhas).toHaveLength(1);
  });

  it("registra retornos válidos e recusa os inválidos", () => {
    const amb = criarAmbienteAplicacao();
    const v = amb.inserirVaga("https://empresa.gupy.io/jobs/2");
    transicionarVaga(amb.vagas, v.id, "PRONTA");
    transicionarVaga(amb.vagas, v.id, "PENDENTE_TESTE");
    registrarRetorno({ vagas: amb.vagas }, { id: v.id, status: "ENVIADA" });
    registrarRetorno(
      { vagas: amb.vagas },
      { id: v.id, status: "EM_PROCESSO", etapa: "tecnica", nota: "dia 12" },
    );
    expect(amb.vagas.buscar(v.id)).toMatchObject({ status: "EM_PROCESSO", etapa: "tecnica" });
    expect(amb.vagas.listarEventos(v.id).at(-1)).toMatchObject({ nota: "dia 12" });
    expect(() => registrarRetorno({ vagas: amb.vagas }, { id: v.id, status: "ENVIADA" })).toThrow(
      ErroTransicaoInvalida,
    );
    expect(() => registrarRetorno({ vagas: amb.vagas }, { id: v.id, status: "ENVIADA" })).toThrow(
      "ENVIADA só vale a partir de MANUAL ou PENDENTE_TESTE. Aceitas a partir de EM_PROCESSO: EM_PROCESSO, OFERTA, RECUSADA",
    );
    expect(() =>
      registrarRetorno({ vagas: amb.vagas }, { id: v.id, status: "EM_PROCESSO" }),
    ).toThrow(/exige etapa/);
    expect(() =>
      registrarRetorno({ vagas: amb.vagas }, { id: 99 as IdVaga, status: "OFERTA" }),
    ).toThrow(ErroUsuario);
  });

  it("agrupa falhas por conector e passo e ranqueia motores sem conector", () => {
    const amb = criarAmbienteAplicacao();
    const base = {
      versaoConector: "1.0.0",
      dominio: "x",
      idVaga: 1,
      seletor: null,
      erro: "e",
      stack: null,
      resultadoAgente: null,
      passosAgente: [],
      resolvida: false,
    };
    amb.falhas.registrar(
      {
        ...base,
        tipo: "falha_conector",
        conector: "greenhouse",
        motor: "greenhouse",
        url: "https://a/1",
        data: "2026-10-01",
        passo: "preencher:CPF",
      },
      "",
    );
    amb.falhas.registrar(
      {
        ...base,
        tipo: "falha_conector",
        conector: "greenhouse",
        motor: "greenhouse",
        url: "https://a/2",
        data: "2026-10-05",
        passo: "preencher:CPF",
        idVaga: 2,
      },
      "",
    );
    amb.falhas.registrar(
      {
        ...base,
        tipo: "sem_conector",
        conector: null,
        motor: "workday",
        url: "https://w",
        data: "2026-10-02",
        passo: null,
        idVaga: 3,
      },
      "",
    );
    amb.falhas.registrar(
      {
        ...base,
        tipo: "sem_conector",
        conector: null,
        motor: "dominio:vagas.b3.com.br",
        url: "https://b",
        data: "2026-10-02",
        passo: null,
        idVaga: 4,
      },
      "",
    );
    amb.falhas.registrar(
      {
        ...base,
        tipo: "sem_conector",
        conector: null,
        motor: "workday",
        url: "https://w2",
        data: "2026-10-03",
        passo: null,
        idVaga: 5,
      },
      "",
    );
    const dados = listarFalhas({ falhas: amb.falhas });
    expect(dados.grupos).toEqual([
      {
        conector: "greenhouse",
        passo: "preencher:CPF",
        quantidade: 2,
        maisRecente: "2026-10-05",
        urlMaisRecente: "https://a/2",
      },
    ]);
    expect(dados.semConector).toEqual([
      { motor: "workday", quantidade: 2 },
      { motor: "vagas.b3.com.br", quantidade: 1 },
    ]);
  });
});

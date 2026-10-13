import { describe, expect, it, vi } from "vitest";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import type { Campo } from "#dominio/respostas/campo.ts";
import { esquemaRespostasSalvas } from "#dominio/respostas/pacote.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { ErroLimiteUso } from "../portas/erros.ts";
import { umaAnalise, umCurriculoGerado } from "#testes/apoio/builders.ts";
import { criarAmbienteAplicacao, type AmbienteAplicacao } from "#testes/apoio/deps-aplicacao.ts";
import { InteracaoRoteirizada } from "#testes/apoio/fakes/basicos.ts";
import {
  CatalogoConectoresFake,
  ConectorFake,
  ExecutorAgenteFake,
  FormularioAbertoFake,
} from "#testes/apoio/fakes/formularios.ts";
import { prepararVagas } from "./preparar-vagas.ts";
import { aplicarVagas } from "./aplicar-vagas.ts";

const URL_GH = "https://job-boards.greenhouse.io/acme/jobs/1";
const PDF_1 = "/dados/vagas/00001/Ana_Silva_CV.pdf";
const sinal = () => new AbortController().signal;

const CAMPOS: Campo[] = [
  { id: "first_name", rotulo: "First Name", tipo: "texto", obrigatorio: true, categoria: "padrao" },
  {
    id: "q1",
    rotulo: "Por que você quer trabalhar aqui?",
    tipo: "textarea",
    obrigatorio: true,
    categoria: "pergunta",
  },
];

function criar(opcoes: { campos?: Campo[] | null; agente?: ExecutorAgenteFake } = {}) {
  const formulario = new FormularioAbertoFake({
    valores: [
      { rotulo: "First Name", valor: "Ana", ehArquivo: false },
      { rotulo: "Por que você quer trabalhar aqui?", valor: "Admiro o produto.", ehArquivo: false },
      { rotulo: "Resume/CV", valor: "Ana_Silva_CV.pdf", ehArquivo: true },
    ],
  });
  const conector = new ConectorFake("greenhouse", formulario);
  conector.campos = opcoes.campos === undefined ? CAMPOS : opcoes.campos;
  const amb = criarAmbienteAplicacao({
    catalogo: new CatalogoConectoresFake(conector),
    ...(opcoes.agente ? { agente: opcoes.agente } : {}),
  });
  amb.gerador
    .sempre("analisar-vaga", umaAnalise())
    .sempre("tailoring", umCurriculoGerado())
    .sempre("responder-perguntas", {
      respostas: [{ campoId: "q1", valor: "Admiro o produto.", fonte: "gerada" }],
      salarios: [],
    });
  return { amb, conector, formulario };
}

async function prontas(amb: AmbienteAplicacao, ...urls: string[]): Promise<IdVaga[]> {
  // Cargos distintos por vaga: com o mesmo cargo e empresa, a deduplicação por chave descartaria as antigas.
  const ids = (urls.length > 0 ? urls : [URL_GH]).map((u, i) => {
    amb.extrator.definir(u, {
      estruturada: {
        empresa: "Empresa X",
        cargo: `Desenvolvedora Sênior ${String(i + 1)}`,
        descricao: "TypeScript e React",
        localidade: "Remoto",
      },
      textoPagina: "TypeScript e React",
    });
    return amb.inserirVaga(u).id;
  });
  await prepararVagas(amb.deps(), { forcar: false, reavaliar: false }, sinal());
  for (const id of ids) expect(amb.vagas.buscar(id)?.status).toBe("PRONTA");
  return ids;
}

function roteiro(
  amb: AmbienteAplicacao,
  ...respostas: (string | number | boolean)[]
): InteracaoRoteirizada {
  amb.interacao = new InteracaoRoteirizada(respostas);
  return amb.interacao;
}

describe("aplicarVagas: revisão e envio", () => {
  it("envia só com a escolha do usuário, registra telas e respostas e aprende no banco (AC12, AC13)", async () => {
    const { amb, formulario } = criar();
    const [id] = await prontas(amb);
    const interacao = roteiro(amb, "enviar");
    const resumo = await aplicarVagas(amb.deps(), { simular: false }, sinal());
    expect(resumo).toEqual({ revisadas: 1, desfechos: { enviada: 1 }, interrompido: null });
    expect(formulario.enviados).toBe(1);
    expect(formulario.fechado).toBe(true);
    expect(formulario.telas).toEqual([
      "/dados/vagas/00001/antes-envio.png",
      "/dados/vagas/00001/confirmacao.png",
    ]);
    expect(amb.vagas.buscar(id as IdVaga)).toMatchObject({ status: "ENVIADA", anexoManual: false });
    expect(interacao.resumos[0]).toMatchObject({
      empresa: "Empresa X",
      rota: "conector",
      caminhoPdf: PDF_1,
      gapsRestantes: [],
    });
    expect(interacao.resumos[0]?.respostas).toContainEqual({
      rotulo: "Por que você quer trabalhar aqui?",
      valor: "Admiro o produto.",
      nova: true,
    });
    expect(amb.curriculo.banco).toMatchObject([
      {
        id: "r-0001",
        pergunta: "Por que você quer trabalhar aqui?",
        resposta: "Admiro o produto.",
        tipo: "texto",
      },
    ]);
    expect(amb.vagas.listarEventos(id as IdVaga).map((e) => e.paraStatus)).toContain("ENVIADA");
  });

  it("simulação preenche e revisa, mas nunca envia (AC14)", async () => {
    const { amb, formulario } = criar();
    const [id] = await prontas(amb);
    roteiro(amb, "enviar");
    const resumo = await aplicarVagas(amb.deps(), { simular: true }, sinal());
    expect(resumo.desfechos).toEqual({ mantida: 1 });
    expect(formulario.enviados).toBe(0);
    expect(formulario.fechado).toBe(true);
    expect(amb.vagas.buscar(id as IdVaga)?.status).toBe("PRONTA");
    expect(amb.interacao.informacoes).toContain("simulação: nada enviado (a vaga continua PRONTA)");
    expect(amb.curriculo.banco).toEqual([]);
  });

  it("pular, manual, ver o PDF e sair respeitam a escolha e fecham a aba", async () => {
    const { amb, formulario } = criar();
    const [a, b, c] = await prontas(
      amb,
      URL_GH,
      "https://job-boards.greenhouse.io/acme/jobs/2",
      "https://job-boards.greenhouse.io/acme/jobs/3",
    );
    const interacao = roteiro(amb, "ver_pdf", "pular", "manual", "sair");
    const resumo = await aplicarVagas(amb.deps(), { simular: false }, sinal());
    expect(resumo).toEqual({
      revisadas: 3,
      desfechos: { pulada: 1, manual: 1, sair: 1 },
      interrompido: "usuario",
    });
    expect(interacao.arquivosAbertos).toEqual([PDF_1]);
    expect(amb.vagas.buscar(a as IdVaga)?.status).toBe("PULADA");
    expect(amb.vagas.buscar(b as IdVaga)).toMatchObject({
      status: "MANUAL",
      motivo: "escolha_usuario",
    });
    expect(amb.vagas.buscar(c as IdVaga)?.status).toBe("PRONTA");
    expect(formulario.enviados).toBe(0);
    expect(formulario.fechado).toBe(true);
  });

  it("revisa na ordem de aderência e respeita --id", async () => {
    const { amb } = criar();
    amb.gerador.quando("analisar-vaga", umaAnalise({ modelo: "presencial" }), umaAnalise());
    amb.config = { ...amb.config, paralelo: 1 };
    const [menor, maior] = await prontas(
      amb,
      URL_GH,
      "https://job-boards.greenhouse.io/acme/jobs/2",
    );
    expect(amb.vagas.buscar(menor as IdVaga)?.aderencia).toBeLessThan(
      amb.vagas.buscar(maior as IdVaga)?.aderencia ?? 0,
    );
    const interacao = roteiro(amb, "pular", "pular");
    await aplicarVagas(amb.deps(), { simular: true }, sinal());
    expect(interacao.resumos.map((r) => r.vagaId)).toEqual([maior, menor]);

    await expect(
      aplicarVagas(amb.deps(), { simular: true, id: menor as IdVaga }, sinal()),
    ).rejects.toThrow(ErroUsuario);
  });

  it("confirmação indeterminada pergunta ao usuário; não confirmada pode ficar PRONTA (AC13)", async () => {
    const { amb, formulario } = criar();
    const [a, b, c] = await prontas(
      amb,
      URL_GH,
      "https://job-boards.greenhouse.io/acme/jobs/2",
      "https://job-boards.greenhouse.io/acme/jobs/3",
    );
    formulario.desfecho = "indeterminada";
    roteiro(amb, "enviar", true);
    await aplicarVagas(amb.deps(), { simular: false, id: a as IdVaga }, sinal());
    expect(amb.vagas.buscar(a as IdVaga)?.status).toBe("ENVIADA");

    roteiro(amb, "enviar", false, false);
    expect(
      (await aplicarVagas(amb.deps(), { simular: false, id: b as IdVaga }, sinal())).desfechos,
    ).toEqual({ mantida: 1 });
    expect(amb.vagas.buscar(b as IdVaga)?.status).toBe("PRONTA");

    formulario.desfecho = "nao_confirmada";
    const interacao = roteiro(amb, "enviar", true);
    await aplicarVagas(amb.deps(), { simular: false, id: c as IdVaga }, sinal());
    expect(interacao.perguntas.at(-1)).toBe(
      "Não detectei a confirmação. Marcar como enviada mesmo assim?",
    );
    expect(amb.vagas.buscar(c as IdVaga)?.status).toBe("ENVIADA");
  });

  it("pedido de teste vira PENDENTE_TESTE e anexo trocado vira anexoManual", async () => {
    const { amb, formulario } = criar();
    const [id] = await prontas(amb);
    formulario.desfecho = "pendente_teste";
    formulario.valores = [
      { rotulo: "Resume/CV", valor: "C:/Users/ana/Downloads/outro.pdf", ehArquivo: true },
    ];
    roteiro(amb, "enviar");
    expect((await aplicarVagas(amb.deps(), { simular: false }, sinal())).desfechos).toEqual({
      pendente_teste: 1,
    });
    expect(amb.vagas.buscar(id as IdVaga)).toMatchObject({
      status: "PENDENTE_TESTE",
      anexoManual: true,
    });
  });

  it("edição feita no navegador conta como resposta editada e corrige o banco", async () => {
    const { amb, formulario } = criar();
    await prontas(amb);
    formulario.valores = [
      {
        rotulo: "Por que você quer trabalhar aqui?",
        valor: "Pelo impacto do produto.",
        ehArquivo: false,
      },
    ];
    roteiro(amb, "enviar");
    await aplicarVagas(amb.deps(), { simular: false }, sinal());
    expect(amb.curriculo.banco[0]?.resposta).toBe("Pelo impacto do produto.");
  });
});

describe("aplicarVagas: rodada de gaps (AC10)", () => {
  const analiseComGap = umaAnalise({
    requisitos: [
      ...umaAnalise().requisitos,
      {
        texto: "Experiência com Docker",
        termo: "Docker",
        obrigatorio: true,
        status: "ausente",
        evidencias: [],
      },
    ],
  });

  it("'sim' grava a skill aprendida, recalcula a aderência e refaz o currículo", async () => {
    const { amb } = criar();
    amb.gerador.sempre("analisar-vaga", analiseComGap);
    const [id] = await prontas(amb);
    const antes = amb.vagas.buscar(id as IdVaga)?.aderencia ?? 0;
    const tailoringsAntes = amb.gerador.pedidosDe("tailoring").length;
    const interacao = roteiro(amb, true, 4, "Pipeline de deploy na Aurora", "pular");
    await aplicarVagas(amb.deps(), { simular: false }, sinal());
    expect(interacao.perguntas[0]).toBe("A vaga pede Docker (1 vaga). Você tem?");
    expect(amb.curriculo.master?.skills.find((s) => s.id === "docker")).toMatchObject({
      origem: "aprendido",
      anos: 4,
      evidencia: "Pipeline de deploy na Aurora",
      vagaOrigem: id,
    });
    expect(amb.gerador.pedidosDe("tailoring")).toHaveLength(tailoringsAntes + 1);
    expect(amb.vagas.buscar(id as IdVaga)?.aderencia).toBeGreaterThan(antes);
    expect(amb.vagas.listarGapsAbertos([id as IdVaga])).toEqual([]);
  });

  it("'não' grava em gaps.yaml e não refaz nada", async () => {
    const { amb } = criar();
    amb.gerador.sempre("analisar-vaga", analiseComGap);
    await prontas(amb);
    const tailoringsAntes = amb.gerador.pedidosDe("tailoring").length;
    roteiro(amb, false, "pular");
    await aplicarVagas(amb.deps(), { simular: false }, sinal());
    expect(amb.curriculo.negados).toEqual(["docker"]);
    expect(amb.gerador.pedidosDe("tailoring")).toHaveLength(tailoringsAntes);
  });

  it("limite de uso ao refazer o currículo encerra o aplicar sem revisar", async () => {
    const { amb, formulario } = criar();
    amb.gerador.sempre("analisar-vaga", analiseComGap);
    await prontas(amb);
    amb.gerador.quando("tailoring", new ErroLimiteUso());
    roteiro(amb, true, 2, "x");
    expect(await aplicarVagas(amb.deps(), { simular: false }, sinal())).toEqual({
      revisadas: 0,
      desfechos: {},
      interrompido: "limite",
    });
    expect(formulario.telas).toEqual([]);
  });
});

describe("aplicarVagas: conector, agente e registro de falhas (AC15 a AC18)", () => {
  it("falha do conector: registra com HTML sanitizado e o agente assume com o contexto", async () => {
    const formularioAgente = new FormularioAbertoFake({ rota: "agente" });
    const agente = new ExecutorAgenteFake({
      tipo: "pronto",
      formulario: formularioAgente,
      passos: ["retomou", "preencheu"],
      perguntasRespondidasNaHora: [{ rotulo: "Pergunta extra", valor: "Resposta extra" }],
    });
    const { amb, conector, formulario } = criar({ agente });
    const [id] = await prontas(amb);
    conector.falharNoPasso = "preencher:email";
    formulario.html =
      "<form><input name='nome' value='Ana Exemplo da Silva'><input value='ana.exemplo@email.com'></form>";
    const interacao = roteiro(amb, "enviar");
    await aplicarVagas(amb.deps(), { simular: false }, sinal());

    const [registro] = [...amb.falhas.registros.values()];
    expect(registro).toMatchObject({
      tipo: "falha_conector",
      conector: "greenhouse",
      versaoConector: "1.0.0",
      passo: "preencher:email",
      seletor: "#campo",
      resultadoAgente: "pronto",
      passosAgente: ["retomou", "preencheu"],
      idVaga: id,
    });
    const snapshot = [...amb.falhas.snapshots.values()][0] ?? "";
    expect(snapshot).not.toContain("Ana Exemplo da Silva");
    expect(snapshot).not.toContain("ana.exemplo@email.com");
    expect(agente.entradas[0]).toMatchObject({
      contextoFalha: { passo: "preencher:email" },
      urlCandidatura: URL_GH,
      saldo: { turnos: 40, ms: 600_000 },
    });
    expect(agente.entradas[0]?.hostsPermitidos).toContain("job-boards.greenhouse.io");
    expect(interacao.resumos[0]).toMatchObject({ rota: "agente" });
    expect(interacao.resumos[0]?.respostas).toContainEqual({
      rotulo: "Pergunta extra",
      valor: "Resposta extra",
      nova: true,
    });
    expect(formularioAgente.enviados).toBe(1);
    expect(formulario.enviados).toBe(0);
    expect(amb.vagas.buscar(id as IdVaga)?.status).toBe("ENVIADA");
  });

  it("sem conector: o agente preenche, a vaga entra em sem_conector e o teto vira MANUAL", async () => {
    const agente = new ExecutorAgenteFake({ tipo: "teto", passos: ["abriu"] });
    const { amb } = criar({ campos: null, agente });
    const url = "https://acme.wd5.myworkdayjobs.com/pt-BR/careers/job/Remoto/Dev_R1";
    amb.resolvedor.definir(url, {
      motor: "workday",
      urlResolvida: url,
      canonica: url as never,
      rota: "agente",
    });
    const [id] = await prontas(amb, url);
    roteiro(amb);
    const resumo = await aplicarVagas(amb.deps(), { simular: false }, sinal());
    expect(resumo.desfechos).toEqual({ manual_automatica: 1 });
    expect(amb.vagas.buscar(id as IdVaga)).toMatchObject({
      status: "MANUAL",
      motivo: "teto_agente",
    });
    expect([...amb.falhas.registros.values()][0]).toMatchObject({
      tipo: "sem_conector",
      motor: "workday",
      conector: null,
      resultadoAgente: "teto",
    });
    expect(amb.interacao.informacoes.at(-1)).toBe(
      `vaga #${String(id)}: marcada como MANUAL (teto_agente)`,
    );
  });

  it("perguntas novas no formulário são respondidas ao vivo e salvas", async () => {
    const { amb, conector } = criar();
    const [id] = await prontas(amb);
    conector.camposAoVivo = [
      {
        id: "q9",
        rotulo: "Conte um desafio técnico",
        tipo: "textarea",
        obrigatorio: true,
        categoria: "pergunta",
      },
    ];
    amb.gerador.quando("responder-perguntas", {
      respostas: [{ campoId: "q9", valor: "Migrei o monólito.", fonte: "gerada" }],
      salarios: [],
    });
    const interacao = roteiro(amb, "pular");
    await aplicarVagas(amb.deps(), { simular: false }, sinal());
    const salvas =
      amb.artefatos.lerJson(id as IdVaga, "respostas.json", esquemaRespostasSalvas) ?? [];
    expect(salvas.map((r) => r.campoId)).toEqual(
      expect.arrayContaining(["first_name", "q1", "q9"]),
    );
    expect(interacao.resumos[0]?.respostas).toContainEqual({
      rotulo: "Conte um desafio técnico",
      valor: "Migrei o monólito.",
      nova: true,
    });
  });

  it("erro inesperado numa vaga não interrompe as demais", async () => {
    const { amb, conector } = criar();
    amb.config = { ...amb.config, paralelo: 1 };
    const [a, b] = await prontas(amb, URL_GH, "https://job-boards.greenhouse.io/acme/jobs/2");
    vi.spyOn(conector, "abrirEPreencher").mockRejectedValueOnce(new Error("navegador caiu"));
    const interacao = roteiro(amb, "pular");
    const resumo = await aplicarVagas(amb.deps(), { simular: false }, sinal());
    expect(resumo.desfechos).toEqual({ erro: 1, pulada: 1 });
    expect(interacao.informacoes).toContain(
      `vaga #${String(a)}: erro inesperado (detalhes no log); ela continua PRONTA`,
    );
    expect(amb.vagas.buscar(a as IdVaga)?.status).toBe("PRONTA");
    expect(amb.vagas.buscar(b as IdVaga)?.status).toBe("PULADA");
    expect(amb.registrador.entradas.some((e) => e.nivel === "erro")).toBe(true);
  });

  it("limite de uso ao responder ao vivo encerra com aviso", async () => {
    const { amb, conector } = criar();
    await prontas(amb);
    conector.camposAoVivo = [
      {
        id: "q9",
        rotulo: "Nova pergunta",
        tipo: "textarea",
        obrigatorio: true,
        categoria: "pergunta",
      },
    ];
    amb.gerador.quando("responder-perguntas", new ErroLimiteUso());
    roteiro(amb);
    expect((await aplicarVagas(amb.deps(), { simular: false }, sinal())).interrompido).toBe(
      "limite",
    );
  });

  it("Ctrl+C num prompt da revisão encerra como cancelado, sem contar erro nem enviar (AC26)", async () => {
    const { amb, formulario } = criar();
    await prontas(amb, URL_GH, "https://job-boards.greenhouse.io/acme/jobs/2");
    const controle = new AbortController();
    amb.interacao = new (class extends InteracaoRoteirizada {
      override escolher<T extends string>(): Promise<T> {
        controle.abort();
        const erro = new Error("User force closed the prompt");
        erro.name = "ExitPromptError";
        return Promise.reject(erro);
      }
    })();
    const resumo = await aplicarVagas(amb.deps(), { simular: false }, controle.signal);
    expect(resumo).toEqual({ revisadas: 0, desfechos: {}, interrompido: "cancelado" });
    expect(formulario.enviados).toBe(0);
    expect(formulario.fechado).toBe(true);
  });

  it("cancelado antes de começar não abre nada", async () => {
    const { amb, formulario } = criar();
    await prontas(amb);
    const controle = new AbortController();
    controle.abort();
    roteiro(amb);
    expect((await aplicarVagas(amb.deps(), { simular: false }, controle.signal)).interrompido).toBe(
      "cancelado",
    );
    expect(formulario.telas).toEqual([]);
  });
});

// Caminhos menos comuns de preparar e aplicar que mudam o status final da vaga.
import { describe, expect, it } from "vitest";
import { ErroExtracao } from "../portas/erros.ts";
import { umaAnalise, umCurriculoGerado } from "#testes/apoio/builders.ts";
import { criarAmbienteAplicacao, type AmbienteAplicacao } from "#testes/apoio/deps-aplicacao.ts";
import { InteracaoRoteirizada } from "#testes/apoio/fakes/basicos.ts";
import { ExecutorAgenteFake } from "#testes/apoio/fakes/formularios.ts";
import { aplicarVagas } from "./aplicar-vagas.ts";
import { prepararVagas } from "./preparar-vagas.ts";

const sinal = () => new AbortController().signal;
const preparar = (amb: AmbienteAplicacao, reavaliar = false) =>
  prepararVagas(amb.deps(), { forcar: false, reavaliar }, sinal());

function ambiente(): AmbienteAplicacao {
  const amb = criarAmbienteAplicacao();
  amb.gerador
    .sempre("analisar-vaga", umaAnalise())
    .sempre("tailoring", umCurriculoGerado())
    .sempre("responder-perguntas", { respostas: [], salarios: [] });
  amb.config = { ...amb.config, paralelo: 1 };
  return amb;
}

describe("preparar: rotas manuais", () => {
  it("Easy Apply continua MANUAL mesmo se os materiais falharem, com aviso no log", async () => {
    const amb = ambiente();
    const url = "https://www.linkedin.com/jobs/view/77";
    const vaga = amb.inserirVaga(url);
    amb.resolvedor.definir(url, {
      motor: "linkedin",
      urlResolvida: url,
      canonica: url as never,
      rota: "manual",
    });
    amb.extrator.definir(url, new ErroExtracao("página exige login"));
    await preparar(amb);
    expect(amb.vagas.buscar(vaga.id)).toMatchObject({ status: "MANUAL", motivo: "easy_apply" });
    expect(amb.registrador.entradas).toContainEqual(
      expect.objectContaining({
        nivel: "avisar",
        mensagem: `vaga #${String(vaga.id)}: materiais do Easy Apply incompletos`,
      }),
    );
  });

  it("issue cujo link leva a página sem formulário, ou sem forma de candidatura, vira MANUAL", async () => {
    const amb = ambiente();
    const issueLink = "https://github.com/backend-br/vagas/issues/1";
    const issueVazia = "https://github.com/backend-br/vagas/issues/2";
    const comLink = amb.inserirVaga(issueLink);
    const semNada = amb.inserirVaga(issueVazia);
    for (const url of [issueLink, issueVazia]) {
      amb.resolvedor.definir(url, {
        motor: "github",
        urlResolvida: url,
        canonica: url as never,
        rota: "a_definir",
      });
      amb.extrator.definir(url, {
        estruturada: {
          empresa: "Acme",
          cargo: `Dev ${url.slice(-1)}`,
          descricao: "TypeScript",
          localidade: "Remoto",
        },
        textoPagina: "TypeScript",
      });
    }
    amb.resolvedor.definir("https://acme.com/carreiras/dev", {
      motor: "dominio:acme.com",
      urlResolvida: "https://acme.com/carreiras/dev",
      canonica: "https://acme.com/carreiras/dev" as never,
      rota: "manual",
    });
    amb.gerador.quando(
      "analisar-vaga",
      umaAnalise({ comoCandidatar: { tipo: "link", valor: "https://acme.com/carreiras/dev" } }),
      umaAnalise(),
    );
    await preparar(amb);
    expect(amb.vagas.buscar(comLink.id)).toMatchObject({
      status: "MANUAL",
      motivo: "sem_formulario",
      motor: "dominio:acme.com",
    });
    expect(amb.vagas.buscar(semNada.id)).toMatchObject({
      status: "MANUAL",
      motivo: "sem_formulario",
    });
  });
});

describe("preparar: erros e reavaliação", () => {
  it("erro inesperado (não tipado) vira ERRO_PREPARO e vai ao log como erro", async () => {
    const amb = ambiente();
    const vaga = amb.inserirVaga("https://job-boards.greenhouse.io/acme/jobs/1");
    amb.extrator.definir(
      "https://job-boards.greenhouse.io/acme/jobs/1",
      new TypeError("cannot read x"),
    );
    const resumo = await preparar(amb);
    expect(amb.vagas.buscar(vaga.id)).toMatchObject({
      status: "ERRO_PREPARO",
      motivo: "extracao_falhou",
    });
    expect(resumo.erros).toEqual([
      { id: vaga.id, motivo: "extracao_falhou", mensagem: "cannot read x" },
    ]);
    expect(amb.registrador.entradas.some((e) => e.nivel === "erro")).toBe(true);
  });

  it("--reavaliar ignora outros motivos de descarte e mantém as que continuam abaixo do mínimo", async () => {
    const amb = ambiente();
    const baixa = amb.inserirVaga("https://job-boards.greenhouse.io/acme/jobs/1");
    const duplicada = amb.inserirVaga("https://job-boards.greenhouse.io/acme/jobs/2");
    amb.gerador.sempre(
      "analisar-vaga",
      umaAnalise({
        modelo: "presencial",
        requisitos: [
          { texto: "Go", termo: "Go", obrigatorio: true, status: "ausente", evidencias: [] },
        ],
      }),
    );
    await preparar(amb);
    amb.vagas.transicionar(duplicada.id, "NOVA");
    amb.vagas.transicionar(duplicada.id, "DESCARTADA", {
      motivo: "duplicada_antiga",
      duplicadaDe: baixa.id,
    });
    const resumo = await preparar(amb, true);
    expect(resumo.reavaliadas).toBe(0);
    expect(amb.vagas.buscar(baixa.id)).toMatchObject({
      status: "DESCARTADA",
      motivo: "aderencia_baixa",
    });
    expect(amb.vagas.buscar(duplicada.id)?.motivo).toBe("duplicada_antiga");
  });
});

describe("aplicar: desfechos do agente", () => {
  it.each([
    ["sem_formulario", "sem_formulario"],
    ["easy_apply", "easy_apply"],
  ] as const)("agente sem conector devolve %s e a vaga vira MANUAL %s", async (tipo, motivo) => {
    const amb = criarAmbienteAplicacao({
      agente: new ExecutorAgenteFake({ tipo, passos: ["abriu"] }),
    });
    amb.gerador.sempre("analisar-vaga", umaAnalise()).sempre("tailoring", umCurriculoGerado());
    const url = "https://acme.wd5.myworkdayjobs.com/careers/job/Dev_R1";
    amb.resolvedor.definir(url, {
      motor: "workday",
      urlResolvida: url,
      canonica: url as never,
      rota: "agente",
    });
    const vaga = amb.inserirVaga(url);
    await preparar(amb);
    amb.interacao = new InteracaoRoteirizada();
    const resumo = await aplicarVagas(amb.deps(), { simular: false }, sinal());
    expect(resumo.desfechos).toEqual({ manual_automatica: 1 });
    expect(amb.vagas.buscar(vaga.id)).toMatchObject({ status: "MANUAL", motivo });
  });
});

// Executa a suíte de contrato para os 8 conectores da v1.
import { readFileSync } from "node:fs";
import { describe, expect, it, afterAll, beforeAll } from "vitest";
import { definicaoAshby } from "#infra/conectores/ashby/conector.ts";
import { definicaoGreenhouse } from "#infra/conectores/greenhouse/conector.ts";
import { definicaoGupy } from "#infra/conectores/gupy/conector.ts";
import { definicaoInhire } from "#infra/conectores/inhire/conector.ts";
import { definicaoLever } from "#infra/conectores/lever/conector.ts";
import { definicaoSmartRecruiters } from "#infra/conectores/smartrecruiters/conector.ts";
import { definicaoTeamtailor } from "#infra/conectores/teamtailor/conector.ts";
import { definicaoWorkable } from "#infra/conectores/workable/conector.ts";
import { DEFINICOES_V1 } from "#infra/conectores/definicoes.ts";
import { criarConector } from "#infra/conectores/base/conector-formulario.ts";
import { ErroFalhaConector } from "#aplicacao/portas/erros.ts";
import { MOTORES_COM_CONECTOR_V1 } from "#dominio/vagas/motores.ts";
import { PASTA_FIXTURES, lerFixture } from "#testes/apoio/fixtures.ts";
import {
  aquecerNavegador,
  criarAmbienteConector,
  httpComRespostas,
  pdfDeTeste,
} from "#testes/apoio/harness-conector.ts";
import { umPacote } from "#testes/apoio/builders.ts";
import { descreverContratoConector } from "./contrato-conector.ts";
import { descreverContratoFormulario } from "./contrato-formulario.ts";

const UUID_LEVER = "2193db3f-77c5-43b8-b030-8f92c9882bf1";
const UUID_ASHBY = "34413f8d-26bf-4bbc-8ade-eb309a0e2245";
const apiGreenhouse = JSON.parse(
  readFileSync(`${PASTA_FIXTURES}greenhouse/api-vaga.json`, "utf8"),
) as unknown;

descreverContratoConector({
  definicao: definicaoGreenhouse,
  url: "https://job-boards.greenhouse.io/gitlab/jobs/8860302002",
  mapa: [
    [
      "https://job-boards.greenhouse.io/gitlab/jobs/8860302002",
      { arquivo: "greenhouse/formulario.html" },
    ],
  ],
  http: httpComRespostas({
    "https://boards-api.greenhouse.io/v1/boards/gitlab/jobs/8860302002": apiGreenhouse,
  }),
  leituraNoPreparo: "campos",
  textoConfirmacao: "Thank you for applying.",
});

descreverContratoConector({
  definicao: definicaoLever,
  url: `https://jobs.lever.co/spotify/${UUID_LEVER}`,
  mapa: [
    [`https://jobs.lever.co/spotify/${UUID_LEVER}/apply`, { arquivo: "lever/formulario.html" }],
  ],
  leituraNoPreparo: "campos",
  textoConfirmacao: "Application submitted!",
});

descreverContratoConector({
  definicao: definicaoAshby,
  url: `https://jobs.ashbyhq.com/ramp/${UUID_ASHBY}`,
  mapa: [
    [
      `https://jobs.ashbyhq.com/ramp/${UUID_ASHBY}/application`,
      { arquivo: "ashby/formulario.html" },
    ],
  ],
  leituraNoPreparo: "campos",
  textoConfirmacao: "Thanks for applying! Your application was submitted.",
});

descreverContratoConector({
  definicao: definicaoWorkable,
  url: "https://apply.workable.com/huggingface/j/DB4D7C0EC8",
  mapa: [
    [
      "https://apply.workable.com/huggingface/j/DB4D7C0EC8/apply/",
      { arquivo: "workable/formulario.html" },
    ],
  ],
  leituraNoPreparo: "campos",
  textoConfirmacao: "Thank you for applying!",
});

descreverContratoConector({
  definicao: definicaoTeamtailor,
  url: "https://career.teamtailor.com/jobs/8118064-uk-account-executive-smb",
  mapa: [
    [
      "https://career.teamtailor.com/jobs/8118064-uk-account-executive-smb",
      { arquivo: "teamtailor/formulario.html" },
    ],
  ],
  leituraNoPreparo: "campos",
  textoConfirmacao: "Thank you for your application!",
});

descreverContratoConector({
  definicao: definicaoSmartRecruiters,
  url: "https://jobs.smartrecruiters.com/Experian/744000154773459",
  mapa: [
    [
      "https://jobs.smartrecruiters.com/Experian/744000154773459?oga=true",
      { arquivo: "smartrecruiters/formulario.html" },
    ],
  ],
  leituraNoPreparo: "nulo",
});

descreverContratoConector({
  definicao: definicaoGupy,
  url: "https://empresa.gupy.io/jobs/1234567",
  mapa: [["https://empresa.gupy.io/jobs/1234567", { arquivo: "gupy/formulario.html" }]],
  leituraNoPreparo: "nulo",
  desfechoEsperado: "pendente_teste",
});

descreverContratoConector({
  definicao: definicaoInhire,
  url: "https://empresa.inhire.app/vagas/abc/analista",
  mapa: [["https://empresa.inhire.app/vagas/abc/analista", { arquivo: "inhire/formulario.html" }]],
  leituraNoPreparo: "campos",
});

describe("catálogo e comportamentos comuns", () => {
  it("há exatamente uma definição para cada motor da v1", () => {
    expect(DEFINICOES_V1.map((d) => d.motor).sort()).toEqual([...MOTORES_COM_CONECTOR_V1].sort());
  });

  const ambiente = criarAmbienteConector(
    [
      [
        "https://empresa.inhire.app/vagas/captcha",
        {
          html: `${lerFixture("inhire/formulario.html")}<iframe src="https://www.google.com/recaptcha/api2/anchor" width="300" height="80"></iframe>`,
        },
      ],
      ["https://empresa.gupy.io/jobs/999", { arquivo: "gupy/login.html" }],
      ["https://empresa.inhire.app/vagas/cadastro", { arquivo: "inhire/cadastro.html" }],
      [
        "https://empresa.inhire.app/vagas/vazia",
        { html: "<html><body><p>Vaga encerrada</p></body></html>" },
      ],
    ],
    {
      cofre: {
        obterOuCriar: () => ({
          email: "ana.exemplo@example.com",
          senha: "Senha!Forte123",
          recemCriada: true,
        }),
      },
    },
  );
  beforeAll(() => aquecerNavegador(ambiente.leitor));
  afterAll(() => ambiente.fechar());
  const pausas: string[] = [];
  const ctx = {
    responderAoVivo: () => Promise.resolve([]),
    aguardarUsuario: (m: string) => {
      pausas.push(m);
      return Promise.resolve();
    },
  };
  const sinal = new AbortController().signal;

  it("pausa para o usuário diante de CAPTCHA, sem tentar resolvê-lo", async () => {
    pausas.length = 0;
    const conector = criarConector(definicaoInhire, ambiente.deps);
    const formulario = await conector.abrirEPreencher(
      "https://empresa.inhire.app/vagas/captcha",
      umPacote({ pdfCurriculo: pdfDeTeste() }),
      ctx,
      sinal,
    );
    expect(pausas.some((p) => p.includes("CAPTCHA"))).toBe(true);
    await formulario.fechar();
  });

  it("conta global pede login ao usuário; conta por tenant preenche a credencial do cofre", async () => {
    pausas.length = 0;
    const gupy = criarConector(definicaoGupy, ambiente.deps);
    await (
      await gupy.abrirEPreencher("https://empresa.gupy.io/jobs/999", umPacote(), ctx, sinal)
    ).fechar();
    expect(pausas[0]).toMatch(/Faça login/);

    pausas.length = 0;
    const inhire = criarConector(definicaoInhire, ambiente.deps);
    await inhire.abrirEPreencher(
      "https://empresa.inhire.app/vagas/cadastro",
      umPacote(),
      ctx,
      sinal,
    );
    const pagina = ambiente.paginas.at(-1);
    expect(pausas[0]).toMatch(/senha nova/);
    expect(await pagina?.locator("#e").inputValue()).toBe("ana.exemplo@example.com");
    expect(await pagina?.locator("#c").inputValue()).toBe("Senha!Forte123");
  });

  it("falha de navegação vira ErroFalhaConector com o formulário parcial", async () => {
    const conector = criarConector(definicaoWorkable, ambiente.deps);
    const erro = await conector
      .abrirEPreencher("https://apply.workable.com/inexistente/j/X", umPacote(), ctx, sinal)
      .catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroFalhaConector);
    expect((erro as ErroFalhaConector).passo).toBe("abrir");
    expect((erro as ErroFalhaConector).formulario).toBeDefined();
  });

  it("formulário vazio não preenche nada e não lança", async () => {
    const conector = criarConector(definicaoInhire, ambiente.deps);
    const formulario = await conector.abrirEPreencher(
      "https://empresa.inhire.app/vagas/vazia",
      umPacote(),
      ctx,
      sinal,
    );
    expect(await formulario.lerValores()).toEqual([]);
    expect(await formulario.confirmarEnvio(600)).toBe("nao_confirmada");
  });
});

descreverContratoFormulario("FormularioPlaywright (conector)", async () => {
  const ambiente = criarAmbienteConector([
    ["https://empresa.inhire.app/vagas/f", { arquivo: "inhire/formulario.html" }],
  ]);
  const conector = criarConector(definicaoInhire, ambiente.deps);
  const formulario = await conector.abrirEPreencher(
    "https://empresa.inhire.app/vagas/f",
    umPacote({ pdfCurriculo: pdfDeTeste() }),
    { responderAoVivo: () => Promise.resolve([]), aguardarUsuario: () => Promise.resolve() },
    new AbortController().signal,
  );
  return { formulario, encerrar: () => ambiente.fechar() };
});

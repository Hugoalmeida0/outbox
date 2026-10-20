// Fluxos das telas sobre o agente simulado (AC5, AC6, AC7, AC11).
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import type { EventoExecucao } from "@contrato";
import { App } from "../App.tsx";
import { CHAVE_TOKEN } from "../agente/cliente.ts";
import {
  agenteFalso,
  json,
  renderizar,
  rotasBase,
  statusCom,
  streamFalso,
  TOKEN,
} from "../testes/agente-falso.tsx";

beforeEach(() => {
  globalThis.localStorage.setItem(CHAVE_TOKEN, TOKEN);
});

const VAGA = { id: 7, empresa: "Acme", cargo: "Dev", status: "NOVA", motivo: null } as const;

describe("início e adicionar (AC5)", () => {
  it("mostra contagens, o onboarding enquanto falta perfil e o atalho para colar links", async () => {
    const { buscar } = agenteFalso({
      ...rotasBase(),
      "GET /status": () => json(statusCom({ NOVA: 2, PRONTA: 5 })),
      "GET /curriculo": () =>
        json({
          masterExiste: true,
          masterAtualizadoEm: null,
          perfilValido: false,
          errosPerfil: [],
        }),
    });
    renderizar(<App />, buscar);
    expect(
      await screen.findByRole("heading", { name: "Bora? 5 vagas prontinhas pra você revisar." }),
    ).toBeVisible();
    const onboarding = screen.getByRole("region", { name: "Primeiros passos" });
    expect(within(onboarding).getByText("Seu perfil")).toBeVisible();
    expect(within(onboarding).getByRole("link", { name: "Preencher" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Colar links de vagas" })).toBeVisible();
  });

  it("adiciona uma URL por linha, sem comentários, e resume como a CLI", async () => {
    const { buscar, chamadas } = agenteFalso({
      ...rotasBase(),
      "POST /vagas": () =>
        json({
          itens: [
            { url: "https://a.exemplo/1", resultado: "adicionada", id: 1 },
            { url: "lixo", resultado: "invalida", detalhe: "URL inválida" },
          ],
        }),
    });
    renderizar(<App />, buscar, { rota: "/vagas/adicionar" });
    await userEvent.type(
      await screen.findByLabelText("Links das vagas"),
      "# semana{enter}https://a.exemplo/1{enter}{enter}lixo",
    );
    await userEvent.click(screen.getByRole("button", { name: /Adicionar 2 à fila/ }));
    expect(await screen.findByRole("heading", { name: "adicionada 1 · inválida 1" })).toBeVisible();
    expect(chamadas.find((c) => c.caminho === "/vagas")?.corpo).toEqual({
      urls: ["https://a.exemplo/1", "lixo"],
    });
  });
});

describe("preparar ao vivo (AC6)", () => {
  it("mostra a etapa de cada vaga, para como o Ctrl+C e resume no tom da marca", async () => {
    const stream = streamFalso();
    const { buscar, chamadas } = agenteFalso({
      ...rotasBase(),
      "POST /execucoes/preparar": () => json({ id: "ex1" }, 202),
      "GET /execucoes/ex1/eventos": () => stream.resposta(),
      "POST /execucoes/ex1/cancelar": () => json({ estado: "cancelando" }),
    });
    renderizar(<App />, buscar, { rota: "/preparar" });
    await userEvent.click(await screen.findByLabelText(/abaixo da aderência mínima/));
    await userEvent.click(screen.getByRole("button", { name: "Bora preparar" }));
    await waitFor(() =>
      expect(chamadas.find((c) => c.caminho === "/execucoes/preparar")?.corpo).toEqual({
        forcar: true,
        reavaliar: false,
        paralelo: 2,
      }),
    );
    act(() => {
      stream.emitir({ tipo: "progresso", evento: { tipo: "inicio", total: 1, paralelo: 2 } });
      stream.emitir({
        tipo: "progresso",
        evento: { tipo: "etapa", vaga: VAGA, etapa: "analisar" },
      });
    });
    expect(await screen.findByText("analisando a aderência")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Preparando 1 vaga" })).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Parar" }));
    expect(chamadas.some((c) => c.caminho === "/execucoes/ex1/cancelar")).toBe(true);
    act(() => {
      stream.emitir({
        tipo: "progresso",
        evento: { tipo: "concluida", vaga: { ...VAGA, status: "PRONTA" }, erro: null },
      });
      stream.emitir({
        tipo: "fim",
        resultado: {
          comando: "preparar",
          processadas: 1,
          contagens: { PRONTA: 1 },
          erros: [],
          reavaliadas: 0,
          interrompido: null,
        },
      });
      stream.fechar();
    });
    expect(await screen.findByText("Deixei 1 vaga prontinha pra você revisar.")).toBeVisible();
    expect(screen.getByText("PRONTA")).toBeVisible();
    expect(screen.getByRole("link", { name: "Revisar e aplicar" })).toBeVisible();
  });
});

describe("aplicar (AC7)", () => {
  const MENU: EventoExecucao = {
    tipo: "pergunta",
    pergunta: {
      id: "p9",
      tipo: "escolha",
      mensagem: "O que fazer com esta vaga?",
      opcoes: [
        { valor: "enviar", rotulo: "[e]nviar a candidatura" },
        { valor: "pular", rotulo: "[p]ular esta vaga" },
      ],
    },
  };
  const REVISAO: EventoExecucao = {
    tipo: "revisao",
    resumo: {
      vagaId: 7,
      empresa: "Acme",
      cargo: "Dev",
      motor: "greenhouse",
      rota: "conector",
      url: "https://job-boards.greenhouse.io/acme/jobs/7",
      aderencia: 82,
      atsAntes: 62,
      atsDepois: 87,
      gapsRestantes: ["kafka"],
      alertas: [],
      respostas: [
        { rotulo: "Nome", valor: "Ana", nova: false, vaziaNaPagina: false },
        { rotulo: "Pretensão salarial", valor: "(sem resposta)", nova: true, vaziaNaPagina: true },
      ],
      cartaInicio: "Olá, Acme!",
      urlPdf: "/arquivos/abc",
    },
  };

  it("retoma a execução ativa, mostra a revisão e só envia depois da confirmação", async () => {
    const stream = streamFalso();
    const { buscar, chamadas } = agenteFalso({
      ...rotasBase(),
      "GET /execucoes/ativas": () =>
        json({
          execucoes: [{ id: "ap1", comando: "aplicar", iniciadaEm: "2026-10-20T10:00:00Z" }],
        }),
      "GET /execucoes/ap1/eventos": () => stream.resposta(),
      "POST /execucoes/ap1/respostas": () => json({ ok: true }),
    });
    stream.emitir({ tipo: "aviso", mensagem: "Vaga #7 Acme · Dev (1 de 1): abrindo o formulário" });
    stream.emitir(REVISAO);
    stream.emitir(MENU);
    renderizar(<App />, buscar, { rota: "/aplicar" });

    const revisao = await screen.findByRole("region", { name: "Revisão da vaga #7" });
    expect(within(revisao).getByText("62 →")).toBeVisible();
    expect(
      within(revisao).getByText("1 campo ficou vazio na página: confira antes de decidir."),
    ).toBeVisible();
    expect(within(revisao).getByText("vazia na página")).toBeVisible();
    expect(within(revisao).getByRole("link", { name: /currículo desta vaga/ })).toHaveAttribute(
      "href",
      "http://127.0.0.1:4321/arquivos/abc",
    );

    await userEvent.click(screen.getByRole("button", { name: "Enviar a candidatura" }));
    expect(screen.getByText(/não dá para desfazer/)).toBeVisible();
    expect(chamadas.some((c) => c.caminho === "/execucoes/ap1/respostas")).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar a candidatura" }));
    await userEvent.click(screen.getByRole("button", { name: "Sim, enviar" }));
    await waitFor(() =>
      expect(chamadas.find((c) => c.caminho === "/execucoes/ap1/respostas")?.corpo).toEqual({
        perguntaId: "p9",
        valor: "enviar",
      }),
    );
    act(() => {
      stream.emitir({ tipo: "respondida", perguntaId: "p9" });
    });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Sim, enviar" })).toBeNull());
  });

  it("pergunta da rodada de gaps vira card de sim ou não", async () => {
    const stream = streamFalso();
    const { buscar, chamadas } = agenteFalso({
      ...rotasBase(),
      "POST /execucoes/aplicar": () => json({ id: "ap2" }, 202),
      "GET /execucoes/ap2/eventos": () => stream.resposta(),
      "POST /execucoes/ap2/respostas": () => json({ ok: true }),
    });
    renderizar(<App />, buscar, { rota: "/aplicar" });
    await userEvent.click(await screen.findByLabelText(/Só simular/));
    await userEvent.click(screen.getByRole("button", { name: "Bora aplicar" }));
    act(() => {
      stream.emitir({
        tipo: "pergunta",
        pergunta: { id: "g1", tipo: "sim_nao", mensagem: "A vaga pede Kafka (3 vagas). Você tem?" },
      });
    });
    expect(await screen.findByRole("heading", { name: /Kafka/ })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Não" }));
    await waitFor(() =>
      expect(chamadas.find((c) => c.caminho === "/execucoes/ap2/respostas")?.corpo).toEqual({
        perguntaId: "g1",
        valor: false,
      }),
    );
    expect(chamadas.find((c) => c.caminho === "/execucoes/aplicar")?.corpo).toEqual({
      simular: true,
    });
  });
});

describe("perfil (AC11)", () => {
  const BRUTO = {
    documentos: { cpf: "123.456.789-09" },
    endereco: { cidade: "São Paulo", pais: "Brasil", cep: "01000-000" },
    salario: { clt_brl_mensal: 15000, pj_brl_mensal: 20000, usd_anual: 60000 },
    disponibilidade: { avisoPrevioDias: 30, inicioImediato: false, viagens: true, mudanca: false },
    autorizacaoTrabalho: { brasil: true, precisaSponsorship: true, paisesAutorizados: ["BR"] },
    preferencias: { modelos: ["remoto"], cidades: [], senioridades: ["senior"], regimes: ["clt"] },
    comoSoube: "LinkedIn",
  };

  it("mascara os sensíveis, mostra por campo e aponta os erros devolvidos pelo agente", async () => {
    const { buscar, chamadas } = agenteFalso({
      ...rotasBase(),
      "GET /perfil": () => json({ perfil: null, dadosBrutos: BRUTO, erros: [] }),
      "PUT /perfil": () =>
        json(
          {
            mensagem: "endereco.cidade: obrigatório",
            erros: [{ caminho: "endereco.cidade", mensagem: "informe a cidade" }],
          },
          422,
        ),
    });
    renderizar(<App />, buscar, { rota: "/curriculo/perfil" });
    const cpf = await screen.findByLabelText("CPF");
    expect(cpf).toHaveAttribute("type", "password");
    expect(cpf).toHaveValue("123.456.789-09");
    await userEvent.click(screen.getByRole("button", { name: "Mostrar CPF" }));
    expect(cpf).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("CEP")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("CLT, mensal (R$)")).toHaveAttribute("type", "password");
    expect(screen.queryByLabelText("Gênero")).toBeNull();

    await userEvent.clear(screen.getByLabelText("Cidade"));
    await userEvent.click(screen.getByLabelText(/^Deixar em branco \(os campos de pretensão/));
    await userEvent.click(screen.getByRole("button", { name: "Salvar perfil" }));
    expect(await screen.findByText("informe a cidade")).toBeVisible();
    expect(screen.getByLabelText("Cidade")).toHaveAttribute("aria-invalid", "true");
    const enviado = chamadas.find((c) => c.metodo === "PUT")?.corpo as Record<string, unknown>;
    expect(enviado).not.toHaveProperty("salario");
    expect(enviado.documentos).toEqual({ cpf: "123.456.789-09" });
    expect(enviado.endereco).toEqual({ cep: "01000-000", pais: "Brasil" });
  });
});

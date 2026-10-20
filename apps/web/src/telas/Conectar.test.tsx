// AC14: sem agente, "Conectar o Camaleão" com o comando e nova tentativa a cada 3 s; contrato diferente
// pede atualização; pareamento pelo código digitado ou pelo fragmento #parear=.
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../App.tsx";
import { CHAVE_TOKEN } from "../agente/cliente.ts";
import { INTERVALO_RECONEXAO_MS } from "../agente/conexao.tsx";
import { agenteFalso, CURRICULO_OK, json, renderizar, SAUDE } from "../testes/agente-falso.tsx";

const STATUS_VAZIO = {
  contagens: Object.fromEntries(
    [
      "NOVA",
      "PRONTA",
      "ERRO_PREPARO",
      "DESCARTADA",
      "DUPLICADA",
      "MANUAL",
      "PULADA",
      "ENVIADA",
      "PENDENTE_TESTE",
      "EM_PROCESSO",
      "OFERTA",
      "RECUSADA",
    ].map((s) => [s, 0]),
  ),
  linhas: [],
  aguardandoVoce: { manuais: [], pendentesTeste: [] },
};

const rotasProntas = {
  "GET /saude": json(SAUDE),
  "GET /curriculo": json(CURRICULO_OK),
  "GET /status": json(STATUS_VAZIO),
  "GET /execucoes/ativas": json({ execucoes: [] }),
};

afterEach(() => {
  vi.useRealTimers();
  globalThis.history.replaceState(null, "", "/");
});

describe("tela de conexão (AC14)", () => {
  it("sem agente mostra o comando e tenta de novo a cada 3 segundos", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let online = false;
    const { buscar } = agenteFalso({ "GET /saude": json(SAUDE) });
    const tentativas: string[] = [];
    const fetchVariavel: typeof fetch = async (entrada, init) => {
      tentativas.push(entrada instanceof Request ? entrada.url : entrada.toString());
      if (!online) throw new TypeError("Failed to fetch");
      return buscar(entrada, init);
    };
    renderizar(<App />, fetchVariavel);
    expect(await screen.findByRole("heading", { name: /Conectar o Camaleão/ })).toBeVisible();
    expect(screen.getByText("npm run camaleao -- agente")).toBeVisible();
    expect(screen.getByText(/acesso à rede local/)).toBeVisible();
    await screen.findByText(/Tento de novo a cada 3 segundos/);
    const antes = tentativas.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVALO_RECONEXAO_MS);
    });
    expect(tentativas.length).toBe(antes + 1);
    online = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVALO_RECONEXAO_MS);
    });
    expect(await screen.findByText(/Só falta o código/)).toBeVisible();
  });

  it("contrato de outra versão pede para atualizar o Camaleão", async () => {
    const { buscar } = agenteFalso({ "GET /saude": json({ ...SAUDE, versaoContrato: 99 }) });
    renderizar(<App />, buscar);
    expect(await screen.findByRole("heading", { name: /desatualizado/ })).toBeVisible();
  });

  it("pareia com o código digitado e guarda o token no navegador", async () => {
    const { buscar, chamadas } = agenteFalso({
      ...rotasProntas,
      "POST /pareamento": json({ token: "t".repeat(43) }),
    });
    renderizar(<App />, buscar);
    const campo = await screen.findByLabelText("Código de pareamento");
    await userEvent.type(campo, "abcd-efgh");
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }));
    expect(await screen.findByRole("navigation", { name: "Principal" })).toBeVisible();
    expect(globalThis.localStorage.getItem(CHAVE_TOKEN)).toBe("t".repeat(43));
    expect(chamadas.find((c) => c.caminho === "/pareamento")?.corpo).toEqual({
      codigo: "abcd-efgh",
    });
    const status = chamadas.find((c) => c.caminho === "/status");
    expect(status?.cabecalhos.get("Authorization")).toBe(`Bearer ${"t".repeat(43)}`);
  });

  it("código errado mostra a mensagem do agente", async () => {
    const { buscar } = agenteFalso({
      "GET /saude": json(SAUDE),
      "POST /pareamento": json({ mensagem: "Código inválido ou expirado." }, 401),
    });
    renderizar(<App />, buscar);
    await userEvent.type(await screen.findByLabelText("Código de pareamento"), "ZZZZZZZZ");
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Código inválido ou expirado.");
  });

  it("pareia sozinho pelo fragmento #parear= e o apaga do endereço", async () => {
    globalThis.history.replaceState(null, "", "/#parear=ABCDEFGH");
    const { buscar, chamadas } = agenteFalso({
      ...rotasProntas,
      "POST /pareamento": json({ token: "u".repeat(43) }),
    });
    renderizar(<App />, buscar);
    expect(await screen.findByRole("navigation", { name: "Principal" })).toBeVisible();
    expect(chamadas.find((c) => c.caminho === "/pareamento")?.corpo).toEqual({
      codigo: "ABCDEFGH",
    });
    expect(globalThis.location.hash).toBe("");
  });

  it("token recusado (401) volta ao pareamento", async () => {
    globalThis.localStorage.setItem(CHAVE_TOKEN, "velho".repeat(9));
    const { buscar } = agenteFalso({
      "GET /saude": json(SAUDE),
      "GET /curriculo": json({ mensagem: "pareamento necessário" }, 401),
    });
    renderizar(<App />, buscar);
    expect(await screen.findByText(/Só falta o código/)).toBeVisible();
    await waitFor(() => expect(globalThis.localStorage.getItem(CHAVE_TOKEN)).toBeNull());
  });
});

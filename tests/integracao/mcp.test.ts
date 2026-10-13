// Servidor MCP `outbox-segredos` (AC18): ferramentas, validação de entrada e retorno sem valores.
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import {
  criarServidorSegredos,
  hostsDoAmbiente,
  vagaDoAmbiente,
  type ServicoFerramentas,
} from "#interfaces/mcp/outbox-segredos.ts";

const SERVIDOR = fileURLToPath(
  new URL("../../src/interfaces/mcp/outbox-segredos.ts", import.meta.url),
);
const FERRAMENTAS = [
  "email_cadastro",
  "preencher_dado_sensivel",
  "preencher_resposta_protegida",
  "preencher_senha",
];

function servicoEspiao() {
  const chamadas: unknown[][] = [];
  const servico: ServicoFerramentas = {
    emailCadastro: () => ({ email: "ana.exemplo@example.com" }),
    preencherSenha: (seletor) => {
      chamadas.push(["senha", seletor]);
      return Promise.resolve({ ok: true, senhaRecemCriada: true });
    },
    preencherDadoSensivel: (chave, seletor, formato) => {
      chamadas.push(["dado", chave, seletor, formato]);
      return Promise.resolve({ ok: true });
    },
    preencherRespostaProtegida: (chave, seletor) => {
      chamadas.push(["resposta", chave, seletor]);
      return Promise.resolve({ ok: false, erro: "host não permitido" });
    },
  };
  return { servico, chamadas };
}

let fechar: (() => Promise<void>) | null = null;
afterEach(async () => {
  await fechar?.();
  fechar = null;
});

async function conectar(servico: ServicoFerramentas): Promise<Client> {
  const [lado, outro] = InMemoryTransport.createLinkedPair();
  const servidor = criarServidorSegredos(servico);
  const cliente = new Client({ name: "teste", version: "1.0.0" });
  await Promise.all([servidor.connect(outro), cliente.connect(lado)]);
  fechar = async () => {
    await cliente.close();
    await servidor.close();
  };
  return cliente;
}

function texto(resultado: Awaited<ReturnType<Client["callTool"]>>): string {
  const [primeiro] = resultado.content as { type: string; text: string }[];
  return primeiro?.text ?? "";
}

describe("servidor MCP outbox-segredos", () => {
  it("expõe as quatro ferramentas e repassa as entradas validadas", async () => {
    const { servico, chamadas } = servicoEspiao();
    const cliente = await conectar(servico);
    expect((await cliente.listTools()).tools.map((t) => t.name).sort()).toEqual(FERRAMENTAS);

    expect(
      JSON.parse(texto(await cliente.callTool({ name: "email_cadastro", arguments: {} }))),
    ).toEqual({
      email: "ana.exemplo@example.com",
    });
    const senha = await cliente.callTool({
      name: "preencher_senha",
      arguments: { seletor: "#senha" },
    });
    expect(JSON.parse(texto(senha))).toEqual({ ok: true, senhaRecemCriada: true });
    expect(senha.isError).toBeUndefined();
    await cliente.callTool({
      name: "preencher_dado_sensivel",
      arguments: { chave: "dataNascimento", seletor: "#nasc", formato: "aaaa-mm-dd" },
    });
    expect(chamadas).toEqual([
      ["senha", "#senha"],
      ["dado", "dataNascimento", "#nasc", "aaaa-mm-dd"],
    ]);
  });

  it("devolve isError quando a ação é recusada e rejeita entradas fora do schema", async () => {
    const { servico, chamadas } = servicoEspiao();
    const cliente = await conectar(servico);
    const recusada = await cliente.callTool({
      name: "preencher_resposta_protegida",
      arguments: { chaveResposta: "p3", seletor: "select#salario" },
    });
    expect(recusada.isError).toBe(true);
    expect(JSON.parse(texto(recusada))).toEqual({ ok: false, erro: "host não permitido" });

    const chaveInvalida = await cliente.callTool({
      name: "preencher_dado_sensivel",
      arguments: { chave: "senha", seletor: "#x" },
    });
    expect(chaveInvalida.isError).toBe(true);
    const respostaInvalida = await cliente.callTool({
      name: "preencher_resposta_protegida",
      arguments: { chaveResposta: "salario", seletor: "#x" },
    });
    expect(respostaInvalida.isError).toBe(true);
    expect(chamadas).toEqual([["resposta", "p3", "select#salario"]]);
  });

  it("lê a vaga e a allowlist do ambiente", () => {
    expect(hostsDoAmbiente(" Job-Boards.greenhouse.io, *.gupy.io ,,")).toEqual([
      "job-boards.greenhouse.io",
      "*.gupy.io",
    ]);
    expect(hostsDoAmbiente(undefined)).toEqual([]);
    expect(vagaDoAmbiente("12")).toBe(12);
    expect(vagaDoAmbiente("abc")).toBeNull();
    expect(vagaDoAmbiente(undefined)).toBeNull();
  });

  it("roda como processo stdio, do jeito que o agente o inicia", async () => {
    const transporte = new StdioClientTransport({
      command: process.execPath,
      args: ["--disable-warning=ExperimentalWarning", SERVIDOR],
      env: {
        ...(process.env as Record<string, string>),
        OUTBOX_VAGA_ID: "1",
        OUTBOX_HOSTS_PERMITIDOS: "127.0.0.1",
      },
      stderr: "pipe",
    });
    const cliente = new Client({ name: "teste", version: "1.0.0" });
    await cliente.connect(transporte);
    fechar = () => cliente.close();
    expect((await cliente.listTools()).tools.map((t) => t.name).sort()).toEqual(FERRAMENTAS);
  });
});

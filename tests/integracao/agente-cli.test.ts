// `camaleao agente` (AC3): servidor real numa porta efêmera, só em 127.0.0.1, com pareamento pelo código
// impresso e reaproveitamento de um agente já aberto na porta.
import { createServer, type Server } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { Hono } from "hono";
import { afterEach, describe, expect, it } from "vitest";
import { criarContainer, type Container } from "#composicao";
import { CONFIG_PADRAO } from "#infra/config/esquema-config.ts";
import { executar } from "#interfaces/cli/principal.ts";
import { iniciarServidor } from "#interfaces/http/servidor.ts";

async function portaLivre(): Promise<number> {
  const servidor = createServer();
  await new Promise<void>((r) => servidor.listen(0, "127.0.0.1", r));
  const endereco = servidor.address();
  await new Promise((r) => servidor.close(r));
  return typeof endereco === "object" && endereco ? endereco.port : 0;
}

const SITE = "https://camaleao.exemplo";

interface Rodada {
  readonly linhas: string[];
  readonly erros: string[];
  readonly abertas: string[];
  readonly codigo: Promise<number>;
  readonly interromper: () => void;
}

function rodarAgente(porta: number, ...args: string[]): Rodada {
  const raiz = mkdtempSync(join(tmpdir(), "camaleao-agente-cli-"));
  const linhas: string[] = [];
  const erros: string[] = [];
  const abertas: string[] = [];
  let ouvinte: (() => void) | null = null;
  const config = {
    ...CONFIG_PADRAO,
    agente: { ...CONFIG_PADRAO.agente, porta, origensPermitidas: ["http://localhost:5173", SITE] },
  };
  const codigo = executar(["node", "camaleao", "agente", ...args], {
    saida: {
      escrever: (t) => linhas.push(stripVTControlCharacters(t)),
      erro: (t) => erros.push(stripVTControlCharacters(t)),
    },
    fabricarContainer: (): Container => ({
      ...criarContainer({ raiz, config, nivelLog: "erro", escreverTerminal: () => undefined }),
      abrirJanelaNavegador: (url) => {
        abertas.push(url);
        return Promise.resolve();
      },
    }),
    alvoSinais: {
      on: (_e, o) => (ouvinte = o),
      off: () => undefined,
    },
    sair: () => undefined,
  });
  return { linhas, erros, abertas, codigo, interromper: () => ouvinte?.() };
}

let abertos: Server[] = [];
afterEach(async () => {
  await Promise.all(abertos.map((s) => new Promise((r) => s.close(r))));
  abertos = [];
});

function servidorFalso(porta: number, responder: (url: string) => [number, string]): Promise<void> {
  const s = createServer((req, res) => {
    const [status, corpo] = responder(req.url ?? "");
    res.statusCode = status;
    res.end(corpo);
  });
  abertos.push(s);
  return new Promise((r) => s.listen(porta, "127.0.0.1", r));
}

describe("camaleao agente (AC3)", () => {
  it("escuta em 127.0.0.1, imprime código e site, abre o site pareado e encerra no Ctrl+C", async () => {
    const porta = await portaLivre();
    const rodada = rodarAgente(porta);
    await expect.poll(() => rodada.linhas.length, { timeout: 15_000 }).toBeGreaterThanOrEqual(3);
    expect(rodada.linhas.slice(0, 3)).toEqual([
      `Camaleão rodando em http://127.0.0.1:${String(porta)}`,
      expect.stringMatching(/^Código de pareamento: [A-Z2-9]{4}-[A-Z2-9]{4}$/),
      `Site: ${SITE}`,
    ]);
    const codigo = /: (.+)$/.exec(rodada.linhas[1] ?? "")?.[1] ?? "";
    await expect.poll(() => rodada.abertas).toEqual([`${SITE}/#parear=${codigo.replace("-", "")}`]);

    const saude = await fetch(`http://127.0.0.1:${String(porta)}/saude`);
    expect(await saude.json()).toMatchObject({ app: "camaleao", versaoContrato: 1 });
    const pareado = await fetch(`http://127.0.0.1:${String(porta)}/pareamento`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: SITE },
      body: JSON.stringify({ codigo }),
    });
    expect(pareado.status).toBe(200);
    const { token } = (await pareado.json()) as { token: string };
    const status = await fetch(`http://127.0.0.1:${String(porta)}/status`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(status.status).toBe(200);
    // O código usado é trocado e o novo aparece no terminal.
    await expect.poll(() => rodada.linhas.at(-1)).toMatch(/^Código de pareamento: /);

    rodada.interromper();
    expect(await rodada.codigo).toBe(130);
    await expect(fetch(`http://127.0.0.1:${String(porta)}/saude`)).rejects.toThrow();
  });

  it("com outro agente do Camaleão na porta, só reabre o site e sai com 0", async () => {
    const porta = await portaLivre();
    await servidorFalso(porta, () => [
      200,
      JSON.stringify({ app: "camaleao", versao: "1.0.0", versaoContrato: 1 }),
    ]);
    const rodada = rodarAgente(porta);
    expect(await rodada.codigo).toBe(0);
    expect(rodada.abertas).toEqual([SITE]);
    expect(rodada.linhas.join("\n")).toContain("já está rodando");
  });

  it("com outro processo na porta, sai com 1 e explica como ajustar", async () => {
    const porta = await portaLivre();
    await servidorFalso(porta, () => [404, "nada aqui"]);
    const rodada = rodarAgente(porta, "--sem-navegador");
    expect(await rodada.codigo).toBe(1);
    expect(rodada.erros.join("\n")).toContain(
      `porta ${String(porta)} ocupada por outro processo; ajuste agente.porta no config.yaml`,
    );
    expect(rodada.abertas).toEqual([]);
  });

  it("iniciarServidor liga o socket só no loopback", async () => {
    const app = new Hono().get("/", (c) => c.text("ok"));
    const servidor = await iniciarServidor(app, 0);
    try {
      expect(servidor.porta).toBeGreaterThan(0);
      expect(servidor.endereco).toBe("127.0.0.1");
      const r = await fetch(`http://127.0.0.1:${String(servidor.porta)}/`);
      expect(await r.text()).toBe("ok");
    } finally {
      await servidor.fechar();
    }
  });
});

import { createServer as criarServidorHttp, type Server } from "node:http";
import { createServer as criarServidorTcp } from "node:net";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NavegadorCamaleao } from "#infra/navegador/navegador-camaleao.ts";

async function portaLivre(): Promise<number> {
  return new Promise((resolver) => {
    const s = criarServidorTcp();
    s.listen(0, "127.0.0.1", () => {
      const endereco = s.address();
      s.close(() => resolver(typeof endereco === "object" && endereco ? endereco.port : 0));
    });
  });
}

describe("NavegadorCamaleao (Chromium real, headless)", () => {
  let porta = 0;
  let servidor: Server;
  let urlPagina = "";
  let navegador: NavegadorCamaleao;

  beforeAll(async () => {
    porta = await portaLivre();
    servidor = criarServidorHttp((_req, res) => res.end("<html><body>vaga local</body></html>"));
    await new Promise<void>((r) => servidor.listen(0, "127.0.0.1", r));
    const endereco = servidor.address();
    urlPagina = `http://127.0.0.1:${typeof endereco === "object" && endereco ? endereco.port : 0}/vaga`;
    navegador = new NavegadorCamaleao({
      portaCdp: porta,
      executavel: "chromium",
      pastaPerfil: mkdtempSync(join(tmpdir(), "camaleao-perfil-")),
      argsExtras: ["--headless=new"],
    });
  });

  afterAll(async () => {
    // Encerra o Chromium de teste pelo próprio CDP.
    const conexao = await navegador.garantir();
    const sessao = await conexao.newBrowserCDPSession();
    await sessao.send("Browser.close").catch(() => undefined);
    servidor.close();
  });

  it("lança o navegador com perfil persistente e reaproveita a conexão", async () => {
    const primeira = await navegador.garantir();
    expect(primeira.isConnected()).toBe(true);
    expect(await navegador.garantir()).toBe(primeira);
    expect(await navegador.resolverExecutavel()).toMatch(/chrom/i);
  });

  it("abre páginas e encontra a mais recente com URL http(s)", async () => {
    const pagina = await navegador.paginaNova();
    await pagina.goto(urlPagina);
    await navegador.abrirParaLogin();
    const recente = await navegador.paginaMaisRecente();
    expect(recente?.url()).toBe(urlPagina);
  });

  it("prefere a aba da vaga a uma aba do usuário aberta depois (ex.: portal corporativo)", async () => {
    const portal = await navegador.paginaNova();
    await portal.goto(urlPagina.replace("127.0.0.1", "localhost").replace("/vaga", "/portal"));
    expect((await navegador.paginaMaisRecente())?.url()).toContain("/portal");
    expect((await navegador.paginaMaisRecente(["127.0.0.1"]))?.url()).toBe(urlPagina);
    await portal.close();
  });

  it("desconectar mantém o navegador aberto e uma nova CLI reconecta", async () => {
    await navegador.desconectar();
    const resposta = await fetch(`${navegador.endpointCdp}/json/version`);
    expect(resposta.ok).toBe(true);
    const outraCli = new NavegadorCamaleao({
      portaCdp: porta,
      executavel: "chromium",
      // Perfil absoluto e temporário: se a reconexão falhasse e lançasse outro navegador, nada vaza.
      pastaPerfil: mkdtempSync(join(tmpdir(), "camaleao-perfil-nao-usado-")),
    });
    expect((await outraCli.paginaMaisRecente())?.url()).toBe(urlPagina);
    await outraCli.desconectar();
  });
});

describe("NavegadorCamaleao: endpoint aberto que não aceita CDP", () => {
  it("não lança um segundo navegador quando a porta já responde", async () => {
    // Responde em /json/version (como um navegador ocupado), mas não fala o protocolo CDP.
    const falso = criarServidorHttp((_req, res) => res.end("{}"));
    await new Promise<void>((r) => falso.listen(0, "127.0.0.1", r));
    const endereco = falso.address();
    const navegador = new NavegadorCamaleao({
      portaCdp: typeof endereco === "object" && endereco ? endereco.port : 0,
      executavel: "chromium",
      pastaPerfil: mkdtempSync(join(tmpdir(), "camaleao-perfil-ocupado-")),
      esperaConexaoMs: 1000,
    });
    try {
      await expect(navegador.garantir()).rejects.toThrow(/está aberto, mas não aceitou a conexão/);
    } finally {
      falso.close();
    }
  });
});

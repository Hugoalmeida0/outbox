// Agente local (spec MVP web): segurança, pareamento, rotas síncronas e arquivos sobre a composição real
// numa raiz temporária (AC4, AC5, AC9, AC11).
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify } from "yaml";
import { describe, expect, it } from "vitest";
import { criarContainer, type Container } from "#composicao";
import { STATUS_DE_RETORNO } from "#aplicacao/casos-de-uso/registrar-retorno.ts";
import {
  esquemaEstadoCurriculo,
  esquemaSaidaAdicionar,
  esquemaSaidaFalhas,
  esquemaSaidaPerfil,
  esquemaSaidaStatus,
  STATUS_RETORNO,
} from "#interfaces/http/contrato.ts";
import { hashToken, MAX_ERROS_CODIGO, VALIDADE_CODIGO_MS } from "#interfaces/http/pareamento.ts";
import { ORIGEM_SITE, montarAgente } from "#testes/apoio/agente-http.ts";
import { umMaster, umPerfil } from "#testes/apoio/builders.ts";

function novoContainer(): Container {
  const raiz = mkdtempSync(join(tmpdir(), "camaleao-agente-"));
  return criarContainer({ raiz, nivelLog: "erro", escreverTerminal: () => undefined });
}

describe("segurança do agente (AC4)", () => {
  const agente = montarAgente(novoContainer());

  it("recusa Host fora de 127.0.0.1:<porta> e localhost:<porta> (DNS rebinding)", async () => {
    for (const host of ["evil.exemplo:4321", "127.0.0.1:9999", "localhost"]) {
      const r = await agente.requisitar("/saude", { headers: { host } });
      expect(r.status, host).toBe(403);
    }
    expect(
      (await agente.requisitar("/saude", { headers: { host: "localhost:4321" } })).status,
    ).toBe(200);
  });

  it("origem fora da lista recebe 403 sem cabeçalhos CORS; a permitida recebe a origem exata", async () => {
    const proibida = await agente.requisitar("/saude", {
      headers: { origin: "https://site-malicioso.exemplo" },
    });
    expect(proibida.status).toBe(403);
    expect(proibida.headers.get("access-control-allow-origin")).toBeNull();

    const permitida = await agente.requisitar("/saude", { headers: { origin: ORIGEM_SITE } });
    expect(permitida.status).toBe(200);
    expect(permitida.headers.get("access-control-allow-origin")).toBe(ORIGEM_SITE);
    expect(permitida.headers.get("vary")).toBe("Origin");
    expect(await permitida.json()).toEqual({ app: "camaleao", versao: "1.0.0", versaoContrato: 1 });
  });

  it("preflight da origem permitida libera a rede privada; sem origem, recusa", async () => {
    const preflight = await agente.requisitar("/status", {
      method: "OPTIONS",
      headers: {
        origin: ORIGEM_SITE,
        "access-control-request-method": "GET",
        "access-control-request-private-network": "true",
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-private-network")).toBe("true");
    expect(preflight.headers.get("access-control-allow-headers")).toBe(
      "Authorization, Content-Type",
    );
    expect(preflight.headers.get("access-control-allow-methods")).toBe("GET, POST, PUT");
    expect((await agente.requisitar("/status", { method: "OPTIONS" })).status).toBe(403);
  });

  it("toda resposta sai com no-store, nosniff e no-referrer", async () => {
    for (const r of [await agente.requisitar("/saude"), await agente.requisitar("/status")]) {
      expect(r.headers.get("cache-control")).toBe("no-store");
      expect(r.headers.get("x-content-type-options")).toBe("nosniff");
      expect(r.headers.get("referrer-policy")).toBe("no-referrer");
    }
  });

  it("rotas protegidas exigem o token de pareamento", async () => {
    agente.semToken();
    expect((await agente.requisitar("/status")).status).toBe(401);
    expect(
      (await agente.requisitar("/status", { headers: { authorization: "Bearer x".repeat(30) } }))
        .status,
    ).toBe(401);
    expect((await agente.post("/execucoes/preparar")).status).toBe(401);
    await agente.parear();
    expect((await agente.requisitar("/status")).status).toBe(200);
  });
});

describe("pareamento (AC4)", () => {
  it("código de uso único vira token; só o hash SHA-256 fica em tokens.json", async () => {
    const agente = montarAgente(novoContainer());
    const codigo = agente.codigos.at(-1)!;
    expect(codigo).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
    const token = await agente.parear();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(agente.codigos.at(-1)).not.toBe(codigo);
    const arquivo = readFileSync(agente.arquivoTokens, "utf8");
    expect(arquivo).not.toContain(token);
    expect(JSON.parse(arquivo)).toEqual([{ hash: hashToken(token), criadoEm: expect.any(String) }]);

    agente.semToken();
    const repetido = await agente.post("/pareamento", { codigo });
    expect(repetido.status).toBe(401);
    // Com hífen e minúsculas, como copiado do terminal.
    const novo = agente.codigos.at(-1)!;
    const formatado = `${novo.slice(0, 4)}-${novo.slice(4)}`.toLowerCase();
    expect((await agente.post("/pareamento", { codigo: formatado })).status).toBe(200);
  });

  it("expira em 10 minutos e cinco erros seguidos trocam o código", async () => {
    let agora = 1_000_000;
    const agente = montarAgente(novoContainer(), { agora: () => agora });
    const codigo = agente.codigos.at(-1)!;
    agora += VALIDADE_CODIGO_MS;
    expect((await agente.post("/pareamento", { codigo })).status).toBe(401);
    const vigente = agente.codigos.at(-1)!;
    expect(vigente).not.toBe(codigo);

    for (let i = 0; i < MAX_ERROS_CODIGO; i++) {
      expect((await agente.post("/pareamento", { codigo: "ERRADO22" })).status).toBe(401);
    }
    expect(agente.codigos.at(-1)).not.toBe(vigente);
    expect((await agente.post("/pareamento", { codigo: vigente })).status).toBe(401);
  });

  it("revogar apaga todos os tokens", async () => {
    const agente = montarAgente(novoContainer());
    await agente.parear();
    expect((await agente.post("/pareamento/revogar")).status).toBe(200);
    expect((await agente.requisitar("/status")).status).toBe(401);
    expect(JSON.parse(readFileSync(agente.arquivoTokens, "utf8"))).toEqual([]);
  });
});

describe("rotas síncronas dos comandos (AC5)", () => {
  it("adicionar, status, retorno e falhas devolvem o mesmo que os casos de uso", async () => {
    const container = novoContainer();
    const agente = montarAgente(container);
    await agente.parear();

    const adicao = await agente.post("/vagas", {
      urls: ["https://job-boards.greenhouse.io/acme/jobs/1", "isto não é url"],
    });
    expect(adicao.status).toBe(200);
    const { itens } = esquemaSaidaAdicionar.parse(await adicao.json());
    expect(itens.map((i) => i.resultado)).toEqual(["adicionada", "invalida"]);
    expect((await agente.post("/vagas", { urls: [] })).status).toBe(422);

    const status = esquemaSaidaStatus.parse(await (await agente.requisitar("/status")).json());
    expect(status.contagens.NOVA).toBe(1);
    expect(status.linhas).toMatchObject([{ id: 1, status: "NOVA", urlPdf: null }]);
    expect(status).toEqual({
      ...container.casos.listarStatus({}),
      linhas: container.casos.listarStatus({}).linhas.map((l) => ({ ...l, urlPdf: null })),
    });
    const filtrado = esquemaSaidaStatus.parse(
      await (await agente.requisitar("/status?status=oferta")).json(),
    );
    expect(filtrado.linhas).toEqual([]);
    expect((await agente.requisitar("/status?status=talvez")).status).toBe(422);

    const invalido = await agente.post("/vagas/1/retorno", { status: "OFERTA" });
    expect(invalido.status).toBe(422);
    const corpo = (await invalido.json()) as { mensagem: string; aceitas: string[] };
    expect(corpo.mensagem).toContain("transição NOVA → OFERTA não permitida");
    expect(corpo.aceitas.length).toBeGreaterThan(0);
    expect((await agente.post("/vagas/99/retorno", { status: "OFERTA" })).status).toBe(422);
    expect((await agente.post("/vagas/abc/retorno", { status: "OFERTA" })).status).toBe(422);

    expect(esquemaSaidaFalhas.parse(await (await agente.requisitar("/falhas")).json())).toEqual({
      grupos: [],
      semConector: [],
    });
    expect([...STATUS_RETORNO]).toEqual([...STATUS_DE_RETORNO]);
  });

  it("currículo: estado para o onboarding e abrir o master no editor", async () => {
    const container = novoContainer();
    const agente = montarAgente(container);
    await agente.parear();
    expect(
      esquemaEstadoCurriculo.parse(await (await agente.requisitar("/curriculo")).json()),
    ).toMatchObject({ masterExiste: false, masterAtualizadoEm: null, perfilValido: false });
    expect((await agente.post("/curriculo/abrir-master")).status).toBe(422);

    mkdirSync(container.caminhos.curriculoDir, { recursive: true });
    writeFileSync(container.caminhos.master, stringify(umMaster()));
    writeFileSync(container.caminhos.perfil, stringify(umPerfil()));
    expect(
      esquemaEstadoCurriculo.parse(await (await agente.requisitar("/curriculo")).json()),
    ).toMatchObject({ masterExiste: true, perfilValido: true, errosPerfil: [] });
    expect((await agente.post("/curriculo/abrir-master")).status).toBe(200);
    expect(agente.abertos).toEqual([container.caminhos.master]);
  });

  it("perfil: grava pelo formulário, valida no agente e aponta cada campo inválido (AC11)", async () => {
    const container = novoContainer();
    const agente = montarAgente(container);
    await agente.parear();
    const vazio = esquemaSaidaPerfil.parse(await (await agente.requisitar("/perfil")).json());
    expect(vazio).toMatchObject({ perfil: null, erros: [{ caminho: "" }] });

    const invalido = await agente.requisitar("/perfil", {
      method: "PUT",
      body: JSON.stringify({ ...umPerfil(), endereco: { cidade: "" }, comoSoube: "" }),
    });
    expect(invalido.status).toBe(422);
    const erro = (await invalido.json()) as { erros: { caminho: string }[] };
    expect(erro.erros.map((e) => e.caminho)).toEqual(
      expect.arrayContaining(["endereco.cidade", "endereco.pais", "comoSoube"]),
    );

    const { salario: _salario, diversidade: _diversidade, ...semSensiveis } = umPerfil();
    const salvo = await agente.requisitar("/perfil", {
      method: "PUT",
      body: JSON.stringify({ ...semSensiveis, documentos: {} }),
    });
    expect(salvo.status).toBe(200);
    const lido = esquemaSaidaPerfil.parse(await salvo.json());
    expect(lido.erros).toEqual([]);
    expect(lido.perfil?.salario).toBeUndefined();
    expect(container.casos.obterPerfil().perfil?.comoSoube).toBe(umPerfil().comoSoube);
  });
});

describe("arquivos por URL de uso único (AC9)", () => {
  it("serve só arquivos assinados das pastas de artefatos, por 5 minutos", async () => {
    let agora = 1_000_000;
    const container = novoContainer();
    const agente = montarAgente(container, { agora: () => agora });
    const pasta = join(container.caminhos.vagasDir, "00001");
    mkdirSync(pasta, { recursive: true });
    const pdf = join(pasta, "Ana-Curriculo.pdf");
    writeFileSync(pdf, "%PDF-1.4 teste");
    writeFileSync(container.caminhos.config, "segredo: 1\n");

    const url = agente.arquivos.assinar(pdf);
    expect(url).toMatch(/^\/arquivos\/[A-Za-z0-9_-]{32}$/);
    expect(agente.arquivos.assinar(container.caminhos.config)).toBeNull();
    expect(agente.arquivos.assinar(join(pasta, "..", "..", "..", "config.yaml"))).toBeNull();

    agente.semToken();
    const r = await agente.requisitar(url!);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("application/pdf");
    expect(await r.text()).toBe("%PDF-1.4 teste");

    // `/arquivos/../..` é normalizado pela URL e cai fora da rota: com o token, 404 também.
    await agente.parear();
    for (const forjado of [
      "/arquivos/..%2F..%2Fconfig.yaml",
      "/arquivos/../../config.yaml",
      "/arquivos/naoexiste",
    ]) {
      expect((await agente.requisitar(forjado)).status, forjado).toBe(404);
    }
    const outro = agente.arquivos.assinar(pdf)!;
    agora += 5 * 60_000;
    expect((await agente.requisitar(outro)).status).toBe(404);
  });
});

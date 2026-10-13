import { createServer, type Server } from "node:http";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { z } from "zod";
import { CONFIG_PADRAO, esquemaConfig } from "#infra/config/esquema-config.ts";
import { carregarConfig } from "#infra/config/carregar-config.ts";
import { escreverAtomico } from "#infra/sistema/escrita-atomica.ts";
import { adquirirTrava } from "#infra/sistema/trava-processo.ts";
import { ClienteHttpFetch } from "#infra/sistema/cliente-http.ts";
import { RegistradorJsonl, nivelDoAmbiente } from "#infra/log/registrador-jsonl.ts";
import { isoLocal, RelogioSistema } from "#infra/sistema/relogio-sistema.ts";
import { criarCaminhos } from "#infra/sistema/caminhos.ts";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import { ErroHttp } from "#aplicacao/portas/erros.ts";
import { listaPii } from "#dominio/falhas/pii.ts";
import { RelogioFixo } from "#testes/apoio/fakes/basicos.ts";
import { umMaster, umPerfil } from "#testes/apoio/builders.ts";

const novaPasta = () => mkdtempSync(join(tmpdir(), "outbox-teste-"));
const sinal = () => new AbortController().signal;

describe("config", () => {
  it("config.exemplo.yaml valida e documenta exatamente os padrões", () => {
    const exemplo = parse(
      readFileSync(new URL("../../config.exemplo.yaml", import.meta.url), "utf8"),
    );
    expect(esquemaConfig.parse(exemplo)).toEqual(CONFIG_PADRAO);
  });

  it("usa os padrões sem config.yaml e sobrescreve só as chaves presentes", () => {
    const pasta = novaPasta();
    expect(carregarConfig(join(pasta, "config.yaml"))).toEqual(CONFIG_PADRAO);
    writeFileSync(join(pasta, "config.yaml"), "preparar:\n  paralelo: 4\n");
    const config = carregarConfig(join(pasta, "config.yaml"));
    expect(config.preparar).toEqual({ paralelo: 4, maxTentativas: 3 });
    expect(config.aderencia.scoreMinimo).toBe(60);
  });

  it("aponta a chave inválida", () => {
    const pasta = novaPasta();
    writeFileSync(join(pasta, "config.yaml"), "aderencia:\n  scoreMinimo: 300\n");
    expect(() => carregarConfig(join(pasta, "config.yaml"))).toThrow(/aderencia\.scoreMinimo/);
    writeFileSync(join(pasta, "config.yaml"), "a: [");
    expect(() => carregarConfig(join(pasta, "config.yaml"))).toThrow(ErroUsuario);
  });
});

describe("caminhos e relógio", () => {
  it("monta os caminhos a partir da raiz", () => {
    const c = criarCaminhos("/x", "/codigo");
    expect(c.master.replace(/\\/g, "/")).toBe("/x/curriculo/master.yaml");
    expect(c.promptsDir.replace(/\\/g, "/")).toBe("/codigo/prompts");
  });

  it("formata ISO com offset local", () => {
    expect(isoLocal(new Date(2026, 9, 9, 14, 3, 0))).toMatch(
      /^2026-10-09T14:03:00[+-]\d{2}:\d{2}$/,
    );
    const relogio = new RelogioSistema();
    expect(relogio.hoje()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(relogio.agoraIso().slice(0, 10)).toBe(relogio.hoje());
    expect(relogio.agora()).toBeInstanceOf(Date);
  });
});

describe("escreverAtomico", () => {
  it("grava criando diretórios e sem deixar temporários", () => {
    const pasta = novaPasta();
    const destino = join(pasta, "a", "b", "arquivo.json");
    escreverAtomico(destino, "1");
    escreverAtomico(destino, "2");
    expect(readFileSync(destino, "utf8")).toBe("2");
    expect(readdirSync(join(pasta, "a", "b"))).toEqual(["arquivo.json"]);
  });
});

describe("adquirirTrava", () => {
  it("impede segunda execução com PID vivo e libera ao final", () => {
    const pasta = novaPasta();
    writeFileSync(join(pasta, "preparar.lock"), String(process.ppid));
    expect(() => adquirirTrava(pasta, "preparar")).toThrow(/já existe um `preparar` em execução/);
  });

  it("remove trava com PID morto e libera só a própria", () => {
    const pasta = novaPasta();
    writeFileSync(join(pasta, "aplicar.lock"), "999999");
    const trava = adquirirTrava(pasta, "aplicar");
    expect(readFileSync(join(pasta, "aplicar.lock"), "utf8")).toBe(String(process.pid));
    trava.liberar();
    trava.liberar();
    expect(existsSync(join(pasta, "aplicar.lock"))).toBe(false);
  });
});

describe("ClienteHttpFetch", () => {
  let servidor: Server;
  let base = "";
  let chamadas503 = 0;

  beforeAll(async () => {
    servidor = createServer((req, res) => {
      if (req.url === "/json") {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: true, ua: req.headers["user-agent"] }));
      } else if (req.url === "/instavel") {
        chamadas503++;
        if (chamadas503 < 3) {
          res.statusCode = 503;
          res.setHeader("retry-after", "0");
          res.end();
        } else res.end("enfim");
      } else if (req.url === "/limite-github") {
        res.statusCode = 403;
        res.setHeader("x-ratelimit-remaining", "0");
        res.end();
      } else if (req.url === "/texto") {
        res.end("não é json");
      } else {
        res.statusCode = 404;
        res.end();
      }
    });
    await new Promise<void>((r) => servidor.listen(0, "127.0.0.1", r));
    const endereco = servidor.address();
    base = `http://127.0.0.1:${typeof endereco === "object" && endereco ? endereco.port : 0}`;
  });

  afterAll(() => {
    servidor.close();
  });

  const cliente = new ClienteHttpFetch({ esperasMs: [1, 1] });

  it("obtém e valida JSON enviando user-agent", async () => {
    const r = await cliente.obterJson(
      `${base}/json`,
      z.object({ ok: z.boolean(), ua: z.string() }),
      sinal(),
    );
    expect(r.ok).toBe(true);
    expect(r.ua).toContain("Outbox");
  });

  it("repete em 5xx até o limite de tentativas", async () => {
    expect(await cliente.obterTexto(`${base}/instavel`, sinal())).toBe("enfim");
  });

  it("converte erros em ErroHttp com mensagens claras", async () => {
    await expect(cliente.obterTexto(`${base}/nada`, sinal())).rejects.toMatchObject({
      status: 404,
    });
    await expect(cliente.obterTexto(`${base}/limite-github`, sinal())).rejects.toThrow(
      /limite de requisições do GitHub/,
    );
    await expect(cliente.obterJson(`${base}/texto`, z.object({}), sinal())).rejects.toThrow(
      ErroHttp,
    );
    await expect(
      cliente.obterJson(`${base}/json`, z.object({ outro: z.string() }), sinal()),
    ).rejects.toThrow(/inesperada/);
  });
});

describe("RegistradorJsonl", () => {
  it("grava JSONL redigindo PII e omitindo chaves sensíveis, respeitando níveis", () => {
    const pasta = novaPasta();
    const terminal: string[] = [];
    const pii = listaPii(umMaster().pessoal, umPerfil());
    const log = new RegistradorJsonl({
      pastaLogs: pasta,
      relogio: new RelogioFixo("2026-10-10T13:00:00Z"),
      obterPii: () => pii,
      escreverTerminal: (linha) => terminal.push(linha),
    });
    log.depurar("detalhe interno");
    log.informar("Vaga de Ana Exemplo da Silva preparada", { vagaId: 3, cpf: "123.456.789-09" });
    log.erro("falhou", {
      erro: new Error("boom para ana.exemplo@example.com"),
      perfil: { salario: 15000 },
    });

    const arquivo = readFileSync(join(pasta, "outbox-2026-10-10.jsonl"), "utf8");
    const linhas = arquivo
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l) as { contexto: unknown });
    expect(linhas).toHaveLength(3);
    expect(arquivo).not.toContain("Ana Exemplo da Silva");
    expect(arquivo).not.toContain("123.456.789-09");
    expect(arquivo).not.toContain("ana.exemplo@example.com");
    expect(arquivo).not.toContain("15000");
    expect(linhas[1]?.contexto).toEqual({ vagaId: 3, cpf: "[OMITIDO]" });
    expect(terminal).toEqual(["Vaga de [REDACTED] preparada", "falhou"]);
  });

  it("aceita nível do ambiente e sobrevive a falha ao obter PII", () => {
    expect(nivelDoAmbiente("avisar")).toBe("avisar");
    expect(nivelDoAmbiente("xpto")).toBeUndefined();
    const pasta = novaPasta();
    mkdirSync(pasta, { recursive: true });
    const terminal: string[] = [];
    const log = new RegistradorJsonl({
      pastaLogs: pasta,
      relogio: new RelogioFixo(),
      nivel: "avisar",
      obterPii: () => {
        throw new Error("sem currículo");
      },
      escreverTerminal: (linha) => terminal.push(linha),
    });
    log.informar("ignorado");
    log.avisar("atenção");
    expect(terminal).toEqual(["atenção"]);
  });
});

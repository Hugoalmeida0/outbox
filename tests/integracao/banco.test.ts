import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { transicionarVaga } from "#aplicacao/compartilhado/transicionar-vaga.ts";
import { umaAtualizacao } from "#testes/apoio/builders.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { abrirConexao } from "#infra/banco/conexao.ts";
import { migrar, versaoAtual } from "#infra/banco/migrador.ts";
import { RepositorioVagasSqlite } from "#infra/banco/repositorio-vagas-sqlite.ts";
import { ErroInfra } from "#aplicacao/portas/erros.ts";
import { ErroTransicaoInvalida } from "#dominio/compartilhado/erros.ts";
import type { ChaveDedup, IdVaga, NovaVaga, UrlCanonica } from "#dominio/vagas/vaga.ts";
import { criarRepositorioMemoria, PASTA_MIGRACOES } from "#testes/apoio/repositorio-memoria.ts";
import { RelogioFixo } from "#testes/apoio/fakes/basicos.ts";

const nova = (n: number, extra: Partial<NovaVaga> = {}): NovaVaga => ({
  urlOriginal: `https://www.linkedin.com/jobs/view/${n}`,
  canal: "linkedin",
  urlCanonica: `https://www.linkedin.com/jobs/view/${n}` as UrlCanonica,
  motor: "linkedin",
  status: "NOVA",
  ...extra,
});

describe("migrador", () => {
  it("aplica todas num banco novo e só as pendentes num banco existente", () => {
    const pasta = mkdtempSync(join(tmpdir(), "camaleao-mig-"));
    writeFileSync(join(pasta, "0001-a.sql"), "CREATE TABLE a (x INTEGER) STRICT;");
    const db = abrirConexao(join(pasta, "teste.db"));
    expect(migrar(db, pasta)).toBe(1);
    writeFileSync(join(pasta, "0002-b.sql"), "CREATE TABLE b (y INTEGER) STRICT;");
    writeFileSync(join(pasta, "leia-me.txt"), "ignorado");
    expect(migrar(db, pasta)).toBe(2);
    expect(migrar(db, pasta)).toBe(2);
    expect(versaoAtual(db)).toBe(2);
  });

  it("faz rollback e não avança a versão quando uma migração falha", () => {
    const pasta = mkdtempSync(join(tmpdir(), "camaleao-mig-"));
    writeFileSync(join(pasta, "0001-ok.sql"), "CREATE TABLE ok (x INTEGER) STRICT;");
    writeFileSync(
      join(pasta, "0002-ruim.sql"),
      "CREATE TABLE parcial (x INTEGER); SELECT * FROM inexistente;",
    );
    const db = abrirConexao(":memory:");
    expect(() => migrar(db, pasta)).toThrow(/0002-ruim\.sql/);
    expect(versaoAtual(db)).toBe(1);
    expect(
      db.prepare("SELECT name FROM sqlite_master WHERE name = 'parcial'").get(),
    ).toBeUndefined();
  });

  it("a migração inicial cria tabelas STRICT", () => {
    const db = abrirConexao(":memory:");
    migrar(db, PASTA_MIGRACOES);
    expect(() =>
      db.prepare("INSERT INTO gaps (vaga_id, termo, termo_normalizado) VALUES ('x', 1, 2)").run(),
    ).toThrow();
  });
});

describe("RepositorioVagasSqlite", () => {
  it("insere, busca e registra o evento de criação", () => {
    const repo = criarRepositorioMemoria();
    const vaga = repo.inserir(nova(1));
    expect(vaga).toMatchObject({
      id: 1,
      status: "NOVA",
      canal: "linkedin",
      anexoManual: false,
      tentativasPreparo: 0,
    });
    expect(repo.buscar(vaga.id)).toEqual(vaga);
    expect(repo.buscar(999 as IdVaga)).toBeNull();
    expect(repo.listarEventos(vaga.id)).toMatchObject([{ deStatus: null, paraStatus: "NOVA" }]);
  });

  it("busca por URL canônica (a mais recente) e por chave, excluindo a própria", () => {
    const repo = criarRepositorioMemoria();
    const a = repo.inserir(nova(1));
    const b = repo.inserir(
      nova(1, { status: "DUPLICADA", motivo: "url_ja_enviada", duplicadaDe: a.id }),
    );
    expect(repo.buscarPorUrlCanonica(a.urlCanonica)?.id).toBe(b.id);
    expect(repo.buscarPorUrlCanonica("https://nada" as UrlCanonica)).toBeNull();
    repo.atualizar(a.id, umaAtualizacao({ chaveDedup: "x|y|" as ChaveDedup }));
    repo.atualizar(b.id, umaAtualizacao({ chaveDedup: "x|y|" as ChaveDedup }));
    expect(repo.buscarPorChave("x|y|" as ChaveDedup, a.id).map((v) => v.id)).toEqual([b.id]);
  });

  it("atualiza campos convertendo booleanos e lista por status e ids", () => {
    const repo = criarRepositorioMemoria();
    const a = repo.inserir(nova(1));
    const b = repo.inserir(nova(2));
    repo.atualizar(
      a.id,
      umaAtualizacao({ anexoManual: true, empresa: "Acme", aderencia: 80, urlResolvida: null }),
    );
    repo.atualizar(a.id, umaAtualizacao({}));
    expect(repo.buscar(a.id)).toMatchObject({ anexoManual: true, empresa: "Acme", aderencia: 80 });
    expect(repo.listarPorStatus(["NOVA"]).map((v) => v.id)).toEqual([a.id, b.id]);
    expect(repo.listarPorStatus(["NOVA"], { ids: [b.id] }).map((v) => v.id)).toEqual([b.id]);
    expect(repo.listarPorStatus(["NOVA"], { ids: [] })).toEqual([]);
    expect(repo.listarPorStatus([])).toEqual([]);
  });

  it("transiciona validando no domínio, grava evento e enviada_em uma única vez", () => {
    const relogio = new RelogioFixo("2026-10-10T10:00:00Z");
    const repo = criarRepositorioMemoria(relogio);
    const v = repo.inserir(nova(1));
    transicionarVaga(repo, v.id, "PRONTA");
    transicionarVaga(repo, v.id, "ENVIADA");
    const enviadaEm = repo.buscar(v.id)?.enviadaEm;
    relogio.avancar(60_000);
    transicionarVaga(repo, v.id, "EM_PROCESSO", { etapa: "tecnica", nota: "entrevista marcada" });
    expect(repo.buscar(v.id)).toMatchObject({ status: "EM_PROCESSO", etapa: "tecnica", enviadaEm });
    expect(repo.listarEventos(v.id).map((e) => e.paraStatus)).toEqual([
      "NOVA",
      "PRONTA",
      "ENVIADA",
      "EM_PROCESSO",
    ]);
    expect(repo.listarEventos(v.id)[3]).toMatchObject({
      etapa: "tecnica",
      nota: "entrevista marcada",
    });
    expect(() => transicionarVaga(repo, v.id, "PRONTA")).toThrow(ErroTransicaoInvalida);
    expect(() => transicionarVaga(repo, 999 as IdVaga, "PRONTA")).toThrow(ErroInfra);
  });

  it("guarda motivo e duplicada_de", () => {
    const repo = criarRepositorioMemoria();
    const a = repo.inserir(nova(1));
    const b = repo.inserir(nova(2));
    transicionarVaga(repo, b.id, "DESCARTADA", { motivo: "duplicada_antiga", duplicadaDe: a.id });
    expect(repo.buscar(b.id)).toMatchObject({
      status: "DESCARTADA",
      motivo: "duplicada_antiga",
      duplicadaDe: a.id,
    });
    transicionarVaga(repo, b.id, "NOVA");
    expect(repo.buscar(b.id)).toMatchObject({ status: "NOVA", motivo: null, duplicadaDe: a.id });
  });

  it("gaps: substitui os abertos, responde por termo e lista confirmados", () => {
    const repo = criarRepositorioMemoria();
    const a = repo.inserir(nova(1));
    const b = repo.inserir(nova(2));
    repo.inserirGaps(a.id, [
      { termo: "Kafka", termoNormalizado: "kafka" },
      { termo: "Go", termoNormalizado: "go" },
    ]);
    repo.inserirGaps(a.id, [{ termo: "Kafka", termoNormalizado: "kafka" }]);
    repo.inserirGaps(b.id, [{ termo: "kafka", termoNormalizado: "kafka" }]);
    expect(repo.listarGapsAbertos([a.id, b.id])).toHaveLength(2);
    expect(repo.listarGapsAbertos([])).toEqual([]);
    expect(repo.responderGaps("kafka", "sim").sort()).toEqual([a.id, b.id]);
    expect(repo.listarGapsAbertos([a.id, b.id])).toEqual([]);
    expect(repo.termosConfirmados()).toEqual(["kafka"]);
  });

  it("respostas enviadas sensíveis são gravadas sem valor", () => {
    const repo = criarRepositorioMemoria();
    const v = repo.inserir(nova(1));
    repo.registrarRespostasEnviadas(v.id, [
      { rotulo: "Pretensão", valor: "15000", fonte: "codigo", editada: false, sensivel: true },
      {
        rotulo: "Por quê?",
        valor: "Gosto do produto",
        fonte: "gerada",
        editada: true,
        sensivel: false,
      },
    ]);
    const db = (repo as unknown as { db: { prepare(s: string): { all(): unknown[] } } }).db;
    expect(
      db
        .prepare("SELECT rotulo, valor, editada, sensivel FROM respostas_enviadas ORDER BY id")
        .all(),
    ).toEqual([
      { rotulo: "Pretensão", valor: null, editada: 0, sensivel: 1 },
      { rotulo: "Por quê?", valor: "Gosto do produto", editada: 1, sensivel: 0 },
    ]);
  });

  it("transação faz rollback em erro, aceita aninhamento e recusa função assíncrona", () => {
    const repo = criarRepositorioMemoria();
    expect(() =>
      repo.transacao(() => {
        repo.inserir(nova(1));
        throw new Error("falha");
      }),
    ).toThrow("falha");
    expect(repo.listarPorStatus(["NOVA"])).toEqual([]);
    expect(repo.transacao(() => repo.transacao(() => repo.inserir(nova(2)).id))).toBe(1);
    expect(() => repo.transacao(() => Promise.resolve(1))).toThrow(/síncrona/);
  });

  it("BEGIN IMMEDIATE dá exclusividade de escrita entre conexões ao mesmo arquivo", () => {
    const pasta = mkdtempSync(join(tmpdir(), "camaleao-db-"));
    mkdirSync(pasta, { recursive: true });
    const arquivo = join(pasta, "camaleao.db");
    const dbA = abrirConexao(arquivo);
    migrar(dbA, PASTA_MIGRACOES);
    const dbB = abrirConexao(arquivo, { esperaLockMs: 50 });
    const repoA = new RepositorioVagasSqlite(dbA, new RelogioFixo());
    const repoB = new RepositorioVagasSqlite(dbB, new RelogioFixo());
    const v = repoA.inserir(nova(1));

    repoA.transacao(() => {
      transicionarVaga(repoA, v.id, "PRONTA");
      expect(() => transicionarVaga(repoB, v.id, "DESCARTADA", { motivo: "manual" })).toThrow(
        /locked|busy/i,
      );
    });
    transicionarVaga(repoB, v.id, "DESCARTADA", { motivo: "manual" });
    expect(repoA.buscar(v.id)?.status).toBe("DESCARTADA");
    expect(repoA.listarEventos(v.id).map((e) => e.paraStatus)).toEqual([
      "NOVA",
      "PRONTA",
      "DESCARTADA",
    ]);
  });
});

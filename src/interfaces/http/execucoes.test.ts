import { describe, expect, it } from "vitest";
import { ErroLimiteUso } from "#aplicacao/portas/erros.ts";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import { umaVaga } from "#testes/apoio/builders.ts";
import type { EventoExecucao, ResultadoExecucao } from "./contrato.ts";
import { ErroExecucaoEmAndamento, GerenciadorExecucoes, RETENCAO_MS } from "./execucoes.ts";
import { ProgressoWeb } from "./progresso-web.ts";

const RESULTADO: ResultadoExecucao = {
  comando: "preparar",
  processadas: 1,
  contagens: { PRONTA: 1 },
  erros: [],
  reavaliadas: 0,
  interrompido: null,
};

function controlavel() {
  let liberar: (r: ResultadoExecucao) => void = () => undefined;
  let falhar: (e: unknown) => void = () => undefined;
  const promessa = new Promise<ResultadoExecucao>((resolver, rejeitar) => {
    liberar = resolver;
    falhar = rejeitar;
  });
  return { promessa, liberar: (r = RESULTADO) => liberar(r), falhar: (e: unknown) => falhar(e) };
}

const tique = () => new Promise((r) => setTimeout(r, 0));

describe("GerenciadorExecucoes (AC6, AC8)", () => {
  it("guarda os eventos desde o início e os reapresenta a quem assina depois", async () => {
    const erros: unknown[] = [];
    const g = new GerenciadorExecucoes({ registrarErro: (_m, e) => erros.push(e) });
    const trabalho = controlavel();
    const execucao = g.iniciar("preparar", async (ctx) => {
      ctx.publicar({ tipo: "aviso", mensagem: "um" });
      return trabalho.promessa;
    });
    await tique();
    const vistos: EventoExecucao[] = [];
    let encerrou = false;
    g.assinar(
      execucao.id,
      (e) => vistos.push(e),
      () => (encerrou = true),
    );
    expect(vistos).toEqual([{ tipo: "aviso", mensagem: "um" }]);
    expect(g.ativas().map((e) => e.id)).toEqual([execucao.id]);
    trabalho.liberar();
    await tique();
    expect(vistos.at(-1)).toEqual({ tipo: "fim", resultado: RESULTADO });
    expect(encerrou).toBe(true);
    expect(g.ativas()).toEqual([]);

    const recarregada: EventoExecucao[] = [];
    g.assinar(
      execucao.id,
      (e) => recarregada.push(e),
      () => undefined,
    );
    expect(recarregada).toEqual(vistos);
    expect(erros).toEqual([]);
  });

  it("recusa um segundo do mesmo comando enquanto o trabalho roda", async () => {
    const g = new GerenciadorExecucoes({ registrarErro: () => undefined });
    const trabalho = controlavel();
    g.iniciar("aplicar", () => trabalho.promessa);
    expect(() => g.iniciar("aplicar", () => trabalho.promessa)).toThrow(ErroExecucaoEmAndamento);
    expect(g.emAndamento("aplicar")).toBe(true);
    expect(g.emAndamento("preparar")).toBe(false);
    trabalho.liberar({ comando: "aplicar", revisadas: 0, desfechos: {}, interrompido: null });
    await tique();
    expect(g.emAndamento("aplicar")).toBe(false);
  });

  it("primeiro cancelamento aborta; o segundo encerra o stream sem liberar a trava antes da hora", async () => {
    const g = new GerenciadorExecucoes({ registrarErro: () => undefined });
    const trabalho = controlavel();
    let liberou = false;
    let sinal: AbortSignal | null = null;
    const execucao = g.iniciar(
      "preparar",
      (ctx) => {
        sinal = ctx.sinal;
        return trabalho.promessa;
      },
      () => (liberou = true),
    );
    expect(g.cancelar(execucao.id)).toBe("cancelando");
    expect(sinal!.aborted).toBe(true);
    expect(g.cancelar(execucao.id)).toBe("forcado");
    expect(g.buscar(execucao.id)?.eventos.at(-1)).toMatchObject({
      tipo: "erro",
      codigo: "cancelada",
    });
    expect(liberou).toBe(false);
    expect(g.emAndamento("preparar")).toBe(true);
    trabalho.liberar();
    await tique();
    expect(liberou).toBe(true);
    // O resumo que chega depois do encerramento forçado não reabre o stream.
    expect(g.buscar(execucao.id)?.eventos.filter((e) => e.tipo === "fim")).toEqual([]);
  });

  it("converte erros em eventos: uso, limite de uso, cancelada e inesperado (com log)", async () => {
    const erros: string[] = [];
    const g = new GerenciadorExecucoes({ registrarErro: (m) => erros.push(m) });
    const ultimo = (falha: unknown, cancelar = false) => {
      const t = controlavel();
      const e = g.iniciar("importar", () => t.promessa);
      if (cancelar) g.cancelar(e.id);
      t.falhar(falha);
      return tique().then(() => g.buscar(e.id)?.eventos.at(-1));
    };
    expect(await ultimo(new ErroUsuario("master.yaml já existe"))).toEqual({
      tipo: "erro",
      codigo: "uso",
      mensagem: "master.yaml já existe",
    });
    expect(await ultimo(new ErroLimiteUso())).toMatchObject({ codigo: "limite_uso" });
    expect(await ultimo(new Error("x"), true)).toMatchObject({ codigo: "cancelada" });
    expect(await ultimo(new TypeError("boom"))).toEqual({
      tipo: "erro",
      codigo: "execucao",
      mensagem: "Erro inesperado (detalhes em dados/logs/).",
    });
    expect(erros).toEqual(["erro inesperado no importar pelo site"]);
  });

  it("esquece execuções encerradas há mais de 30 minutos", async () => {
    let agora = 1_000_000;
    const g = new GerenciadorExecucoes({ registrarErro: () => undefined, agora: () => agora });
    const e = g.iniciar("renderizar_master", () =>
      Promise.resolve({ comando: "renderizar_master" as const, urlPdf: "/arquivos/x", paginas: 1 }),
    );
    await tique();
    agora += RETENCAO_MS - 1;
    expect(g.buscar(e.id)).not.toBeNull();
    agora += 2;
    expect(g.buscar(e.id)).toBeNull();
    expect(() =>
      g.assinar(
        e.id,
        () => undefined,
        () => undefined,
      ),
    ).toThrow(/não encontrada/);
  });
});

describe("ProgressoWeb (AC6)", () => {
  it("publica cada evento do preparar com a vaga reduzida e nunca lança", () => {
    const eventos: EventoExecucao[] = [];
    const falhas: unknown[] = [];
    const progresso = new ProgressoWeb(
      (e) => eventos.push(e),
      (e) => falhas.push(e),
    );
    const vaga = umaVaga({ id: 3 as never, empresa: "Acme", cargo: "Dev", status: "PRONTA" });
    progresso.emitir({ tipo: "inicio", total: 2, paralelo: 1 });
    progresso.emitir({ tipo: "etapa", vaga, etapa: "analisar" });
    progresso.emitir({ tipo: "concluida", vaga, erro: null });
    expect(eventos).toEqual([
      { tipo: "progresso", evento: { tipo: "inicio", total: 2, paralelo: 1 } },
      {
        tipo: "progresso",
        evento: {
          tipo: "etapa",
          etapa: "analisar",
          vaga: { id: 3, empresa: "Acme", cargo: "Dev", status: "PRONTA", motivo: null },
        },
      },
      {
        tipo: "progresso",
        evento: {
          tipo: "concluida",
          erro: null,
          vaga: { id: 3, empresa: "Acme", cargo: "Dev", status: "PRONTA", motivo: null },
        },
      },
    ]);
    const quebrado = new ProgressoWeb(
      () => {
        throw new Error("stream fechado");
      },
      (e) => falhas.push(e),
    );
    expect(() => quebrado.emitir({ tipo: "inicio", total: 1, paralelo: 1 })).not.toThrow();
    expect(falhas).toHaveLength(1);
  });
});

import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { streamSSE } from "hono/streaming";
import type { Container } from "#composicao";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { lerCurriculo, validarExtensao } from "#interfaces/compartilhado/importacao.ts";
import {
  esquemaEntradaAplicar,
  esquemaEntradaPreparar,
  esquemaEntradaResposta,
  type EventoExecucao,
  type ResultadoExecucao,
} from "../contrato.ts";
import { lerJson, validar } from "../entrada.ts";
import { ErroExecucaoEmAndamento, type ContextoExecucao } from "../execucoes.ts";
import { ErroPerguntaNaoPendente, InteracaoWeb } from "../interacao-web.ts";
import { ProgressoWeb } from "../progresso-web.ts";
import type { DepsRotas } from "./deps.ts";

/** Teto do upload de currículo. */
export const LIMITE_UPLOAD_BYTES = 10 * 1024 * 1024;

function ocupado(comando: string, causa?: unknown): ErroExecucaoEmAndamento {
  return new ErroExecucaoEmAndamento(
    `Já tem um ${comando} rodando. Bora esperar ele terminar?`,
    causa === undefined ? undefined : { cause: causa },
  );
}

/**
 * `preparar` e `aplicar` nunca rodam dois ao mesmo tempo, nem com a CLI (ADR-0016): a execução em memória
 * barra o segundo no mesmo agente e a trava de arquivo barra o de outro processo.
 */
function iniciarExclusivo(
  deps: DepsRotas,
  comando: "preparar" | "aplicar",
  trabalho: (ctx: ContextoExecucao) => Promise<ResultadoExecucao>,
): string {
  if (deps.execucoes.emAndamento(comando)) throw ocupado(comando);
  let trava: ReturnType<Container["adquirirTrava"]>;
  try {
    trava = deps.container.adquirirTrava(comando);
  } catch (erro) {
    if (erro instanceof ErroUsuario) throw ocupado(comando, erro);
    throw erro;
  }
  try {
    return deps.execucoes.iniciar(comando, trabalho, () => {
      trava.liberar();
    }).id;
  } catch (erro) {
    trava.liberar();
    throw erro;
  }
}

function rotasPrepararEAplicar(app: Hono, deps: DepsRotas): void {
  const { container, arquivos } = deps;

  app.post("/execucoes/preparar", async (c) => {
    const { forcar, reavaliar, paralelo } = validar(esquemaEntradaPreparar, await lerJson(c));
    const id = iniciarExclusivo(deps, "preparar", async (ctx) => {
      const progresso = new ProgressoWeb(ctx.publicar, (erro) => {
        container.registrarErro("falha ao publicar o andamento do preparar", erro);
      });
      const resumo = await container.casos.prepararVagas(
        { forcar, reavaliar, ...(paralelo !== undefined ? { paralelo } : {}) },
        progresso,
        ctx.sinal,
      );
      return {
        comando: "preparar",
        ...resumo,
        contagens: { ...resumo.contagens },
        erros: resumo.erros.map((e) => ({ ...e })),
      };
    });
    return c.json({ id }, 202);
  });

  app.post("/execucoes/aplicar", async (c) => {
    const { simular, id: vaga } = validar(esquemaEntradaAplicar, await lerJson(c));
    const id = iniciarExclusivo(deps, "aplicar", async (ctx) => {
      const interacao = new InteracaoWeb({
        publicar: ctx.publicar,
        sinal: ctx.sinal,
        assinarArquivo: (caminho) => arquivos.assinar(caminho),
      });
      ctx.definirInteracao(interacao);
      if (simular) {
        ctx.publicar({
          tipo: "aviso",
          mensagem: "Modo simulação: preenche e revisa, mas nada é enviado.",
        });
      }
      const resumo = await container.casos.aplicarVagas(
        { simular, ...(vaga !== undefined ? { id: vaga as IdVaga } : {}) },
        interacao,
        ctx.sinal,
      );
      return { comando: "aplicar", ...resumo, desfechos: { ...resumo.desfechos } };
    });
    return c.json({ id }, 202);
  });
}

function rotasImportarERenderizar(app: Hono, deps: DepsRotas): void {
  const { container, execucoes, arquivos } = deps;
  const { caminhos } = container;
  const rel = (caminho: string): string => relative(caminhos.raiz, caminho).replaceAll("\\", "/");

  app.post(
    "/execucoes/importar",
    bodyLimit({
      maxSize: LIMITE_UPLOAD_BYTES + 64 * 1024,
      onError: (c) => c.json({ mensagem: "O arquivo passou de 10 MB." }, 413),
    }),
    async (c) => {
      const corpo = await c.req.parseBody();
      const arquivo = corpo.arquivo;
      if (!(arquivo instanceof File)) throw new ErroUsuario("envie o currículo no campo `arquivo`");
      if (arquivo.size > LIMITE_UPLOAD_BYTES) {
        return c.json({ mensagem: "O arquivo passou de 10 MB." }, 413);
      }
      const extensao = validarExtensao(arquivo.name);
      const sobrescrever = corpo.sobrescrever === "true";
      if (execucoes.emAndamento("importar")) throw ocupado("importar");
      mkdirSync(caminhos.tmpDir, { recursive: true });
      const temporario = join(caminhos.tmpDir, `importar-${randomUUID()}${extensao}`);
      writeFileSync(temporario, Buffer.from(await arquivo.arrayBuffer()));
      const apagar = (): void => {
        rmSync(temporario, { force: true });
      };
      try {
        const { id } = execucoes.iniciar(
          "importar",
          async (ctx) => {
            const { ehPdf, texto } = await lerCurriculo(temporario);
            const r = await container.casos.importarCurriculo(
              {
                caminhoArquivo: temporario,
                ehPdf,
                ...(texto !== undefined ? { texto } : {}),
                sobrescrever,
                pastaLog: join(caminhos.logsDir, "llm"),
              },
              ctx.sinal,
            );
            return {
              comando: "importar",
              master: rel(caminhos.master),
              ...(r.backup ? { backup: rel(r.backup) } : {}),
              criados: r.criados.map(rel),
              experiencias: r.master.experiencias.length,
              skills: r.master.skills.length,
            };
          },
          apagar,
        );
        return c.json({ id }, 202);
      } catch (erro) {
        apagar();
        throw erro;
      }
    },
  );

  app.post("/execucoes/renderizar-master", (c) => {
    const { id } = execucoes.iniciar("renderizar_master", async (ctx) => {
      const { pdf, paginas } = await container.casos.renderizarMaster(ctx.sinal);
      const urlPdf = arquivos.assinar(pdf);
      if (urlPdf === null) throw new ErroUsuario("o PDF do master não foi gerado");
      if (paginas > 2) {
        ctx.publicar({
          tipo: "aviso",
          mensagem: "O PDF passou de 2 páginas: vale enxugar o master.",
        });
      }
      return { comando: "renderizar_master", urlPdf, paginas };
    });
    return c.json({ id }, 202);
  });
}

function rotasAcompanhamento(app: Hono, deps: DepsRotas): void {
  const { execucoes } = deps;

  app.get("/execucoes/ativas", (c) =>
    c.json({
      execucoes: execucoes
        .ativas()
        .map((e) => ({ id: e.id, comando: e.comando, iniciadaEm: e.iniciadaEm })),
    }),
  );

  app.get("/execucoes/:id/eventos", (c) => {
    const id = c.req.param("id");
    if (!execucoes.buscar(id)) return c.json({ mensagem: "execução não encontrada" }, 404);
    return streamSSE(c, async (stream) => {
      const fila: EventoExecucao[] = [];
      // Objeto (não `let`): os callbacks mudam o estado entre os `await` do laço.
      const estado: { encerrado: boolean; acordar: (() => void) | null } = {
        encerrado: false,
        acordar: null,
      };
      const avisar = (): void => {
        estado.acordar?.();
        estado.acordar = null;
      };
      const cancelar = execucoes.assinar(
        id,
        (evento) => {
          fila.push(evento);
          avisar();
        },
        () => {
          estado.encerrado = true;
          avisar();
        },
      );
      stream.onAbort(() => {
        estado.encerrado = true;
        avisar();
      });
      try {
        for (;;) {
          for (let evento = fila.shift(); evento; evento = fila.shift()) {
            await stream.writeSSE({ data: JSON.stringify(evento) });
          }
          if (estado.encerrado) break;
          await new Promise<void>((resolver) => {
            estado.acordar = resolver;
          });
        }
      } finally {
        cancelar();
      }
    });
  });

  app.post("/execucoes/:id/respostas", async (c) => {
    const execucao = execucoes.buscar(c.req.param("id"));
    if (!execucao) return c.json({ mensagem: "execução não encontrada" }, 404);
    const { perguntaId, valor } = validar(esquemaEntradaResposta, await lerJson(c));
    if (!execucao.interacao || execucao.encerrada) {
      throw new ErroPerguntaNaoPendente("essa execução não está esperando resposta");
    }
    execucao.interacao.responder(perguntaId, valor);
    return c.json({ ok: true });
  });

  app.post("/execucoes/:id/cancelar", (c) => {
    const id = c.req.param("id");
    if (!execucoes.buscar(id)) return c.json({ mensagem: "execução não encontrada" }, 404);
    return c.json({ estado: execucoes.cancelar(id) });
  });
}

/** Execuções longas: iniciar, acompanhar (stream), responder perguntas e cancelar. */
export function registrarRotasExecucoes(app: Hono, deps: DepsRotas): void {
  rotasPrepararEAplicar(app, deps);
  rotasImportarERenderizar(app, deps);
  rotasAcompanhamento(app, deps);
}

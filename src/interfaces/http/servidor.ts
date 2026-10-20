// Servidor HTTP do agente local (ADR-0024): expõe os casos de uso ao site, só em 127.0.0.1.
import type { Server } from "node:http";
import { serve } from "@hono/node-server";
import { Hono, type Context } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  ErroCamaleao,
  ErroDominio,
  ErroEntradaInvalida,
  ErroTransicaoInvalida,
  ErroUsuario,
} from "#dominio/compartilhado/erros.ts";
import type { AssinadorArquivos } from "./arquivos.ts";
import { registrarRotaArquivos } from "./arquivos.ts";
import { esquemaEntradaPareamento, VERSAO_CONTRATO, type ErroApi } from "./contrato.ts";
import { lerJson, validar } from "./entrada.ts";
import { ErroExecucaoEmAndamento, type GerenciadorExecucoes } from "./execucoes.ts";
import { ErroPerguntaNaoPendente } from "./interacao-web.ts";
import type { ArmazemTokens, Pareamento } from "./pareamento.ts";
import type { DepsRotas } from "./rotas/deps.ts";
import { registrarRotasCurriculo } from "./rotas/curriculo.ts";
import { registrarRotasExecucoes } from "./rotas/execucoes.ts";
import { registrarRotasFalhas } from "./rotas/falhas.ts";
import { registrarRotasNavegador } from "./rotas/navegador.ts";
import { registrarRotasPerfil } from "./rotas/perfil.ts";
import { registrarRotasStatus } from "./rotas/status.ts";
import { registrarRotasVagas } from "./rotas/vagas.ts";
import { exigirToken, protegerAgente } from "./seguranca.ts";

export interface OpcoesApp {
  readonly porta: number;
  readonly origensPermitidas: readonly string[];
  readonly versao: string;
  readonly pareamento: Pareamento;
  readonly tokens: ArmazemTokens;
  readonly execucoes: GerenciadorExecucoes;
  readonly arquivos: AssinadorArquivos;
  readonly abrir: (caminho: string) => Promise<unknown>;
}

type Status = 401 | 403 | 404 | 409 | 413 | 422 | 500;

function responderErro(c: Context, status: Status, corpo: ErroApi): Response {
  return c.json(corpo, status);
}

/** Erro → resposta: uso e domínio 422, conflito 409, inesperado 500 com o stack só no log. */
function tratarErro(
  erro: unknown,
  c: Context,
  registrarErro: DepsRotas["container"]["registrarErro"],
) {
  if (erro instanceof HTTPException) return erro.getResponse();
  if (erro instanceof ErroExecucaoEmAndamento || erro instanceof ErroPerguntaNaoPendente) {
    return responderErro(c, 409, { mensagem: erro.message });
  }
  if (erro instanceof ErroTransicaoInvalida) {
    return responderErro(c, 422, { mensagem: erro.message, aceitas: [...erro.aceitas] });
  }
  if (erro instanceof ErroEntradaInvalida) {
    return responderErro(c, 422, { mensagem: erro.message, erros: [...erro.problemas] });
  }
  if (erro instanceof ErroUsuario || erro instanceof ErroDominio) {
    return responderErro(c, 422, { mensagem: erro.message });
  }
  if (erro instanceof ErroCamaleao) return responderErro(c, 500, { mensagem: erro.message });
  registrarErro(`erro inesperado em ${c.req.method} ${c.req.path}`, erro);
  return responderErro(c, 500, { mensagem: "Erro inesperado (detalhes em dados/logs/)." });
}

/**
 * Caminho para o log: o id de `/arquivos/<id>` é uma credencial e sai mascarado. O corpo das requisições
 * (perfil, pareamento) nunca é registrado.
 */
function caminhoParaLog(caminho: string): string {
  return caminho.replace(/^\/arquivos\/.+$/, "/arquivos/***");
}

/**
 * Monta o app: proteções (Host, CORS, cabeçalhos), rotas públicas (`/saude`, `/pareamento`,
 * `/arquivos/:id`) e, sob o token, as rotas dos comandos.
 */
export function criarApp(container: DepsRotas["container"], opcoes: OpcoesApp): Hono {
  const app = new Hono();
  const deps: DepsRotas = {
    container,
    execucoes: opcoes.execucoes,
    arquivos: opcoes.arquivos,
    abrir: opcoes.abrir,
  };
  app.onError((erro, c) => tratarErro(erro, c, container.registrarErro));
  app.notFound((c) => responderErro(c, 404, { mensagem: "rota não encontrada" }));

  app.use(protegerAgente(opcoes));
  app.use(async (c, next) => {
    const inicio = Date.now();
    await next();
    container
      .registrador()
      .depurar(
        `${c.req.method} ${caminhoParaLog(c.req.path)} ${String(c.res.status)} (${String(Date.now() - inicio)} ms)`,
      );
  });

  app.get("/saude", (c) =>
    c.json({ app: "camaleao", versao: opcoes.versao, versaoContrato: VERSAO_CONTRATO }),
  );
  app.post("/pareamento", async (c) => {
    const { codigo } = validar(esquemaEntradaPareamento, await lerJson(c));
    const token = opcoes.pareamento.parear(codigo);
    if (token === null) {
      return responderErro(c, 401, {
        mensagem: "Código inválido ou expirado. Confira o código no terminal do Camaleão.",
      });
    }
    return c.json({ token });
  });
  registrarRotaArquivos(app, opcoes.arquivos);

  app.use(exigirToken(opcoes.tokens));
  app.post("/pareamento/revogar", (c) => {
    opcoes.tokens.revogarTodos();
    return c.json({ ok: true });
  });
  registrarRotasExecucoes(app, deps);
  registrarRotasVagas(app, deps);
  registrarRotasStatus(app, deps);
  registrarRotasFalhas(app, deps);
  registrarRotasNavegador(app, deps);
  registrarRotasCurriculo(app, deps);
  registrarRotasPerfil(app, deps);
  return app;
}

export interface ServidorAgente {
  /** Endereço em que o socket escuta (sempre `127.0.0.1`). */
  readonly endereco: string;
  readonly porta: number;
  /** Fecha o servidor, inclusive as conexões de stream abertas. */
  fechar(): Promise<void>;
}

/** Escuta só em 127.0.0.1 (nunca na rede). Porta ocupada rejeita com o erro do `listen`. */
export function iniciarServidor(app: Hono, porta: number): Promise<ServidorAgente> {
  return new Promise((resolver, rejeitar) => {
    const servidor = serve(
      { fetch: app.fetch, port: porta, hostname: "127.0.0.1", overrideGlobalObjects: false },
      (info) => {
        resolver({
          endereco: info.address,
          porta: info.port,
          fechar: () =>
            new Promise<void>((fechado) => {
              (servidor as Server).closeAllConnections();
              servidor.close(() => {
                fechado();
              });
            }),
        });
      },
    );
    servidor.once("error", rejeitar);
  });
}

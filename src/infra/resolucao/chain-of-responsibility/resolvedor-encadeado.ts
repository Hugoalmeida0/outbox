import type { Page } from "playwright";
import { ErroAgregadorExigeLogin, ErroResolucao } from "#aplicacao/portas/erros.ts";
import type { Resolucao, ResolvedorVagas } from "#aplicacao/portas/resolvedor-vagas.ts";
import {
  AGREGADORES,
  canonizar,
  ehMotorConhecido,
  MOTORES_COM_CONECTOR_V1,
  type Motor,
} from "#dominio/vagas/motores.ts";
import type { UrlCanonica } from "#dominio/vagas/vaga.ts";
import type { LeitorHeadless } from "#infra/navegador/leitor-headless.ts";
import { resolverNoAgregador } from "../agregadores.ts";
import { detectarAtsNoHtml } from "../detectar-ats.ts";

const PROFUNDIDADE_MAXIMA = 2;

type ResolverDeNovo = (url: string) => Promise<Resolucao>;

/** Um elo da cadeia: o primeiro que aceitar a URL resolve. */
export interface EloResolucao {
  aceita(motor: Motor, url: URL): boolean;
  resolver(
    canonica: UrlCanonica,
    motor: Motor,
    sinal: AbortSignal,
    deNovo: ResolverDeNovo,
  ): Promise<Resolucao>;
}

function ehPortalGupy(url: URL): boolean {
  return url.hostname === "portal.gupy.io";
}

export const eloDireto: EloResolucao = {
  aceita: (motor, url) =>
    ehMotorConhecido(motor) && MOTORES_COM_CONECTOR_V1.includes(motor) && !ehPortalGupy(url),
  resolver: (canonica, motor) =>
    Promise.resolve({ motor, urlResolvida: canonica, canonica, rota: "conector" }),
};

export const eloGithub: EloResolucao = {
  aceita: (motor) => motor === "github",
  resolver: (canonica) =>
    Promise.resolve({ motor: "github", urlResolvida: canonica, canonica, rota: "a_definir" }),
};

/** Agregadores: usa a sessão do navegador do Outbox só para descobrir o destino da candidatura. */
export function eloAgregadores(abrirPagina: () => Promise<Page>): EloResolucao {
  return {
    aceita: (motor) => ehMotorConhecido(motor) && AGREGADORES.includes(motor),
    resolver: async (canonica, motor, _sinal, deNovo) => {
      const pagina = await abrirPagina();
      try {
        const desfecho = await resolverNoAgregador(pagina, canonica);
        if (desfecho.tipo === "easy_apply") {
          return {
            motor,
            urlResolvida: canonica,
            canonica,
            rota: "manual",
            manual: { motivo: "easy_apply" },
          };
        }
        return await deNovo(desfecho.url);
      } finally {
        await pagina.close().catch(() => undefined);
      }
    },
  };
}

export function eloPortalGupy(leitor: LeitorHeadless): EloResolucao {
  return {
    aceita: (_motor, url) => ehPortalGupy(url),
    resolver: async (canonica, _motor, sinal, deNovo) => {
      const pagina = await leitor.ler(canonica, sinal);
      const final = new URL(pagina.urlFinal);
      if (
        final.hostname.endsWith(".gupy.io") &&
        !ehPortalGupy(final) &&
        /\/jobs?\/\d+/.test(final.pathname)
      ) {
        return deNovo(final.href);
      }
      const link = /https:\/\/[\w-]+\.gupy\.io\/jobs?\/\d+/.exec(
        pagina.html.replace(/\\\//g, "/"),
      )?.[0];
      if (!link || link.includes("portal.gupy.io")) {
        throw new ErroResolucao(`não encontrei a vaga da empresa a partir de ${canonica}`);
      }
      return deNovo(link);
    },
  };
}

/** Página de carreira ou domínio próprio: detecta um ATS embutido; sem ATS, a candidatura fica com o agente. */
export function eloDetectarAts(leitor: LeitorHeadless): EloResolucao {
  return {
    aceita: () => true,
    resolver: async (canonica, motor, sinal, deNovo) => {
      const pagina = await leitor.ler(canonica, sinal);
      const detectado = detectarAtsNoHtml(pagina.html, pagina.urlFinal);
      if (detectado?.canonica) return deNovo(detectado.canonica);
      return {
        motor: detectado?.motor ?? motor,
        urlResolvida: pagina.urlFinal,
        canonica,
        rota: "agente",
      };
    },
  };
}

/** Cadeia de resolução (Chain of Responsibility simplificada, arquitetura.md §8.1). */
export class ResolvedorEncadeado implements ResolvedorVagas {
  private readonly elos: readonly EloResolucao[];

  constructor(elos: readonly EloResolucao[]) {
    this.elos = elos;
  }

  resolver(canonica: UrlCanonica, motor: Motor, sinal: AbortSignal): Promise<Resolucao> {
    return this.resolverComProfundidade(canonica, motor, sinal, 0);
  }

  private async resolverComProfundidade(
    canonica: UrlCanonica,
    motor: Motor,
    sinal: AbortSignal,
    profundidade: number,
  ): Promise<Resolucao> {
    sinal.throwIfAborted();
    const url = new URL(canonica);
    const elo = this.elos.find((e) => e.aceita(motor, url));
    if (!elo) throw new ErroResolucao(`nenhum resolvedor para ${canonica}`);
    const deNovo: ResolverDeNovo = (proxima) => {
      if (profundidade + 1 > PROFUNDIDADE_MAXIMA) {
        throw new ErroResolucao(`redirecionamentos demais a partir de ${canonica}`);
      }
      const { canonica: c, motor: m } = canonizar(proxima);
      return this.resolverComProfundidade(c, m, sinal, profundidade + 1);
    };
    try {
      return await elo.resolver(canonica, motor, sinal, deNovo);
    } catch (erro) {
      // Login exigido e falhas já classificadas passam; o resto (navegador, rede) vira falha de resolução.
      if (erro instanceof ErroAgregadorExigeLogin || erro instanceof ErroResolucao) throw erro;
      throw new ErroResolucao(`falha ao resolver ${canonica}: ${(erro as Error).message}`, {
        cause: erro,
      });
    }
  }
}

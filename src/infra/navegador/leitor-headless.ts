import type { Browser, BrowserContext, Page, Route } from "playwright";
import { ErroNavegador } from "#aplicacao/portas/erros.ts";

export interface PaginaLida {
  readonly urlFinal: string;
  readonly html: string;
  readonly texto: string;
}

export interface OpcoesLeitor {
  /** Intercepta todas as requisições (os testes servem fixtures e negam o resto). */
  readonly interceptar?: (rota: Route) => Promise<void>;
  readonly lancar?: () => Promise<Browser>;
}

/**
 * Chromium headless efêmero (sem perfil) para páginas públicas e render de PDF. Um navegador por execução
 * de comando; um contexto isolado por leitura.
 */
export class LeitorHeadless {
  private readonly opcoes: OpcoesLeitor;
  private navegador: Promise<Browser> | null = null;

  constructor(opcoes: OpcoesLeitor = {}) {
    this.opcoes = opcoes;
  }

  private obterNavegador(): Promise<Browser> {
    this.navegador ??= (async () => {
      if (this.opcoes.lancar) return this.opcoes.lancar();
      const { chromium } = await import("playwright");
      return chromium.launch({ headless: true });
    })();
    return this.navegador;
  }

  /** Cria um contexto novo, já com a interceptação de testes aplicada. */
  async novoContexto(opcoes: { readonly javaScript?: boolean } = {}): Promise<BrowserContext> {
    const navegador = await this.obterNavegador();
    const contexto = await navegador.newContext({
      javaScriptEnabled: opcoes.javaScript ?? true,
      locale: "pt-BR",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
    });
    if (this.opcoes.interceptar) await contexto.route("**/*", this.opcoes.interceptar);
    return contexto;
  }

  /** Executa `fn` numa página de um contexto isolado, fechado ao final. */
  async comPagina<T>(fn: (pagina: Page) => Promise<T>, sinal?: AbortSignal): Promise<T> {
    const contexto = await this.novoContexto();
    const aoAbortar = (): void => {
      void contexto.close();
    };
    sinal?.addEventListener("abort", aoAbortar, { once: true });
    try {
      return await fn(await contexto.newPage());
    } finally {
      sinal?.removeEventListener("abort", aoAbortar);
      await contexto.close().catch(() => undefined);
    }
  }

  /** Navega até a URL, espera a rede acalmar (ou `esperarMs`) e devolve URL final, HTML e texto visível. */
  async ler(url: string, sinal?: AbortSignal, esperarMs = 15_000): Promise<PaginaLida> {
    try {
      return await this.comPagina(async (pagina) => {
        await pagina.goto(url, { waitUntil: "domcontentloaded", timeout: esperarMs });
        await pagina.waitForLoadState("networkidle", { timeout: esperarMs }).catch(() => undefined);
        return {
          urlFinal: pagina.url(),
          html: await pagina.content(),
          texto: await pagina
            .locator("body")
            .innerText({ timeout: esperarMs })
            .catch(() => ""),
        };
      }, sinal);
    } catch (erro) {
      if (erro instanceof ErroNavegador) throw erro;
      throw new ErroNavegador(`não foi possível ler ${url}: ${(erro as Error).message}`, {
        cause: erro,
      });
    }
  }

  /** Contexto para render de PDF: sem JavaScript e com toda requisição de rede bloqueada (ADR-012). */
  async contextoRender(): Promise<BrowserContext> {
    const navegador = await this.obterNavegador();
    const contexto = await navegador.newContext({ javaScriptEnabled: false });
    await contexto.route("**/*", (rota) => rota.abort());
    return contexto;
  }

  async fechar(): Promise<void> {
    const navegador = this.navegador;
    this.navegador = null;
    if (navegador) await (await navegador).close().catch(() => undefined);
  }
}

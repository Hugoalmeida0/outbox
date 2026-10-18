import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Browser, Page } from "playwright";
import { ErroNavegador } from "#aplicacao/portas/erros.ts";
import type { NavegadorUsuario } from "#aplicacao/portas/navegador-usuario.ts";
import { hostCasaPadrao } from "#dominio/vagas/motores.ts";

export interface OpcoesNavegadorOutbox {
  readonly portaCdp: number;
  readonly executavel: "auto" | "chrome" | "chromium";
  readonly pastaPerfil: string;
  /** Argumentos extras ao lançar (os testes usam `--headless=new`). */
  readonly argsExtras?: readonly string[];
  readonly esperaConexaoMs?: number;
}

function caminhosChrome(): string[] {
  const bases = [
    process.env.ProgramFiles,
    process.env["ProgramFiles(x86)"],
    process.env.LOCALAPPDATA,
  ];
  return bases
    .filter((b): b is string => typeof b === "string" && b.length > 0)
    .map((b) => join(b, "Google", "Chrome", "Application", "chrome.exe"));
}

/**
 * Navegador dedicado do Outbox: Chrome (ou Chromium) com perfil persistente em `dados/navegador/` e porta
 * CDP, compartilhado por conectores, agente e MCP. Sobrevive ao fim do processo da CLI.
 */
export class NavegadorOutbox implements NavegadorUsuario {
  private readonly opcoes: OpcoesNavegadorOutbox;
  private conexao: Browser | null = null;

  constructor(opcoes: OpcoesNavegadorOutbox) {
    this.opcoes = opcoes;
  }

  get endpointCdp(): string {
    return `http://127.0.0.1:${String(this.opcoes.portaCdp)}`;
  }

  /** Caminho do executável conforme a configuração (`auto` prefere o Chrome instalado). */
  async resolverExecutavel(): Promise<string> {
    if (this.opcoes.executavel !== "chromium") {
      const chrome = caminhosChrome().find((c) => existsSync(c));
      if (chrome) return chrome;
      if (this.opcoes.executavel === "chrome")
        throw new ErroNavegador("Google Chrome não encontrado");
    }
    const { chromium } = await import("playwright");
    return chromium.executablePath();
  }

  private async conectar(timeoutMs = 3000): Promise<Browser> {
    const { chromium } = await import("playwright");
    return chromium.connectOverCDP(this.endpointCdp, { timeout: timeoutMs });
  }

  /** O endpoint CDP responde? Distingue "navegador fechado" de "navegador aberto, mas lento". */
  private async cdpAtivo(): Promise<boolean> {
    try {
      const resposta = await fetch(`${this.endpointCdp}/json/version`, {
        signal: AbortSignal.timeout(2000),
      });
      return resposta.ok;
    } catch {
      return false;
    }
  }

  /** Conecta ao navegador do Outbox, lançando-o se ainda não estiver aberto. */
  async garantir(): Promise<Browser> {
    if (this.conexao?.isConnected()) return this.conexao;
    try {
      this.conexao = await this.conectar();
      return this.conexao;
    } catch (erro) {
      // Aberto mas lento (máquina carregada): reconecta com mais prazo em vez de lançar um segundo
      // navegador, que ficaria órfão disputando a mesma porta e o mesmo perfil.
      if (await this.cdpAtivo()) {
        try {
          this.conexao = await this.conectar(this.opcoes.esperaConexaoMs ?? 15_000);
          return this.conexao;
        } catch {
          throw new ErroNavegador(
            `o navegador do Outbox em ${this.endpointCdp} está aberto, mas não aceitou a conexão`,
            { cause: erro },
          );
        }
      }
    }
    const exe = await this.resolverExecutavel();
    const filho = spawn(
      exe,
      [
        `--remote-debugging-port=${String(this.opcoes.portaCdp)}`,
        `--user-data-dir=${this.opcoes.pastaPerfil}`,
        "--no-first-run",
        "--no-default-browser-check",
        ...(this.opcoes.argsExtras ?? []),
      ],
      { detached: true, stdio: "ignore", windowsHide: false },
    );
    filho.unref();
    const limite = Date.now() + (this.opcoes.esperaConexaoMs ?? 15_000);
    let ultimoErro: unknown;
    while (Date.now() < limite) {
      try {
        this.conexao = await this.conectar();
        return this.conexao;
      } catch (erro) {
        ultimoErro = erro;
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    throw new ErroNavegador(
      `não foi possível conectar ao navegador do Outbox em ${this.endpointCdp}`,
      {
        cause: ultimoErro,
      },
    );
  }

  async paginaNova(): Promise<Page> {
    const navegador = await this.garantir();
    const contexto = navegador.contexts()[0] ?? (await navegador.newContext());
    return contexto.newPage();
  }

  /**
   * Última página `http(s)` do contexto padrão, preferindo as de `hosts` (padrões como `*.gupy.io`). A
   * ordem das abas por CDP não é a de uso: sem o filtro, uma aba do usuário (a página inicial do Chrome,
   * um portal aberto ao lado) pode ser tomada pela página da vaga.
   */
  async paginaMaisRecente(hosts: readonly string[] = []): Promise<Page | null> {
    const navegador = await this.garantir();
    const paginas = (navegador.contexts()[0]?.pages() ?? []).filter((p) =>
      /^https?:/.test(p.url()),
    );
    const daVaga = paginas.filter((p) => {
      const host = URL.canParse(p.url()) ? new URL(p.url()).hostname : "";
      return hosts.some((padrao) => hostCasaPadrao(host, padrao));
    });
    return daVaga.at(-1) ?? paginas.at(-1) ?? null;
  }

  async abrirParaLogin(): Promise<void> {
    const pagina = await this.paginaNova();
    await pagina.goto("about:blank");
  }

  /** Encerra só a conexão CDP desta CLI; o navegador continua aberto para o usuário. */
  async desconectar(): Promise<void> {
    const conexao = this.conexao;
    this.conexao = null;
    if (!conexao) return;
    // Em navegador conectado por CDP, close() desconecta sem encerrar o processo do navegador.
    await conexao.close().catch(() => undefined);
  }
}

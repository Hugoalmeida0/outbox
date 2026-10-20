import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Page } from "playwright";
import type {
  DesfechoEnvio,
  FormularioAberto,
  ValorLido,
} from "#aplicacao/portas/formulario-aberto.ts";
import { lerValoresGenerico } from "./descritores.ts";

export interface RegrasConfirmacao {
  /** Texto exibido após o envio bem-sucedido. */
  readonly texto: RegExp;
  /** URL após o envio bem-sucedido (opcional). */
  readonly url?: RegExp;
  /** Texto que indica etapa de teste após o envio (Gupy). */
  readonly pendenteTeste?: RegExp;
}

export interface OpcoesFormularioPlaywright {
  readonly rota: "conector" | "agente";
  /** Seletor do botão final de envio; `null` quando quem confirma é o usuário. */
  readonly seletorEnviar: string | null;
  readonly confirmacao: RegrasConfirmacao | null;
  readonly ignorar?: readonly string[];
}

/** Handle de formulário sobre uma `Page` do Playwright (conector ou agente). */
export class FormularioPlaywright implements FormularioAberto {
  readonly rota: "conector" | "agente";
  private readonly pagina: Page;
  private readonly opcoes: OpcoesFormularioPlaywright;
  private fechado = false;

  constructor(pagina: Page, opcoes: OpcoesFormularioPlaywright) {
    this.pagina = pagina;
    this.opcoes = opcoes;
    this.rota = opcoes.rota;
  }

  urlAtual(): string {
    return this.pagina.url();
  }

  async capturarTela(destino: string): Promise<void> {
    mkdirSync(dirname(destino), { recursive: true });
    await this.pagina.screenshot({ path: destino, fullPage: true });
  }

  capturarHtml(): Promise<string> {
    return this.pagina.content();
  }

  lerValores(): Promise<ValorLido[]> {
    return lerValoresGenerico(this.pagina, this.opcoes.ignorar ?? []);
  }

  async enviar(): Promise<void> {
    if (this.opcoes.seletorEnviar === null)
      throw new Error("formulário sem seletor de envio conhecido");
    // Só o primeiro botão visível: páginas escondem botões de envio auxiliares (ex.: hCaptcha do Lever).
    await this.pagina.locator(this.opcoes.seletorEnviar).filter({ visible: true }).first().click();
    await this.pagina
      .waitForLoadState("domcontentloaded", { timeout: 15_000 })
      .catch(() => undefined);
  }

  /** Espera a confirmação por texto ou URL; sem regras conhecidas, devolve `indeterminada`. */
  async confirmarEnvio(timeoutMs: number): Promise<DesfechoEnvio> {
    const regras = this.opcoes.confirmacao;
    if (regras === null) return "indeterminada";
    const limite = Date.now() + timeoutMs;
    while (Date.now() < limite) {
      const texto = await this.pagina
        .locator("body")
        .innerText({ timeout: 2000 })
        .catch(() => "");
      if (regras.pendenteTeste?.test(texto)) return "pendente_teste";
      if (regras.texto.test(texto) || regras.url?.test(this.pagina.url())) return "enviada";
      await new Promise((r) => setTimeout(r, 500));
    }
    return "nao_confirmada";
  }

  async fechar(): Promise<void> {
    if (this.fechado) return;
    this.fechado = true;
    await this.pagina.close().catch(() => undefined);
  }
}

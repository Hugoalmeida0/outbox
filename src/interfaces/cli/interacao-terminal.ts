import { confirm, input, number, select } from "@inquirer/prompts";
import type { Interacao, OpcaoEscolha, ResumoRevisao } from "#aplicacao/portas/interacao.ts";
import { formatarResumoRevisao } from "./apresentacao/resumo-revisao.ts";
import { ehInterrupcao } from "./codigos-saida.ts";
import type { Saida } from "./contexto.ts";

export interface OpcoesInteracaoTerminal {
  readonly saida: Saida;
  readonly sinal: AbortSignal;
  /** Chamado quando o usuário cancela um prompt (Ctrl+C), para o caso de uso encerrar sem enviar. */
  readonly cancelar: () => void;
  /** Abre um arquivo no programa padrão (padrão: pacote `open`, carregado sob demanda). */
  readonly abrir?: (caminho: string) => Promise<unknown>;
}

/** Porta `Interacao` no terminal, com `@inquirer/prompts`. */
export class InteracaoTerminal implements Interacao {
  private readonly opcoes: OpcoesInteracaoTerminal;

  constructor(opcoes: OpcoesInteracaoTerminal) {
    this.opcoes = opcoes;
  }

  private async perguntar<T>(
    prompt: (contexto: { signal: AbortSignal }) => Promise<T>,
  ): Promise<T> {
    try {
      return await prompt({ signal: this.opcoes.sinal });
    } catch (erro) {
      // Ctrl+C dentro do prompt não gera SIGINT: o cancelamento é propagado pelo sinal.
      if (ehInterrupcao(erro)) this.opcoes.cancelar();
      throw erro;
    }
  }

  perguntarSimNao(mensagem: string): Promise<boolean> {
    return this.perguntar((ctx) => confirm({ message: mensagem, default: false }, ctx));
  }

  perguntarNumero(mensagem: string, opcoes: { min?: number; max?: number } = {}): Promise<number> {
    return this.perguntar((ctx) =>
      number({ message: mensagem, required: true, step: 1, ...opcoes }, ctx),
    );
  }

  perguntarTexto(mensagem: string): Promise<string> {
    return this.perguntar((ctx) => input({ message: mensagem }, ctx));
  }

  escolher<T extends string>(mensagem: string, opcoes: readonly OpcaoEscolha<T>[]): Promise<T> {
    return this.perguntar((ctx) =>
      select<T>(
        { message: mensagem, choices: opcoes.map((o) => ({ name: o.rotulo, value: o.valor })) },
        ctx,
      ),
    );
  }

  async aguardarUsuario(mensagem: string): Promise<void> {
    await this.perguntar((ctx) => input({ message: `${mensagem} (Enter para continuar)` }, ctx));
  }

  exibirResumoRevisao(resumo: ResumoRevisao): void {
    this.opcoes.saida.escrever(`\n${formatarResumoRevisao(resumo)}\n`);
  }

  informar(mensagem: string): void {
    this.opcoes.saida.escrever(mensagem);
  }

  async abrirArquivo(caminho: string): Promise<void> {
    const abrir =
      this.opcoes.abrir ??
      (async (c: string) => {
        const { default: open } = await import("open");
        return open(c);
      });
    await abrir(caminho);
  }
}

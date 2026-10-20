// Porta `Interacao` do site (ADR-0024): cada pergunta vira um evento `pergunta` e a promessa só resolve
// com a resposta àquela pergunta, enviada pelo site. Os casos de uso (rodada de gaps, revisão e envio)
// não mudam: o envio continua exigindo a escolha "enviar" no menu e a confirmação do próprio fluxo.
import { randomUUID } from "node:crypto";
import type { Interacao, OpcaoEscolha, ResumoRevisao } from "#aplicacao/portas/interacao.ts";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import type { EventoExecucao, Pergunta } from "./contrato.ts";

/** Resposta a uma pergunta que não é a pendente (já respondida, de outra vaga ou inventada). */
export class ErroPerguntaNaoPendente extends ErroUsuario {}

/** Mesmo nome do erro do `@inquirer/prompts` num prompt abortado: o tratamento do Ctrl+C serve aqui. */
export class ErroPerguntaCancelada extends Error {
  constructor() {
    super("pergunta cancelada");
    this.name = "AbortPromptError";
  }
}

type ValorResposta = boolean | number | string | null;

interface Pendente {
  readonly pergunta: Pergunta;
  readonly converter: (valor: ValorResposta) => unknown;
  readonly resolver: (valor: unknown) => void;
  readonly rejeitar: (erro: unknown) => void;
}

export interface OpcoesInteracaoWeb {
  readonly publicar: (evento: EventoExecucao) => void;
  readonly sinal: AbortSignal;
  /** URL de uso único para um arquivo local, ou `null` se ele não pode ser servido. */
  readonly assinarArquivo: (caminho: string) => string | null;
  readonly gerarId?: () => string;
}

function invalida(mensagem: string): never {
  throw new ErroUsuario(mensagem);
}

export class InteracaoWeb implements Interacao {
  private readonly opcoes: OpcoesInteracaoWeb;
  private pendente: Pendente | null = null;

  constructor(opcoes: OpcoesInteracaoWeb) {
    this.opcoes = opcoes;
    opcoes.sinal.addEventListener("abort", () => {
      const pendente = this.pendente;
      this.pendente = null;
      pendente?.rejeitar(new ErroPerguntaCancelada());
    });
  }

  /** A pergunta à espera de resposta, para o site retomar depois de recarregar. */
  get perguntaPendente(): Pergunta | null {
    return this.pendente?.pergunta ?? null;
  }

  private perguntar<T>(
    dados: Omit<Pergunta, "id">,
    converter: (valor: ValorResposta) => T,
  ): Promise<T> {
    if (this.opcoes.sinal.aborted) return Promise.reject(new ErroPerguntaCancelada());
    if (this.pendente) return Promise.reject(new Error("já existe uma pergunta pendente"));
    const pergunta: Pergunta = { id: (this.opcoes.gerarId ?? randomUUID)(), ...dados };
    const promessa = new Promise<T>((resolver, rejeitar) => {
      this.pendente = {
        pergunta,
        converter,
        resolver: resolver as (valor: unknown) => void,
        rejeitar,
      };
    });
    this.opcoes.publicar({ tipo: "pergunta", pergunta });
    return promessa;
  }

  /**
   * Resolve a pergunta pendente. Outra id lança `ErroPerguntaNaoPendente` (409); valor que não serve
   * ao tipo da pergunta lança `ErroUsuario` (422) e a pergunta continua pendente.
   */
  responder(perguntaId: string, valor: ValorResposta): void {
    const pendente = this.pendente;
    if (!pendente || pendente.pergunta.id !== perguntaId) {
      throw new ErroPerguntaNaoPendente("essa pergunta não está mais esperando resposta");
    }
    const convertido = pendente.converter(valor);
    this.pendente = null;
    this.opcoes.publicar({ tipo: "respondida", perguntaId });
    pendente.resolver(convertido);
  }

  perguntarSimNao(mensagem: string): Promise<boolean> {
    return this.perguntar({ tipo: "sim_nao", mensagem }, (v) =>
      typeof v === "boolean" ? v : invalida("responda sim ou não"),
    );
  }

  perguntarNumero(mensagem: string, opcoes: { min?: number; max?: number } = {}): Promise<number> {
    const { min, max } = opcoes;
    return this.perguntar(
      {
        tipo: "numero",
        mensagem,
        ...(min !== undefined ? { min } : {}),
        ...(max !== undefined ? { max } : {}),
      },
      (v) => {
        if (typeof v !== "number" || !Number.isInteger(v))
          return invalida("informe um número inteiro");
        if ((min !== undefined && v < min) || (max !== undefined && v > max)) {
          return invalida(`informe um número entre ${String(min ?? "-∞")} e ${String(max ?? "∞")}`);
        }
        return v;
      },
    );
  }

  perguntarTexto(mensagem: string): Promise<string> {
    return this.perguntar({ tipo: "texto", mensagem }, (v) =>
      typeof v === "string" ? v : invalida("informe um texto"),
    );
  }

  escolher<T extends string>(mensagem: string, opcoes: readonly OpcaoEscolha<T>[]): Promise<T> {
    return this.perguntar(
      {
        tipo: "escolha",
        mensagem,
        opcoes: opcoes.map((o) => ({ valor: o.valor, rotulo: o.rotulo })),
      },
      (v) => opcoes.find((o) => o.valor === v)?.valor ?? invalida("escolha uma das opções"),
    );
  }

  async aguardarUsuario(mensagem: string): Promise<void> {
    await this.perguntar({ tipo: "aguardar", mensagem }, () => undefined);
  }

  exibirResumoRevisao(resumo: ResumoRevisao): void {
    const { caminhoPdf, ...resto } = resumo;
    this.opcoes.publicar({
      tipo: "revisao",
      resumo: {
        ...resto,
        respostas: resto.respostas.map((r) => ({ ...r })),
        gapsRestantes: [...resto.gapsRestantes],
        alertas: [...resto.alertas],
        urlPdf: this.opcoes.assinarArquivo(caminhoPdf),
      },
    });
  }

  informar(mensagem: string): void {
    this.opcoes.publicar({ tipo: "aviso", mensagem: mensagem.trim() });
  }

  abrirArquivo(caminho: string): Promise<void> {
    const url = this.opcoes.assinarArquivo(caminho);
    this.opcoes.publicar(
      url
        ? { tipo: "abrir_arquivo", url }
        : { tipo: "aviso", mensagem: "Não consegui abrir esse arquivo pelo site." },
    );
    return Promise.resolve();
  }
}

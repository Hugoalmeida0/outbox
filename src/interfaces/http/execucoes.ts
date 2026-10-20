// Execuções longas iniciadas pelo site (preparar, aplicar, importar, renderizar master): cada uma tem id,
// eventos guardados desde o início (recarregar a página reapresenta tudo) e cancelamento como o Ctrl+C.
import { randomUUID } from "node:crypto";
import { ErroLimiteUso } from "#aplicacao/portas/erros.ts";
import { ErroCamaleao, ErroUsuario } from "#dominio/compartilhado/erros.ts";
import type { ComandoExecucao, EventoExecucao, ResultadoExecucao } from "./contrato.ts";
import type { InteracaoWeb } from "./interacao-web.ts";

/** Execuções encerradas ficam disponíveis por 30 minutos (o site pode recarregar e ver o resumo). */
export const RETENCAO_MS = 30 * 60_000;

/** Já existe uma execução do mesmo comando em andamento neste agente. */
export class ErroExecucaoEmAndamento extends ErroUsuario {}

export interface Execucao {
  readonly id: string;
  readonly comando: ComandoExecucao;
  readonly iniciadaEm: string;
  readonly eventos: readonly EventoExecucao[];
  /** O stream terminou (`fim` ou `erro`); o trabalho pode ainda estar parando, depois de forçado. */
  readonly encerrada: boolean;
  /** Presente no `aplicar`: recebe as respostas do site. */
  readonly interacao: InteracaoWeb | null;
}

interface EstadoExecucao extends Execucao {
  eventos: EventoExecucao[];
  encerrada: boolean;
  interacao: InteracaoWeb | null;
  /** O trabalho ainda roda (mesmo depois de um cancelamento forçado). */
  emAndamento: boolean;
  encerradaEm: number | null;
  readonly controlador: AbortController;
  readonly assinantes: Set<Assinante>;
}

interface Assinante {
  readonly aoEvento: (evento: EventoExecucao) => void;
  readonly aoEncerrar: () => void;
}

export interface ContextoExecucao {
  readonly id: string;
  readonly sinal: AbortSignal;
  readonly publicar: (evento: EventoExecucao) => void;
  /** Liga a interação web à execução, para a rota de respostas. */
  readonly definirInteracao: (interacao: InteracaoWeb) => void;
}

export interface OpcoesGerenciador {
  readonly agora?: () => number;
  /** Erro inesperado: a mensagem curta vai ao site, o stack só para o log. */
  readonly registrarErro: (mensagem: string, erro: unknown) => void;
}

function eventoDeErro(erro: unknown, sinal: AbortSignal): EventoExecucao {
  if (sinal.aborted)
    return { tipo: "erro", codigo: "cancelada", mensagem: "Execução interrompida." };
  if (erro instanceof ErroLimiteUso) {
    return {
      tipo: "erro",
      codigo: "limite_uso",
      mensagem:
        "O limite de uso do Claude chegou. Dá pra retomar mais tarde, do ponto em que parou.",
    };
  }
  if (erro instanceof ErroUsuario) return { tipo: "erro", codigo: "uso", mensagem: erro.message };
  return {
    tipo: "erro",
    codigo: "execucao",
    mensagem:
      erro instanceof ErroCamaleao ? erro.message : "Erro inesperado (detalhes em dados/logs/).",
  };
}

/** Execuções em memória, com um assinante por conexão de stream. */
export class GerenciadorExecucoes {
  private readonly opcoes: OpcoesGerenciador;
  private readonly execucoes = new Map<string, EstadoExecucao>();

  constructor(opcoes: OpcoesGerenciador) {
    this.opcoes = opcoes;
  }

  private agora(): number {
    return (this.opcoes.agora ?? Date.now)();
  }

  private limpar(): void {
    const limite = this.agora() - RETENCAO_MS;
    for (const [id, e] of this.execucoes) {
      if (!e.emAndamento && e.encerradaEm !== null && e.encerradaEm < limite)
        this.execucoes.delete(id);
    }
  }

  /** Há uma execução deste comando cujo trabalho ainda não terminou. */
  emAndamento(comando: ComandoExecucao): boolean {
    return [...this.execucoes.values()].some((e) => e.comando === comando && e.emAndamento);
  }

  /**
   * Inicia o trabalho em segundo plano. `aoTerminar` roda quando o trabalho termina de verdade (libera a
   * trava), mesmo que o site já tenha forçado o encerramento.
   */
  iniciar(
    comando: ComandoExecucao,
    trabalho: (ctx: ContextoExecucao) => Promise<ResultadoExecucao>,
    aoTerminar: () => void = () => undefined,
  ): Execucao {
    this.limpar();
    if (this.emAndamento(comando)) {
      throw new ErroExecucaoEmAndamento(`Já tem um ${comando} rodando. Bora esperar ele terminar?`);
    }
    const estado: EstadoExecucao = {
      id: randomUUID(),
      comando,
      iniciadaEm: new Date(this.agora()).toISOString(),
      eventos: [],
      encerrada: false,
      interacao: null,
      emAndamento: true,
      encerradaEm: null,
      controlador: new AbortController(),
      assinantes: new Set(),
    };
    this.execucoes.set(estado.id, estado);
    const ctx: ContextoExecucao = {
      id: estado.id,
      sinal: estado.controlador.signal,
      publicar: (evento) => {
        this.publicar(estado, evento);
      },
      definirInteracao: (interacao) => {
        estado.interacao = interacao;
      },
    };
    void (async () => {
      try {
        const resultado = await trabalho(ctx);
        this.publicar(estado, { tipo: "fim", resultado });
      } catch (erro) {
        const evento = eventoDeErro(erro, ctx.sinal);
        if (
          evento.tipo === "erro" &&
          evento.codigo === "execucao" &&
          !(erro instanceof ErroCamaleao)
        ) {
          this.opcoes.registrarErro(`erro inesperado no ${comando} pelo site`, erro);
        }
        this.publicar(estado, evento);
      } finally {
        estado.emAndamento = false;
        aoTerminar();
      }
    })();
    return estado;
  }

  private publicar(estado: EstadoExecucao, evento: EventoExecucao): void {
    if (estado.encerrada) return;
    estado.eventos.push(evento);
    for (const a of estado.assinantes) a.aoEvento(evento);
    if (evento.tipo === "fim" || evento.tipo === "erro") {
      estado.encerrada = true;
      estado.encerradaEm = this.agora();
      for (const a of estado.assinantes) a.aoEncerrar();
      estado.assinantes.clear();
    }
  }

  buscar(id: string): Execucao | null {
    this.limpar();
    return this.execucoes.get(id) ?? null;
  }

  ativas(): Execucao[] {
    this.limpar();
    return [...this.execucoes.values()].filter((e) => !e.encerrada);
  }

  /**
   * Reenvia os eventos já emitidos e depois os novos; `aoEncerrar` vem depois de `fim` ou `erro`.
   * Devolve a função que cancela a assinatura (conexão fechada).
   */
  assinar(
    id: string,
    aoEvento: (evento: EventoExecucao) => void,
    aoEncerrar: () => void,
  ): () => void {
    const estado = this.execucoes.get(id);
    if (!estado) throw new ErroUsuario(`execução ${id} não encontrada`);
    for (const evento of estado.eventos) aoEvento(evento);
    if (estado.encerrada) {
      aoEncerrar();
      return () => undefined;
    }
    const assinante = { aoEvento, aoEncerrar };
    estado.assinantes.add(assinante);
    return () => {
      estado.assinantes.delete(assinante);
    };
  }

  /**
   * Primeira chamada: cancelamento ordenado (como o primeiro Ctrl+C). Segunda: encerra o stream na hora
   * com `erro` "cancelada", sem esperar o trabalho (como o segundo Ctrl+C); a trava só é liberada quando
   * o trabalho de fato termina.
   */
  cancelar(id: string): "cancelando" | "forcado" {
    const estado = this.execucoes.get(id);
    if (!estado) throw new ErroUsuario(`execução ${id} não encontrada`);
    if (!estado.controlador.signal.aborted) {
      estado.controlador.abort();
      return "cancelando";
    }
    this.publicar(estado, {
      tipo: "erro",
      codigo: "cancelada",
      mensagem: "Execução interrompida à força.",
    });
    return "forcado";
  }

  /** Cancela tudo e espera o trabalho em andamento parar (encerramento do agente). */
  async encerrarTodas(limiteMs = 10_000): Promise<void> {
    for (const e of this.execucoes.values()) if (e.emAndamento) e.controlador.abort();
    const fim = Date.now() + limiteMs;
    while ([...this.execucoes.values()].some((e) => e.emAndamento) && Date.now() < fim) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
}

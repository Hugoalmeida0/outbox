import type {
  EtapaPreparo,
  EventoPreparo,
  ProgressoPreparo,
} from "#aplicacao/portas/progresso-preparo.ts";
import type { IdVaga, Vaga } from "#dominio/vagas/vaga.ts";
import {
  formatarCabecalhoPreparo,
  formatarConclusao,
  formatarEmAndamento,
  formatarEtapa,
  formatarRodape,
} from "./apresentacao/progresso.ts";
import type { Saida } from "./contexto.ts";

const QUADROS = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;
const INTERVALO_MS = 100;

interface EmAndamento {
  readonly vaga: Vaga;
  readonly etapa: EtapaPreparo;
  readonly inicio: number;
}

export interface OpcoesProgressoTerminal {
  readonly saida: Saida;
  /** Relógio em milissegundos (padrão: `Date.now`). */
  readonly agora?: () => number;
  /** Chama `fn` a cada `ms` e devolve como parar (padrão: `setInterval` que não segura o processo). */
  readonly repetir?: (fn: () => void, ms: number) => () => void;
}

function repetirSemSegurar(fn: () => void, ms: number): () => void {
  const timer = setInterval(fn, ms);
  timer.unref();
  return () => {
    clearInterval(timer);
  };
}

/**
 * Porta `ProgressoPreparo` no terminal, sempre no stderr (o stdout fica só com o resumo). Com região viva,
 * anima uma linha por vaga em andamento (etapa e tempo) mais um rodapé com o total; sem ela, escreve uma
 * linha por etapa. A conclusão de cada vaga vira linha fixa nos dois modos.
 */
export class ProgressoTerminal implements ProgressoPreparo {
  private readonly opcoes: OpcoesProgressoTerminal;
  private readonly emAndamento = new Map<IdVaga, EmAndamento>();
  private total = 0;
  private concluidas = 0;
  private inicio = 0;
  private quadro = 0;
  private parar: (() => void) | null = null;

  constructor(opcoes: OpcoesProgressoTerminal) {
    this.opcoes = opcoes;
  }

  emitir(evento: EventoPreparo): void {
    if (evento.tipo === "inicio") this.iniciar(evento.total, evento.paralelo);
    else if (evento.tipo === "etapa") this.avancar(evento.vaga, evento.etapa);
    else this.concluir(evento.vaga, evento.erro);
  }

  /** Para a animação e remove a região viva. Idempotente. */
  encerrar(): void {
    this.parar?.();
    this.parar = null;
    this.emAndamento.clear();
    this.opcoes.saida.regiaoViva?.desenhar([]);
  }

  private agora(): number {
    return (this.opcoes.agora ?? Date.now)();
  }

  private iniciar(total: number, paralelo: number): void {
    this.total = total;
    this.concluidas = 0;
    this.inicio = this.agora();
    this.opcoes.saida.erro(formatarCabecalhoPreparo(total, paralelo));
    if (this.opcoes.saida.regiaoViva && this.parar === null) {
      this.parar = (this.opcoes.repetir ?? repetirSemSegurar)(() => {
        this.quadro++;
        this.desenhar();
      }, INTERVALO_MS);
    }
    this.desenhar();
  }

  private avancar(vaga: Vaga, etapa: EtapaPreparo): void {
    const inicio = this.emAndamento.get(vaga.id)?.inicio ?? this.agora();
    this.emAndamento.set(vaga.id, { vaga, etapa, inicio });
    if (this.opcoes.saida.regiaoViva) this.desenhar();
    else this.opcoes.saida.erro(formatarEtapa(vaga, etapa));
  }

  private concluir(vaga: Vaga, erro: string | null): void {
    const inicio = this.emAndamento.get(vaga.id)?.inicio;
    this.emAndamento.delete(vaga.id);
    this.concluidas++;
    this.opcoes.saida.erro(
      formatarConclusao(vaga, erro, inicio === undefined ? null : this.agora() - inicio),
    );
    this.desenhar();
  }

  private desenhar(): void {
    const regiao = this.opcoes.saida.regiaoViva;
    if (!regiao) return;
    const largura = regiao.colunas();
    const agora = this.agora();
    const quadro = QUADROS[this.quadro % QUADROS.length] ?? QUADROS[0];
    regiao.desenhar([
      ...[...this.emAndamento.values()].map((e) =>
        formatarEmAndamento(quadro, e.vaga, e.etapa, agora - e.inicio, largura),
      ),
      formatarRodape(this.concluidas, this.total, agora - this.inicio, largura),
    ]);
  }
}

// Gerador estruturado roteirizado: respostas por tarefa, validadas pelo schema do pedido.
import type {
  GeradorEstruturado,
  PedidoGeracao,
  TarefaLlm,
} from "#aplicacao/portas/gerador-estruturado.ts";

/** Valor bruto, função que recebe o pedido, ou `Error` para simular falha. */
type Resposta = unknown;

export class GeradorEstruturadoRoteirizado implements GeradorEstruturado {
  readonly pedidos: PedidoGeracao<unknown>[] = [];
  private readonly filas = new Map<TarefaLlm, Resposta[]>();
  private readonly padroes = new Map<TarefaLlm, Resposta>();

  /** Enfileira respostas usadas uma vez cada, na ordem. */
  quando(tarefa: TarefaLlm, ...respostas: Resposta[]): this {
    this.filas.set(tarefa, [...(this.filas.get(tarefa) ?? []), ...respostas]);
    return this;
  }

  /** Resposta usada sempre que a fila da tarefa estiver vazia. */
  sempre(tarefa: TarefaLlm, resposta: Resposta): this {
    this.padroes.set(tarefa, resposta);
    return this;
  }

  gerar<T>(pedido: PedidoGeracao<T>, sinal: AbortSignal): Promise<T> {
    if (sinal.aborted) return Promise.reject(new Error("abortado"));
    this.pedidos.push(pedido);
    const fila = this.filas.get(pedido.tarefa) ?? [];
    const resposta = fila.length > 0 ? fila.shift() : this.padroes.get(pedido.tarefa);
    if (resposta === undefined) {
      return Promise.reject(new Error(`sem resposta roteirizada para ${pedido.tarefa}`));
    }
    if (resposta instanceof Error) return Promise.reject(resposta);
    const bruto =
      typeof resposta === "function"
        ? (resposta as (p: PedidoGeracao<unknown>) => unknown)(pedido)
        : resposta;
    return Promise.resolve(pedido.schema.parse(bruto));
  }

  pedidosDe(tarefa: TarefaLlm): PedidoGeracao<unknown>[] {
    return this.pedidos.filter((p) => p.tarefa === tarefa);
  }
}

import type { Etapa, Motivo, Status } from "#dominio/vagas/status.ts";
import type {
  AtualizacaoVaga,
  ChaveDedup,
  Evento,
  GapAberto,
  IdVaga,
  NovaVaga,
  RespostaEnviada,
  UrlCanonica,
  Vaga,
} from "#dominio/vagas/vaga.ts";

export interface OpcoesTransicaoVaga {
  readonly motivo?: Motivo;
  readonly etapa?: Etapa;
  readonly nota?: string;
  readonly duplicadaDe?: IdVaga;
}

/**
 * Persistência do agregado Vaga (vaga, eventos, gaps e respostas enviadas). Síncrona por decisão
 * (ADR-008): mantém as transações atômicas.
 */
export interface RepositorioVagas {
  /** Executa `fn` numa transação `BEGIN IMMEDIATE`. `fn` precisa ser síncrona. */
  transacao<T>(fn: () => T): T;
  inserir(nova: NovaVaga): Vaga;
  buscar(id: IdVaga): Vaga | null;
  /** A vaga mais recente com essa URL canônica. */
  buscarPorUrlCanonica(url: UrlCanonica): Vaga | null;
  buscarPorChave(chave: ChaveDedup, excetoId: IdVaga): Vaga[];
  listarPorStatus(status: readonly Status[], filtro?: { readonly ids?: readonly IdVaga[] }): Vaga[];
  atualizar(id: IdVaga, campos: AtualizacaoVaga): void;
  /** Valida a transição no domínio e grava status e evento na mesma transação. */
  transicionar(id: IdVaga, para: Status, opcoes?: OpcoesTransicaoVaga): void;
  listarEventos(id: IdVaga): Evento[];
  inserirGaps(
    id: IdVaga,
    termos: readonly { readonly termo: string; readonly termoNormalizado: string }[],
  ): void;
  listarGapsAbertos(ids: readonly IdVaga[]): GapAberto[];
  /** Responde todos os gaps abertos com esse termo e devolve as vagas afetadas. */
  responderGaps(termoNormalizado: string, resposta: "sim" | "nao"): IdVaga[];
  /** Termos normalizados já respondidos "sim". */
  termosConfirmados(): string[];
  registrarRespostasEnviadas(id: IdVaga, respostas: readonly RespostaEnviada[]): void;
}

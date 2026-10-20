import type { Status } from "#dominio/vagas/status.ts";
import type { TransicaoVaga } from "#dominio/vagas/state-machine/transicoes.ts";
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

/** Transação síncrona `BEGIN IMMEDIATE` (ADR-008). */
export interface TransacaoVagas {
  /** Executa `fn` numa transação `BEGIN IMMEDIATE`. `fn` precisa ser síncrona. */
  transacao<T>(fn: () => T): T;
}

/** Consultas de vagas. */
export interface ConsultaVagas {
  buscar(id: IdVaga): Vaga | null;
  /** A vaga mais recente com essa URL canônica. */
  buscarPorUrlCanonica(url: UrlCanonica): Vaga | null;
  buscarPorChave(chave: ChaveDedup, excetoId: IdVaga): Vaga[];
  listarPorStatus(status: readonly Status[], filtro?: { readonly ids?: readonly IdVaga[] }): Vaga[];
}

/** Escrita da vaga e do histórico de status. */
export interface EscritaVagas {
  inserir(nova: NovaVaga): Vaga;
  /** Grava uma atualização montada pelas funções de `#dominio/vagas/atualizacoes.ts`. */
  atualizar(id: IdVaga, campos: AtualizacaoVaga): void;
  /**
   * Grava status e evento de uma transição já validada pelo domínio. Use `transicionarVaga`
   * (aplicação), que lê a vaga, aplica a máquina de estados e grava na mesma transação.
   */
  gravarTransicao(id: IdVaga, transicao: TransicaoVaga): void;
  listarEventos(id: IdVaga): Evento[];
}

/** Gaps de requisitos da vaga e respostas do usuário a eles. */
export interface GapsVagas {
  inserirGaps(
    id: IdVaga,
    termos: readonly { readonly termo: string; readonly termoNormalizado: string }[],
  ): void;
  listarGapsAbertos(ids: readonly IdVaga[]): GapAberto[];
  /** Responde todos os gaps abertos com esse termo e devolve as vagas afetadas. */
  responderGaps(termoNormalizado: string, resposta: "sim" | "nao"): IdVaga[];
  /** Termos normalizados já respondidos "sim". */
  termosConfirmados(): string[];
}

/** Histórico do que foi enviado em cada candidatura. */
export interface RespostasEnviadasVagas {
  registrarRespostasEnviadas(id: IdVaga, respostas: readonly RespostaEnviada[]): void;
}

/**
 * Persistência do agregado Vaga (vaga, eventos, gaps e respostas enviadas). Síncrona por decisão
 * (ADR-008): mantém as transações atômicas. É uma implementação só (SQLite) para as cinco interfaces,
 * porque elas dividem a mesma transação; os casos de uso pedem só o recorte que usam (`Pick`).
 */
export interface RepositorioVagas
  extends TransacaoVagas, ConsultaVagas, EscritaVagas, GapsVagas, RespostasEnviadasVagas {}

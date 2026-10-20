import type { Marca } from "../compartilhado/marca.ts";
import type { Etapa, Motivo, Rota, Status } from "./status.ts";
import type { Motor } from "./motores.ts";

export type IdVaga = Marca<number, "IdVaga">;
export type UrlCanonica = Marca<string, "UrlCanonica">;
export type ChaveDedup = Marca<string, "ChaveDedup">;

/** Agregado Vaga, como lido do repositório. */
export interface Vaga {
  readonly id: IdVaga;
  readonly urlOriginal: string;
  readonly canal: Motor;
  readonly urlCanonica: UrlCanonica;
  readonly urlResolvida: string | null;
  readonly motor: Motor;
  readonly rota: Rota | null;
  readonly status: Status;
  readonly motivo: Motivo | null;
  readonly duplicadaDe: IdVaga | null;
  readonly empresa: string | null;
  readonly cargo: string | null;
  readonly localidade: string | null;
  readonly chaveDedup: ChaveDedup | null;
  readonly idioma: string | null;
  readonly publicadaEm: string | null;
  readonly adicionadaEm: string;
  readonly aderencia: number | null;
  readonly atsAntes: number | null;
  readonly atsDepois: number | null;
  readonly camaleaoFalhou: string | null;
  readonly anexoManual: boolean;
  readonly tentativasPreparo: number;
  readonly etapa: Etapa | null;
  readonly enviadaEm: string | null;
  readonly atualizadaEm: string;
}

/** Dados para criar uma vaga. */
export interface NovaVaga {
  readonly urlOriginal: string;
  readonly canal: Motor;
  readonly urlCanonica: UrlCanonica;
  readonly motor: Motor;
  readonly status: Status;
  readonly motivo?: Motivo;
  readonly duplicadaDe?: IdVaga;
}

/** Campos atualizáveis fora das transições de status. */
export interface CamposAtualizaveisVaga {
  readonly urlCanonica?: UrlCanonica;
  readonly urlResolvida?: string | null;
  readonly motor?: Motor;
  readonly rota?: Rota | null;
  readonly empresa?: string | null;
  readonly cargo?: string | null;
  readonly localidade?: string | null;
  readonly chaveDedup?: ChaveDedup | null;
  readonly idioma?: string | null;
  readonly publicadaEm?: string | null;
  readonly aderencia?: number | null;
  readonly atsAntes?: number | null;
  readonly atsDepois?: number | null;
  readonly camaleaoFalhou?: string | null;
  readonly anexoManual?: boolean;
  readonly tentativasPreparo?: number;
}

/**
 * Atualização parcial da vaga. A marca obriga a passar pelas funções de `atualizacoes.ts`, que
 * nomeiam a intenção e aplicam as regras de cada campo.
 */
export type AtualizacaoVaga = Marca<CamposAtualizaveisVaga, "AtualizacaoVaga">;

export interface Evento {
  readonly id: number;
  readonly vagaId: IdVaga;
  readonly deStatus: Status | null;
  readonly paraStatus: Status;
  readonly etapa: Etapa | null;
  readonly nota: string | null;
  readonly criadoEm: string;
}

export interface GapAberto {
  readonly vagaId: IdVaga;
  readonly termo: string;
  readonly termoNormalizado: string;
}

export interface RespostaEnviada {
  readonly rotulo: string;
  readonly valor: string | null;
  readonly fonte: string;
  readonly editada: boolean;
  readonly sensivel: boolean;
}

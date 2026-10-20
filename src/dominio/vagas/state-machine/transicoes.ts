import { ErroTransicaoInvalida } from "#dominio/compartilhado/erros.ts";
import type { Marca } from "#dominio/compartilhado/marca.ts";
import {
  ehMotivoDe,
  ehStatusComMotivo,
  ETAPAS,
  type Etapa,
  type Motivo,
  type Status,
} from "../status.ts";
import type { IdVaga, Vaga } from "../vaga.ts";

/** Máquina de estados da vaga: fonte única de transições válidas (CLI, painel e casos de uso). */
export const TRANSICOES_VALIDAS: Readonly<Record<Status, readonly Status[]>> = {
  NOVA: ["PRONTA", "ERRO_PREPARO", "DESCARTADA", "DUPLICADA", "MANUAL"],
  ERRO_PREPARO: ["PRONTA", "ERRO_PREPARO", "DESCARTADA", "DUPLICADA", "MANUAL"],
  PRONTA: ["ENVIADA", "PENDENTE_TESTE", "PULADA", "MANUAL", "DESCARTADA", "PRONTA"],
  PULADA: ["NOVA"],
  DESCARTADA: ["NOVA"],
  MANUAL: ["ENVIADA"],
  PENDENTE_TESTE: ["ENVIADA", "RECUSADA"],
  ENVIADA: ["EM_PROCESSO", "OFERTA", "RECUSADA"],
  EM_PROCESSO: ["EM_PROCESSO", "OFERTA", "RECUSADA"],
  OFERTA: [],
  RECUSADA: [],
  DUPLICADA: [],
};

export interface OpcoesTransicao {
  readonly motivo?: string | undefined;
  readonly etapa?: string | undefined;
}

/** Valida uma transição; lança `ErroTransicaoInvalida` com as transições aceitas quando não for válida. */
export function validarTransicao(de: Status, para: Status, opcoes: OpcoesTransicao = {}): void {
  const aceitas = TRANSICOES_VALIDAS[de];
  if (!aceitas.includes(para)) {
    throw new ErroTransicaoInvalida(de, para, aceitas);
  }
  if (ehStatusComMotivo(para)) {
    if (opcoes.motivo === undefined) {
      throw new ErroTransicaoInvalida(de, para, aceitas, `${para} exige motivo`);
    }
    if (!ehMotivoDe(para, opcoes.motivo)) {
      throw new ErroTransicaoInvalida(
        de,
        para,
        aceitas,
        `motivo "${opcoes.motivo}" inválido para ${para}`,
      );
    }
  } else if (opcoes.motivo !== undefined) {
    throw new ErroTransicaoInvalida(de, para, aceitas, `${para} não aceita motivo`);
  }
  if (para === "EM_PROCESSO") {
    if (opcoes.etapa === undefined || !(ETAPAS as readonly string[]).includes(opcoes.etapa)) {
      throw new ErroTransicaoInvalida(
        de,
        para,
        aceitas,
        `EM_PROCESSO exige etapa (${ETAPAS.join(", ")})`,
      );
    }
  }
}

export interface OpcoesTransicaoVaga {
  readonly motivo?: Motivo;
  readonly etapa?: Etapa;
  readonly nota?: string;
  readonly duplicadaDe?: IdVaga;
}

/**
 * Mudança de status já validada pela máquina de estados. A marca impede que um repositório receba
 * uma transição que não passou por `transicionar`.
 */
export type TransicaoVaga = Marca<
  {
    readonly de: Status;
    readonly para: Status;
    readonly motivo: Motivo | null;
    /** Etapa registrada no evento. */
    readonly etapa: Etapa | null;
    /** Etapa que fica na vaga: só EM_PROCESSO guarda etapa. */
    readonly etapaAtual: Etapa | null;
    readonly nota: string | null;
    readonly duplicadaDe: IdVaga | null;
    /** `true` na primeira vez que a vaga sai para o ATS (ENVIADA ou PENDENTE_TESTE). */
    readonly registraEnvio: boolean;
  },
  "TransicaoVaga"
>;

/** Aplica a máquina de estados à vaga e devolve a transição pronta para gravar. */
export function transicionar(
  vaga: Pick<Vaga, "status" | "enviadaEm">,
  para: Status,
  opcoes: OpcoesTransicaoVaga = {},
): TransicaoVaga {
  validarTransicao(vaga.status, para, { motivo: opcoes.motivo, etapa: opcoes.etapa });
  return {
    de: vaga.status,
    para,
    motivo: opcoes.motivo ?? null,
    etapa: opcoes.etapa ?? null,
    etapaAtual: para === "EM_PROCESSO" ? (opcoes.etapa ?? null) : null,
    nota: opcoes.nota ?? null,
    duplicadaDe: opcoes.duplicadaDe ?? null,
    registraEnvio: (para === "ENVIADA" || para === "PENDENTE_TESTE") && vaga.enviadaEm === null,
  } as TransicaoVaga;
}

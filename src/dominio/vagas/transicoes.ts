import { ErroTransicaoInvalida } from "../compartilhado/erros.ts";
import { ehMotivoDe, ehStatusComMotivo, ETAPAS, type Status } from "./status.ts";

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

import { STATUS_IGNORADOS_DEDUP, STATUS_NA_FILA, STATUS_POS_ENVIO, type Status } from "./status.ts";
import type { IdVaga, Vaga } from "./vaga.ts";

export type AcaoDeduplicacaoUrl =
  | { readonly tipo: "criar" }
  | { readonly tipo: "ignorar_na_fila"; readonly id: IdVaga }
  | { readonly tipo: "criar_duplicada"; readonly duplicadaDe: IdVaga }
  | { readonly tipo: "reabrir"; readonly id: IdVaga }
  | { readonly tipo: "ignorar_status"; readonly id: IdVaga; readonly status: Status };

/** Decide o que fazer com uma URL canônica que pode já existir. */
export function decidirDeduplicacaoUrl(existente: Vaga | null): AcaoDeduplicacaoUrl {
  if (existente === null) return { tipo: "criar" };
  if (STATUS_NA_FILA.includes(existente.status))
    return { tipo: "ignorar_na_fila", id: existente.id };
  if (STATUS_POS_ENVIO.includes(existente.status)) {
    return { tipo: "criar_duplicada", duplicadaDe: existente.id };
  }
  if (existente.status === "PULADA" || existente.status === "DESCARTADA") {
    return { tipo: "reabrir", id: existente.id };
  }
  return { tipo: "ignorar_status", id: existente.id, status: existente.status };
}

export interface AcaoDescartarDuplicada {
  readonly tipo: "descartar";
  readonly id: IdVaga;
  readonly duplicadaDe: IdVaga;
}

function dataReferencia(vaga: Vaga): string {
  return vaga.publicadaEm ?? vaga.adicionadaEm;
}

/** Ordem de recência: data de publicação (ou de entrada) e, no empate, o id mais novo. */
function ehMaisRecente(a: Vaga, b: Vaga): boolean {
  const da = dataReferencia(a);
  const db = dataReferencia(b);
  return da !== db ? da > db : a.id > b.id;
}

/**
 * Decide os descartes entre a vaga `x` e as vagas `outras` com a mesma chave. Fica sempre a de publicação
 * mais recente; um repost de vaga já enviada segue, salvo se for comprovadamente mais antigo.
 */
export function decidirDeduplicacaoChave(
  x: Vaga,
  outras: readonly Vaga[],
): AcaoDescartarDuplicada[] {
  const acoes: AcaoDescartarDuplicada[] = [];
  for (const y of outras) {
    if (y.id === x.id || STATUS_IGNORADOS_DEDUP.includes(y.status)) continue;
    if (STATUS_NA_FILA.includes(y.status)) {
      if (ehMaisRecente(y, x))
        return [...acoes, { tipo: "descartar", id: x.id, duplicadaDe: y.id }];
      acoes.push({ tipo: "descartar", id: y.id, duplicadaDe: x.id });
      continue;
    }
    if (STATUS_POS_ENVIO.includes(y.status)) {
      if (x.publicadaEm !== null && y.publicadaEm !== null && x.publicadaEm <= y.publicadaEm) {
        return [...acoes, { tipo: "descartar", id: x.id, duplicadaDe: y.id }];
      }
    }
  }
  return acoes;
}

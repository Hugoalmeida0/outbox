import { normalizarTexto } from "../compartilhado/texto.ts";
import { idsDoMaster, type Master } from "../curriculo/master.ts";
import type { AnaliseVaga } from "./analise-vaga.ts";

/** Marca como `ausente` requisitos cujas evidências citam ids que não existem no master. */
export function sanearAnalise(analise: AnaliseVaga, master: Master): AnaliseVaga {
  const ids = new Set(idsDoMaster(master));
  return {
    ...analise,
    requisitos: analise.requisitos.map((r) =>
      r.evidencias.length > 0 && r.evidencias.some((e) => !ids.has(e))
        ? { ...r, status: "ausente", evidencias: [] }
        : r,
    ),
  };
}

export interface TermoGap {
  readonly termo: string;
  readonly termoNormalizado: string;
}

/** Termos ausentes (normalizados e sem repetição) que o usuário ainda não negou. */
export function gapsDaAnalise(analise: AnaliseVaga, negados: readonly string[]): TermoGap[] {
  const negadosSet = new Set(negados.map(normalizarTexto));
  const vistos = new Set<string>();
  const gaps: TermoGap[] = [];
  for (const r of analise.requisitos) {
    if (r.status !== "ausente") continue;
    const termoNormalizado = normalizarTexto(r.termo);
    if (termoNormalizado === "" || negadosSet.has(termoNormalizado) || vistos.has(termoNormalizado))
      continue;
    vistos.add(termoNormalizado);
    gaps.push({ termo: r.termo, termoNormalizado });
  }
  return gaps;
}

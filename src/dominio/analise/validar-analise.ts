import { normalizarTexto } from "../compartilhado/texto.ts";
import { idsDoMaster, type Master } from "../curriculo/master.ts";
import type { AnaliseVaga } from "./analise-vaga.ts";
import { chaveGapIdioma, statusIdioma } from "./idiomas.ts";

/**
 * Requisitos de idioma têm o status decidido pelo master (`idiomas`); os demais viram `ausente` quando as
 * evidências citam ids que não existem no master.
 */
export function sanearAnalise(analise: AnaliseVaga, master: Master): AnaliseVaga {
  const ids = new Set(idsDoMaster(master));
  return {
    ...analise,
    requisitos: analise.requisitos.map((r) =>
      r.idiomaExigido
        ? { ...r, status: statusIdioma(master.idiomas, r.idiomaExigido), evidencias: [] }
        : r.evidencias.length > 0 && r.evidencias.some((e) => !ids.has(e))
          ? { ...r, status: "ausente", evidencias: [] }
          : r,
    ),
  };
}

export interface TermoGap {
  readonly termo: string;
  readonly termoNormalizado: string;
}

/**
 * Termos ausentes (normalizados e sem repetição) que o usuário ainda não negou. Idioma abaixo do nível
 * exigido (ausente ou parcial) gera um gap por idioma e nível, com a chave de `chaveGapIdioma`.
 */
export function gapsDaAnalise(analise: AnaliseVaga, negados: readonly string[]): TermoGap[] {
  // As chaves de idioma (`idioma:ingles:fluente`) são gravadas como estão; os termos comuns, normalizados.
  const negadosSet = new Set([...negados, ...negados.map(normalizarTexto)]);
  const vistos = new Set<string>();
  const gaps: TermoGap[] = [];
  for (const r of analise.requisitos) {
    if (r.idiomaExigido ? r.status === "coberto" : r.status !== "ausente") continue;
    const termoNormalizado = r.idiomaExigido
      ? chaveGapIdioma(r.idiomaExigido.idioma, r.idiomaExigido.nivel)
      : normalizarTexto(r.termo);
    if (termoNormalizado === "" || negadosSet.has(termoNormalizado) || vistos.has(termoNormalizado))
      continue;
    vistos.add(termoNormalizado);
    gaps.push({ termo: r.idiomaExigido?.idioma ?? r.termo, termoNormalizado });
  }
  return gaps;
}

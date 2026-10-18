import { contemTermo, normalizarTexto } from "../compartilhado/texto.ts";
import type { Keyword } from "../analise/analise-vaga.ts";
import type { Master } from "./master.ts";

/** Termos aceitos para uma keyword: o próprio termo e o nome e os aliases da skill do master que casar. */
function termosAceitos(termo: string, master: Master): string[] {
  const alvo = normalizarTexto(termo);
  const skill = master.skills.find(
    (s) => normalizarTexto(s.nome) === alvo || s.aliases.some((a) => normalizarTexto(a) === alvo),
  );
  const termos = [alvo];
  if (skill) termos.push(normalizarTexto(skill.nome), ...skill.aliases.map(normalizarTexto));
  return termos;
}

/** Keywords da vaga presentes no texto (pelo termo, ou pelo nome e aliases da skill do master). */
export function keywordsPresentes(
  texto: string,
  keywords: readonly Keyword[],
  master: Master,
): Keyword[] {
  const normalizado = normalizarTexto(texto);
  return keywords.filter((k) =>
    termosAceitos(k.termo, master).some((t) => contemTermo(normalizado, t)),
  );
}

/** Percentual das keywords da vaga presentes no texto (0 a 100), ou `null` sem keywords. */
export function scoreAts(texto: string, keywords: readonly Keyword[], master: Master): number | null {
  if (keywords.length === 0) return null;
  return Math.round((100 * keywordsPresentes(texto, keywords, master).length) / keywords.length);
}

/**
 * Keywords que o currículo genérico do master tem (logo, com lastro) e o currículo ajustado perdeu: o
 * que o tailoring deve recolocar quando o score cai.
 */
export function keywordsPerdidas(
  textoMaster: string,
  textoAjustado: string,
  keywords: readonly Keyword[],
  master: Master,
): string[] {
  const noAjustado = new Set(keywordsPresentes(textoAjustado, keywords, master).map((k) => k.termo));
  return keywordsPresentes(textoMaster, keywords, master)
    .map((k) => k.termo)
    .filter((t) => !noAjustado.has(t));
}

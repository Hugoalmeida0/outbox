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

/** Percentual das keywords da vaga presentes no texto (0 a 100), ou `null` sem keywords. */
export function scoreAts(texto: string, keywords: readonly Keyword[], master: Master): number | null {
  if (keywords.length === 0) return null;
  const normalizado = normalizarTexto(texto);
  const acertos = keywords.filter((k) =>
    termosAceitos(k.termo, master).some((t) => contemTermo(normalizado, t)),
  ).length;
  return Math.round((100 * acertos) / keywords.length);
}

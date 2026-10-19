import { normalizarTexto } from "../compartilhado/texto.ts";
import type { Master } from "./master.ts";

/**
 * Aplica `nuncaListar` ao master antes de qualquer uso: remove as skills cujo id, nome ou alias casa com um
 * termo da lista (e as referências a elas nos bullets e projetos). O master devolvido carrega em
 * `nuncaListar` os termos já expandidos (termos originais + nomes e aliases das skills removidas), para a
 * validação do texto gerado.
 */
export function aplicarNuncaListar(master: Master): Master {
  const entradas = master.nuncaListar ?? [];
  if (entradas.length === 0) return master;
  const alvos = new Set(entradas.map(normalizarTexto));
  const removidas = master.skills.filter(
    (s) =>
      alvos.has(normalizarTexto(s.id)) ||
      alvos.has(normalizarTexto(s.nome)) ||
      s.aliases.some((a) => alvos.has(normalizarTexto(a))),
  );
  const ids = new Set(removidas.map((s) => s.id));
  const semRemovidas = (skills: readonly string[]): string[] => skills.filter((s) => !ids.has(s));
  return {
    ...master,
    skills: master.skills.filter((s) => !ids.has(s.id)),
    experiencias: master.experiencias.map((e) => ({
      ...e,
      bullets: e.bullets.map((b) => ({ ...b, skills: semRemovidas(b.skills) })),
    })),
    projetos: master.projetos.map((p) => ({ ...p, skills: semRemovidas(p.skills) })),
    nuncaListar: [...new Set([...entradas, ...removidas.flatMap((s) => [s.nome, ...s.aliases])])],
  };
}

/** Master sem o campo `nuncaListar`: os termos proibidos não podem aparecer nem no prompt. */
export function paraPrompt(master: Master): Omit<Master, "nuncaListar"> {
  const { nuncaListar: _termos, ...resto } = master;
  return resto;
}

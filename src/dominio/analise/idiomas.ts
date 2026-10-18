import { normalizarTexto } from "../compartilhado/texto.ts";
import { NIVEIS_IDIOMA, type IdiomaFalado, type NivelIdioma } from "../curriculo/master.ts";
import type { Requisito } from "./analise-vaga.ts";

const PREFIXO = "idioma:";

/** Chave do gap de idioma em `gaps` e `gaps.yaml`: um por idioma e nível exigido. */
export function chaveGapIdioma(idioma: string, nivel: NivelIdioma): string {
  return `${PREFIXO}${normalizarTexto(idioma)}:${nivel}`;
}

export function lerChaveGapIdioma(chave: string): { idioma: string; nivel: NivelIdioma } | null {
  if (!chave.startsWith(PREFIXO)) return null;
  const [idioma, nivel] = chave.slice(PREFIXO.length).split(":");
  const nivelValido = NIVEIS_IDIOMA.find((n) => n === nivel);
  return idioma && nivelValido ? { idioma, nivel: nivelValido } : null;
}

export function nivelNoMaster(
  idiomas: readonly IdiomaFalado[],
  idioma: string,
): NivelIdioma | undefined {
  const alvo = normalizarTexto(idioma);
  return idiomas.find((i) => normalizarTexto(i.idioma) === alvo)?.nivel;
}

export function nivelAtende(atual: NivelIdioma | undefined, exigido: NivelIdioma): boolean {
  return atual !== undefined && NIVEIS_IDIOMA.indexOf(atual) >= NIVEIS_IDIOMA.indexOf(exigido);
}

/** Status de um requisito de idioma contra `master.idiomas`; `parcial` quando fala, mas abaixo do nível. */
export function statusIdioma(
  idiomas: readonly IdiomaFalado[],
  exigido: NonNullable<Requisito["idiomaExigido"]>,
): Requisito["status"] {
  const atual = nivelNoMaster(idiomas, exigido.idioma);
  if (nivelAtende(atual, exigido.nivel)) return "coberto";
  return atual === undefined ? "ausente" : "parcial";
}

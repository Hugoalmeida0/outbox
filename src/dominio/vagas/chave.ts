import { normalizarTexto } from "../compartilhado/texto.ts";
import type { ChaveDedup } from "./vaga.ts";

const MARCADORES_GENERO =
  /\((?:a|o\/a|m\/f\/d|f\/m\/x|m\/f|all genders|todos os g[eê]neros)\)|\/a(?=$|[\s)\],.;:-])/gi;

/** Normaliza o cargo removendo marcadores de gênero, ex.: "Desenvolvedor(a)" → "desenvolvedor". */
export function normalizarCargo(cargo: string): string {
  return normalizarTexto(cargo.replace(MARCADORES_GENERO, " "));
}

/** Chave de deduplicação: empresa, cargo e localidade normalizados. */
export function chaveDedup(empresa: string, cargo: string, localidade?: string | null): ChaveDedup {
  return [normalizarTexto(empresa), normalizarCargo(cargo), normalizarTexto(localidade ?? "")].join(
    "|",
  ) as ChaveDedup;
}

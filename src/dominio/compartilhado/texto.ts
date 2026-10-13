/**
 * Normaliza texto para comparação: minúsculas, sem acentos, pontuação vira espaço e espaços colapsados.
 * `#` e `+` são preservados para não confundir tecnologias como C, C# e C++.
 */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}#+]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Verdadeiro se `termo` aparece em `texto` como sequência completa de palavras (ambos normalizados). */
export function contemTermo(textoNormalizado: string, termoNormalizado: string): boolean {
  if (termoNormalizado === "") return false;
  return ` ${textoNormalizado} `.includes(` ${termoNormalizado} `);
}

/** Converte um texto em identificador kebab-case ASCII. */
export function paraKebab(texto: string): string {
  return normalizarTexto(texto).replace(/[#]/g, "sharp").replace(/[+]/g, "plus").replace(/ /g, "-");
}

/** Escapa caracteres especiais para uso literal dentro de uma expressão regular. */
export function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

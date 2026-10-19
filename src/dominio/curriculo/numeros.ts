const TOKEN_NUMERO = /\d+(?:[.,]\d+)*/g;

/**
 * Forma canônica de um número escrito no texto: sem separador de milhar ("1.497" e "1,497" viram "1497") e
 * com ponto decimal ("98,34" vira "98.34"). Com os dois separadores, o último é o decimal.
 */
export function normalizarNumero(token: string): string {
  const pontos = token.split(".").length - 1;
  const virgulas = token.split(",").length - 1;
  if (pontos === 0 && virgulas === 0) return token;
  if (pontos > 0 && virgulas > 0) {
    const decimal = token.lastIndexOf(".") > token.lastIndexOf(",") ? "." : ",";
    const milhar = decimal === "." ? "," : ".";
    return token.split(milhar).join("").replace(decimal, ".");
  }
  const separador = pontos > 0 ? "." : ",";
  const partes = token.split(separador);
  const ultima = partes[partes.length - 1] ?? "";
  const primeira = partes[0] ?? "";
  const ehMilhar =
    partes.length > 2 ||
    (ultima.length === 3 && primeira.length >= 1 && primeira.length <= 3 && primeira !== "0");
  return ehMilhar ? partes.join("") : partes.join(".");
}

/**
 * Números de um texto, normalizados. `%`, `~` e `+` não contam, e faixas ("50% a 80%", "50–80%") viram dois
 * números separados.
 */
export function numerosDe(texto: string): string[] {
  return (texto.match(TOKEN_NUMERO) ?? []).map(normalizarNumero);
}

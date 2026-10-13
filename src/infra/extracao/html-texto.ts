const ENTIDADES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  bull: "•",
};

/** Decodifica entidades HTML nomeadas comuns e numéricas (decimais e hexadecimais). */
export function decodificarEntidades(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (original, codigo: string) => {
    if (codigo.startsWith("#x") || codigo.startsWith("#X"))
      return String.fromCodePoint(parseInt(codigo.slice(2), 16));
    if (codigo.startsWith("#")) return String.fromCodePoint(Number(codigo.slice(1)));
    return ENTIDADES[codigo.toLowerCase()] ?? original;
  });
}

/** Converte HTML em texto legível, preservando quebras de bloco e itens de lista. */
export function htmlParaTexto(html: string): string {
  const texto = decodificarEntidades(
    html
      .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<\/(p|div|li|ul|ol|h[1-6]|section|article|tr)\s*>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  );
  return texto
    .split("\n")
    .map((linha) => linha.replace(/[ \t\u00a0]+/g, " ").trim())
    .filter((linha) => linha.length > 0)
    .join("\n")
    .trim();
}

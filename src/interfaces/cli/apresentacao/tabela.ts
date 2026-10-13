/** Corta o texto em `max` caracteres, com reticências. */
export function truncar(texto: string, max: number): string {
  return texto.length <= max ? texto : `${texto.slice(0, Math.max(0, max - 1))}…`;
}

/** Tabela de texto alinhada com `padEnd`: cabeçalho, linha separadora e linhas. */
export function formatarTabela(
  cabecalho: readonly string[],
  linhas: readonly (readonly string[])[],
): string {
  const larguras = cabecalho.map((titulo, i) =>
    Math.max(titulo.length, ...linhas.map((l) => (l[i] ?? "").length)),
  );
  const formatar = (colunas: readonly string[]): string =>
    larguras
      .map((largura, i) => (colunas[i] ?? "").padEnd(largura))
      .join("  ")
      .trimEnd();
  return [
    formatar(cabecalho),
    larguras.map((l) => "-".repeat(l)).join("  "),
    ...linhas.map(formatar),
  ].join("\n");
}

/** `2026-10-10T13:14:15-03:00` vira `2026-10-10 13:14`. */
export function dataHora(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

/** Número ou traço. */
export function numero(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? "-" : String(valor);
}

/** Converte um slug (ex.: "acme-pagamentos") em nome legível ("Acme Pagamentos"). */
export function nomeDoSlug(slug: string): string {
  return decodeURIComponent(slug)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/** Data AAAA-MM-DD a partir de ISO ou epoch em milissegundos. */
export function dataCurta(valor: string | number | null | undefined): string | undefined {
  if (valor === null || valor === undefined) return undefined;
  const data = typeof valor === "number" ? new Date(valor) : new Date(valor);
  return Number.isNaN(data.getTime()) ? undefined : data.toISOString().slice(0, 10);
}

/** Acrescenta um parâmetro de consulta preservando os existentes. */
export function comParametro(url: string, nome: string, valor: string): string {
  const u = new URL(url);
  u.searchParams.set(nome, valor);
  return u.href;
}

/** Junta segmentos de caminho a uma URL sem duplicar barras. */
export function comSufixo(url: string, sufixo: string): string {
  const u = new URL(url);
  u.pathname = `${u.pathname.replace(/\/+$/, "")}/${sufixo.replace(/^\/+/, "")}`;
  return u.href;
}

/** Nome do arquivo enviado ao recrutador: `<Nome>_<Sobrenome>_<CV|Carta>.pdf`, sem acentos. */
export function nomeArquivo(nome: string, tipo: "CV" | "Carta"): string {
  const partes = nome
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);
  const primeiro = partes[0] ?? "Curriculo";
  const ultimo = partes.length > 1 ? partes[partes.length - 1] : undefined;
  return [primeiro, ultimo, tipo].filter((p): p is string => p !== undefined).join("_") + ".pdf";
}

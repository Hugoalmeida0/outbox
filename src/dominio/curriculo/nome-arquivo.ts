function palavras(texto: string): string[] {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);
}

/**
 * Nome do arquivo enviado ao recrutador, sem acentos nem espaços: `Nome-Sobrenome-Curriculo.pdf` e, para uma
 * vaga, `Nome-Sobrenome-Curriculo-Empresa.pdf` (carta: `Nome-Sobrenome-Carta[-Empresa].pdf`).
 */
export function nomeArquivo(nome: string, tipo: "Curriculo" | "Carta", empresa?: string): string {
  const partes = palavras(nome);
  const primeiro = partes[0];
  const ultimo = partes.length > 1 ? partes[partes.length - 1] : undefined;
  const daEmpresa = empresa ? palavras(empresa).join("-") : "";
  return (
    [primeiro, ultimo, tipo, daEmpresa]
      .filter((p): p is string => p !== undefined && p.length > 0)
      .join("-") + ".pdf"
  );
}

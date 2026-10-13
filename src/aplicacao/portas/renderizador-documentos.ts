import type { DocumentoCarta, DocumentoCurriculo } from "#dominio/curriculo/documento.ts";

/** Converte documentos em PDF (A4, coluna única, texto selecionável). */
export interface RenderizadorDocumentos {
  renderizarCurriculo(
    doc: DocumentoCurriculo,
    destino: string,
    sinal: AbortSignal,
  ): Promise<{ paginas: number }>;
  renderizarCarta(
    doc: DocumentoCarta,
    destino: string,
    sinal: AbortSignal,
  ): Promise<{ paginas: number }>;
}

import type { RenderizadorDocumentos } from "#aplicacao/portas/renderizador-documentos.ts";
import type { DocumentoCarta, DocumentoCurriculo } from "#dominio/curriculo/documento.ts";
import type { LeitorHeadless } from "../navegador/leitor-headless.ts";
import { escreverAtomico } from "../sistema/escrita-atomica.ts";
import { htmlCarta, htmlCurriculo } from "./template-html.ts";

/** Conta as páginas de um PDF pelos objetos `/Type /Page` (excluindo `/Pages`). */
export function contarPaginas(pdf: Uint8Array): number {
  const texto = Buffer.from(pdf).toString("latin1");
  return (texto.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
}

/** PDF em A4 via `page.pdf()` num contexto sem JavaScript e sem rede (ADR-012). */
export class RenderizadorPdfPlaywright implements RenderizadorDocumentos {
  private readonly leitor: LeitorHeadless;

  constructor(leitor: LeitorHeadless) {
    this.leitor = leitor;
  }

  renderizarCurriculo(
    doc: DocumentoCurriculo,
    destino: string,
    sinal: AbortSignal,
  ): Promise<{ paginas: number }> {
    return this.renderizar(htmlCurriculo(doc), destino, sinal);
  }

  renderizarCarta(
    doc: DocumentoCarta,
    destino: string,
    sinal: AbortSignal,
  ): Promise<{ paginas: number }> {
    return this.renderizar(htmlCarta(doc), destino, sinal);
  }

  private async renderizar(
    html: string,
    destino: string,
    sinal: AbortSignal,
  ): Promise<{ paginas: number }> {
    sinal.throwIfAborted();
    const contexto = await this.leitor.contextoRender();
    try {
      const pagina = await contexto.newPage();
      await pagina.setContent(html, { waitUntil: "load" });
      const pdf = await pagina.pdf({
        format: "A4",
        printBackground: false,
        preferCSSPageSize: true,
      });
      escreverAtomico(destino, pdf);
      return { paginas: contarPaginas(pdf) };
    } finally {
      await contexto.close().catch(() => undefined);
    }
  }
}

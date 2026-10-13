// Extrai texto e dimensões de um PDF nos testes (pdfjs-dist é dependência só de desenvolvimento).
import { readFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export interface PdfLido {
  readonly texto: string;
  readonly paginas: number;
  readonly largura: number;
  readonly altura: number;
}

export async function lerPdf(caminho: string): Promise<PdfLido> {
  const tarefa = getDocument({ data: new Uint8Array(readFileSync(caminho)), verbosity: 0 });
  const documento = await tarefa.promise;
  const partes: string[] = [];
  let largura = 0;
  let altura = 0;
  for (let n = 1; n <= documento.numPages; n++) {
    const pagina = await documento.getPage(n);
    if (n === 1) {
      const viewport = pagina.getViewport({ scale: 1 });
      largura = viewport.width;
      altura = viewport.height;
    }
    const conteudo = await pagina.getTextContent();
    partes.push(conteudo.items.map((i) => ("str" in i ? i.str : "")).join(" "));
  }
  const paginas = documento.numPages;
  await tarefa.destroy();
  return { texto: partes.join("\n").replace(/\s+/g, " "), paginas, largura, altura };
}

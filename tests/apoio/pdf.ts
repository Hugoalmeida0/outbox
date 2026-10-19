// Extrai texto e dimensões de um PDF nos testes (pdfjs-dist é dependência só de desenvolvimento).
import { readFileSync } from "node:fs";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";

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

export interface PdfInspecionado {
  readonly paginas: number;
  readonly texto: string;
  readonly largura: number;
  readonly altura: number;
  /** Tamanhos de fonte (pt) de cada trecho de texto da 1ª página, sem espaços em branco. */
  readonly tamanhosDeFonte: readonly number[];
  /** Menor distância (mm) do texto da 1ª página a cada borda. */
  readonly margensMm: {
    readonly esquerda: number;
    readonly direita: number;
    readonly topo: number;
    readonly base: number;
  };
  readonly operadoresDeImagem: number;
  readonly titulo: string | undefined;
}

const MM_POR_PONTO = 25.4 / 72;
const OPERADORES_DE_IMAGEM = [
  OPS.paintImageXObject,
  OPS.paintInlineImageXObject,
  OPS.paintImageMaskXObject,
  OPS.paintImageXObjectRepeat,
  OPS.paintImageMaskXObjectGroup,
  OPS.paintImageMaskXObjectRepeat,
  OPS.paintSolidColorImageMask,
];

/** Lê o PDF e mede o que os testes do currículo ATS verificam: texto, fontes, margens, imagens e metadados. */
export async function inspecionarPdf(caminho: string): Promise<PdfInspecionado> {
  const tarefa = getDocument({ data: new Uint8Array(readFileSync(caminho)), verbosity: 0 });
  const documento = await tarefa.promise;
  const partes: string[] = [];
  const tamanhos: number[] = [];
  let largura = 0;
  let altura = 0;
  let operadoresDeImagem = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let n = 1; n <= documento.numPages; n++) {
    const pagina = await documento.getPage(n);
    const viewport = pagina.getViewport({ scale: 1 });
    const conteudo = await pagina.getTextContent();
    partes.push(conteudo.items.map((i) => ("str" in i ? i.str : "")).join(" "));
    const operadores = await pagina.getOperatorList();
    operadoresDeImagem += operadores.fnArray.filter((f) => OPERADORES_DE_IMAGEM.includes(f)).length;
    if (n !== 1) continue;
    largura = viewport.width;
    altura = viewport.height;
    for (const item of conteudo.items) {
      if (!("str" in item) || item.str.trim() === "") continue;
      const [, , c, d, x, y] = item.transform as number[];
      tamanhos.push(Math.hypot(c ?? 0, d ?? 0));
      minX = Math.min(minX, x ?? 0);
      maxX = Math.max(maxX, (x ?? 0) + item.width);
      minY = Math.min(minY, y ?? 0);
      maxY = Math.max(maxY, (y ?? 0) + item.height);
    }
  }
  const metadados = await documento.getMetadata();
  const info = metadados.info as { Title?: string };
  const paginas = documento.numPages;
  await tarefa.destroy();
  return {
    paginas,
    texto: partes.join("\n").replace(/\s+/g, " "),
    largura,
    altura,
    tamanhosDeFonte: tamanhos,
    margensMm: {
      esquerda: minX * MM_POR_PONTO,
      direita: (largura - maxX) * MM_POR_PONTO,
      topo: (altura - maxY) * MM_POR_PONTO,
      base: minY * MM_POR_PONTO,
    },
    operadoresDeImagem,
    titulo: info.Title,
  };
}

/** Fontes do PDF: descritores declarados e quantos têm o arquivo da fonte embutido (`/FontFile*`). */
export function contarFontes(caminho: string): {
  readonly descritores: number;
  readonly embutidas: number;
} {
  const bruto = readFileSync(caminho).toString("latin1");
  return {
    descritores: (bruto.match(/\/Type\s*\/FontDescriptor/g) ?? []).length,
    embutidas: (bruto.match(/\/FontFile[23]?(?![\w])/g) ?? []).length,
  };
}

/** Rasteriza a página 1 do PDF em PNG com a resolução (dpi) pedida. */
export async function pngDaPagina(caminho: string, dpi: number): Promise<Buffer> {
  const tarefa = getDocument({ data: new Uint8Array(readFileSync(caminho)), verbosity: 0 });
  const documento = await tarefa.promise;
  try {
    const pagina = await documento.getPage(1);
    const viewport = pagina.getViewport({ scale: dpi / 72 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await pagina.render({ canvas: canvas as unknown as HTMLCanvasElement, viewport }).promise;
    return canvas.toBuffer("image/png");
  } finally {
    await tarefa.destroy();
  }
}

import {
  linhasCompetencias,
  urlEmTextoPuro,
  type DocumentoCarta,
  type DocumentoCurriculo,
  type SecaoDocumento,
} from "#dominio/curriculo/documento.ts";

/** Escapa os 5 caracteres especiais de HTML. Todo texto vindo de dados passa por aqui. */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const e = escaparHtml;

/** Base da carta: texto corrido, sem a pressão de caber em 1 página do currículo. */
const TAMANHO_BASE_CARTA = 10.5;

const pt = (n: number): string => `${String(Math.round(n * 100) / 100)}pt`;

// Coluna única, fonte de sistema, sem tabelas, imagens, ícones ou fundos: formato que os ATS parseiam bem.
// Todos os tamanhos derivam de `b` (tamanho base em pt); margens A4: 13 mm laterais, 10 mm topo, 9 mm base.
function css(b: number): string {
  return `
  @page { size: A4; margin: 10mm 13mm 9mm 13mm; }
  * { box-sizing: border-box; }
  body { font-family: Helvetica, Arial, Calibri, sans-serif; font-size: ${pt(b)}; line-height: ${pt(1.2 * b)}; color: #000; margin: 0; }
  h1 { font-size: ${pt(b + 8)}; line-height: ${pt(b + 11)}; font-weight: bold; margin: 0; }
  .titulo { font-size: ${pt(b + 1)}; line-height: ${pt(1.2 * (b + 1))}; font-weight: bold; margin: 0; }
  .contato { font-size: ${pt(b - 0.5)}; line-height: ${pt(1.2 * b)}; color: #333333; margin: 0; }
  h2 { font-size: ${pt(b + 0.5)}; line-height: ${pt(1.2 * b + 1)}; font-weight: bold; text-transform: uppercase; border-bottom: 0.6pt solid #000; margin: ${pt(0.55 * b)} 0 0 0; padding-bottom: 2pt; }
  p { margin: 0; }
  .sub { margin-top: ${pt(0.25 * b)}; }
  b { font-weight: bold; }
  ul { list-style: none; margin: 0; padding: 0 0 0 9pt; }
  li { position: relative; margin: 0; }
  li::before { content: "•"; position: absolute; left: -9pt; }
`;
}

function cabecalho(nome: string, contato: readonly string[], titulo?: string): string {
  return [
    `<h1>${e(nome)}</h1>`,
    titulo ? `<p class="titulo">${e(titulo)}</p>` : "",
    `<p class="contato">${contato.map(e).join(" · ")}</p>`,
  ].join("\n");
}

function lista(itens: readonly string[]): string {
  return itens.length === 0 ? "" : `<ul>${itens.map((i) => `<li>${e(i)}</li>`).join("")}</ul>`;
}

function secao(s: SecaoDocumento): string {
  const titulo = `<h2>${e(s.titulo)}</h2>`;
  switch (s.tipo) {
    case "resumo":
      return `${titulo}<p>${e(s.texto)}</p>`;
    case "experiencia":
      return (
        titulo +
        s.itens
          .map(
            (i) =>
              `<p class="sub"><b>${e(i.empresa)}</b>${i.local ? ` · ${e(i.local)}` : ""}</p>` +
              `<p><b>${e(i.cargo)}</b> · ${e(i.periodo)}</p>` +
              (i.contexto ? `<p>${e(i.contexto)}</p>` : "") +
              lista(i.bullets),
          )
          .join("")
      );
    case "projetos":
      return (
        titulo +
        s.itens
          .map(
            (i) =>
              `<p class="sub"><b>${e(i.descricao ? `${i.nome} — ${i.descricao}` : i.nome)}</b>` +
              `${i.url ? ` · ${e(urlEmTextoPuro(i.url))}` : ""}</p>${lista(i.bullets)}`,
          )
          .join("")
      );
    case "formacao":
      return titulo + s.itens.map((i) => `<p><b>${e(i.curso)}</b> — ${e(i.detalhe)}</p>`).join("");
    case "certificacoes":
      return `${titulo}<p>${s.itens.map((i) => e(i.texto)).join(" · ")}</p>`;
    case "competencias":
      return (
        titulo +
        linhasCompetencias(s)
          .map((l) => `<p><b>${e(l.rotulo)}:</b> ${e(l.itens)}</p>`)
          .join("")
      );
  }
}

function documento(idioma: string, titulo: string, corpo: string, base: number): string {
  return `<!doctype html><html lang="${idioma === "en" ? "en" : "pt-BR"}"><head><meta charset="utf-8"><title>${e(
    titulo,
  )}</title><style>${css(base)}</style></head><body>${corpo}</body></html>`;
}

export function htmlCurriculo(doc: DocumentoCurriculo): string {
  return documento(
    doc.idioma,
    doc.nome,
    cabecalho(doc.nome, doc.contato, doc.titulo) + doc.secoes.map(secao).join("\n"),
    doc.tamanhoBase,
  );
}

export function htmlCarta(doc: DocumentoCarta): string {
  return documento(
    doc.idioma,
    doc.nome,
    cabecalho(doc.nome, doc.contato) +
      doc.paragrafos.map((p) => `<p class="sub">${e(p)}</p>`).join("\n"),
    TAMANHO_BASE_CARTA,
  );
}

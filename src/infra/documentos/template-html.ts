import type {
  DocumentoCarta,
  DocumentoCurriculo,
  SecaoDocumento,
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

// Coluna única, fontes do sistema, sem tabelas, imagens, ícones ou fundos: formato que os ATS parseiam bem.
const CSS = `
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.35; color: #000; margin: 0; }
  h1 { font-size: 18pt; margin: 0 0 2pt 0; }
  .titulo { font-size: 11.5pt; margin: 0 0 4pt 0; }
  .contato { font-size: 9.5pt; margin: 0 0 8pt 0; }
  h2 { font-size: 11.5pt; text-transform: uppercase; border-bottom: 1px solid #000; margin: 10pt 0 4pt 0; padding-bottom: 1pt; }
  h3 { font-size: 10.5pt; margin: 6pt 0 1pt 0; }
  .periodo { font-weight: normal; }
  ul { margin: 2pt 0 4pt 0; padding-left: 14pt; }
  li { margin: 0 0 1.5pt 0; }
  p { margin: 0 0 6pt 0; }
`;

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
              `<h3>${e(i.cargo)} — ${e(i.empresa)}${i.local ? `, ${e(i.local)}` : ""} ` +
              `<span class="periodo">(${e(i.periodo)})</span></h3>${lista(i.bullets)}`,
          )
          .join("")
      );
    case "projetos":
      return (
        titulo +
        s.itens
          .map(
            (i) =>
              `<h3>${e(i.nome)}${i.url ? ` <span class="periodo">(${e(i.url)})</span>` : ""}</h3>` +
              (i.descricao ? `<p>${e(i.descricao)}</p>` : "") +
              lista(i.bullets),
          )
          .join("")
      );
    case "lista":
      return titulo + lista(s.itens);
    case "competencias":
      return titulo + lista(s.grupos.map((g) => `${g.categoria}: ${g.itens.join(", ")}`));
  }
}

function documento(idioma: string, titulo: string, corpo: string): string {
  return `<!doctype html><html lang="${idioma === "en" ? "en" : "pt-BR"}"><head><meta charset="utf-8"><title>${e(
    titulo,
  )}</title><style>${CSS}</style></head><body>${corpo}</body></html>`;
}

export function htmlCurriculo(doc: DocumentoCurriculo): string {
  return documento(
    doc.idioma,
    doc.nome,
    cabecalho(doc.nome, doc.contato, doc.titulo) + doc.secoes.map(secao).join("\n"),
  );
}

export function htmlCarta(doc: DocumentoCarta): string {
  return documento(
    doc.idioma,
    doc.nome,
    cabecalho(doc.nome, doc.contato) + doc.paragrafos.map((p) => `<p>${e(p)}</p>`).join("\n"),
  );
}

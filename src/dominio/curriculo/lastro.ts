import { contemTermo, normalizarTexto } from "../compartilhado/texto.ts";
import type { AnaliseVaga } from "../analise/analise-vaga.ts";
import type { CurriculoGerado } from "./curriculo-gerado.ts";
import type { Master } from "./master.ts";

export type RegraLastro = "R1" | "R2" | "R3" | "R4" | "R5" | "R6";

export interface Violacao {
  readonly regra: RegraLastro;
  readonly detalhe: string;
}

const NUMERO = /\d+(?:[.,]\d+)*%?/g;

function numeros(texto: string): string[] {
  return (texto.match(NUMERO) ?? []).map((n) => n.replace(/[.,%]/g, ""));
}

/** Termos normalizados de skills (nome e aliases) e certificações do master. */
function vocabularioMaster(master: Master): Set<string> {
  const termos = new Set<string>();
  for (const s of master.skills) {
    termos.add(normalizarTexto(s.nome));
    for (const a of s.aliases) termos.add(normalizarTexto(a));
  }
  for (const c of master.certificacoes) termos.add(normalizarTexto(c.nome));
  return termos;
}

/** Todo o texto factual do master, normalizado (lastro de título e resumo). */
function textoMaster(master: Master): string {
  return normalizarTexto(
    [
      master.pessoal.titulo,
      master.resumo,
      ...master.experiencias.flatMap((e) => [e.cargo, ...e.bullets.map((b) => b.texto)]),
      ...master.projetos.flatMap((p) => [p.nome, p.descricao, ...p.bullets.map((b) => b.texto)]),
    ].join(" "),
  );
}

/**
 * Verifica se cada afirmação do currículo gerado tem lastro no master (regras R1 a R6 da spec).
 * Devolve a lista de violações; lista vazia significa currículo aprovado.
 */
export function validarLastro(gerado: CurriculoGerado, master: Master, analise: AnaliseVaga): Violacao[] {
  const violacoes: Violacao[] = [];
  const idsExp = new Set(master.experiencias.map((e) => e.id));
  const idsGerados = gerado.experiencias.map((e) => e.id);

  // R1: exatamente as experiências do master, cada uma com pelo menos 1 bullet.
  for (const id of idsExp) {
    if (!idsGerados.includes(id)) violacoes.push({ regra: "R1", detalhe: `experiência ausente: ${id}` });
  }
  for (const exp of gerado.experiencias) {
    if (!idsExp.has(exp.id)) violacoes.push({ regra: "R1", detalhe: `experiência inexistente: ${exp.id}` });
    else if (exp.bullets.length === 0) violacoes.push({ regra: "R1", detalhe: `experiência sem bullets: ${exp.id}` });
  }
  if (new Set(idsGerados).size !== idsGerados.length) {
    violacoes.push({ regra: "R1", detalhe: "experiência repetida" });
  }

  const vocabulario = vocabularioMaster(master);
  const keywordsConcretas = analise.keywords
    .filter((k) => k.tipo === "tecnologia" || k.tipo === "certificacao")
    .map((k) => normalizarTexto(k.termo))
    .filter((k) => k.length > 0);

  const checarKeywords = (texto: string, lastro: string, onde: string): void => {
    const normalizado = normalizarTexto(texto);
    for (const termo of keywordsConcretas) {
      if (contemTermo(normalizado, termo) && !vocabulario.has(termo) && !contemTermo(lastro, termo)) {
        violacoes.push({ regra: "R5", detalhe: `"${termo}" sem lastro em ${onde}` });
      }
    }
  };

  const checarBullets = (
    bullets: CurriculoGerado["experiencias"][number]["bullets"],
    origemValida: ReadonlyMap<string, string>,
    onde: string,
  ): void => {
    for (const bullet of bullets) {
      // R2: origem não vazia e pertencente ao mesmo item do master.
      if (bullet.origem.length === 0) {
        violacoes.push({ regra: "R2", detalhe: `bullet sem origem em ${onde}` });
        continue;
      }
      const invalidas = bullet.origem.filter((o) => !origemValida.has(o));
      if (invalidas.length > 0) {
        violacoes.push({ regra: "R2", detalhe: `origem inválida em ${onde}: ${invalidas.join(", ")}` });
        continue;
      }
      const textoOrigem = bullet.origem.map((o) => origemValida.get(o) ?? "").join(" ");
      // R4: nenhum número novo.
      const numerosOrigem = new Set(numeros(textoOrigem));
      for (const n of numeros(bullet.texto)) {
        if (!numerosOrigem.has(n)) violacoes.push({ regra: "R4", detalhe: `número "${n}" sem lastro em ${onde}` });
      }
      // R5: tecnologias e certificações só se existirem no master ou na origem.
      checarKeywords(bullet.texto, normalizarTexto(textoOrigem), onde);
    }
  };

  for (const exp of gerado.experiencias) {
    const doMaster = master.experiencias.find((e) => e.id === exp.id);
    if (!doMaster) continue;
    checarBullets(exp.bullets, new Map(doMaster.bullets.map((b) => [b.id, b.texto])), exp.id);
  }

  // R6: projetos, formação e certificações existentes.
  for (const proj of gerado.projetos) {
    const doMaster = master.projetos.find((p) => p.id === proj.id);
    if (!doMaster) {
      violacoes.push({ regra: "R6", detalhe: `projeto inexistente: ${proj.id}` });
      continue;
    }
    checarBullets(proj.bullets, new Map(doMaster.bullets.map((b) => [b.id, b.texto])), proj.id);
  }
  const idsFormacao = new Set(master.formacao.map((f) => f.id));
  for (const id of gerado.formacao) {
    if (!idsFormacao.has(id)) violacoes.push({ regra: "R6", detalhe: `formação inexistente: ${id}` });
  }
  const idsCert = new Set(master.certificacoes.map((c) => c.id));
  for (const id of gerado.certificacoes) {
    if (!idsCert.has(id)) violacoes.push({ regra: "R6", detalhe: `certificação inexistente: ${id}` });
  }

  // R3: skills existentes no master.
  const idsSkills = new Set(master.skills.map((s) => s.id));
  for (const id of gerado.skills) {
    if (!idsSkills.has(id)) violacoes.push({ regra: "R3", detalhe: `skill inexistente: ${id}` });
  }

  // R5 em título e resumo: lastro é qualquer texto factual do master.
  const lastroGeral = textoMaster(master);
  checarKeywords(gerado.titulo, lastroGeral, "título");
  checarKeywords(gerado.resumo, lastroGeral, "resumo");

  return violacoes;
}

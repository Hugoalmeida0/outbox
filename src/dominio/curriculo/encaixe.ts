import type { Keyword } from "../analise/analise-vaga.ts";
import {
  TAMANHO_BASE_MINIMO,
  TAMANHO_BASE_PADRAO,
  type DocumentoCurriculo,
  type ItemCertificacao,
  type ItemExperiencia,
  type ItemProjeto,
  type SecaoDocumento,
} from "./documento.ts";
import { keywordsPresentes } from "./score-ats.ts";
import type { Master } from "./master.ts";

/** Menor valor de prioridade de corte protegido: só sai se nada abaixo (nem a redução de fonte) resolver. */
export const PRIORIDADE_PROTEGIDA = 9;
/** A experiência atual nunca fica com menos bullets que isto. */
export const MIN_BULLETS_EXPERIENCIA_ATUAL = 4;
/** Posições antigas ficam com até 2 bullets (a spec do currículo ATS permite de 0 a 2). */
export const MAX_BULLETS_EXPERIENCIA_ANTIGA = 2;
/** Projetos ficam com até 2 bullets antes de serem cortados pela prioridade implícita 3. */
export const MAX_BULLETS_PROJETO = 2;
const PASSO_FONTE = 0.1;
/** Tamanho em que termina a redução de fonte que precede os cortes (a redução final vai até o piso). */
const TAMANHO_BASE_ANTES_DOS_CORTES = 9.0;

const PRIORIDADE_EXPERIENCIA_SEM_ADERENCIA = 1;
const PRIORIDADE_BULLET_PROJETO = 3;
const PRIORIDADE_BULLET = 4;
const PRIORIDADE_EXPERIENCIA_COM_ADERENCIA = 10;

/** Ids das skills do master que a vaga pede (nome ou alias casa com alguma keyword da análise). */
export function skillsAderentes(master: Master, keywords: readonly Keyword[]): ReadonlySet<string> {
  const ids = master.skills
    .filter(
      (s) => keywordsPresentes([s.nome, ...s.aliases].join(" ; "), keywords, master).length > 0,
    )
    .map((s) => s.id);
  return new Set(ids);
}

/** Sem vaga (master genérico), toda skill declarada no master conta como aderente. */
export function todasAsSkills(master: Master): ReadonlySet<string> {
  return new Set(master.skills.map((s) => s.id));
}

function aderencia(skills: readonly string[], aderentes: ReadonlySet<string>): number {
  return new Set(skills.filter((s) => aderentes.has(s))).size;
}

interface Candidato {
  readonly valor: number;
  readonly aderencia: number;
  /** Início da experiência (AAAA-MM); itens que não são experiência ficam depois dos antigos. */
  readonly inicio: string;
  /** Desempate final: o último bullet sai antes do primeiro. */
  readonly posicao: number;
  readonly descricao: string;
  readonly aplicar: (doc: DocumentoCurriculo) => DocumentoCurriculo;
}

function trocarSecao(
  doc: DocumentoCurriculo,
  indice: number,
  nova: SecaoDocumento | null,
): DocumentoCurriculo {
  const secoes = doc.secoes.flatMap((s, i) => (i !== indice ? [s] : nova ? [nova] : []));
  return { ...doc, secoes };
}

function semItem<T>(itens: readonly T[], indice: number): T[] {
  return itens.filter((_, i) => i !== indice);
}

function candidatosExperiencia(
  indiceSecao: number,
  itens: readonly ItemExperiencia[],
  aderentes: ReadonlySet<string>,
): Candidato[] {
  const candidatos: Candidato[] = [];
  const reescrever =
    (indice: number, item: ItemExperiencia | null) =>
    (doc: DocumentoCurriculo): DocumentoCurriculo => {
      const secao = doc.secoes[indiceSecao];
      if (secao?.tipo !== "experiencia") return doc;
      const novos = item ? itens.map((x, i) => (i === indice ? item : x)) : semItem(itens, indice);
      return trocarSecao(doc, indiceSecao, novos.length > 0 ? { ...secao, itens: novos } : null);
    };

  itens.forEach((item, indice) => {
    const corte = item.corte;
    if (!corte) return;
    const aderenciaExperiencia = aderencia(corte.skills, aderentes);
    const nomeExperiencia = `experiência "${item.empresa}"`;

    if (!corte.atual) {
      // Degraus: primeiro os bullets (fica só a linha do cargo), depois a experiência inteira.
      const valor =
        corte.prioridadeCorte ??
        (aderenciaExperiencia === 0
          ? PRIORIDADE_EXPERIENCIA_SEM_ADERENCIA
          : PRIORIDADE_EXPERIENCIA_COM_ADERENCIA);
      const base = { valor, aderencia: aderenciaExperiencia, inicio: corte.inicio, posicao: 0 };
      candidatos.push(
        item.bullets.length > 0
          ? {
              ...base,
              descricao: `bullets da ${nomeExperiencia}`,
              aplicar: reescrever(indice, {
                ...item,
                bullets: [],
                corte: { ...corte, bullets: [] },
              }),
            }
          : { ...base, descricao: nomeExperiencia, aplicar: reescrever(indice, null) },
      );
    }

    const minimo = corte.atual ? MIN_BULLETS_EXPERIENCIA_ATUAL : 0;
    if (item.bullets.length <= minimo) return;
    item.bullets.forEach((_, posicao) => {
      const meta = corte.bullets[posicao];
      const explicita = meta?.prioridadeCorte;
      // Posições antigas só perdem bullets sem prioridade explícita quando passam do limite de 2.
      if (
        explicita === undefined &&
        !corte.atual &&
        item.bullets.length <= MAX_BULLETS_EXPERIENCIA_ANTIGA
      ) {
        return;
      }
      candidatos.push({
        valor: explicita ?? PRIORIDADE_BULLET,
        aderencia: aderencia(meta?.skills ?? [], aderentes),
        inicio: corte.inicio,
        posicao: -posicao,
        descricao: `bullet ${String(posicao + 1)} da ${nomeExperiencia}`,
        aplicar: reescrever(indice, {
          ...item,
          bullets: semItem(item.bullets, posicao),
          corte: { ...corte, bullets: semItem(corte.bullets, posicao) },
        }),
      });
    });
  });
  return candidatos;
}

function candidatosProjetos(
  indiceSecao: number,
  itens: readonly ItemProjeto[],
  aderentes: ReadonlySet<string>,
): Candidato[] {
  const candidatos: Candidato[] = [];
  const reescrever =
    (indice: number, item: ItemProjeto | null) =>
    (doc: DocumentoCurriculo): DocumentoCurriculo => {
      const secao = doc.secoes[indiceSecao];
      if (secao?.tipo !== "projetos") return doc;
      const novos = item ? itens.map((x, i) => (i === indice ? item : x)) : semItem(itens, indice);
      return trocarSecao(doc, indiceSecao, novos.length > 0 ? { ...secao, itens: novos } : null);
    };

  itens.forEach((item, indice) => {
    const skills = item.corte?.skills ?? [];
    const ader = aderencia(skills, aderentes);
    const explicita = item.corte?.prioridadeCorte;
    if (explicita !== undefined) {
      const base = { valor: explicita, aderencia: ader, inicio: "9999-99", posicao: 0 };
      candidatos.push(
        item.bullets.length > 0
          ? {
              ...base,
              descricao: `bullets do projeto "${item.nome}"`,
              aplicar: reescrever(indice, { ...item, bullets: [] }),
            }
          : { ...base, descricao: `projeto "${item.nome}"`, aplicar: reescrever(indice, null) },
      );
    }
    item.bullets.forEach((_, posicao) => {
      if (posicao < MAX_BULLETS_PROJETO) return;
      candidatos.push({
        valor: PRIORIDADE_BULLET_PROJETO,
        aderencia: ader,
        inicio: "9999-99",
        posicao: -posicao,
        descricao: `bullet ${String(posicao + 1)} do projeto "${item.nome}"`,
        aplicar: reescrever(indice, { ...item, bullets: semItem(item.bullets, posicao) }),
      });
    });
  });
  return candidatos;
}

function candidatosCertificacoes(
  indiceSecao: number,
  itens: readonly ItemCertificacao[],
): Candidato[] {
  return itens.flatMap((item, indice): Candidato[] => {
    if (item.prioridadeCorte === undefined) return [];
    return [
      {
        valor: item.prioridadeCorte,
        aderencia: 0,
        inicio: "9999-99",
        posicao: -indice,
        descricao: `certificação "${item.texto}"`,
        aplicar: (doc) => {
          const secao = doc.secoes[indiceSecao];
          if (secao?.tipo !== "certificacoes") return doc;
          const novos = semItem(itens, indice);
          return trocarSecao(doc, indiceSecao, novos.length > 0 ? { ...secao, itens: novos } : null);
        },
      },
    ];
  });
}

function comparar(a: Candidato, b: Candidato): number {
  return (
    a.valor - b.valor ||
    a.aderencia - b.aderencia ||
    a.inicio.localeCompare(b.inicio) ||
    a.posicao - b.posicao
  );
}

/**
 * Próximo corte do documento, por prioridade (o menor valor primeiro), depois menor aderência e item mais
 * antigo. Valores implícitos: 1 experiência não atual sem aderência, 3 bullet de projeto além do 2º,
 * 4 bullet de menor aderência (a experiência atual nunca fica com menos de 4 e nunca é removida),
 * 10 experiência não atual com aderência. `prioridadeCorte` explícito substitui o implícito.
 * Com `abaixoDe`, só considera cortes com valor menor que ele. Devolve `null` quando não há o que cortar.
 */
export function proximoCorte(
  doc: DocumentoCurriculo,
  aderentes: ReadonlySet<string>,
  abaixoDe = Number.POSITIVE_INFINITY,
): { readonly doc: DocumentoCurriculo; readonly descricao: string } | null {
  const candidatos = doc.secoes.flatMap((secao, indice): Candidato[] => {
    switch (secao.tipo) {
      case "experiencia":
        return candidatosExperiencia(indice, secao.itens, aderentes);
      case "projetos":
        return candidatosProjetos(indice, secao.itens, aderentes);
      case "certificacoes":
        return candidatosCertificacoes(indice, secao.itens);
      default:
        return [];
    }
  });
  const escolhido = candidatos.filter((c) => c.valor < abaixoDe).sort(comparar)[0];
  return escolhido ? { doc: escolhido.aplicar(doc), descricao: escolhido.descricao } : null;
}

/** O que ainda resta no documento (para o erro/log quando não cabe em 1 página). */
export function resumoDoQueSobrou(doc: DocumentoCurriculo): string[] {
  return doc.secoes.flatMap((secao): string[] => {
    switch (secao.tipo) {
      case "experiencia":
        return secao.itens.map((i) => `experiência "${i.empresa}": ${String(i.bullets.length)} bullet(s)`);
      case "projetos":
        return secao.itens.map((i) => `projeto "${i.nome}": ${String(i.bullets.length)} bullet(s)`);
      case "certificacoes":
        return [`${String(secao.itens.length)} certificação(ões)`];
      default:
        return [];
    }
  });
}

export interface ResultadoEncaixe {
  readonly documento: DocumentoCurriculo;
  readonly paginas: number;
  readonly tamanhoBase: number;
  /** Itens cortados, na ordem em que saíram. */
  readonly cortes: readonly string[];
  /** Verdadeiro quando o PDF final tem 1 página. */
  readonly coube: boolean;
  /** Quando não coube: o que sobrou no documento. */
  readonly sobrou: readonly string[];
}

function arredondar(tamanho: number): number {
  return Math.round(tamanho * 10) / 10;
}

/**
 * Encaixa o currículo em 1 página, renderizando e contando páginas a cada passo: reduz B de 9,5 a 9,0;
 * corta os itens desprotegidos (valor < 9); reduz B até o piso de 8,8; por fim corta os protegidos.
 * Nunca usa fonte abaixo de 8,8 pt nem mexe nas margens. O último `renderizar` corresponde ao `documento`
 * devolvido; se não couber, devolve o resultado com `coube: false` (quem chama decide o que fazer).
 */
export async function encaixarEmUmaPagina(
  inicial: DocumentoCurriculo,
  aderentes: ReadonlySet<string>,
  renderizar: (doc: DocumentoCurriculo) => Promise<{ paginas: number }>,
): Promise<ResultadoEncaixe> {
  let documento: DocumentoCurriculo = { ...inicial, tamanhoBase: TAMANHO_BASE_PADRAO };
  const cortes: string[] = [];
  let paginas = (await renderizar(documento)).paginas;

  const resultado = (): ResultadoEncaixe => ({
    documento,
    paginas,
    tamanhoBase: documento.tamanhoBase,
    cortes,
    coube: paginas <= 1,
    sobrou: paginas <= 1 ? [] : resumoDoQueSobrou(documento),
  });

  const reduzirAte = async (piso: number): Promise<void> => {
    while (paginas > 1 && arredondar(documento.tamanhoBase - PASSO_FONTE) >= piso) {
      documento = { ...documento, tamanhoBase: arredondar(documento.tamanhoBase - PASSO_FONTE) };
      paginas = (await renderizar(documento)).paginas;
    }
  };
  const cortarAte = async (abaixoDe: number): Promise<void> => {
    while (paginas > 1) {
      const proximo = proximoCorte(documento, aderentes, abaixoDe);
      if (!proximo) return;
      documento = proximo.doc;
      cortes.push(proximo.descricao);
      paginas = (await renderizar(documento)).paginas;
    }
  };

  await reduzirAte(TAMANHO_BASE_ANTES_DOS_CORTES);
  await cortarAte(PRIORIDADE_PROTEGIDA);
  await reduzirAte(TAMANHO_BASE_MINIMO);
  await cortarAte(Number.POSITIVE_INFINITY);
  return resultado();
}

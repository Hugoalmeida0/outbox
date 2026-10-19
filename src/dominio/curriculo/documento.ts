import type { CurriculoGerado } from "./curriculo-gerado.ts";
import type { CategoriaSkill, Experiencia, IdiomaCurriculo, Master, NivelIdioma } from "./master.ts";
import type { Contato } from "../respostas/pacote.ts";

/** Tamanho base (B) da fonte em pt: o encaixe em 1 página o reduz até `TAMANHO_BASE_MINIMO`. */
export const TAMANHO_BASE_PADRAO = 9.5;
export const TAMANHO_BASE_MINIMO = 8.8;
/** Máximo de certificações no documento (a spec do currículo ATS usa um único parágrafo curto). */
export const MAX_CERTIFICACOES = 4;

/** Dados do master que o encaixe em 1 página usa para decidir o que cortar; não são renderizados. */
export interface MetaBulletCorte {
  readonly skills: readonly string[];
  readonly prioridadeCorte?: number;
}

export interface CorteExperiencia {
  readonly inicio: string;
  readonly atual: boolean;
  readonly prioridadeCorte?: number;
  /** Skills de todos os bullets originais da experiência (não muda quando bullets são cortados). */
  readonly skills: readonly string[];
  /** Paralelo a `bullets` do item. */
  readonly bullets: readonly MetaBulletCorte[];
}

export interface ItemExperiencia {
  readonly cargo: string;
  readonly empresa: string;
  readonly local?: string;
  readonly contexto?: string;
  readonly periodo: string;
  readonly bullets: readonly string[];
  readonly corte?: CorteExperiencia;
}

export interface ItemProjeto {
  readonly nome: string;
  readonly descricao?: string;
  readonly url?: string;
  readonly bullets: readonly string[];
  readonly corte?: { readonly skills: readonly string[]; readonly prioridadeCorte?: number };
}

export interface ItemFormacao {
  readonly curso: string;
  readonly detalhe: string;
}

export interface ItemCertificacao {
  readonly texto: string;
  readonly prioridadeCorte?: number;
}

export type SecaoDocumento =
  | { readonly tipo: "resumo"; readonly titulo: string; readonly texto: string }
  | { readonly tipo: "experiencia"; readonly titulo: string; readonly itens: readonly ItemExperiencia[] }
  | { readonly tipo: "projetos"; readonly titulo: string; readonly itens: readonly ItemProjeto[] }
  | { readonly tipo: "formacao"; readonly titulo: string; readonly itens: readonly ItemFormacao[] }
  | { readonly tipo: "certificacoes"; readonly titulo: string; readonly itens: readonly ItemCertificacao[] }
  | {
      readonly tipo: "competencias";
      readonly titulo: string;
      readonly grupos: readonly { readonly categoria: string; readonly itens: readonly string[] }[];
      /** Idiomas falados, anexados ao fim da última linha (sem seção própria). */
      readonly idiomas?: { readonly rotulo: string; readonly itens: readonly string[] };
    };

/** Conteúdo renderizável do currículo: fonte única para o HTML/PDF (infra) e para o texto do score ATS. */
export interface DocumentoCurriculo {
  readonly idioma: IdiomaCurriculo;
  readonly nome: string;
  readonly titulo: string;
  readonly contato: readonly string[];
  readonly secoes: readonly SecaoDocumento[];
  /** Tamanho base B em pt; os demais tamanhos do template derivam dele. */
  readonly tamanhoBase: number;
}

export interface DocumentoCarta {
  readonly idioma: IdiomaCurriculo;
  readonly nome: string;
  readonly contato: readonly string[];
  readonly paragrafos: readonly string[];
}

const TITULOS = {
  pt: {
    resumo: "RESUMO",
    experiencia: "EXPERIÊNCIA PROFISSIONAL",
    projetos: "PROJETOS",
    formacao: "FORMAÇÃO",
    certificacoes: "CERTIFICAÇÕES E RECONHECIMENTOS",
    competencias: "COMPETÊNCIAS TÉCNICAS",
    idiomas: "Idiomas",
  },
  en: {
    resumo: "SUMMARY",
    experiencia: "EXPERIENCE",
    projetos: "PROJECTS",
    formacao: "EDUCATION",
    certificacoes: "CERTIFICATIONS & AWARDS",
    competencias: "SKILLS",
    idiomas: "Languages",
  },
} as const;

const MESES = {
  pt: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
} as const;

const CATEGORIAS: Record<IdiomaCurriculo, Record<CategoriaSkill, string>> = {
  pt: {
    linguagem: "Linguagens",
    framework: "Frameworks",
    ferramenta: "Ferramentas",
    cloud: "Cloud",
    banco: "Bancos de dados",
    pratica: "Práticas",
    soft: "Comportamentais",
  },
  en: {
    linguagem: "Programming languages",
    framework: "Frameworks",
    ferramenta: "Tools",
    cloud: "Cloud",
    banco: "Databases",
    pratica: "Practices",
    soft: "Soft skills",
  },
};

const NIVEIS: Record<IdiomaCurriculo, Record<NivelIdioma, string>> = {
  pt: {
    basico: "básico",
    intermediario: "intermediário",
    avancado: "avançado",
    fluente: "fluente",
    nativo: "nativo",
  },
  en: {
    basico: "Basic",
    intermediario: "Intermediate",
    avancado: "Advanced",
    fluente: "Fluent",
    nativo: "Native",
  },
};

const NOMES_IDIOMA_EN: Readonly<Record<string, string>> = {
  portugues: "Portuguese",
  ingles: "English",
  espanhol: "Spanish",
  frances: "French",
  alemao: "German",
  italiano: "Italian",
  japones: "Japanese",
  mandarim: "Mandarin",
  chines: "Chinese",
};

function chaveIdioma(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function formatarMes(anoMes: string, idioma: IdiomaCurriculo): string {
  const [ano, mes] = anoMes.split("-");
  const nomeMes = MESES[idioma][Number(mes) - 1] ?? mes ?? "";
  return idioma === "pt" ? `${nomeMes}/${ano ?? ""}` : `${nomeMes} ${ano ?? ""}`;
}

export function formatarPeriodo(inicio: string, fim: string | null, idioma: IdiomaCurriculo): string {
  const atual = idioma === "pt" ? "atual" : "Present";
  return `${formatarMes(inicio, idioma)} – ${fim === null ? atual : formatarMes(fim, idioma)}`;
}

/** Campos do contato usados na linha de contato (GitHub e portfólio ficam fora do cabeçalho). */
export interface DadosContato {
  readonly cidade: string;
  readonly uf?: string | undefined;
  readonly pais?: string | undefined;
  readonly modalidade?: string | undefined;
  readonly email: string;
  readonly telefone: string;
  readonly linkedin?: string | undefined;
}

/** Remove o protocolo e o `www.` de uma URL, deixando-a em texto puro (`linkedin.com/in/slug`). */
export function urlEmTextoPuro(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "");
}

/** Linha de contato: Cidade, UF, País · modalidade · e-mail · telefone · LinkedIn (GitHub e portfólio ficam fora). */
export function linhaContato(contato: DadosContato): string[] {
  const local = [contato.cidade, contato.uf, contato.pais]
    .filter((parte): parte is string => typeof parte === "string" && parte.length > 0)
    .join(", ");
  return [
    local,
    contato.modalidade,
    contato.email,
    contato.telefone,
    contato.linkedin ? urlEmTextoPuro(contato.linkedin) : undefined,
  ].filter((parte): parte is string => typeof parte === "string" && parte.length > 0);
}

function ordenarPorInicioDesc(experiencias: readonly Experiencia[]): Experiencia[] {
  return [...experiencias].sort((a, b) => b.inicio.localeCompare(a.inicio));
}

function agruparSkills(
  master: Master,
  ids: readonly string[],
  idioma: IdiomaCurriculo,
): { categoria: string; itens: string[] }[] {
  const grupos = new Map<CategoriaSkill, string[]>();
  for (const id of ids) {
    const skill = master.skills.find((s) => s.id === id);
    // Comportamentais ("soft") soltas não trazem recrutador e não entram no PDF.
    if (!skill || skill.categoria === "soft") continue;
    const lista = grupos.get(skill.categoria) ?? [];
    lista.push(skill.nome);
    grupos.set(skill.categoria, lista);
  }
  return [...grupos.entries()].map(([categoria, itens]) => ({
    categoria: CATEGORIAS[idioma][categoria],
    itens,
  }));
}

function nomeIdioma(nome: string, idioma: IdiomaCurriculo): string {
  return idioma === "en" ? (NOMES_IDIOMA_EN[chaveIdioma(nome)] ?? nome) : nome;
}

function menorPrioridade(valores: readonly (number | undefined)[]): number | undefined {
  const definidos = valores.filter((v): v is number => v !== undefined);
  return definidos.length > 0 ? Math.min(...definidos) : undefined;
}

function metaBullet(
  ids: readonly string[],
  doMaster: ReadonlyMap<string, { skills: readonly string[]; prioridadeCorte?: number | undefined }>,
): MetaBulletCorte {
  const origens = ids.flatMap((id) => {
    const bullet = doMaster.get(id);
    return bullet ? [bullet] : [];
  });
  const prioridade = menorPrioridade(origens.map((o) => o.prioridadeCorte));
  return {
    skills: [...new Set(origens.flatMap((o) => o.skills))],
    ...(prioridade !== undefined ? { prioridadeCorte: prioridade } : {}),
  };
}

/** Certificações do documento, no máximo `MAX_CERTIFICACOES`: ficam as de maior prioridade, depois as primeiras. */
function limitarCertificacoes(itens: readonly ItemCertificacao[]): ItemCertificacao[] {
  if (itens.length <= MAX_CERTIFICACOES) return [...itens];
  return itens
    .map((item, indice) => ({ item, indice }))
    .sort((a, b) => (b.item.prioridadeCorte ?? 5) - (a.item.prioridadeCorte ?? 5) || a.indice - b.indice)
    .slice(0, MAX_CERTIFICACOES)
    .sort((a, b) => a.indice - b.indice)
    .map((o) => o.item);
}

/**
 * Monta o documento do currículo. Empresa, cargo, datas e local vêm sempre do master; `cargoTraducao` só
 * substitui o cargo quando o idioma do documento difere do master. Com `gerado = null`, monta o master genérico.
 */
export function montarDocumento(
  master: Master,
  gerado: CurriculoGerado | null,
  idioma: IdiomaCurriculo,
): DocumentoCurriculo {
  const t = TITULOS[idioma];
  const traduzindo = idioma !== master.idioma;
  const secoes: SecaoDocumento[] = [];

  secoes.push({ tipo: "resumo", titulo: t.resumo, texto: gerado ? gerado.resumo : master.resumo });

  const experiencias = ordenarPorInicioDesc(master.experiencias).map((exp): ItemExperiencia => {
    const doGerado = gerado?.experiencias.find((e) => e.id === exp.id);
    const cargo = traduzindo && doGerado?.cargoTraducao ? doGerado.cargoTraducao : exp.cargo;
    const bulletsMaster = new Map(exp.bullets.map((b) => [b.id, b]));
    const bullets = doGerado ? doGerado.bullets.map((b) => b.texto) : exp.bullets.map((b) => b.texto);
    const meta = doGerado
      ? doGerado.bullets.map((b) => metaBullet(b.origem, bulletsMaster))
      : exp.bullets.map((b) => metaBullet([b.id], bulletsMaster));
    return {
      cargo,
      empresa: exp.empresa,
      ...(exp.local ? { local: exp.local } : {}),
      ...(exp.contexto ? { contexto: exp.contexto } : {}),
      periodo: formatarPeriodo(exp.inicio, exp.fim, idioma),
      bullets,
      corte: {
        inicio: exp.inicio,
        atual: exp.fim === null,
        skills: [...new Set(exp.bullets.flatMap((b) => b.skills))],
        ...(exp.prioridadeCorte !== undefined ? { prioridadeCorte: exp.prioridadeCorte } : {}),
        bullets: meta,
      },
    };
  });
  if (experiencias.length > 0) secoes.push({ tipo: "experiencia", titulo: t.experiencia, itens: experiencias });

  const projetosFonte = gerado
    ? gerado.projetos.flatMap((p) => {
        const doMaster = master.projetos.find((m) => m.id === p.id);
        return doMaster ? [{ doMaster, bullets: p.bullets.map((b) => b.texto) }] : [];
      })
    : master.projetos.map((doMaster) => ({ doMaster, bullets: doMaster.bullets.map((b) => b.texto) }));
  const projetos = projetosFonte.map(({ doMaster, bullets }): ItemProjeto => ({
    nome: doMaster.nome,
    ...(traduzindo ? {} : { descricao: doMaster.descricao }),
    ...(doMaster.url ? { url: doMaster.url } : {}),
    bullets,
    corte: {
      skills: doMaster.skills,
      ...(doMaster.prioridadeCorte !== undefined ? { prioridadeCorte: doMaster.prioridadeCorte } : {}),
    },
  }));
  if (projetos.length > 0) secoes.push({ tipo: "projetos", titulo: t.projetos, itens: projetos });

  const idsFormacao = gerado && gerado.formacao.length > 0 ? gerado.formacao : master.formacao.map((f) => f.id);
  const formacao = idsFormacao.flatMap((id): ItemFormacao[] => {
    const f = master.formacao.find((x) => x.id === id);
    if (!f) return [];
    const fim = f.fim ?? (idioma === "pt" ? "atual" : "present");
    return [{ curso: f.curso, detalhe: `${f.instituicao} (${f.grau}) · ${f.inicio} – ${fim}` }];
  });
  if (formacao.length > 0) secoes.push({ tipo: "formacao", titulo: t.formacao, itens: formacao });

  const idsCertificacoes = gerado ? gerado.certificacoes : master.certificacoes.map((c) => c.id);
  const certificacoes = limitarCertificacoes(
    idsCertificacoes.flatMap((id): ItemCertificacao[] => {
      const c = master.certificacoes.find((x) => x.id === id);
      if (!c) return [];
      const data = c.mes ? formatarMes(`${c.ano}-${String(c.mes).padStart(2, "0")}`, idioma) : String(c.ano);
      return [
        {
          texto: `${c.nome} — ${c.emissor} (${data})`,
          ...(c.prioridadeCorte !== undefined ? { prioridadeCorte: c.prioridadeCorte } : {}),
        },
      ];
    }),
  );
  if (certificacoes.length > 0) secoes.push({ tipo: "certificacoes", titulo: t.certificacoes, itens: certificacoes });

  const idsSkills = gerado ? gerado.skills : master.skills.map((s) => s.id);
  const grupos = agruparSkills(master, idsSkills, idioma);
  const idiomas = master.idiomas.map((i) => `${nomeIdioma(i.idioma, idioma)} (${NIVEIS[idioma][i.nivel]})`);
  if (grupos.length > 0 || idiomas.length > 0) {
    secoes.push({
      tipo: "competencias",
      titulo: t.competencias,
      grupos,
      ...(idiomas.length > 0 ? { idiomas: { rotulo: t.idiomas, itens: idiomas } } : {}),
    });
  }

  return {
    idioma,
    nome: master.pessoal.nome,
    titulo: gerado ? gerado.titulo : master.pessoal.titulo,
    contato: linhaContato(master.pessoal),
    secoes,
    tamanhoBase: TAMANHO_BASE_PADRAO,
  };
}

/**
 * Linhas da seção de competências (`Rótulo: item, item`). Os idiomas vão ao fim da última linha, separados
 * por " · "; sem nenhum grupo técnico, viram a própria linha.
 */
export function linhasCompetencias(
  secao: Extract<SecaoDocumento, { tipo: "competencias" }>,
): { readonly rotulo: string; readonly itens: string }[] {
  const linhas = secao.grupos.map((g) => ({ rotulo: g.categoria, itens: g.itens.join(", ") }));
  const { idiomas } = secao;
  if (!idiomas) return linhas;
  const ultima = linhas[linhas.length - 1];
  if (!ultima) return [{ rotulo: idiomas.rotulo, itens: idiomas.itens.join(", ") }];
  linhas[linhas.length - 1] = {
    rotulo: ultima.rotulo,
    itens: `${ultima.itens} · ${idiomas.rotulo}: ${idiomas.itens.join(", ")}`,
  };
  return linhas;
}

/** Texto puro com o mesmo conteúdo do documento (usado no score ATS). */
export function paraTexto(doc: DocumentoCurriculo): string {
  const linhas: string[] = [doc.nome, doc.titulo, doc.contato.join(" · "), ""];
  for (const secao of doc.secoes) {
    linhas.push(secao.titulo);
    switch (secao.tipo) {
      case "resumo":
        linhas.push(secao.texto);
        break;
      case "experiencia":
        for (const item of secao.itens) {
          linhas.push(`${item.empresa}${item.local ? ` · ${item.local}` : ""}`);
          linhas.push(`${item.cargo} · ${item.periodo}`);
          if (item.contexto) linhas.push(item.contexto);
          linhas.push(...item.bullets.map((b) => `- ${b}`));
        }
        break;
      case "projetos":
        for (const item of secao.itens) {
          const nome = item.descricao ? `${item.nome} — ${item.descricao}` : item.nome;
          linhas.push(item.url ? `${nome} · ${urlEmTextoPuro(item.url)}` : nome);
          linhas.push(...item.bullets.map((b) => `- ${b}`));
        }
        break;
      case "formacao":
        linhas.push(...secao.itens.map((i) => `${i.curso} — ${i.detalhe}`));
        break;
      case "certificacoes":
        linhas.push(secao.itens.map((i) => i.texto).join(" · "));
        break;
      case "competencias":
        linhas.push(...linhasCompetencias(secao).map((l) => `${l.rotulo}: ${l.itens}`));
        break;
    }
    linhas.push("");
  }
  return linhas.join("\n").trimEnd() + "\n";
}

/** Documento da carta: mesmo cabeçalho do currículo e corpo em parágrafos. */
export function montarCarta(contato: Contato, corpo: string, idioma: IdiomaCurriculo): DocumentoCarta {
  return {
    idioma,
    nome: contato.nome,
    contato: linhaContato(contato),
    paragrafos: corpo
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0),
  };
}

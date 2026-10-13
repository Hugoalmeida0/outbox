import type { CurriculoGerado } from "./curriculo-gerado.ts";
import type { CategoriaSkill, Experiencia, IdiomaCurriculo, Master, NivelIdioma } from "./master.ts";
import type { Contato } from "../respostas/pacote.ts";

export interface ItemExperiencia {
  readonly cargo: string;
  readonly empresa: string;
  readonly local?: string;
  readonly periodo: string;
  readonly bullets: readonly string[];
}

export interface ItemProjeto {
  readonly nome: string;
  readonly descricao?: string;
  readonly url?: string;
  readonly bullets: readonly string[];
}

export type SecaoDocumento =
  | { readonly tipo: "resumo"; readonly titulo: string; readonly texto: string }
  | { readonly tipo: "experiencia"; readonly titulo: string; readonly itens: readonly ItemExperiencia[] }
  | { readonly tipo: "projetos"; readonly titulo: string; readonly itens: readonly ItemProjeto[] }
  | { readonly tipo: "lista"; readonly titulo: string; readonly itens: readonly string[] }
  | {
      readonly tipo: "competencias";
      readonly titulo: string;
      readonly grupos: readonly { readonly categoria: string; readonly itens: readonly string[] }[];
    };

/** Conteúdo renderizável do currículo: fonte única para o HTML/PDF (infra) e para o texto do score ATS. */
export interface DocumentoCurriculo {
  readonly idioma: IdiomaCurriculo;
  readonly nome: string;
  readonly titulo: string;
  readonly contato: readonly string[];
  readonly secoes: readonly SecaoDocumento[];
}

export interface DocumentoCarta {
  readonly idioma: IdiomaCurriculo;
  readonly nome: string;
  readonly contato: readonly string[];
  readonly paragrafos: readonly string[];
}

const TITULOS = {
  pt: {
    resumo: "Resumo",
    experiencia: "Experiência",
    projetos: "Projetos",
    formacao: "Formação",
    certificacoes: "Certificações",
    competencias: "Competências",
    idiomas: "Idiomas",
  },
  en: {
    resumo: "Summary",
    experiencia: "Experience",
    projetos: "Projects",
    formacao: "Education",
    certificacoes: "Certifications",
    competencias: "Skills",
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

/** Linha de contato: cidade/UF · e-mail · telefone · LinkedIn · GitHub · portfólio. */
export function linhaContato(contato: Pick<Contato, "cidade" | "uf" | "email" | "telefone" | "linkedin" | "github" | "portfolio">): string[] {
  const local = contato.uf ? `${contato.cidade}/${contato.uf}` : contato.cidade;
  return [local, contato.email, contato.telefone, contato.linkedin, contato.github, contato.portfolio].filter(
    (parte): parte is string => typeof parte === "string" && parte.length > 0,
  );
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
    if (!skill) continue;
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
    const bullets = doGerado ? doGerado.bullets.map((b) => b.texto) : exp.bullets.map((b) => b.texto);
    return {
      cargo,
      empresa: exp.empresa,
      ...(exp.local ? { local: exp.local } : {}),
      periodo: formatarPeriodo(exp.inicio, exp.fim, idioma),
      bullets,
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
  }));
  if (projetos.length > 0) secoes.push({ tipo: "projetos", titulo: t.projetos, itens: projetos });

  const idsFormacao = gerado && gerado.formacao.length > 0 ? gerado.formacao : master.formacao.map((f) => f.id);
  const formacao = idsFormacao.flatMap((id) => {
    const f = master.formacao.find((x) => x.id === id);
    return f ? [`${f.curso} — ${f.instituicao} (${f.grau}), ${f.inicio}–${f.fim ?? (idioma === "pt" ? "atual" : "present")}`] : [];
  });
  if (formacao.length > 0) secoes.push({ tipo: "lista", titulo: t.formacao, itens: formacao });

  const idsCertificacoes = gerado ? gerado.certificacoes : master.certificacoes.map((c) => c.id);
  const certificacoes = idsCertificacoes.flatMap((id) => {
    const c = master.certificacoes.find((x) => x.id === id);
    return c ? [`${c.nome} — ${c.emissor} (${c.ano})`] : [];
  });
  if (certificacoes.length > 0) secoes.push({ tipo: "lista", titulo: t.certificacoes, itens: certificacoes });

  const idsSkills = gerado ? gerado.skills : master.skills.map((s) => s.id);
  const grupos = agruparSkills(master, idsSkills, idioma);
  if (grupos.length > 0) secoes.push({ tipo: "competencias", titulo: t.competencias, grupos });

  const idiomas = master.idiomas.map((i) => `${nomeIdioma(i.idioma, idioma)} — ${NIVEIS[idioma][i.nivel]}`);
  if (idiomas.length > 0) secoes.push({ tipo: "lista", titulo: t.idiomas, itens: idiomas });

  return {
    idioma,
    nome: master.pessoal.nome,
    titulo: gerado ? gerado.titulo : master.pessoal.titulo,
    contato: linhaContato(master.pessoal),
    secoes,
  };
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
          linhas.push(`${item.cargo} — ${item.empresa}${item.local ? `, ${item.local}` : ""} (${item.periodo})`);
          linhas.push(...item.bullets.map((b) => `- ${b}`));
        }
        break;
      case "projetos":
        for (const item of secao.itens) {
          linhas.push(item.nome + (item.url ? ` (${item.url})` : ""));
          if (item.descricao) linhas.push(item.descricao);
          linhas.push(...item.bullets.map((b) => `- ${b}`));
        }
        break;
      case "lista":
        linhas.push(...secao.itens.map((i) => `- ${i}`));
        break;
      case "competencias":
        linhas.push(...secao.grupos.map((g) => `${g.categoria}: ${g.itens.join(", ")}`));
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

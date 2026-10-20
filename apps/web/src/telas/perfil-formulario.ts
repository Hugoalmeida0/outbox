// Conversão entre o perfil (contrato) e o rascunho do formulário, em que todo campo é texto ou caixa.
import type { Perfil } from "@contrato";

export const CONSENTIMENTOS = [
  ["tratamentoDados", "Política de privacidade e LGPD, quando opcional"],
  ["reterDados", "Guardar meus dados para vagas futuras (banco de talentos)"],
  ["compartilharParceiros", "Compartilhar meu currículo com parceiros"],
  ["transcricaoIa", "Gravar ou transcrever entrevistas, inclusive com IA"],
  ["comunicacoes", "Receber e-mail, SMS, WhatsApp e novidades"],
  ["diversidade", "Usar meus dados de diversidade nos formulários"],
] as const;

export type ChaveConsentimento = (typeof CONSENTIMENTOS)[number][0];
/** "" = padrão (aceitar), "sim" ou "nao". */
export type TriEstado = "" | "sim" | "nao";

export interface Rascunho {
  modelos: string[];
  cidades: string;
  senioridades: string[];
  regimes: string[];
  avisoPrevioDias: string;
  inicioImediato: boolean;
  viagens: boolean;
  mudanca: boolean;
  brasil: boolean;
  precisaSponsorship: boolean;
  paisesAutorizados: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    pais: string;
  };
  salarioAtivo: boolean;
  salario: { clt: string; pj: string; usd: string; atual: string };
  documentos: { cpf: string; rg: string; dataNascimento: string };
  diversidadeAtiva: boolean;
  diversidade: { genero: string; raca: string; pcd: TriEstado; lgbtqia: TriEstado };
  consentimentos: Record<ChaveConsentimento, TriEstado>;
  comoSoube: string;
}

type Bruto = Record<string, unknown>;

function objeto(valor: unknown): Bruto {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as Bruto)
    : {};
}

function texto(valor: unknown): string {
  return typeof valor === "string" || typeof valor === "number" ? String(valor) : "";
}

function lista(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string") : [];
}

function booleano(valor: unknown, padrao = false): boolean {
  return typeof valor === "boolean" ? valor : padrao;
}

function triEstado(valor: unknown): TriEstado {
  return valor === true ? "sim" : valor === false ? "nao" : "";
}

/** Rascunho a partir do YAML lido (mesmo parcial ou inválido): o que não existe fica vazio. */
export function rascunhoDe(dados: unknown): Rascunho {
  const raiz = objeto(dados);
  const preferencias = objeto(raiz.preferencias);
  const disponibilidade = objeto(raiz.disponibilidade);
  const autorizacao = objeto(raiz.autorizacaoTrabalho);
  const endereco = objeto(raiz.endereco);
  const salario = objeto(raiz.salario);
  const documentos = objeto(raiz.documentos);
  const diversidade = objeto(raiz.diversidade);
  const consentimentos = objeto(raiz.consentimentos);
  return {
    modelos: lista(preferencias.modelos),
    cidades: lista(preferencias.cidades).join(", "),
    senioridades: lista(preferencias.senioridades),
    regimes: lista(preferencias.regimes),
    avisoPrevioDias: texto(disponibilidade.avisoPrevioDias),
    inicioImediato: booleano(disponibilidade.inicioImediato),
    viagens: booleano(disponibilidade.viagens),
    mudanca: booleano(disponibilidade.mudanca),
    brasil: booleano(autorizacao.brasil, true),
    precisaSponsorship: booleano(autorizacao.precisaSponsorship),
    paisesAutorizados: lista(autorizacao.paisesAutorizados).join(", "),
    endereco: {
      logradouro: texto(endereco.logradouro),
      numero: texto(endereco.numero),
      complemento: texto(endereco.complemento),
      bairro: texto(endereco.bairro),
      cidade: texto(endereco.cidade),
      uf: texto(endereco.uf),
      cep: texto(endereco.cep),
      pais: texto(endereco.pais) || "Brasil",
    },
    salarioAtivo: raiz.salario !== undefined && raiz.salario !== null,
    salario: {
      clt: texto(salario.clt_brl_mensal),
      pj: texto(salario.pj_brl_mensal),
      usd: texto(salario.usd_anual),
      atual: texto(salario.atual),
    },
    documentos: {
      cpf: texto(documentos.cpf),
      rg: texto(documentos.rg),
      dataNascimento: texto(documentos.dataNascimento),
    },
    diversidadeAtiva: raiz.diversidade !== undefined && raiz.diversidade !== null,
    diversidade: {
      genero: texto(diversidade.genero),
      raca: texto(diversidade.raca),
      pcd: triEstado(diversidade.pcd),
      lgbtqia: triEstado(diversidade.lgbtqia),
    },
    consentimentos: Object.fromEntries(
      CONSENTIMENTOS.map(([chave]) => [chave, triEstado(consentimentos[chave])]),
    ) as Record<ChaveConsentimento, TriEstado>,
    comoSoube: texto(raiz.comoSoube),
  };
}

function separarLista(valor: string): string[] {
  return valor
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v !== "");
}

/** Só as chaves com valor: campo vazio sai do objeto (os opcionais ficam de fora do YAML). */
function semVazios(campos: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(campos)
      .map(([k, v]) => [k, v.trim()] as const)
      .filter(([, v]) => v !== ""),
  );
}

function numero(valor: string): number | string {
  const limpo = valor.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  // Inválido segue como texto: o agente devolve o erro no campo certo.
  return limpo !== "" && Number.isFinite(n) ? n : valor;
}

function deTriEstado(valor: TriEstado): boolean | undefined {
  return valor === "sim" ? true : valor === "nao" ? false : undefined;
}

/** Objeto enviado ao agente (`PUT /perfil`), que valida com o `esquemaPerfil`. */
export function perfilDe(r: Rascunho): Record<string, unknown> {
  const consentimentos = Object.fromEntries(
    CONSENTIMENTOS.flatMap(([chave]) => {
      const v = deTriEstado(r.consentimentos[chave]);
      return v === undefined ? [] : [[chave, v]];
    }),
  );
  const diversidade = {
    ...(r.diversidade.genero ? { genero: r.diversidade.genero } : {}),
    ...(r.diversidade.raca ? { raca: r.diversidade.raca } : {}),
    ...(deTriEstado(r.diversidade.pcd) !== undefined
      ? { pcd: deTriEstado(r.diversidade.pcd) }
      : {}),
    ...(deTriEstado(r.diversidade.lgbtqia) !== undefined
      ? { lgbtqia: deTriEstado(r.diversidade.lgbtqia) }
      : {}),
  };
  return {
    documentos: semVazios(r.documentos),
    endereco: semVazios(r.endereco),
    ...(r.salarioAtivo
      ? {
          salario: {
            clt_brl_mensal: numero(r.salario.clt),
            pj_brl_mensal: numero(r.salario.pj),
            usd_anual: numero(r.salario.usd),
            ...(r.salario.atual.trim() ? { atual: r.salario.atual.trim() } : {}),
          },
        }
      : {}),
    disponibilidade: {
      avisoPrevioDias: numero(r.avisoPrevioDias),
      inicioImediato: r.inicioImediato,
      viagens: r.viagens,
      mudanca: r.mudanca,
    },
    autorizacaoTrabalho: {
      brasil: r.brasil,
      precisaSponsorship: r.precisaSponsorship,
      paisesAutorizados: separarLista(r.paisesAutorizados),
    },
    ...(r.diversidadeAtiva && Object.keys(diversidade).length > 0 ? { diversidade } : {}),
    consentimentos,
    preferencias: {
      modelos: r.modelos,
      cidades: separarLista(r.cidades),
      senioridades: r.senioridades,
      regimes: r.regimes,
    },
    comoSoube: r.comoSoube.trim(),
  } satisfies Partial<Record<keyof Perfil, unknown>>;
}

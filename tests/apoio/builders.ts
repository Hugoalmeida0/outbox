// Builders de dados válidos com overrides parciais (arquitetura.md §11.1).
import type { AnaliseVaga } from "#dominio/analise/analise-vaga.ts";
import type { CurriculoGerado } from "#dominio/curriculo/curriculo-gerado.ts";
import type { Master } from "#dominio/curriculo/master.ts";
import type { PacoteCandidatura, RespostaSugerida } from "#dominio/respostas/pacote.ts";
import type { Perfil } from "#dominio/respostas/perfil.ts";
import type {
  AtualizacaoVaga,
  CamposAtualizaveisVaga,
  ChaveDedup,
  IdVaga,
  UrlCanonica,
  Vaga,
} from "#dominio/vagas/vaga.ts";

export function umMaster(override: Partial<Master> = {}): Master {
  return {
    idioma: "pt",
    pessoal: {
      nome: "Ana Exemplo da Silva",
      titulo: "Desenvolvedora Full Stack",
      email: "ana.exemplo@example.com",
      telefone: "+55 11 90000-0000",
      cidade: "São Paulo",
      uf: "SP",
      pais: "Brasil",
      linkedin: "https://www.linkedin.com/in/ana-exemplo",
      github: "https://github.com/ana-exemplo",
    },
    resumo: "Desenvolvedora full stack com 6 anos de experiência em TypeScript, Node.js e React.",
    experiencias: [
      {
        id: "exp-aurora",
        empresa: "Fintech Aurora",
        cargo: "Desenvolvedora Sênior",
        inicio: "2022-03",
        fim: null,
        local: "Remoto",
        bullets: [
          {
            id: "exp-aurora-b1",
            texto:
              "Liderei a migração de 12 serviços Node.js para TypeScript, reduzindo incidentes em 40%.",
            skills: ["typescript", "nodejs"],
          },
          {
            id: "exp-aurora-b2",
            texto: "Construí APIs REST com PostgreSQL e AWS SQS para conciliação de pagamentos.",
            skills: ["postgresql", "aws"],
          },
        ],
      },
      {
        id: "exp-horizonte",
        empresa: "Loja Horizonte",
        cargo: "Desenvolvedora Pleno",
        inicio: "2019-01",
        fim: "2022-02",
        bullets: [
          {
            id: "exp-horizonte-b1",
            texto: "Desenvolvi o checkout em React usado por 2 milhões de clientes por mês.",
            skills: ["react"],
          },
        ],
      },
    ],
    projetos: [
      {
        id: "proj-financas",
        nome: "Gestor de Finanças",
        descricao: "Aplicativo pessoal de controle de gastos.",
        skills: ["react"],
        bullets: [{ id: "proj-financas-b1", texto: "Frontend em React com gráficos de gastos." }],
      },
    ],
    formacao: [
      {
        id: "form-usp",
        instituicao: "Universidade de São Paulo",
        curso: "Ciência da Computação",
        grau: "Bacharelado",
        inicio: "2014",
        fim: "2018",
      },
    ],
    certificacoes: [
      {
        id: "cert-aws",
        nome: "AWS Certified Cloud Practitioner",
        emissor: "Amazon Web Services",
        ano: 2023,
      },
    ],
    skills: [
      {
        id: "typescript",
        nome: "TypeScript",
        aliases: ["TS"],
        categoria: "linguagem",
        origem: "master",
      },
      {
        id: "nodejs",
        nome: "Node.js",
        aliases: ["Node"],
        categoria: "framework",
        origem: "master",
      },
      {
        id: "react",
        nome: "React",
        aliases: ["ReactJS"],
        categoria: "framework",
        origem: "master",
      },
      {
        id: "postgresql",
        nome: "PostgreSQL",
        aliases: ["Postgres"],
        categoria: "banco",
        origem: "master",
      },
      { id: "aws", nome: "AWS", aliases: [], categoria: "cloud", origem: "master" },
    ],
    idiomas: [
      { idioma: "Português", nivel: "nativo" },
      { idioma: "Inglês", nivel: "avancado" },
    ],
    ...override,
  };
}

export function umPerfil(override: Partial<Perfil> = {}): Perfil {
  return {
    documentos: { cpf: "123.456.789-09", dataNascimento: "1995-06-15", rg: "12.345.678-9" },
    endereco: {
      logradouro: "Rua Exemplo Fictícia",
      numero: "100",
      bairro: "Centro",
      cidade: "São Paulo",
      uf: "SP",
      cep: "01000-000",
      pais: "Brasil",
    },
    salario: { clt_brl_mensal: 15000, pj_brl_mensal: 20000, usd_anual: 60000 },
    disponibilidade: { avisoPrevioDias: 30, inicioImediato: false, viagens: true, mudanca: false },
    autorizacaoTrabalho: { brasil: true, precisaSponsorship: true, paisesAutorizados: ["BR"] },
    diversidade: { genero: "mulher_cis" },
    consentimentos: {},
    preferencias: {
      modelos: ["remoto", "hibrido"],
      cidades: ["São Paulo"],
      senioridades: ["pleno", "senior"],
      regimes: ["clt", "pj"],
    },
    comoSoube: "LinkedIn",
    ...override,
  };
}

export function umaAnalise(override: Partial<AnaliseVaga> = {}): AnaliseVaga {
  return {
    idioma: "pt",
    senioridade: "senior",
    modelo: "remoto",
    regime: "clt",
    afirmativa: { exclusiva: false, grupos: [] },
    requisitos: [
      {
        texto: "Experiência com TypeScript",
        termo: "TypeScript",
        obrigatorio: true,
        status: "coberto",
        evidencias: ["typescript"],
      },
      {
        texto: "Experiência com React",
        termo: "React",
        obrigatorio: true,
        status: "coberto",
        evidencias: ["react"],
      },
    ],
    keywords: [
      { termo: "TypeScript", tipo: "tecnologia" },
      { termo: "React", tipo: "tecnologia" },
      { termo: "Kafka", tipo: "tecnologia" },
      { termo: "microsserviços", tipo: "pratica" },
    ],
    ...override,
  };
}

export function umCurriculoGerado(override: Partial<CurriculoGerado> = {}): CurriculoGerado {
  return {
    idioma: "pt",
    titulo: "Desenvolvedora Full Stack TypeScript",
    resumo: "Desenvolvedora full stack com foco em TypeScript e React.",
    experiencias: [
      {
        id: "exp-aurora",
        bullets: [
          {
            texto: "Migrei 12 serviços Node.js para TypeScript, reduzindo incidentes em 40%.",
            origem: ["exp-aurora-b1"],
          },
        ],
      },
      {
        id: "exp-horizonte",
        bullets: [
          {
            texto: "Construí o checkout em React para 2 milhões de clientes.",
            origem: ["exp-horizonte-b1"],
          },
        ],
      },
    ],
    projetos: [],
    skills: ["typescript", "react", "nodejs"],
    formacao: ["form-usp"],
    certificacoes: [],
    ...override,
  };
}

let proximoIdVaga = 1;

export function umaVaga(override: Partial<Vaga> = {}): Vaga {
  const id = (override.id ?? proximoIdVaga++) as IdVaga;
  return {
    id,
    urlOriginal: `https://job-boards.greenhouse.io/empresa/jobs/${id}`,
    canal: "greenhouse",
    urlCanonica: `https://job-boards.greenhouse.io/empresa/jobs/${id}` as UrlCanonica,
    urlResolvida: null,
    motor: "greenhouse",
    rota: null,
    status: "NOVA",
    motivo: null,
    duplicadaDe: null,
    empresa: null,
    cargo: null,
    localidade: null,
    chaveDedup: null as ChaveDedup | null,
    idioma: null,
    publicadaEm: null,
    adicionadaEm: "2026-10-01T10:00:00-03:00",
    aderencia: null,
    atsAntes: null,
    atsDepois: null,
    camaleaoFalhou: null,
    anexoManual: false,
    tentativasPreparo: 0,
    etapa: null,
    enviadaEm: null,
    atualizadaEm: "2026-10-01T10:00:00-03:00",
    ...override,
  };
}

export function umaResposta(override: Partial<RespostaSugerida> = {}): RespostaSugerida {
  return {
    rotulo: "Por que você quer trabalhar aqui?",
    categoria: "pergunta",
    tipoCampo: "textarea",
    valor: "Porque admiro o produto.",
    fonte: "gerada",
    confianca: "alta",
    especificaDaVaga: false,
    sensivel: false,
    ...override,
  };
}

export function umPacote(override: Partial<PacoteCandidatura> = {}): PacoteCandidatura {
  const master = umMaster();
  return {
    vagaId: 1,
    idioma: "pt",
    pdfCurriculo: "C:/tmp/Ana-Silva-Curriculo.pdf",
    respostas: [],
    contato: { ...master.pessoal },
    ...override,
  };
}

/** Atualização arbitrária para montar cenários: em produção ela vem de `#dominio/vagas/atualizacoes.ts`. */
export function umaAtualizacao(campos: CamposAtualizaveisVaga): AtualizacaoVaga {
  return campos as AtualizacaoVaga;
}

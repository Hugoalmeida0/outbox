// Contrato da API do agente local (ADR-0024): schemas Zod de toda entrada, saída e evento. O site
// (apps/web) importa este arquivo direto, por isso ele só pode importar `zod` e `#dominio/*`.
import { z } from "zod";
import { esquemaPerfil } from "#dominio/respostas/perfil.ts";
import { ETAPAS, STATUS } from "#dominio/vagas/status.ts";

/** Muda quando uma rota ou um evento deixa de ser compatível com o site publicado. */
export const VERSAO_CONTRATO = 1;

const status = z.enum(STATUS);
const id = z.number().int().positive();

export const STATUS_RETORNO = ["EM_PROCESSO", "OFERTA", "RECUSADA", "ENVIADA"] as const;

// ---------------------------------------------------------------- conexão e pareamento

export const esquemaSaude = z.object({
  app: z.literal("camaleao"),
  versao: z.string(),
  versaoContrato: z.number().int(),
});
export type Saude = z.infer<typeof esquemaSaude>;

export const esquemaEntradaPareamento = z.object({ codigo: z.string().trim().min(1).max(20) });
export const esquemaSaidaPareamento = z.object({ token: z.string().min(1) });

/** Corpo de toda resposta de erro (4xx e 5xx). */
export const esquemaErroApi = z.object({
  mensagem: z.string(),
  /** Transições aceitas, quando o retorno pedido não é permitido. */
  aceitas: z.array(z.string()).optional(),
  /** Problemas de validação por campo (perfil), com o caminho no formato `secao.campo`. */
  erros: z.array(z.object({ caminho: z.string(), mensagem: z.string() })).optional(),
});
export type ErroApi = z.infer<typeof esquemaErroApi>;

// ---------------------------------------------------------------- execuções

export const COMANDOS_EXECUCAO = ["preparar", "aplicar", "importar", "renderizar_master"] as const;
export type ComandoExecucao = (typeof COMANDOS_EXECUCAO)[number];

export const esquemaEntradaPreparar = z.object({
  forcar: z.boolean().default(false),
  reavaliar: z.boolean().default(false),
  paralelo: z
    .number()
    .int("deve ser inteiro")
    .min(1, "vai de 1 a 8")
    .max(8, "vai de 1 a 8")
    .optional(),
});
export const esquemaEntradaAplicar = z.object({
  simular: z.boolean().default(false),
  id: id.optional(),
});
export const esquemaExecucaoCriada = z.object({ id: z.string().min(1) });
export const esquemaExecucoesAtivas = z.object({
  execucoes: z.array(
    z.object({ id: z.string(), comando: z.enum(COMANDOS_EXECUCAO), iniciadaEm: z.string() }),
  ),
});

export const TIPOS_PERGUNTA = ["sim_nao", "numero", "texto", "escolha", "aguardar"] as const;
export type TipoPergunta = (typeof TIPOS_PERGUNTA)[number];

export const esquemaPergunta = z.object({
  id: z.string(),
  tipo: z.enum(TIPOS_PERGUNTA),
  mensagem: z.string(),
  opcoes: z.array(z.object({ valor: z.string(), rotulo: z.string() })).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});
export type Pergunta = z.infer<typeof esquemaPergunta>;

export const esquemaEntradaResposta = z.object({
  perguntaId: z.string().min(1),
  valor: z.union([z.boolean(), z.number(), z.string(), z.null()]),
});

const esquemaVagaResumida = z.object({
  id,
  empresa: z.string().nullable(),
  cargo: z.string().nullable(),
  status,
  motivo: z.string().nullable(),
});
export type VagaResumida = z.infer<typeof esquemaVagaResumida>;

export const ETAPAS_PREPARO = [
  "resolver",
  "extrair",
  "analisar",
  "gerar_curriculo",
  "gerar_carta",
  "responder_campos",
] as const;

const esquemaEventoPreparo = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("inicio"), total: z.number().int(), paralelo: z.number().int() }),
  z.object({ tipo: z.literal("etapa"), vaga: esquemaVagaResumida, etapa: z.enum(ETAPAS_PREPARO) }),
  z.object({
    tipo: z.literal("concluida"),
    vaga: esquemaVagaResumida,
    erro: z.string().nullable(),
  }),
]);

export const esquemaResumoRevisao = z.object({
  vagaId: z.number(),
  empresa: z.string(),
  cargo: z.string(),
  motor: z.string(),
  rota: z.string(),
  url: z.string(),
  aderencia: z.number().nullable(),
  atsAntes: z.number().nullable(),
  atsDepois: z.number().nullable(),
  gapsRestantes: z.array(z.string()),
  alertas: z.array(z.string()),
  respostas: z.array(
    z.object({
      rotulo: z.string(),
      valor: z.string(),
      nova: z.boolean(),
      vaziaNaPagina: z.boolean().optional(),
    }),
  ),
  cartaInicio: z.string().optional(),
  /** URL de uso único do PDF do currículo (`/arquivos/<id>`), no lugar do caminho local. */
  urlPdf: z.string().nullable(),
});
export type ResumoRevisaoWeb = z.infer<typeof esquemaResumoRevisao>;

const contagens = z.partialRecord(status, z.number().int());

export const esquemaResultado = z.discriminatedUnion("comando", [
  z.object({
    comando: z.literal("preparar"),
    processadas: z.number().int(),
    contagens,
    erros: z.array(z.object({ id, motivo: z.string(), mensagem: z.string() })),
    reavaliadas: z.number().int(),
    interrompido: z.enum(["limite", "cancelado"]).nullable(),
  }),
  z.object({
    comando: z.literal("aplicar"),
    revisadas: z.number().int(),
    desfechos: z.record(z.string(), z.number().int()),
    interrompido: z.enum(["limite", "cancelado", "usuario"]).nullable(),
  }),
  z.object({
    comando: z.literal("importar"),
    /** Caminhos relativos à raiz dos dados do usuário. */
    master: z.string(),
    backup: z.string().optional(),
    criados: z.array(z.string()),
    experiencias: z.number().int(),
    skills: z.number().int(),
  }),
  z.object({
    comando: z.literal("renderizar_master"),
    urlPdf: z.string(),
    paginas: z.number().int(),
  }),
]);
export type ResultadoExecucao = z.infer<typeof esquemaResultado>;

export const CODIGOS_ERRO_EXECUCAO = ["uso", "execucao", "cancelada", "limite_uso"] as const;

/** Evento de uma execução, na ordem em que aconteceu; o stream reenvia todos desde o início. */
export const esquemaEventoExecucao = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("progresso"), evento: esquemaEventoPreparo }),
  z.object({ tipo: z.literal("pergunta"), pergunta: esquemaPergunta }),
  /** A pergunta deixou de esperar resposta (o site a tira da tela, inclusive ao recarregar). */
  z.object({ tipo: z.literal("respondida"), perguntaId: z.string() }),
  z.object({ tipo: z.literal("revisao"), resumo: esquemaResumoRevisao }),
  z.object({ tipo: z.literal("aviso"), mensagem: z.string() }),
  z.object({ tipo: z.literal("abrir_arquivo"), url: z.string() }),
  z.object({ tipo: z.literal("fim"), resultado: esquemaResultado }),
  z.object({
    tipo: z.literal("erro"),
    mensagem: z.string(),
    codigo: z.enum(CODIGOS_ERRO_EXECUCAO),
  }),
]);
export type EventoExecucao = z.infer<typeof esquemaEventoExecucao>;

// ---------------------------------------------------------------- comandos síncronos

export const esquemaEntradaAdicionar = z.object({
  urls: z.array(z.string()).min(1, "informe ao menos uma URL"),
});
export const RESULTADOS_ADICAO = [
  "adicionada",
  "ja_na_fila",
  "duplicada",
  "reaberta",
  "ignorada",
  "invalida",
] as const;
export const esquemaSaidaAdicionar = z.object({
  itens: z.array(
    z.object({
      url: z.string(),
      resultado: z.enum(RESULTADOS_ADICAO),
      id: id.optional(),
      status: status.optional(),
      detalhe: z.string().optional(),
    }),
  ),
});

const esquemaLinhaStatus = z.object({
  id,
  status,
  motivo: z.string().nullable(),
  etapa: z.enum(ETAPAS).nullable(),
  empresa: z.string().nullable(),
  cargo: z.string().nullable(),
  canal: z.string(),
  motor: z.string(),
  aderencia: z.number().nullable(),
  atsAntes: z.number().nullable(),
  atsDepois: z.number().nullable(),
  atualizadaEm: z.string(),
  /** PDF do currículo da vaga, quando existe (URL de uso único). */
  urlPdf: z.string().nullable(),
});
export type LinhaStatusWeb = z.infer<typeof esquemaLinhaStatus>;

export const esquemaSaidaStatus = z.object({
  contagens: z.record(status, z.number().int()),
  linhas: z.array(esquemaLinhaStatus),
  aguardandoVoce: z.object({
    manuais: z.array(esquemaLinhaStatus.extend({ destino: z.string().optional() })),
    pendentesTeste: z.array(esquemaLinhaStatus),
  }),
});
export type SaidaStatus = z.infer<typeof esquemaSaidaStatus>;

export const esquemaEntradaRetorno = z.object({
  status: z.enum(STATUS_RETORNO),
  etapa: z.enum(ETAPAS).optional(),
  nota: z.string().trim().min(1).optional(),
});

export const esquemaSaidaFalhas = z.object({
  grupos: z.array(
    z.object({
      conector: z.string(),
      passo: z.string(),
      quantidade: z.number().int(),
      maisRecente: z.string(),
      urlMaisRecente: z.string(),
    }),
  ),
  semConector: z.array(z.object({ motor: z.string(), quantidade: z.number().int() })),
});

const esquemaErroCampo = z.object({ caminho: z.string(), mensagem: z.string() });

export const esquemaEstadoCurriculo = z.object({
  masterExiste: z.boolean(),
  masterAtualizadoEm: z.string().nullable(),
  perfilValido: z.boolean(),
  errosPerfil: z.array(esquemaErroCampo),
});
export type EstadoCurriculo = z.infer<typeof esquemaEstadoCurriculo>;

export const esquemaSaidaPerfil = z.object({
  perfil: esquemaPerfil.nullable(),
  /** YAML lido sem validar, para o formulário mostrar um perfil parcial. */
  dadosBrutos: z.unknown(),
  erros: z.array(esquemaErroCampo),
});
export type SaidaPerfil = z.infer<typeof esquemaSaidaPerfil>;

/** `PUT /perfil` aceita o perfil inteiro; o agente valida com `esquemaPerfil` e devolve 422 por campo. */
export { esquemaPerfil };
export type { Perfil } from "#dominio/respostas/perfil.ts";
/** Valores aceitos pelo formulário de perfil e pelos filtros do site. */
export { GENEROS, RACAS } from "#dominio/respostas/perfil.ts";
export { MODELOS_TRABALHO, REGIMES, SENIORIDADES } from "#dominio/analise/analise-vaga.ts";
export { ETAPAS, STATUS } from "#dominio/vagas/status.ts";
export type { Etapa, Status } from "#dominio/vagas/status.ts";

export const esquemaOk = z.object({ ok: z.literal(true) });

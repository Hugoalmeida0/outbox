export const STATUS = {
  NOVA: "NOVA",
  PRONTA: "PRONTA",
  ERRO_PREPARO: "ERRO_PREPARO",
  DESCARTADA: "DESCARTADA",
  DUPLICADA: "DUPLICADA",
  MANUAL: "MANUAL",
  PULADA: "PULADA",
  ENVIADA: "ENVIADA",
  PENDENTE_TESTE: "PENDENTE_TESTE",
  EM_PROCESSO: "EM_PROCESSO",
  OFERTA: "OFERTA",
  RECUSADA: "RECUSADA",
} as const;
export type Status = (typeof STATUS)[keyof typeof STATUS];
export const TODOS_STATUS: readonly Status[] = Object.values(STATUS);

/** Motivos aceitos por status. Status ausentes deste mapa não aceitam motivo. */
export const MOTIVOS = {
  DESCARTADA: ["aderencia_baixa", "duplicada_antiga", "afirmativa_inelegivel", "manual"],
  DUPLICADA: ["url_ja_enviada", "mesma_vaga_na_fila"],
  MANUAL: [
    "easy_apply",
    "candidatura_por_email",
    "sem_formulario",
    "teto_agente",
    "agente_bloqueado",
    "escolha_usuario",
  ],
  ERRO_PREPARO: ["resolucao_falhou", "agregador_exige_login", "extracao_falhou", "llm_falhou"],
} as const;
export type StatusComMotivo = keyof typeof MOTIVOS;
export type Motivo = (typeof MOTIVOS)[StatusComMotivo][number];
export type MotivoDe<S extends StatusComMotivo> = (typeof MOTIVOS)[S][number];

export const ETAPAS = ["triagem", "entrevista_rh", "tecnica", "final"] as const;
export type Etapa = (typeof ETAPAS)[number];

export const ROTAS = ["conector", "agente", "manual", "a_definir"] as const;
export type Rota = (typeof ROTAS)[number];

export const STATUS_NA_FILA: readonly Status[] = ["NOVA", "PRONTA", "ERRO_PREPARO"];
export const STATUS_POS_ENVIO: readonly Status[] = [
  "ENVIADA",
  "PENDENTE_TESTE",
  "EM_PROCESSO",
  "OFERTA",
  "RECUSADA",
];
export const STATUS_COM_RESPOSTA: readonly Status[] = ["EM_PROCESSO", "OFERTA", "RECUSADA"];
export const STATUS_IGNORADOS_DEDUP: readonly Status[] = [
  "PULADA",
  "DESCARTADA",
  "MANUAL",
  "DUPLICADA",
];
export const ETAPAS_ENTREVISTA: readonly Etapa[] = ["entrevista_rh", "tecnica", "final"];

export function ehStatusComMotivo(status: Status): status is StatusComMotivo {
  return Object.hasOwn(MOTIVOS, status);
}

export function ehMotivoDe(status: Status, motivo: string): boolean {
  return ehStatusComMotivo(status) && (MOTIVOS[status] as readonly string[]).includes(motivo);
}

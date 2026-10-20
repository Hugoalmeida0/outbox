import { ErroValidacao } from "../compartilhado/erros.ts";
import type { UrlCanonica } from "./vaga.ts";

export const MOTORES_CONHECIDOS = [
  "greenhouse",
  "lever",
  "ashby",
  "gupy",
  "inhire",
  "smartrecruiters",
  "workable",
  "teamtailor",
  "workday",
  "oracle",
  "successfactors",
  "cornerstone",
  "eightfold",
  "linkedin",
  "indeed",
  "glassdoor",
  "github",
] as const;
export type MotorConhecido = (typeof MOTORES_CONHECIDOS)[number];
export type Motor = MotorConhecido | `dominio:${string}`;

export const MOTORES_COM_CONECTOR_V1: readonly MotorConhecido[] = [
  "greenhouse",
  "lever",
  "ashby",
  "gupy",
  "inhire",
  "smartrecruiters",
  "workable",
  "teamtailor",
];

export const AGREGADORES: readonly MotorConhecido[] = ["linkedin", "indeed", "glassdoor"];

interface PadraoMotor {
  readonly motor: MotorConhecido;
  /** Padrões de host; `*.` casa com qualquer subdomínio (não com o domínio nu). */
  readonly hosts: readonly string[];
  /** Restrição opcional sobre o caminho. */
  readonly caminho?: RegExp;
  /**
   * URL canônica específica do motor, ou `null` para cair na canonização genérica. Um motor novo
   * declara aqui o próprio formato, sem editar `canonizar`.
   */
  readonly canonica?: (url: URL) => string | null;
}

function canonicaGreenhouse(url: URL): string | null {
  const eu = url.hostname.includes(".eu.");
  const host = eu ? "job-boards.eu.greenhouse.io" : "job-boards.greenhouse.io";
  const caminho = /^\/([^/]+)\/jobs\/(\d+)/.exec(url.pathname);
  if (caminho) return `https://${host}/${caminho[1] ?? ""}/jobs/${caminho[2] ?? ""}`;
  const board = url.searchParams.get("for");
  const token = url.searchParams.get("token");
  if (url.pathname.startsWith("/embed/job_app") && board && token) {
    return `https://${host}/${board}/jobs/${token}`;
  }
  return null;
}

/** Lever e Ashby: `/<empresa>/<uuid>`. */
function canonicaEmpresaUuid(url: URL): string | null {
  const m = /^\/([^/]+)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(
    url.pathname,
  );
  return m ? `https://${url.hostname}/${m[1] ?? ""}/${(m[2] ?? "").toLowerCase()}` : null;
}

function canonicaGupy(url: URL): string | null {
  if (url.hostname === "portal.gupy.io") return null;
  const m = /^\/jobs?\/(\d+)/.exec(url.pathname);
  return m ? `https://${url.hostname}/jobs/${m[1] ?? ""}` : null;
}

function canonicaLinkedin(url: URL): string | null {
  const doCaminho = /\/jobs\/view\/(?:[^/]*?-)?(\d+)/.exec(url.pathname)?.[1];
  const id = doCaminho ?? url.searchParams.get("currentJobId");
  return id ? `https://www.linkedin.com/jobs/view/${id}` : null;
}

function canonicaIndeed(url: URL): string | null {
  const id = url.searchParams.get("jk") ?? url.searchParams.get("vjk");
  if (!id) return null;
  const brasileiro = url.hostname.endsWith("indeed.com.br") || url.hostname === "br.indeed.com";
  return `https://${brasileiro ? "br.indeed.com" : url.hostname}/viewjob?jk=${id}`;
}

function canonicaGithub(url: URL): string | null {
  const m = /^\/([^/]+)\/([^/]+)\/issues\/(\d+)/.exec(url.pathname);
  return m ? `https://github.com/${m[1] ?? ""}/${m[2] ?? ""}/issues/${m[3] ?? ""}` : null;
}

/** Tabela única de motores: detecção, canonização, canal, resolução e allowlist de hosts. */
export const PADROES_MOTOR: readonly PadraoMotor[] = [
  {
    motor: "greenhouse",
    hosts: ["job-boards.greenhouse.io", "job-boards.eu.greenhouse.io", "boards.greenhouse.io"],
    canonica: canonicaGreenhouse,
  },
  { motor: "lever", hosts: ["jobs.lever.co", "jobs.eu.lever.co"], canonica: canonicaEmpresaUuid },
  { motor: "ashby", hosts: ["jobs.ashbyhq.com"], canonica: canonicaEmpresaUuid },
  { motor: "gupy", hosts: ["*.gupy.io"], canonica: canonicaGupy },
  { motor: "inhire", hosts: ["*.inhire.app"] },
  { motor: "smartrecruiters", hosts: ["jobs.smartrecruiters.com"] },
  { motor: "workable", hosts: ["apply.workable.com"] },
  { motor: "teamtailor", hosts: ["*.teamtailor.com"] },
  { motor: "workday", hosts: ["*.myworkdayjobs.com"] },
  { motor: "oracle", hosts: ["*.oraclecloud.com"], caminho: /CandidateExperience/i },
  {
    motor: "successfactors",
    hosts: ["*.successfactors.com", "*.successfactors.eu", "*.sapsf.com", "*.sapsf.eu"],
  },
  { motor: "cornerstone", hosts: ["*.csod.com"] },
  { motor: "eightfold", hosts: ["*.eightfold.ai"] },
  { motor: "linkedin", hosts: ["linkedin.com", "*.linkedin.com"], canonica: canonicaLinkedin },
  {
    motor: "indeed",
    hosts: ["indeed.com", "*.indeed.com", "indeed.com.br", "*.indeed.com.br"],
    canonica: canonicaIndeed,
  },
  {
    motor: "glassdoor",
    hosts: ["glassdoor.com", "*.glassdoor.com", "glassdoor.com.br", "*.glassdoor.com.br"],
  },
  {
    motor: "github",
    hosts: ["github.com"],
    caminho: /^\/[^/]+\/[^/]+\/issues\/\d+/,
    canonica: canonicaGithub,
  },
];

/** Verifica se `host` casa com um padrão (`exato` ou `*.sufixo`). */
export function hostCasaPadrao(host: string, padrao: string): boolean {
  const h = host.toLowerCase();
  const p = padrao.toLowerCase();
  if (p.startsWith("*.")) return h.endsWith(p.slice(1)) && h.length > p.length - 1;
  return h === p;
}

/** Padrões de host do motor (usados na allowlist do outbox-segredos). */
export function padroesHostDoMotor(motor: Motor): readonly string[] {
  return PADROES_MOTOR.find((p) => p.motor === motor)?.hosts ?? [];
}

function semWww(host: string): string {
  return host.replace(/^www\./, "");
}

/** Detecta o motor de uma URL pelos padrões de host e caminho. */
export function detectarMotor(url: URL): Motor {
  const padrao = PADROES_MOTOR.find(
    (p) =>
      p.hosts.some((h) => hostCasaPadrao(url.hostname, h)) &&
      (p.caminho === undefined || p.caminho.test(url.pathname)),
  );
  return padrao ? padrao.motor : `dominio:${semWww(url.hostname.toLowerCase())}`;
}

export function ehMotorConhecido(motor: Motor): motor is MotorConhecido {
  return (MOTORES_CONHECIDOS as readonly string[]).includes(motor);
}

const PARAMETROS_RASTREAMENTO = new Set([
  "gh_src",
  "source",
  "src",
  "ref",
  "referrer",
  "lever-source",
  "lever-origin",
  "jobboardsource",
  "trk",
  "trackingid",
  "refid",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "lang",
]);

function ehRastreamento(nome: string): boolean {
  const n = nome.toLowerCase();
  return n.startsWith("utm_") || PARAMETROS_RASTREAMENTO.has(n);
}

function canonicaGenerica(url: URL): string {
  url.hash = "";
  const mantidos = [...url.searchParams.entries()]
    .filter(([nome]) => !ehRastreamento(nome))
    .sort(([a], [b]) => a.localeCompare(b));
  url.search = "";
  for (const [nome, valor] of mantidos) url.searchParams.append(nome, valor);
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
  return url.href;
}

/** Converte uma URL de entrada em URL canônica e detecta o motor. */
export function canonizar(entrada: string): { canonica: UrlCanonica; motor: Motor } {
  let url: URL;
  try {
    url = new URL(entrada.trim());
  } catch (erro) {
    throw new ErroValidacao("url", `URL inválida: ${entrada}`, { cause: erro });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ErroValidacao("url", `URL precisa ser http(s): ${entrada}`);
  }
  const motor = detectarMotor(url);
  const especifica = PADROES_MOTOR.find((p) => p.motor === motor)?.canonica?.(url) ?? null;
  const canonica = especifica ?? canonicaGenerica(url);
  return { canonica: canonica as UrlCanonica, motor };
}

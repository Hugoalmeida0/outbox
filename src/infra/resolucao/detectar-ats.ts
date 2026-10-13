import {
  AGREGADORES,
  canonizar,
  detectarMotor,
  ehMotorConhecido,
  type Motor,
} from "#dominio/vagas/motores.ts";
import type { UrlCanonica } from "#dominio/vagas/vaga.ts";
import { decodificarEntidades } from "../extracao/html-texto.ts";

/** Padrões de caminho que indicam uma vaga específica (e não uma listagem) em cada motor. */
const CAMINHO_DE_VAGA: Partial<Record<Motor, RegExp>> = {
  greenhouse: /\/jobs\/\d+|\/embed\/job_app/,
  lever: /\/[0-9a-f]{8}-[0-9a-f]{4}-/i,
  ashby: /\/[0-9a-f]{8}-[0-9a-f]{4}-/i,
  gupy: /\/jobs?\/\d+/,
  inhire: /\/vagas\/[^/]+/,
  smartrecruiters: /^\/[^/]+\/\d+/,
  workable: /\/j\/[A-Z0-9]+/i,
  teamtailor: /\/jobs\/\d+/,
  workday: /\/job\//,
  oracle: /\/job\/\d+/,
  successfactors: /jobid=|\/job\//i,
  cornerstone: /\/requisition\/\d+/,
  eightfold: /\/job\/\d+|[?&]pid=\d+/,
};

export interface AtsDetectado {
  readonly motor: Motor;
  /** Presente quando há exatamente uma URL de vaga distinta na página. */
  readonly canonica?: UrlCanonica;
}

function urlsDoHtml(html: string): string[] {
  const texto = decodificarEntidades(html).replace(/\\\//g, "/");
  return [...new Set(texto.match(/https?:\/\/[^\s"'<>()\\]+/g) ?? [])];
}

/**
 * Procura no HTML de uma página de carreira URLs de vaga de ATS conhecidos (links, iframes, scripts),
 * incluindo o Greenhouse embutido via `gh_jid`. Devolve o motor e, se houver uma única vaga, a canônica.
 */
export function detectarAtsNoHtml(html: string, urlPagina: string): AtsDetectado | null {
  const vagas = new Map<string, Motor>();
  const motoresVistos = new Set<Motor>();
  for (const bruta of urlsDoHtml(html)) {
    let url: URL;
    try {
      url = new URL(bruta);
    } catch {
      continue;
    }
    const motor = detectarMotor(url);
    if (!ehMotorConhecido(motor) || AGREGADORES.includes(motor) || motor === "github") continue;
    motoresVistos.add(motor);
    if (CAMINHO_DE_VAGA[motor]?.test(url.pathname + url.search)) {
      vagas.set(canonizar(url.href).canonica, motor);
    }
  }

  const ghJid = new URL(urlPagina).searchParams.get("gh_jid");
  const boardGreenhouse =
    /greenhouse\.io\/(?:embed\/job_board(?:\/js)?\?for=|embed\/job_app\?for=)([\w-]+)/.exec(
      html,
    )?.[1];
  if (ghJid && boardGreenhouse) {
    return {
      motor: "greenhouse",
      canonica: canonizar(`https://job-boards.greenhouse.io/${boardGreenhouse}/jobs/${ghJid}`)
        .canonica,
    };
  }

  if (vagas.size === 1) {
    const [[canonica, motor]] = [...vagas.entries()] as [[string, Motor]];
    return { motor, canonica: canonica as UrlCanonica };
  }
  const motores = [...new Set([...vagas.values(), ...motoresVistos])];
  return motores.length === 1 && motores[0] !== undefined ? { motor: motores[0] } : null;
}

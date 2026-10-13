import { normalizarTexto } from "../compartilhado/texto.ts";
import { SENIORIDADES, type AnaliseVaga, type Senioridade } from "./analise-vaga.ts";
import { gruposDoPerfil, perfilInformaGrupo } from "./grupos.ts";
import type { Diversidade, Preferencias } from "../respostas/perfil.ts";

export interface DetalhesAderencia {
  readonly cobertura: number;
  readonly senioridade: number;
  readonly modeloLocalidade: number;
  readonly regime: number;
}

export interface ResultadoAderencia {
  readonly score: number;
  readonly detalhes: DetalhesAderencia;
  readonly eliminacao?: "afirmativa_inelegivel";
  readonly alertas: readonly string[];
}

export const ALERTA_AFIRMATIVA = "vaga afirmativa: confira elegibilidade";

function pontosCobertura(analise: AnaliseVaga): number {
  const obrigatorios = analise.requisitos.filter((r) => r.obrigatorio);
  const base = obrigatorios.length > 0 ? obrigatorios : analise.requisitos;
  if (base.length === 0) return 60;
  const cobertos = base.filter((r) => r.status === "coberto").length;
  const parciais = base.filter((r) => r.status === "parcial").length;
  return Math.round((60 * (cobertos + 0.5 * parciais)) / base.length);
}

function pontosSenioridade(analise: AnaliseVaga, preferencias: Preferencias): number {
  if (analise.senioridade === "nao_informada") return 15;
  const vaga: Senioridade = analise.senioridade;
  if (preferencias.senioridades.includes(vaga)) return 15;
  const indice = SENIORIDADES.indexOf(vaga);
  const adjacente = preferencias.senioridades.some(
    (s) => Math.abs(SENIORIDADES.indexOf(s) - indice) === 1,
  );
  return adjacente ? 7 : 0;
}

function pontosModelo(analise: AnaliseVaga, preferencias: Preferencias): number {
  if (analise.modelo === "nao_informado") return 15;
  if (!preferencias.modelos.includes(analise.modelo)) return 0;
  if (analise.modelo === "remoto") return 15;
  const cidade = analise.cidade ? normalizarTexto(analise.cidade) : "";
  return cidade !== "" && preferencias.cidades.some((c) => normalizarTexto(c) === cidade) ? 15 : 0;
}

function pontosRegime(analise: AnaliseVaga, preferencias: Preferencias): number {
  if (analise.regime === "nao_informado") return 10;
  return preferencias.regimes.includes(analise.regime) ? 10 : 0;
}

/**
 * Score de aderência (0 a 100): cobertura de requisitos (60), senioridade (15), modelo e localidade (15)
 * e regime (10). Vaga afirmativa exclusiva fora dos grupos do perfil elimina (score 0) quando o perfil
 * informa os dados necessários; sem dados, gera alerta e não elimina.
 */
export function calcularAderencia(
  analise: AnaliseVaga,
  preferencias: Preferencias,
  diversidade: Diversidade | undefined,
  dataNascimento: string | undefined,
  hoje: string,
): ResultadoAderencia {
  const detalhes: DetalhesAderencia = {
    cobertura: pontosCobertura(analise),
    senioridade: pontosSenioridade(analise, preferencias),
    modeloLocalidade: pontosModelo(analise, preferencias),
    regime: pontosRegime(analise, preferencias),
  };
  const score =
    detalhes.cobertura + detalhes.senioridade + detalhes.modeloLocalidade + detalhes.regime;

  if (analise.afirmativa.exclusiva && analise.afirmativa.grupos.length > 0) {
    const grupos = gruposDoPerfil(diversidade, dataNascimento, hoje);
    const elegivel = analise.afirmativa.grupos.some((g) => grupos.has(g));
    if (!elegivel) {
      const informado = analise.afirmativa.grupos.every((g) =>
        perfilInformaGrupo(g, diversidade, dataNascimento),
      );
      if (informado)
        return { score: 0, detalhes, eliminacao: "afirmativa_inelegivel", alertas: [] };
      return { score, detalhes, alertas: [ALERTA_AFIRMATIVA] };
    }
  }
  return { score, detalhes, alertas: [] };
}

/** Marca como cobertos os requisitos cujo termo normalizado o usuário confirmou ter (gap respondido "sim"). */
export function recalcularComGaps(
  analise: AnaliseVaga,
  termosSim: ReadonlySet<string>,
): AnaliseVaga {
  return {
    ...analise,
    requisitos: analise.requisitos.map((r) =>
      termosSim.has(normalizarTexto(r.termo)) ? { ...r, status: "coberto" } : r,
    ),
  };
}

import type { Regime } from "../analise/analise-vaga.ts";
import type { TabelaSalario } from "./perfil.ts";

export interface PedidoSalario {
  readonly regime: Regime | "nao_informado";
  readonly periodo: "mensal" | "anual";
  readonly moeda: "BRL" | "USD";
}

/** Regime efetivo: o informado ou, se ausente, o primeiro das preferências (com confiança baixa). */
export function resolverRegime(
  regime: Regime | "nao_informado",
  regimesPreferidos: readonly Regime[],
): { regime: Regime; confianca: "alta" | "baixa" } {
  if (regime !== "nao_informado") return { regime, confianca: "alta" };
  return { regime: regimesPreferidos[0] ?? "clt", confianca: "baixa" };
}

/**
 * Pretensão salarial calculada pela tabela do perfil. CLT anual considera 13 salários; PJ anual, 12.
 * Contractor ou moeda USD usam `usd_anual`.
 */
export function calcularSalario(
  pedido: { regime: Regime; periodo: "mensal" | "anual"; moeda: "BRL" | "USD" },
  salario: TabelaSalario,
): number {
  if (pedido.moeda === "USD" || pedido.regime === "contractor") {
    return pedido.periodo === "anual" ? salario.usd_anual : Math.round(salario.usd_anual / 12);
  }
  if (pedido.regime === "clt") {
    return pedido.periodo === "anual" ? salario.clt_brl_mensal * 13 : salario.clt_brl_mensal;
  }
  return pedido.periodo === "anual" ? salario.pj_brl_mensal * 12 : salario.pj_brl_mensal;
}

interface Faixa {
  readonly opcao: string;
  readonly min: number;
  readonly max: number;
}

const NUMERO = /(\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,](\d{1,2}))?\s*(k|mil)?\b/gi;

function numerosDe(texto: string): number[] {
  const valores: number[] = [];
  for (const m of texto.matchAll(NUMERO)) {
    const inteiro = Number((m[1] ?? "0").replace(/[.,]/g, ""));
    const multiplicador = m[3] ? 1000 : 1;
    valores.push(inteiro * multiplicador);
  }
  return valores;
}

function interpretarFaixa(opcao: string): Faixa | null {
  const texto = opcao.toLowerCase();
  const numeros = numerosDe(texto);
  const [primeiro, segundo] = numeros;
  if (primeiro === undefined) return null;
  if (/at[eé]|up to|less than|menos de|abaixo de/.test(texto))
    return { opcao, min: 0, max: primeiro };
  if (/acima de|mais de|a partir de|above|over|more than|\+/.test(texto) && segundo === undefined) {
    return { opcao, min: primeiro, max: Number.POSITIVE_INFINITY };
  }
  if (segundo !== undefined)
    return { opcao, min: Math.min(primeiro, segundo), max: Math.max(primeiro, segundo) };
  return { opcao, min: primeiro, max: primeiro };
}

/**
 * Escolhe, entre opções de faixa salarial, a que contém o valor; sem nenhuma, a mais próxima acima
 * (ou a mais alta). Devolve `null` se nenhuma opção tiver números.
 */
export function escolherFaixa(opcoes: readonly string[], valor: number): string | null {
  const faixas = opcoes.map(interpretarFaixa).filter((f): f is Faixa => f !== null);
  if (faixas.length === 0) return null;
  const contem = faixas.find((f) => valor >= f.min && valor <= f.max);
  if (contem) return contem.opcao;
  const acima = faixas.filter((f) => f.min > valor).sort((a, b) => a.min - b.min)[0];
  if (acima) return acima.opcao;
  return [...faixas].sort((a, b) => b.max - a.max)[0]?.opcao ?? null;
}

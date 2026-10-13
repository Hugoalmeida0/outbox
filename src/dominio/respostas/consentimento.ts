import type { Campo } from "./campo.ts";

const AFIRMATIVO = /^(sim|yes)\b|aceito|concordo|i agree|consinto|i consent|autorizo/i;
const NEGATIVO = /^(nao|não|no)\b|do not|don't|nao aceito|não aceito|recuso|decline/i;

/**
 * Consentimento: o obrigatório (ex.: política de privacidade) é aceito; os opcionais (marketing, futuras
 * vagas, SMS) ficam recusados, minimizando o compartilhamento de dados. Decidido por código, sem LLM.
 */
export function respostaConsentimento(campo: Pick<Campo, "tipo" | "obrigatorio" | "opcoes">): {
  valor: string | null;
  confianca: "alta" | "baixa";
} {
  if (campo.tipo === "checkbox" && (campo.opcoes ?? []).length <= 1) {
    return { valor: campo.obrigatorio ? "Sim" : "Não", confianca: "alta" };
  }
  const opcoes = campo.opcoes ?? [];
  const alvo = campo.obrigatorio ? AFIRMATIVO : NEGATIVO;
  const escolhida = opcoes.find((o) => alvo.test(o.trim()));
  return escolhida ? { valor: escolhida, confianca: "alta" } : { valor: null, confianca: "baixa" };
}

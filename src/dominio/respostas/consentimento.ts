import type { Campo } from "./campo.ts";
import type { Consentimentos, TipoConsentimento } from "./perfil.ts";

const AFIRMATIVO =
  /^(sim|yes|ok)\b|aceito|concordo|i agree|consinto|i consent|autorizo|acknowledge|i understand|estou ciente/i;
const NEGATIVO =
  /^(nao|não|no)\b|do not|don't|disagree|nao aceito|não aceito|nao concordo|não concordo|recuso|decline/i;

/**
 * Se o candidato aceita este consentimento: o tratamento de dados obrigatório é sempre aceito (sem ele não
 * há candidatura); os demais seguem `perfil.consentimentos`, e a chave ausente é aceitar.
 */
export function aceitaConsentimento(
  tipo: TipoConsentimento,
  obrigatorio: boolean,
  consentimentos: Consentimentos,
): boolean {
  if (tipo === "tratamentoDados" && obrigatorio) return true;
  return consentimentos[tipo] ?? true;
}

/**
 * Consentimento decidido por código, sem LLM, conforme as preferências do perfil. Sem opção afirmativa ou
 * negativa reconhecível, devolve `null` (o campo vira pergunta para o LLM).
 */
export function respostaConsentimento(
  campo: Pick<Campo, "tipo" | "obrigatorio" | "opcoes">,
  tipo: TipoConsentimento,
  consentimentos: Consentimentos,
): { valor: string | null; confianca: "alta" | "baixa" } {
  const aceitar = aceitaConsentimento(tipo, campo.obrigatorio, consentimentos);
  if (campo.tipo === "checkbox" && (campo.opcoes ?? []).length <= 1) {
    return { valor: aceitar ? "Sim" : "Não", confianca: "alta" };
  }
  const opcoes = (campo.opcoes ?? []).map((o) => o.trim());
  // "Não. Eu não concordo…" contém "concordo": a negativa é excluída antes de procurar a afirmativa.
  const escolhida = aceitar
    ? opcoes.find((o) => AFIRMATIVO.test(o) && !NEGATIVO.test(o))
    : opcoes.find((o) => NEGATIVO.test(o));
  return escolhida ? { valor: escolhida, confianca: "alta" } : { valor: null, confianca: "baixa" };
}

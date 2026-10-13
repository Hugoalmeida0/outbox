import { escaparRegex } from "../compartilhado/texto.ts";

/** Substitui, sem diferenciar maiúsculas e minúsculas, cada item de PII por `[REDACTED]`. */
export function redigirPii(texto: string, pii: readonly string[]): string {
  let resultado = texto;
  for (const item of pii) {
    if (item.length === 0) continue;
    resultado = resultado.replace(new RegExp(escaparRegex(item), "gi"), "[REDACTED]");
  }
  return resultado;
}

/**
 * Remove de um HTML tudo o que pode carregar dado pessoal antes de versioná-lo em `falhas/` ou em
 * fixtures: scripts, valores de inputs, seleções, conteúdo de textarea e de áreas editáveis, e PII.
 */
export function sanitizarHtml(html: string, pii: readonly string[]): string {
  const semScripts = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi, "");
  const semValores = semScripts
    .replace(/<input\b[^>]*>/gi, (tag) =>
      tag
        .replace(/\svalue\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
        .replace(/\schecked(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/gi, ""),
    )
    .replace(/<option\b[^>]*>/gi, (tag) =>
      tag.replace(/\sselected(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/gi, ""),
    )
    .replace(/(<textarea\b[^>]*>)[\s\S]*?(<\/textarea\s*>)/gi, "$1$2")
    .replace(/(<(\w+)\b[^>]*\scontenteditable\b[^>]*>)[\s\S]*?(<\/\2\s*>)/gi, "$1$3");
  return redigirPii(semValores, pii);
}

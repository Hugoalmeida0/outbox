import { CommanderError } from "commander";
import { ErroCamaleao, ErroUsuario } from "#dominio/compartilhado/erros.ts";

/** Códigos de saída da CLI (arquitetura.md §10.1). */
export const CODIGOS_SAIDA = { sucesso: 0, erro: 1, usoInvalido: 2, interrompido: 130 } as const;

/** Ctrl+C dentro de um prompt do inquirer, ou prompt abortado pelo sinal. */
export function ehInterrupcao(erro: unknown): boolean {
  return (
    erro instanceof Error && (erro.name === "ExitPromptError" || erro.name === "AbortPromptError")
  );
}

export function codigoDoErro(erro: unknown): number {
  if (erro instanceof CommanderError) {
    return erro.exitCode === 0 ? CODIGOS_SAIDA.sucesso : CODIGOS_SAIDA.usoInvalido;
  }
  if (ehInterrupcao(erro)) return CODIGOS_SAIDA.interrompido;
  if (erro instanceof ErroUsuario) return CODIGOS_SAIDA.usoInvalido;
  return CODIGOS_SAIDA.erro;
}

/** Erro previsto: mostra a mensagem e não precisa de stack. */
export function ehErroPrevisto(erro: unknown): boolean {
  return erro instanceof ErroCamaleao || erro instanceof CommanderError || ehInterrupcao(erro);
}

/** Mensagem curta para o terminal; `null` quando o commander já escreveu a sua. */
export function mensagemDoErro(erro: unknown): string | null {
  if (erro instanceof CommanderError) return null;
  if (ehInterrupcao(erro)) return "interrompido";
  if (erro instanceof ErroCamaleao) return erro.message;
  const detalhe = erro instanceof Error ? `: ${erro.message}` : "";
  return `erro inesperado${detalhe} (stack em dados/logs/)`;
}

export type ContextoLog = Readonly<Record<string, unknown>>;

/** Log estruturado com redação obrigatória de PII (ADR-014). */
export interface Registrador {
  depurar(mensagem: string, contexto?: ContextoLog): void;
  informar(mensagem: string, contexto?: ContextoLog): void;
  avisar(mensagem: string, contexto?: ContextoLog): void;
  erro(mensagem: string, contexto?: ContextoLog): void;
}

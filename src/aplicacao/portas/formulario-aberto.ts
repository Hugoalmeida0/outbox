export interface ValorLido {
  readonly rotulo: string;
  readonly valor: string;
  readonly ehArquivo: boolean;
}

export type DesfechoEnvio = "enviada" | "pendente_teste" | "nao_confirmada" | "indeterminada";

/** Handle de um formulário preenchido e ainda não enviado, comum a conector e agente (ADR-010). */
export interface FormularioAberto {
  readonly rota: "conector" | "agente";
  urlAtual(): string;
  capturarTela(destino: string): Promise<void>;
  /** HTML bruto da página; a aplicação sanitiza antes de registrar. */
  capturarHtml(): Promise<string>;
  lerValores(): Promise<ValorLido[]>;
  enviar(): Promise<void>;
  confirmarEnvio(timeoutMs: number): Promise<DesfechoEnvio>;
  /** Fecha a aba. Idempotente. */
  fechar(): Promise<void>;
}

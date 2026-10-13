/** Parâmetros de comportamento que a aplicação recebe da composição (vindos de `config.yaml`). */
export interface ConfigAplicacao {
  readonly scoreMinimo: number;
  readonly paralelo: number;
  readonly maxTentativas: number;
  readonly gupyAnexoPorCandidatura: boolean;
  readonly agenteMaxTurnos: number;
  readonly agenteTimeoutMin: number;
  readonly cartaMaxPalavras: number;
}

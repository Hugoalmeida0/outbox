/** Credenciais geradas por tenant (interface interna da infra, usada por conectores e pelo MCP). */
export interface Credencial {
  readonly email: string;
  readonly senha: string;
  readonly recemCriada: boolean;
}

export interface CofreCredenciais {
  /** Devolve a credencial do tenant (hostname), gerando uma senha forte na primeira vez. */
  obterOuCriar(tenant: string): Credencial;
}

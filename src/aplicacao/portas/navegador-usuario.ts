/** Navegador dedicado do Outbox, para logins manuais. */
export interface NavegadorUsuario {
  abrirParaLogin(): Promise<void>;
}

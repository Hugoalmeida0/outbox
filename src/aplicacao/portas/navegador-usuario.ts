/** Navegador dedicado do Camaleão, para logins manuais. */
export interface NavegadorUsuario {
  abrirParaLogin(): Promise<void>;
}

import type { NavegadorUsuario } from "../portas/navegador-usuario.ts";

/** Abre o navegador do Camaleão para logins manuais (Gupy, LinkedIn etc.). */
export async function abrirNavegador(deps: {
  readonly navegador: NavegadorUsuario;
}): Promise<void> {
  await deps.navegador.abrirParaLogin();
}

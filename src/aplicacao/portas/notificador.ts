/** Notificação fora do terminal (toast). Nunca lança: falhas viram aviso no log. */
export interface Notificador {
  notificar(titulo: string, mensagem: string): void;
}

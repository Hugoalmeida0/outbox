import type { Notificador } from "#aplicacao/portas/notificador.ts";
import type { Registrador } from "#aplicacao/portas/registrador.ts";

export interface MotorToast {
  notify(
    opcoes: { title: string; message: string; appID?: string },
    retorno?: (erro: Error | null) => void,
  ): unknown;
}

/** Toast do Windows via `node-notifier` (importado sob demanda). Nunca lança: falhas viram aviso no log. */
export class NotificadorWindows implements Notificador {
  private readonly ativo: boolean;
  private readonly registrador: Registrador;
  private readonly carregarMotor: () => Promise<MotorToast>;

  constructor(
    ativo: boolean,
    registrador: Registrador,
    carregarMotor: () => Promise<MotorToast> = async () => {
      const modulo = (await import("node-notifier")) as unknown as { default: MotorToast };
      return modulo.default;
    },
  ) {
    this.ativo = ativo;
    this.registrador = registrador;
    this.carregarMotor = carregarMotor;
  }

  notificar(titulo: string, mensagem: string): void {
    if (!this.ativo) return;
    void this.carregarMotor()
      .then((motor) => {
        motor.notify({ title: titulo, message: mensagem, appID: "Camaleão" }, (erro) => {
          if (erro) this.registrador.avisar("falha ao exibir notificação", { erro: erro.message });
        });
      })
      .catch((erro: unknown) => {
        this.registrador.avisar("notificação indisponível", { erro: (erro as Error).message });
      });
  }
}

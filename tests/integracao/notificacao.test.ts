import { describe, expect, it } from "vitest";
import { NotificadorWindows, type MotorToast } from "#infra/notificacao/notificador-windows.ts";
import { RegistradorMemoria } from "#testes/apoio/fakes/basicos.ts";

const aguardar = () => new Promise((r) => setTimeout(r, 20));

describe("NotificadorWindows", () => {
  it("emite o toast com appID Outbox quando ativo", async () => {
    const enviados: unknown[] = [];
    const motor: MotorToast = { notify: (o, cb) => (enviados.push(o), cb?.(null)) };
    new NotificadorWindows(true, new RegistradorMemoria(), () => Promise.resolve(motor)).notificar(
      "Outbox",
      "pronto",
    );
    await aguardar();
    expect(enviados).toEqual([{ title: "Outbox", message: "pronto", appID: "Outbox" }]);
  });

  it("não faz nada quando desativado e transforma falhas em aviso", async () => {
    const registrador = new RegistradorMemoria();
    let chamado = false;
    new NotificadorWindows(
      false,
      registrador,
      () => ((chamado = true), Promise.reject(new Error("x"))),
    ).notificar("a", "b");
    await aguardar();
    expect(chamado).toBe(false);
    new NotificadorWindows(true, registrador, () =>
      Promise.reject(new Error("sem node-notifier")),
    ).notificar("a", "b");
    const comErro: MotorToast = { notify: (_o, cb) => cb?.(new Error("toast falhou")) };
    new NotificadorWindows(true, registrador, () => Promise.resolve(comErro)).notificar("a", "b");
    await aguardar();
    expect(registrador.entradas.map((e) => e.nivel)).toEqual(["avisar", "avisar"]);
  });
});

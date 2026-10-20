// Suíte de contrato de FormularioAberto: conector e agente devem se comportar igual (LSP, ADR-010).
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FormularioAberto } from "#aplicacao/portas/formulario-aberto.ts";

export function descreverContratoFormulario(
  nome: string,
  criar: () => Promise<{ formulario: FormularioAberto; encerrar: () => Promise<void> }>,
): void {
  describe(`contrato de FormularioAberto: ${nome}`, () => {
    let formulario: FormularioAberto;
    let encerrar: () => Promise<void> = () => Promise.resolve();

    beforeAll(async () => {
      const criado = await criar();
      formulario = criado.formulario;
      encerrar = criado.encerrar;
    });
    afterAll(() => encerrar());

    it("informa rota e URL atual", () => {
      expect(["conector", "agente"]).toContain(formulario.rota);
      expect(formulario.urlAtual()).toMatch(/^https?:/);
    });

    it("captura tela e HTML", async () => {
      const destino = join(mkdtempSync(join(tmpdir(), "camaleao-tela-")), "sub", "antes-envio.png");
      await formulario.capturarTela(destino);
      expect(existsSync(destino)).toBe(true);
      expect(await formulario.capturarHtml()).toContain("<html");
    });

    it("lê valores como lista de rótulo/valor", async () => {
      const valores = await formulario.lerValores();
      expect(Array.isArray(valores)).toBe(true);
      for (const v of valores) expect(typeof v.rotulo).toBe("string");
    });

    it("fecha de forma idempotente", async () => {
      await formulario.fechar();
      await expect(formulario.fechar()).resolves.toBeUndefined();
    });
  });
}

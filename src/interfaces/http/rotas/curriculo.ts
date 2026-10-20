import { existsSync } from "node:fs";
import type { Hono } from "hono";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import type { DepsRotas } from "./deps.ts";

/** `GET /curriculo` (o que falta para começar) e `POST /curriculo/abrir-master` (abre no editor). */
export function registrarRotasCurriculo(app: Hono, { container, abrir }: DepsRotas): void {
  app.get("/curriculo", (c) => c.json(container.casos.obterEstadoCurriculo()));

  app.post("/curriculo/abrir-master", async (c) => {
    const { master } = container.caminhos;
    if (!existsSync(master)) {
      throw new ErroUsuario("Ainda não há master: importe o seu currículo primeiro.");
    }
    await abrir(master);
    return c.json({ ok: true });
  });
}

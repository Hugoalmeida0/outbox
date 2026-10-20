import type { Hono } from "hono";
import type { DepsRotas } from "./deps.ts";

/** `POST /navegador`: abre o navegador do Camaleão para os logins (LinkedIn, Gupy...). */
export function registrarRotasNavegador(app: Hono, { container }: DepsRotas): void {
  app.post("/navegador", async (c) => {
    await container.casos.abrirNavegador();
    return c.json({ ok: true });
  });
}

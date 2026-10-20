import type { Hono } from "hono";
import { lerJson } from "../entrada.ts";
import type { DepsRotas } from "./deps.ts";

/**
 * `GET /perfil` e `PUT /perfil`. O corpo tem dados sensíveis (documentos, salário, diversidade): ele vai
 * direto ao caso de uso, que valida e grava, e nunca é registrado em log.
 */
export function registrarRotasPerfil(app: Hono, { container }: DepsRotas): void {
  app.get("/perfil", (c) => c.json(container.casos.obterPerfil()));

  app.put("/perfil", async (c) => {
    container.casos.salvarPerfil(await lerJson(c));
    return c.json(container.casos.obterPerfil());
  });
}

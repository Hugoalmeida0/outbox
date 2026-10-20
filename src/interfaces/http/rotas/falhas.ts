import type { Hono } from "hono";
import type { DepsRotas } from "./deps.ts";

/** `GET /falhas`: falhas de conector abertas e motores sem conector. */
export function registrarRotasFalhas(app: Hono, { container }: DepsRotas): void {
  app.get("/falhas", (c) => c.json(container.casos.listarFalhas()));
}

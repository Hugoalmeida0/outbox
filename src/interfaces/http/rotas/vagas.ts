import type { Hono } from "hono";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { esquemaEntradaAdicionar, esquemaEntradaRetorno } from "../contrato.ts";
import { idDaRota, lerJson, validar } from "../entrada.ts";
import type { DepsRotas } from "./deps.ts";

/** `POST /vagas` (adicionar) e `POST /vagas/:id/retorno`. */
export function registrarRotasVagas(app: Hono, { container }: DepsRotas): void {
  app.post("/vagas", async (c) => {
    const { urls } = validar(esquemaEntradaAdicionar, await lerJson(c));
    return c.json({ itens: container.casos.adicionarVagas(urls) });
  });

  app.post("/vagas/:id/retorno", async (c) => {
    const id = idDaRota(c) as IdVaga;
    const { status, etapa, nota } = validar(esquemaEntradaRetorno, await lerJson(c));
    container.casos.registrarRetorno({
      id,
      status,
      ...(etapa ? { etapa } : {}),
      ...(nota ? { nota } : {}),
    });
    return c.json({ ok: true });
  });
}

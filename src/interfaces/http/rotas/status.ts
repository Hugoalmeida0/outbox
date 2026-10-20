import type { Hono } from "hono";
import { z } from "zod";
import type { LinhaStatus } from "#aplicacao/casos-de-uso/listar-status.ts";
import { STATUS } from "#dominio/vagas/status.ts";
import type { LinhaStatusWeb } from "../contrato.ts";
import { validar } from "../entrada.ts";
import type { DepsRotas } from "./deps.ts";

const esquemaFiltro = z.object({
  status: z
    .string()
    .transform((s) => s.trim().toUpperCase())
    .pipe(z.enum(STATUS))
    .optional(),
});

/** `GET /status?status=<STATUS>`: o `camaleao status`, com o PDF de cada vaga como URL de uso único. */
export function registrarRotasStatus(app: Hono, { container, arquivos }: DepsRotas): void {
  const paraWeb = ({ pdf, ...linha }: LinhaStatus): LinhaStatusWeb => ({
    ...linha,
    urlPdf: pdf === undefined ? null : arquivos.assinar(pdf),
  });

  app.get("/status", (c) => {
    const { status } = validar(esquemaFiltro, { status: c.req.query("status") });
    const dados = container.casos.listarStatus(status ? { status } : {});
    return c.json({
      contagens: dados.contagens,
      linhas: dados.linhas.map(paraWeb),
      aguardandoVoce: {
        manuais: dados.aguardandoVoce.manuais.map((m) => ({
          ...paraWeb(m),
          ...(m.destino ? { destino: m.destino } : {}),
        })),
        pendentesTeste: dados.aguardandoVoce.pendentesTeste.map(paraWeb),
      },
    });
  });
}

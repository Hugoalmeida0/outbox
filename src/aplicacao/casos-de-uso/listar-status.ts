import { TODOS_STATUS, type Etapa, type Motivo, type Status } from "#dominio/vagas/status.ts";
import type { Motor } from "#dominio/vagas/motores.ts";
import type { IdVaga, Vaga } from "#dominio/vagas/vaga.ts";
import { esquemaArquivoAnalise } from "../compartilhado/artefatos.ts";
import type { ArmazemArtefatos } from "../portas/armazem-artefatos.ts";
import type { RepositorioVagas } from "../portas/repositorio-vagas.ts";

export interface LinhaStatus {
  readonly id: IdVaga;
  readonly status: Status;
  readonly motivo: Motivo | null;
  readonly etapa: Etapa | null;
  readonly empresa: string | null;
  readonly cargo: string | null;
  readonly canal: Motor;
  readonly motor: Motor;
  readonly aderencia: number | null;
  readonly atsAntes: number | null;
  readonly atsDepois: number | null;
  readonly atualizadaEm: string;
}

export interface DadosStatus {
  readonly contagens: Readonly<Record<Status, number>>;
  readonly linhas: readonly LinhaStatus[];
  readonly aguardandoVoce: {
    readonly manuais: readonly (LinhaStatus & { readonly destino?: string })[];
    readonly pendentesTeste: readonly LinhaStatus[];
  };
}

export interface DepsListarStatus {
  readonly vagas: Pick<RepositorioVagas, "listarPorStatus">;
  readonly artefatos: Pick<ArmazemArtefatos, "lerJson">;
}

function paraLinha(v: Vaga): LinhaStatus {
  return {
    id: v.id,
    status: v.status,
    motivo: v.motivo,
    etapa: v.etapa,
    empresa: v.empresa,
    cargo: v.cargo,
    canal: v.canal,
    motor: v.motor,
    aderencia: v.aderencia,
    atsAntes: v.atsAntes,
    atsDepois: v.atsDepois,
    atualizadaEm: v.atualizadaEm,
  };
}

/** Dados do `outbox status`: contagens, linhas (filtráveis por status) e o que aguarda o usuário. */
export function listarStatus(
  deps: DepsListarStatus,
  entrada: { readonly status?: Status },
): DadosStatus {
  const todas = deps.vagas.listarPorStatus(TODOS_STATUS);
  const contagens = Object.fromEntries(TODOS_STATUS.map((s) => [s, 0])) as Record<Status, number>;
  for (const v of todas) contagens[v.status]++;
  const manuais = todas
    .filter((v) => v.status === "MANUAL")
    .map((v) => {
      const destino =
        v.motivo === "candidatura_por_email"
          ? deps.artefatos.lerJson(v.id, "analise.json", esquemaArquivoAnalise)?.destinoEmail
          : undefined;
      return destino ? { ...paraLinha(v), destino } : paraLinha(v);
    });
  return {
    contagens,
    linhas: todas
      .filter((v) => entrada.status === undefined || v.status === entrada.status)
      .map(paraLinha),
    aguardandoVoce: {
      manuais,
      pendentesTeste: todas.filter((v) => v.status === "PENDENTE_TESTE").map(paraLinha),
    },
  };
}

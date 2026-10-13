import { decidirDeduplicacaoUrl } from "#dominio/vagas/deduplicacao.ts";
import type { Vaga } from "#dominio/vagas/vaga.ts";
import type { RepositorioVagas } from "../portas/repositorio-vagas.ts";
import type { Resolucao, ResolvedorVagas } from "../portas/resolvedor-vagas.ts";

export interface DepsResolverVaga {
  readonly vagas: Pick<
    RepositorioVagas,
    "transacao" | "buscarPorUrlCanonica" | "atualizar" | "transicionar" | "buscar"
  >;
  readonly resolvedor: ResolvedorVagas;
}

export type DesfechoResolucao =
  | { readonly tipo: "resolvida"; readonly vaga: Vaga; readonly resolucao: Resolucao }
  | { readonly tipo: "duplicada" };

/**
 * Resolve a URL até o ATS de destino. Se a canônica mudou e já existe outra vaga com ela (na fila ou já
 * enviada), a atual vira DUPLICADA. Senão, grava motor, URL resolvida, canônica e rota.
 */
export async function resolverVaga(
  deps: DepsResolverVaga,
  vaga: Vaga,
  sinal: AbortSignal,
): Promise<DesfechoResolucao> {
  const resolucao = await deps.resolvedor.resolver(vaga.urlCanonica, vaga.motor, sinal);
  return deps.vagas.transacao((): DesfechoResolucao => {
    if (resolucao.canonica !== vaga.urlCanonica) {
      const existente = deps.vagas.buscarPorUrlCanonica(resolucao.canonica);
      if (existente && existente.id !== vaga.id) {
        const acao = decidirDeduplicacaoUrl(existente);
        if (acao.tipo === "ignorar_na_fila") {
          deps.vagas.transicionar(vaga.id, "DUPLICADA", {
            motivo: "mesma_vaga_na_fila",
            duplicadaDe: existente.id,
          });
          return { tipo: "duplicada" };
        }
        if (acao.tipo === "criar_duplicada") {
          deps.vagas.transicionar(vaga.id, "DUPLICADA", {
            motivo: "url_ja_enviada",
            duplicadaDe: existente.id,
          });
          return { tipo: "duplicada" };
        }
      }
    }
    deps.vagas.atualizar(vaga.id, {
      motor: resolucao.motor,
      urlResolvida: resolucao.urlResolvida,
      urlCanonica: resolucao.canonica,
      rota: resolucao.rota,
    });
    return { tipo: "resolvida", vaga: deps.vagas.buscar(vaga.id) ?? vaga, resolucao };
  });
}

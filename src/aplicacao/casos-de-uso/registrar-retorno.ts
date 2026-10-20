import { ErroTransicaoInvalida, ErroUsuario } from "#dominio/compartilhado/erros.ts";
import type { Etapa, Status } from "#dominio/vagas/status.ts";
import { TRANSICOES_VALIDAS } from "#dominio/vagas/state-machine/transicoes.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { transicionarVaga } from "../compartilhado/transicionar-vaga.ts";
import type { RepositorioVagas } from "../portas/repositorio-vagas.ts";

export const STATUS_DE_RETORNO = ["EM_PROCESSO", "OFERTA", "RECUSADA", "ENVIADA"] as const;
export type StatusRetorno = (typeof STATUS_DE_RETORNO)[number];

export interface EntradaRegistrarRetorno {
  readonly id: IdVaga;
  readonly status: StatusRetorno;
  readonly etapa?: Etapa;
  readonly nota?: string;
}

/**
 * Registra o retorno de uma candidatura (marcação manual, sem expiração). ENVIADA só vale para vagas
 * MANUAL (aplicadas por conta própria) ou PENDENTE_TESTE (teste concluído).
 */
export function registrarRetorno(
  deps: { readonly vagas: Pick<RepositorioVagas, "transacao" | "buscar" | "gravarTransicao"> },
  entrada: EntradaRegistrarRetorno,
): void {
  const vaga = deps.vagas.buscar(entrada.id);
  if (!vaga) throw new ErroUsuario(`vaga #${String(entrada.id)} não encontrada`);
  const origensEnviada: readonly Status[] = ["MANUAL", "PENDENTE_TESTE"];
  if (entrada.status === "ENVIADA" && !origensEnviada.includes(vaga.status)) {
    const aceitas = TRANSICOES_VALIDAS[vaga.status].filter(
      (s) => s !== "ENVIADA" && (STATUS_DE_RETORNO as readonly Status[]).includes(s),
    );
    throw new ErroTransicaoInvalida(
      vaga.status,
      "ENVIADA",
      aceitas,
      "ENVIADA só vale a partir de MANUAL ou PENDENTE_TESTE",
    );
  }
  transicionarVaga(deps.vagas, entrada.id, entrada.status, {
    ...(entrada.etapa ? { etapa: entrada.etapa } : {}),
    ...(entrada.nota ? { nota: entrada.nota } : {}),
  });
}

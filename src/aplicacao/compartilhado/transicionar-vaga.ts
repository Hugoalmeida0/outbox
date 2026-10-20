import { transicionar, type OpcoesTransicaoVaga } from "#dominio/vagas/state-machine/transicoes.ts";
import type { Status } from "#dominio/vagas/status.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { ErroInfra } from "../portas/erros.ts";
import type { RepositorioVagas } from "../portas/repositorio-vagas.ts";

export type RepositorioTransicao = Pick<
  RepositorioVagas,
  "transacao" | "buscar" | "gravarTransicao"
>;

/**
 * Muda o status da vaga: lê o status atual, aplica a máquina de estados do domínio e grava status e
 * evento numa só transação. Lança `ErroTransicaoInvalida` se o domínio recusar.
 */
export function transicionarVaga(
  vagas: RepositorioTransicao,
  id: IdVaga,
  para: Status,
  opcoes?: OpcoesTransicaoVaga,
): void {
  vagas.transacao(() => {
    const atual = vagas.buscar(id);
    if (!atual) throw new ErroInfra(`vaga #${String(id)} não encontrada`);
    vagas.gravarTransicao(id, transicionar(atual, para, opcoes));
  });
}

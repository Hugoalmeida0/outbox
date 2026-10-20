import { ErroValidacao } from "#dominio/compartilhado/erros.ts";
import { reiniciarTentativasPreparo } from "#dominio/vagas/atualizacoes.ts";
import { decidirDeduplicacaoUrl } from "#dominio/vagas/deduplicacao.ts";
import { canonizar } from "#dominio/vagas/motores.ts";
import type { Status } from "#dominio/vagas/status.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { transicionarVaga } from "../compartilhado/transicionar-vaga.ts";
import type { RepositorioVagas } from "../portas/repositorio-vagas.ts";

export type ResultadoAdicao =
  "adicionada" | "ja_na_fila" | "duplicada" | "reaberta" | "ignorada" | "invalida";

export interface ItemAdicao {
  readonly url: string;
  readonly resultado: ResultadoAdicao;
  readonly id?: IdVaga;
  readonly status?: Status;
  readonly detalhe?: string;
}

export interface DepsAdicionarVagas {
  readonly vagas: Pick<
    RepositorioVagas,
    "transacao" | "buscarPorUrlCanonica" | "inserir" | "buscar" | "gravarTransicao" | "atualizar"
  >;
}

/** Canoniza cada URL e aplica a deduplicação por URL (decisão no domínio, execução numa transação). */
export function adicionarVagas(
  deps: DepsAdicionarVagas,
  entrada: { readonly urls: readonly string[] },
): ItemAdicao[] {
  return entrada.urls.map((url): ItemAdicao => {
    let canonizada: ReturnType<typeof canonizar>;
    try {
      canonizada = canonizar(url);
    } catch (erro) {
      if (erro instanceof ErroValidacao)
        return { url, resultado: "invalida", detalhe: erro.detalhe };
      throw erro;
    }
    const { canonica, motor } = canonizada;
    return deps.vagas.transacao((): ItemAdicao => {
      const acao = decidirDeduplicacaoUrl(deps.vagas.buscarPorUrlCanonica(canonica));
      switch (acao.tipo) {
        case "criar": {
          const vaga = deps.vagas.inserir({
            urlOriginal: url,
            canal: motor,
            urlCanonica: canonica,
            motor,
            status: "NOVA",
          });
          return { url, resultado: "adicionada", id: vaga.id };
        }
        case "ignorar_na_fila":
          return { url, resultado: "ja_na_fila", id: acao.id };
        case "criar_duplicada": {
          const vaga = deps.vagas.inserir({
            urlOriginal: url,
            canal: motor,
            urlCanonica: canonica,
            motor,
            status: "DUPLICADA",
            motivo: "url_ja_enviada",
            duplicadaDe: acao.duplicadaDe,
          });
          return { url, resultado: "duplicada", id: vaga.id };
        }
        case "reabrir":
          transicionarVaga(deps.vagas, acao.id, "NOVA");
          deps.vagas.atualizar(acao.id, reiniciarTentativasPreparo());
          return { url, resultado: "reaberta", id: acao.id };
        case "ignorar_status":
          return { url, resultado: "ignorada", id: acao.id, status: acao.status };
      }
    });
  });
}

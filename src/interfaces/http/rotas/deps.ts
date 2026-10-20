import type { Container } from "#composicao";
import type { AssinadorArquivos } from "../arquivos.ts";
import type { GerenciadorExecucoes } from "../execucoes.ts";

/** O que as rotas usam: casos de uso pela composição, execuções em memória e URLs de arquivo. */
export interface DepsRotas {
  readonly container: Pick<
    Container,
    "casos" | "caminhos" | "adquirirTrava" | "registrarErro" | "registrador"
  >;
  readonly execucoes: GerenciadorExecucoes;
  readonly arquivos: AssinadorArquivos;
  /** Abre um arquivo no programa padrão do sistema (padrão: pacote `open`, carregado sob demanda). */
  readonly abrir: (caminho: string) => Promise<unknown>;
}

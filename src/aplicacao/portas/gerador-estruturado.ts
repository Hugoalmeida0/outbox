import type { ZodType } from "zod";

export const TAREFAS_LLM = [
  "importar-curriculo",
  "extrair-vaga",
  "analisar-vaga",
  "tailoring",
  "responder-perguntas",
] as const;
export type TarefaLlm = (typeof TAREFAS_LLM)[number];

export interface PedidoGeracao<T> {
  readonly tarefa: TarefaLlm;
  /** Variáveis confiáveis do prompt (`{{chave}}`). */
  readonly variaveis: Readonly<Record<string, string>>;
  /** Conteúdo externo, envolvido em `<conteudo_nao_confiavel>` (fronteira de confiança, ADR-012). */
  readonly conteudoNaoConfiavel?: Readonly<Record<string, string>>;
  readonly schema: ZodType<T>;
  /** Caminhos absolutos de arquivos que o modelo pode ler (ex.: PDF no `importar`). */
  readonly arquivosLeitura?: readonly string[];
  /** Pasta onde gravar o log da chamada. */
  readonly pastaLog?: string;
}

/**
 * Executa uma tarefa de LLM e devolve um objeto validado pelo schema.
 * Lança `ErroLimiteUso`, `ErroTimeoutLlm` ou `ErroLlm`.
 */
export interface GeradorEstruturado {
  gerar<T>(pedido: PedidoGeracao<T>, sinal: AbortSignal): Promise<T>;
}

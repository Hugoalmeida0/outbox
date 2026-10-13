/** O que a CLI usa do `process` para sinais (injetável nos testes). */
export interface AlvoSinais {
  on(evento: "SIGINT", ouvinte: () => void): unknown;
  off(evento: "SIGINT", ouvinte: () => void): unknown;
}

/**
 * Ctrl+C cooperativo (ADR-016): o primeiro aborta o `AbortController` e avisa; o segundo força a saída
 * com 130. Devolve a função que remove o ouvinte.
 */
export function instalarSinais(
  controle: AbortController,
  avisar: (mensagem: string) => void,
  sair: (codigo: number) => void,
  alvo: AlvoSinais = process,
): () => void {
  const ouvinte = (): void => {
    if (controle.signal.aborted) {
      sair(130);
      return;
    }
    controle.abort();
    avisar("encerrando… (Ctrl+C de novo para forçar)");
  };
  alvo.on("SIGINT", ouvinte);
  return () => {
    alvo.off("SIGINT", ouvinte);
  };
}

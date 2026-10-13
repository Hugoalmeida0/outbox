import { ErroLimiteUso } from "../portas/erros.ts";

/**
 * Processa `itens` com no máximo `limite` execuções simultâneas. Para de iniciar novos itens quando o
 * sinal aborta ou quando algum item lança `ErroLimiteUso`, que é relançado depois de aguardar os em
 * andamento. Os demais erros são responsabilidade de `fn`.
 */
export async function executarComLimite<T>(
  itens: readonly T[],
  limite: number,
  fn: (item: T, sinal: AbortSignal) => Promise<void>,
  sinal: AbortSignal,
): Promise<void> {
  const estado: { proximo: number; limiteAtingido: ErroLimiteUso | null } = {
    proximo: 0,
    limiteAtingido: null,
  };

  const trabalhador = async (): Promise<void> => {
    while (!sinal.aborted && estado.limiteAtingido === null) {
      const indice = estado.proximo++;
      if (indice >= itens.length) return;
      try {
        await fn(itens[indice] as T, sinal);
      } catch (erro) {
        if (erro instanceof ErroLimiteUso) {
          estado.limiteAtingido = erro;
          return;
        }
        throw erro;
      }
    }
  };

  const quantidade = Math.max(1, Math.min(limite, itens.length));
  await Promise.all(Array.from({ length: quantidade }, trabalhador));
  if (estado.limiteAtingido !== null) throw estado.limiteAtingido;
}

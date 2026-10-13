import type { ItemAdicao, ResultadoAdicao } from "#aplicacao/casos-de-uso/adicionar-vagas.ts";
import { formatarTabela } from "./tabela.ts";

const ROTULOS: Readonly<Record<ResultadoAdicao, string>> = {
  adicionada: "adicionada",
  ja_na_fila: "já na fila",
  duplicada: "duplicada",
  reaberta: "reaberta",
  ignorada: "ignorada",
  invalida: "inválida",
};

/** Resultado do `outbox adicionar`: uma linha por URL e o total por resultado. */
export function formatarAdicao(itens: readonly ItemAdicao[]): string {
  const tabela = formatarTabela(
    ["RESULTADO", "ID", "URL", "DETALHE"],
    itens.map((i) => [
      ROTULOS[i.resultado],
      i.id === undefined ? "-" : String(i.id),
      i.url,
      i.detalhe ?? (i.status ? `status ${i.status}` : ""),
    ]),
  );
  const totais = (Object.keys(ROTULOS) as ResultadoAdicao[])
    .map((r) => [r, itens.filter((i) => i.resultado === r).length] as const)
    .filter(([, n]) => n > 0)
    .map(([r, n]) => `${ROTULOS[r]} ${String(n)}`)
    .join(" · ");
  return `${tabela}\n\n${totais}`;
}

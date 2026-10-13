import type { DadosFalhas } from "#aplicacao/casos-de-uso/listar-falhas.ts";
import { cores } from "./cores.ts";
import { dataHora, formatarTabela, truncar } from "./tabela.ts";

/** Saída do `outbox falhas`: falhas de conector por passo e motores sem conector. */
export function formatarFalhas(dados: DadosFalhas): string {
  if (dados.grupos.length === 0 && dados.semConector.length === 0)
    return "Nenhuma falha aberta em falhas/.";
  const partes: string[] = [];
  if (dados.grupos.length > 0) {
    const total = dados.grupos.reduce((soma, g) => soma + g.quantidade, 0);
    partes.push(
      `${cores.negrito(`Falhas de conector abertas: ${String(total)}`)}\n` +
        formatarTabela(
          ["CONECTOR", "PASSO", "QTD", "MAIS RECENTE", "URL"],
          dados.grupos.map((g) => [
            g.conector,
            truncar(g.passo, 40),
            String(g.quantidade),
            dataHora(g.maisRecente),
            g.urlMaisRecente,
          ]),
        ),
    );
  }
  if (dados.semConector.length > 0) {
    partes.push(
      `${cores.negrito("Vagas preenchidas pelo agente, sem conector:")}\n` +
        formatarTabela(
          ["MOTOR", "QTD"],
          dados.semConector.map((s) => [s.motor, String(s.quantidade)]),
        ),
    );
  }
  partes.push(
    cores.cinza(
      "Detalhes e HTML sanitizado em falhas/. Para corrigir um conector: `npm run capturar-fixture -- <url>`.",
    ),
  );
  return partes.join("\n\n");
}

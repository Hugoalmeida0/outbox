import type { ResumoPreparo } from "#aplicacao/casos-de-uso/preparar-vagas.ts";
import { TODOS_STATUS } from "#dominio/vagas/status.ts";
import { cores } from "./cores.ts";

/** Resumo do `outbox preparar`. */
export function formatarResumoPreparo(resumo: ResumoPreparo): string {
  const linhas: string[] = [];
  if (resumo.reavaliadas > 0) {
    linhas.push(
      `${String(resumo.reavaliadas)} vaga(s) descartada(s) reaberta(s) pelos gaps aprendidos.`,
    );
  }
  if (resumo.processadas === 0 && resumo.interrompido === null) {
    linhas.push("Nenhuma vaga para preparar. Adicione com `outbox adicionar <url>`.");
    return linhas.join("\n");
  }
  linhas.push(cores.negrito(`Preparo: ${String(resumo.processadas)} vaga(s) processada(s)`));
  const contagens = TODOS_STATUS.filter((s) => (resumo.contagens[s] ?? 0) > 0)
    .map((s) => `${s} ${String(resumo.contagens[s] ?? 0)}`)
    .join(" · ");
  if (contagens) linhas.push(`  ${contagens}`);
  if (resumo.erros.length > 0) {
    linhas.push(cores.vermelho("Erros (tentam de novo no próximo `preparar`):"));
    for (const e of resumo.erros) linhas.push(`  #${String(e.id)} ${e.motivo}: ${e.mensagem}`);
  }
  if (resumo.interrompido === "limite") {
    linhas.push(
      cores.amarelo(
        "Limite de uso do Claude atingido: as vagas restantes continuam NOVA. Rode `outbox preparar` mais tarde.",
      ),
    );
  } else if (resumo.interrompido === "cancelado") {
    linhas.push(cores.amarelo("Interrompido: as vagas em andamento continuam no status anterior."));
  }
  const prontas = resumo.contagens.PRONTA ?? 0;
  if (prontas > 0)
    linhas.push(cores.verde(`Próximo passo: \`outbox aplicar\` (${String(prontas)} pronta(s)).`));
  return linhas.join("\n");
}

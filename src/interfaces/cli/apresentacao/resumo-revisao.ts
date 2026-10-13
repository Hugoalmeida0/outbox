import type { ResumoAplicacao } from "#aplicacao/casos-de-uso/aplicar-vagas.ts";
import type { ResumoRevisao } from "#aplicacao/portas/interacao.ts";
import { cores } from "./cores.ts";
import { numero } from "./tabela.ts";

const ROTULOS_DESFECHO: Readonly<Record<string, string>> = {
  enviada: "enviada",
  pendente_teste: "pendente de teste",
  pulada: "pulada",
  manual: "manual",
  manual_automatica: "manual (automático)",
  mantida: "mantida PRONTA",
  sair: "saída",
  erro: "erro",
};

/** Tela de revisão antes do envio (spec T22): contexto, alertas, respostas novas, carta e PDF. */
export function formatarResumoRevisao(r: ResumoRevisao): string {
  const linhas = [
    cores.negrito(`──── Vaga #${String(r.vagaId)}: ${r.empresa} · ${r.cargo} ────`),
    `Motor: ${r.motor} (${r.rota})`,
    `URL: ${r.url}`,
    `Aderência: ${numero(r.aderencia)} · ATS: ${numero(r.atsAntes)} → ${numero(r.atsDepois)}`,
  ];
  if (r.gapsRestantes.length > 0) linhas.push(`Gaps restantes: ${r.gapsRestantes.join(", ")}`);
  if (r.alertas.length > 0) {
    linhas.push(cores.amarelo("Alertas:"));
    for (const a of r.alertas) linhas.push(cores.amarelo(`  ! ${a}`));
  }
  const novas = r.respostas.filter((x) => x.nova);
  const conhecidas = r.respostas.length - novas.length;
  if (novas.length > 0) {
    linhas.push("Respostas novas (confira no navegador):");
    for (const n of novas) linhas.push(`  • ${n.rotulo}: ${n.valor.replace(/\s+/g, " ")}`);
  }
  if (conhecidas > 0)
    linhas.push(cores.cinza(`${String(conhecidas)} resposta(s) já conhecida(s) preenchida(s).`));
  if (r.cartaInicio) {
    linhas.push("Carta (início):");
    for (const l of r.cartaInicio.split("\n")) linhas.push(`  ${l}`);
  }
  linhas.push(`PDF: ${r.caminhoPdf}`);
  linhas.push(cores.cinza("Edite o que quiser direto no navegador antes de escolher."));
  return linhas.join("\n");
}

/** Resumo do `outbox aplicar`. */
export function formatarResumoAplicacao(resumo: ResumoAplicacao): string {
  const desfechos = Object.entries(resumo.desfechos)
    .filter(([, n]) => n > 0)
    .map(([d, n]) => `${ROTULOS_DESFECHO[d] ?? d} ${String(n)}`)
    .join(" · ");
  const linhas = [
    resumo.revisadas === 0 && !desfechos
      ? "Nenhuma vaga revisada."
      : cores.negrito(`Aplicação: ${String(resumo.revisadas)} vaga(s) revisada(s)`) +
        (desfechos ? `  (${desfechos})` : ""),
  ];
  if (resumo.interrompido === "limite") {
    linhas.push(cores.amarelo("Limite de uso do Claude atingido: retome o `aplicar` mais tarde."));
  }
  if (resumo.interrompido === "cancelado") {
    linhas.push(cores.amarelo("Interrompido: nada foi enviado na vaga em andamento."));
  }
  return linhas.join("\n");
}

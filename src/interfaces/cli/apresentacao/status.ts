import type { DadosStatus, LinhaStatus } from "#aplicacao/casos-de-uso/listar-status.ts";
import { TODOS_STATUS, type Status } from "#dominio/vagas/status.ts";
import { cores } from "./cores.ts";
import { dataHora, formatarTabela, numero, truncar } from "./tabela.ts";

function ats(linha: LinhaStatus): string {
  return linha.atsAntes === null || linha.atsDepois === null
    ? "-"
    : `${String(linha.atsAntes)}→${String(linha.atsDepois)}`;
}

function titulo(linha: LinhaStatus): string {
  return `#${String(linha.id)} ${linha.empresa ?? "(empresa?)"} · ${linha.cargo ?? "(cargo?)"}`;
}

/** Saída do `outbox status`: contagens, tabela e o que aguarda o usuário. */
export function formatarStatus(dados: DadosStatus, filtro?: Status): string {
  const total = TODOS_STATUS.reduce((soma, s) => soma + dados.contagens[s], 0);
  const contagens = TODOS_STATUS.filter((s) => dados.contagens[s] > 0)
    .map((s) => `${s} ${String(dados.contagens[s])}`)
    .join(" · ");
  const partes = [cores.negrito(`Vagas: ${String(total)}`) + (contagens ? `  (${contagens})` : "")];

  if (dados.linhas.length === 0) {
    partes.push(
      filtro
        ? `Nenhuma vaga com status ${filtro}.`
        : "Nenhuma vaga. Adicione com `outbox adicionar <url>`.",
    );
  } else {
    partes.push(
      formatarTabela(
        [
          "ID",
          "STATUS",
          "MOTIVO/ETAPA",
          "EMPRESA",
          "CARGO",
          "CANAL",
          "MOTOR",
          "ADER.",
          "ATS",
          "ATUALIZADA",
        ],
        dados.linhas.map((l) => [
          String(l.id),
          l.status,
          l.motivo ?? l.etapa ?? "-",
          truncar(l.empresa ?? "-", 24),
          truncar(l.cargo ?? "-", 32),
          truncar(l.canal, 20),
          truncar(l.motor, 20),
          numero(l.aderencia),
          ats(l),
          dataHora(l.atualizadaEm),
        ]),
      ),
    );
  }

  const { manuais, pendentesTeste } = dados.aguardandoVoce;
  if (manuais.length > 0 || pendentesTeste.length > 0) {
    const linhas = [cores.amarelo("Aguardando você:")];
    for (const m of manuais) {
      const destino = m.destino ? `: envie para ${m.destino}` : "";
      linhas.push(`  MANUAL          ${titulo(m)} (${m.motivo ?? "-"}${destino})`);
    }
    for (const p of pendentesTeste) {
      linhas.push(
        `  PENDENTE_TESTE  ${titulo(p)}: conclua o teste e rode \`outbox retorno ${String(p.id)} ENVIADA\``,
      );
    }
    partes.push(linhas.join("\n"));
  }
  return partes.join("\n\n");
}

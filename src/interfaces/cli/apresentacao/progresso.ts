import type { EtapaPreparo } from "#aplicacao/portas/progresso-preparo.ts";
import type { Status } from "#dominio/vagas/status.ts";
import type { Vaga } from "#dominio/vagas/vaga.ts";
import { cores } from "./cores.ts";
import { truncar } from "./tabela.ts";

const ETAPAS: Readonly<Record<EtapaPreparo, string>> = {
  resolver: "resolvendo o link",
  extrair: "lendo a vaga",
  analisar: "analisando a aderência",
  gerar_curriculo: "gerando o currículo",
  gerar_carta: "escrevendo a carta",
  responder_campos: "respondendo o formulário",
};

const ICONES: Partial<Readonly<Record<Status, string>>> = {
  PRONTA: cores.verde("✓"),
  MANUAL: cores.amarelo("!"),
  ERRO_PREPARO: cores.vermelho("✗"),
  DESCARTADA: cores.cinza("–"),
  DUPLICADA: cores.cinza("–"),
};

const MAX_ERRO = 100;

type DadosRotulo = Pick<Vaga, "id" | "empresa" | "cargo" | "urlOriginal">;

const GRAFEMAS = new Intl.Segmenter();

/**
 * Colunas que o grafema ocupa, por cima: CJK, emoji e afins contam 2. Na região viva, subestimar quebra a
 * linha e o redesenho passa a deixar restos na tela; superestimar só corta um pouco antes.
 */
function colunasDe(grafema: string): number {
  return (grafema.codePointAt(0) ?? 0) >= 0x2e80 ? 2 : 1;
}

/** Corta o texto para ocupar no máximo `max` colunas, com reticências. */
export function cortarNaLargura(texto: string, max: number): string {
  const caracteres = Array.from(GRAFEMAS.segment(texto), (s) => s.segment);
  if (caracteres.reduce((soma, c) => soma + colunasDe(c), 0) <= max) return texto;
  let usadas = 1;
  let cortado = "";
  for (const c of caracteres) {
    if (usadas + colunasDe(c) > max) break;
    usadas += colunasDe(c);
    cortado += c;
  }
  return `${cortado}…`;
}

/** `42s`, `2m05s` ou `1h03m`. */
export function formatarDuracao(ms: number): string {
  const segundos = Math.max(0, Math.floor(ms / 1000));
  if (segundos < 60) return `${String(segundos)}s`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `${String(minutos)}m${String(segundos % 60).padStart(2, "0")}s`;
  return `${String(Math.floor(minutos / 60))}h${String(minutos % 60).padStart(2, "0")}m`;
}

/** `#3 Acme · Dev Backend`; antes da extração, o host da URL. */
export function rotuloVaga(vaga: DadosRotulo): string {
  const nome = [vaga.empresa, vaga.cargo]
    .map((t) => t?.trim() ?? "")
    .filter((t) => t !== "")
    .join(" · ");
  const host = URL.canParse(vaga.urlOriginal)
    ? new URL(vaga.urlOriginal).host.replace(/^www\./, "")
    : vaga.urlOriginal;
  return `#${String(vaga.id)} ${nome || host}`;
}

/** Primeira linha do `preparar`, que antecipa a demora. */
export function formatarCabecalhoPreparo(total: number, paralelo: number): string {
  const vez = paralelo > 1 ? `, ${String(paralelo)} por vez` : "";
  return `Preparando ${String(total)} vaga(s)${vez}. Cada uma leva alguns minutos (várias chamadas ao Claude).`;
}

/** Linha de uma etapa quando não há região viva (pipe, log). */
export function formatarEtapa(vaga: DadosRotulo, etapa: EtapaPreparo): string {
  return cores.cinza(`  ${rotuloVaga(vaga)}: ${ETAPAS[etapa]}…`);
}

/** Linha animada de uma vaga em andamento; corta o rótulo para caber em `largura` sem quebrar. */
export function formatarEmAndamento(
  quadro: string,
  vaga: DadosRotulo,
  etapa: EtapaPreparo,
  decorridoMs: number,
  largura: number,
): string {
  const sufixo = `: ${ETAPAS[etapa]}… ${formatarDuracao(decorridoMs)}`;
  const rotulo = cortarNaLargura(rotuloVaga(vaga), Math.max(8, largura - 3 - sufixo.length));
  return `${cores.ciano(quadro)} ${cortarNaLargura(`${rotulo}${sufixo}`, largura - 3)}`;
}

/** Última linha da região viva: quantas saíram do lote e o tempo total. */
export function formatarRodape(
  concluidas: number,
  total: number,
  decorridoMs: number,
  largura: number,
): string {
  const texto = `${String(concluidas)} de ${String(total)} concluída(s) · ${formatarDuracao(decorridoMs)} no total`;
  return cores.cinza(cortarNaLargura(`  ${texto}`, largura - 1));
}

/** Linha fixa da vaga que saiu do lote: status, motivo, aderência, erro e quanto levou. */
export function formatarConclusao(
  vaga: DadosRotulo & Pick<Vaga, "status" | "motivo" | "aderencia">,
  erro: string | null,
  duracaoMs: number | null,
): string {
  const icone = ICONES[vaga.status] ?? "·";
  const motivo = vaga.motivo ? ` ${vaga.motivo}` : "";
  // Em erro, a aderência é de uma análise anterior e não descreve a vaga como está agora.
  const aderencia =
    vaga.aderencia === null || vaga.status === "ERRO_PREPARO"
      ? ""
      : `, aderência ${String(vaga.aderencia)}`;
  const detalhe = erro === null ? "" : ` — ${truncar(erro, MAX_ERRO)}`;
  const duracao = duracaoMs === null ? "" : cores.cinza(` (${formatarDuracao(duracaoMs)})`);
  return `${icone} ${rotuloVaga(vaga)}: ${vaga.status}${motivo}${aderencia}${detalhe}${duracao}`;
}

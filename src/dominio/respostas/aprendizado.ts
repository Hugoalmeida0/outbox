import type { BancoRespostas, EntradaBanco, TipoResposta } from "./banco.ts";
import type { TipoCampo } from "./campo.ts";
import type { RespostaSugerida } from "./pacote.ts";

export interface RespostaFinal {
  readonly resposta: RespostaSugerida;
  readonly valorFinal: string;
  readonly editada: boolean;
}

function tipoResposta(tipo: TipoCampo | undefined): TipoResposta {
  switch (tipo) {
    case "select":
    case "radio":
      return "opcao";
    case "checkbox":
      return "sim_nao";
    case "numero":
      return "numero";
    default:
      return "texto";
  }
}

function proximoId(banco: BancoRespostas): string {
  const maior = banco.reduce((max, e) => Math.max(max, Number(e.id.slice(2))), 0);
  return `r-${String(maior + 1).padStart(4, "0")}`;
}

/**
 * Incorpora ao banco as respostas geradas ou editadas na revisão (só perguntas não sensíveis e não
 * específicas da vaga). Devolve um banco novo, sem alterar o recebido.
 */
export function aplicarAprendizado(
  banco: BancoRespostas,
  finais: readonly RespostaFinal[],
  idioma: "pt" | "en",
  hoje: string,
): BancoRespostas {
  let resultado: EntradaBanco[] = banco.map((e) => ({ ...e, variantes: [...e.variantes] }));
  for (const { resposta, valorFinal, editada } of finais) {
    if (resposta.categoria !== "pergunta" || resposta.sensivel || resposta.especificaDaVaga)
      continue;
    if (resposta.fonte !== "gerada" && !editada) continue;
    const idBanco = resposta.fonte.startsWith("banco:")
      ? resposta.fonte.slice("banco:".length)
      : null;
    const existente = idBanco ? resultado.find((e) => e.id === idBanco) : undefined;
    if (existente) {
      resultado = resultado.map((e) =>
        e.id === existente.id
          ? {
              ...e,
              resposta: valorFinal,
              atualizadaEm: hoje,
              variantes:
                e.pergunta === resposta.rotulo || e.variantes.includes(resposta.rotulo)
                  ? e.variantes
                  : [...e.variantes, resposta.rotulo],
            }
          : e,
      );
      continue;
    }
    resultado.push({
      id: proximoId(resultado),
      pergunta: resposta.rotulo,
      variantes: [],
      idioma,
      tipo: tipoResposta(resposta.tipoCampo),
      resposta: valorFinal,
      atualizadaEm: hoje,
    });
  }
  return resultado;
}

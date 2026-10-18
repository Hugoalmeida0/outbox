import { esquemaAnaliseVaga } from "#dominio/analise/analise-vaga.ts";
import { lerChaveGapIdioma } from "#dominio/analise/idiomas.ts";
import { gapsDaAnalise, sanearAnalise } from "#dominio/analise/validar-analise.ts";
import { chaveDedup } from "#dominio/vagas/chave.ts";
import type { VagaExtraida } from "#dominio/vagas/vaga-extraida.ts";
import type { Vaga } from "#dominio/vagas/vaga.ts";
import { esquemaArquivoAnalise, type ArquivoAnalise } from "../compartilhado/artefatos.ts";
import type { ArmazemArtefatos } from "../portas/armazem-artefatos.ts";
import type { ArmazemCurriculo } from "../portas/armazem-curriculo.ts";
import type { GeradorEstruturado } from "../portas/gerador-estruturado.ts";
import type { RepositorioVagas } from "../portas/repositorio-vagas.ts";

export interface DepsAnalisarVaga {
  readonly gerador: GeradorEstruturado;
  readonly curriculo: Pick<ArmazemCurriculo, "lerMaster" | "lerPerfil" | "lerGapsNegados">;
  readonly artefatos: Pick<ArmazemArtefatos, "gravarJson" | "lerJson" | "pastaLlm">;
  readonly vagas: Pick<RepositorioVagas, "atualizar" | "inserirGaps">;
}

/** Lê o `analise.json` da vaga (validado), ou `null`. */
export function lerAnalise(
  artefatos: Pick<ArmazemArtefatos, "lerJson">,
  vaga: Pick<Vaga, "id">,
): ArquivoAnalise | null {
  return artefatos.lerJson(vaga.id, "analise.json", esquemaArquivoAnalise);
}

/** Atualiza campos derivados do `analise.json` sem perder o resto. */
export function atualizarAnalise(
  artefatos: Pick<ArmazemArtefatos, "lerJson" | "gravarJson">,
  vaga: Pick<Vaga, "id">,
  mudar: (atual: ArquivoAnalise) => ArquivoAnalise,
): ArquivoAnalise | null {
  const atual = lerAnalise(artefatos, vaga);
  if (!atual) return null;
  const novo = mudar(atual);
  artefatos.gravarJson(vaga.id, "analise.json", novo);
  return novo;
}

/**
 * Analisa a vaga contra o master (LLM), saneia evidências inválidas, grava `analise.json`, registra os
 * gaps ainda não negados e a chave de deduplicação. A diversidade do perfil nunca vai ao LLM.
 */
export async function analisarVaga(
  deps: DepsAnalisarVaga,
  vaga: Vaga,
  extraida: VagaExtraida,
  sinal: AbortSignal,
): Promise<ArquivoAnalise> {
  const master = deps.curriculo.lerMaster();
  const perfil = deps.curriculo.lerPerfil();
  const negados = deps.curriculo.lerGapsNegados();
  const termosNegados = negados.filter((n) => lerChaveGapIdioma(n) === null);
  const bruta = await deps.gerador.gerar(
    {
      tarefa: "analisar-vaga",
      variaveis: {
        negados: termosNegados.length > 0 ? termosNegados.join(", ") : "nenhum",
        preferencias: JSON.stringify(perfil.preferencias),
        master: JSON.stringify(master),
      },
      conteudoNaoConfiavel: {
        descricao: `${extraida.cargo} — ${extraida.empresa}\n\n${extraida.descricao}`,
      },
      schema: esquemaAnaliseVaga,
      pastaLog: deps.artefatos.pastaLlm(vaga.id),
    },
    sinal,
  );
  const analise: ArquivoAnalise = { ...sanearAnalise(bruta, master), alertas: [] };
  deps.artefatos.gravarJson(vaga.id, "analise.json", analise);
  deps.vagas.inserirGaps(vaga.id, gapsDaAnalise(analise, negados));
  deps.vagas.atualizar(vaga.id, {
    idioma: analise.idioma,
    chaveDedup: chaveDedup(extraida.empresa, extraida.cargo, extraida.localidade),
  });
  return analise;
}

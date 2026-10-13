import {
  esquemaCurriculoGerado,
  type CurriculoGerado,
} from "#dominio/curriculo/curriculo-gerado.ts";
import { montarDocumento, paraTexto } from "#dominio/curriculo/documento.ts";
import { validarLastro, type Violacao } from "#dominio/curriculo/lastro.ts";
import type { IdiomaCurriculo, Master } from "#dominio/curriculo/master.ts";
import { scoreAts } from "#dominio/curriculo/score-ats.ts";
import type { Vaga } from "#dominio/vagas/vaga.ts";
import {
  ALERTA_CAMALEAO_FALHOU,
  ALERTA_PDF_LONGO,
  type ArquivoAnalise,
} from "../compartilhado/artefatos.ts";
import type { ArmazemArtefatos } from "../portas/armazem-artefatos.ts";
import type { ArmazemCurriculo } from "../portas/armazem-curriculo.ts";
import type { GeradorEstruturado } from "../portas/gerador-estruturado.ts";
import type { Relogio } from "../portas/relogio.ts";
import type { RenderizadorDocumentos } from "../portas/renderizador-documentos.ts";
import type { RepositorioVagas } from "../portas/repositorio-vagas.ts";
import { atualizarAnalise } from "./analisar-vaga.ts";

export interface DepsGerarCurriculo {
  readonly gerador: GeradorEstruturado;
  readonly curriculo: Pick<ArmazemCurriculo, "lerMaster">;
  readonly artefatos: Pick<
    ArmazemArtefatos,
    | "caminho"
    | "gravarJson"
    | "gravarTexto"
    | "lerTexto"
    | "lerJson"
    | "lerTextoMaster"
    | "pastaLlm"
  >;
  readonly renderizador: RenderizadorDocumentos;
  readonly vagas: Pick<RepositorioVagas, "atualizar">;
  readonly relogio: Relogio;
}

export interface SaidaGerarCurriculo {
  readonly paginas: number;
  readonly camaleaoFalhou: boolean;
  readonly atsAntes: number | null;
  readonly atsDepois: number | null;
}

/** Anos de experiência somados (meses de todas as experiências, até hoje para a atual). */
export function anosDeExperiencia(master: Master, hoje: string): number {
  const meses = master.experiencias.reduce((total, e) => {
    const [ai, mi] = e.inicio.split("-").map(Number);
    const [af, mf] = (e.fim ?? hoje.slice(0, 7)).split("-").map(Number);
    return total + Math.max(0, ((af ?? 0) - (ai ?? 0)) * 12 + ((mf ?? 0) - (mi ?? 0)));
  }, 0);
  return meses / 12;
}

function descreverViolacoes(violacoes: readonly Violacao[]): string {
  return violacoes.map((v) => `${v.regra}: ${v.detalhe}`).join("; ");
}

/**
 * Gera o currículo camaleão (LLM), valida o lastro com 1 nova tentativa e, se ainda houver violações, usa
 * o master genérico. Renderiza o PDF e calcula o score ATS antes (master genérico) e depois.
 */
export async function gerarCurriculo(
  deps: DepsGerarCurriculo,
  vaga: Vaga,
  analise: ArquivoAnalise,
  sinal: AbortSignal,
): Promise<SaidaGerarCurriculo> {
  const master = deps.curriculo.lerMaster();
  const idioma: IdiomaCurriculo = analise.idioma === "pt" ? "pt" : "en";
  const descricao =
    deps.artefatos.lerTexto(vaga.id, "descricao.md") ?? `${vaga.cargo ?? ""} ${vaga.empresa ?? ""}`;
  const metaPaginas =
    anosDeExperiencia(master, deps.relogio.hoje()) < 5 ? "1 página" : "no máximo 2 páginas";

  const pedir = (correcoes: string): Promise<CurriculoGerado> =>
    deps.gerador.gerar(
      {
        tarefa: "tailoring",
        variaveis: {
          idioma,
          idiomaMaster: master.idioma,
          metaPaginas,
          correcoes,
          analise: JSON.stringify({
            requisitos: analise.requisitos,
            keywords: analise.keywords,
            senioridade: analise.senioridade,
          }),
          master: JSON.stringify(master),
        },
        conteudoNaoConfiavel: { descricao },
        schema: esquemaCurriculoGerado,
        pastaLog: deps.artefatos.pastaLlm(vaga.id),
      },
      sinal,
    );

  let gerado: CurriculoGerado | null = await pedir("nenhuma");
  const violacoes = validarLastro(gerado, master, analise);
  if (violacoes.length > 0) {
    gerado = await pedir(descreverViolacoes(violacoes));
    if (validarLastro(gerado, master, analise).length > 0) gerado = null;
  }

  const documento = montarDocumento(master, gerado, gerado ? idioma : master.idioma);
  const { paginas } = await deps.renderizador.renderizarCurriculo(
    documento,
    deps.artefatos.caminho(vaga.id, "pdf-curriculo"),
    sinal,
  );
  const texto = paraTexto(documento);
  deps.artefatos.gravarTexto(vaga.id, "curriculo.txt", texto);
  deps.artefatos.gravarJson(vaga.id, "curriculo.json", gerado);

  const textoMaster =
    deps.artefatos.lerTextoMaster() ?? paraTexto(montarDocumento(master, null, master.idioma));
  const atsAntes = scoreAts(textoMaster, analise.keywords, master);
  const atsDepois = scoreAts(texto, analise.keywords, master);
  const camaleaoFalhou = gerado === null;
  deps.vagas.atualizar(vaga.id, {
    atsAntes,
    atsDepois,
    camaleaoFalhou: camaleaoFalhou ? "lastro" : null,
  });
  atualizarAnalise(deps.artefatos, vaga, (atual) => ({
    ...atual,
    alertas: [
      ...atual.alertas.filter((a) => a !== ALERTA_PDF_LONGO && a !== ALERTA_CAMALEAO_FALHOU),
      ...(paginas > 2 ? [ALERTA_PDF_LONGO] : []),
      ...(camaleaoFalhou ? [ALERTA_CAMALEAO_FALHOU] : []),
    ],
  }));
  return { paginas, camaleaoFalhou, atsAntes, atsDepois };
}

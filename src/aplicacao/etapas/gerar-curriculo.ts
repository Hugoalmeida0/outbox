import {
  esquemaCurriculoGerado,
  type CurriculoGerado,
} from "#dominio/curriculo/curriculo-gerado.ts";
import {
  montarDocumento,
  paraTexto,
  type DocumentoCurriculo,
} from "#dominio/curriculo/documento.ts";
import { encaixarEmUmaPagina, skillsAderentes } from "#dominio/curriculo/encaixe.ts";
import { validarLastro, type Violacao } from "#dominio/curriculo/lastro.ts";
import type { IdiomaCurriculo, Master } from "#dominio/curriculo/master.ts";
import { aplicarNuncaListar, paraPrompt } from "#dominio/curriculo/nunca-listar.ts";
import { keywordsPerdidas, scoreAts } from "#dominio/curriculo/score-ats.ts";
import { registrarCurriculo } from "#dominio/vagas/atualizacoes.ts";
import type { Vaga } from "#dominio/vagas/vaga.ts";
import {
  ALERTA_ATS_CAIU,
  ALERTA_CAMALEAO_FALHOU,
  ALERTA_PDF_LONGO,
  type ArquivoAnalise,
} from "../compartilhado/artefatos.ts";
import type { ArmazemArtefatos } from "../portas/armazem-artefatos.ts";
import type { ArmazemCurriculo } from "../portas/armazem-curriculo.ts";
import type { GeradorEstruturado } from "../portas/gerador-estruturado.ts";
import type { Registrador } from "../portas/registrador.ts";
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
  readonly registrador: Pick<Registrador, "informar" | "avisar">;
}

export interface SaidaGerarCurriculo {
  readonly paginas: number;
  readonly camaleaoFalhou: boolean;
  readonly atsAntes: number | null;
  readonly atsDepois: number | null;
}

function descreverViolacoes(violacoes: readonly Violacao[]): string {
  return violacoes.map((v) => `${v.regra}: ${v.detalhe}`).join("; ");
}

type PedirTailoring = (correcoes: string, keywordsFaltantes?: string) => Promise<CurriculoGerado>;

/** Pedido de tailoring ao LLM, com a descrição da vaga como conteúdo não confiável. */
function criarPedido(
  deps: DepsGerarCurriculo,
  vaga: Vaga,
  analise: ArquivoAnalise,
  master: Master,
  sinal: AbortSignal,
): PedirTailoring {
  const idioma: IdiomaCurriculo = analise.idioma === "pt" ? "pt" : "en";
  const descricao =
    deps.artefatos.lerTexto(vaga.id, "descricao.md") ?? `${vaga.cargo ?? ""} ${vaga.empresa ?? ""}`;
  const metaPaginas = "1 página";
  return (correcoes, keywordsFaltantes = "nenhuma") =>
    deps.gerador.gerar(
      {
        tarefa: "tailoring",
        variaveis: {
          idioma,
          idiomaMaster: master.idioma,
          metaPaginas,
          correcoes,
          keywordsFaltantes,
          analise: JSON.stringify({
            requisitos: analise.requisitos,
            keywords: analise.keywords,
            senioridade: analise.senioridade,
          }),
          master: JSON.stringify(paraPrompt(master)),
        },
        conteudoNaoConfiavel: { descricao },
        schema: esquemaCurriculoGerado,
        pastaLog: deps.artefatos.pastaLlm(vaga.id),
      },
      sinal,
    );
}

/** Gera e valida o lastro com 1 nova tentativa; `null` quando ainda há violações (usa o master). */
async function gerarComLastro(
  pedir: PedirTailoring,
  master: Master,
  analise: ArquivoAnalise,
): Promise<CurriculoGerado | null> {
  const gerado = await pedir("nenhuma");
  const violacoes = validarLastro(gerado, master, analise);
  if (violacoes.length === 0) return gerado;
  const corrigido = await pedir(descreverViolacoes(violacoes));
  return validarLastro(corrigido, master, analise).length > 0 ? null : corrigido;
}

/**
 * O ajuste não pode deixar o currículo pior no ATS que o genérico: refaz uma vez pedindo as keywords
 * com lastro que se perderam e fica com a versão de maior score.
 */
async function recuperarKeywordsPerdidas(
  pedir: PedirTailoring,
  gerado: CurriculoGerado,
  ats: {
    readonly antes: number;
    readonly textoMaster: string;
    readonly textoDe: (g: CurriculoGerado) => string;
  },
  master: Master,
  analise: ArquivoAnalise,
): Promise<CurriculoGerado> {
  const scoreAtual = scoreAts(ats.textoDe(gerado), analise.keywords, master) ?? 0;
  if (scoreAtual >= ats.antes) return gerado;
  const perdidas = keywordsPerdidas(ats.textoMaster, ats.textoDe(gerado), analise.keywords, master);
  if (perdidas.length === 0) return gerado;
  const refeito = await pedir("nenhuma", perdidas.join(", "));
  const scoreRefeito = scoreAts(ats.textoDe(refeito), analise.keywords, master) ?? 0;
  return validarLastro(refeito, master, analise).length === 0 && scoreRefeito > scoreAtual
    ? refeito
    : gerado;
}

/** Renderiza o PDF encaixando em 1 página e registra o resultado do encaixe. */
async function renderizarEmUmaPagina(
  deps: DepsGerarCurriculo,
  vaga: Vaga,
  documento: DocumentoCurriculo,
  skills: ReturnType<typeof skillsAderentes>,
  sinal: AbortSignal,
): Promise<Awaited<ReturnType<typeof encaixarEmUmaPagina>>> {
  const destino = deps.artefatos.caminho(vaga.id, "pdf-curriculo");
  const encaixe = await encaixarEmUmaPagina(documento, skills, (doc) =>
    deps.renderizador.renderizarCurriculo(doc, destino, sinal),
  );
  const { paginas } = encaixe;
  const contexto = {
    tamanhoBase: encaixe.tamanhoBase,
    cortes: encaixe.cortes,
    paginas,
    sobrou: encaixe.sobrou,
  };
  if (encaixe.coube) {
    deps.registrador.informar(`vaga #${String(vaga.id)}: currículo em 1 página`, contexto);
  } else {
    deps.registrador.avisar(
      `vaga #${String(vaga.id)}: currículo com ${String(paginas)} páginas mesmo no piso de fonte`,
      contexto,
    );
  }
  return encaixe;
}

/** Grava scores na vaga e troca os alertas de currículo no `analise.json`. */
function registrarResultado(
  deps: DepsGerarCurriculo,
  vaga: Vaga,
  saida: SaidaGerarCurriculo,
): void {
  const { paginas, camaleaoFalhou, atsAntes, atsDepois } = saida;
  const atsCaiu = atsAntes !== null && atsDepois !== null && atsDepois < atsAntes;
  deps.vagas.atualizar(
    vaga.id,
    registrarCurriculo({ antes: atsAntes, depois: atsDepois, camaleaoFalhou }),
  );
  atualizarAnalise(deps.artefatos, vaga, (atual) => ({
    ...atual,
    alertas: [
      ...atual.alertas.filter(
        (a) => a !== ALERTA_PDF_LONGO && a !== ALERTA_CAMALEAO_FALHOU && a !== ALERTA_ATS_CAIU,
      ),
      ...(paginas > 1 ? [ALERTA_PDF_LONGO] : []),
      ...(camaleaoFalhou ? [ALERTA_CAMALEAO_FALHOU] : []),
      ...(atsCaiu ? [ALERTA_ATS_CAIU] : []),
    ],
  }));
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
  const master = aplicarNuncaListar(deps.curriculo.lerMaster());
  const idioma: IdiomaCurriculo = analise.idioma === "pt" ? "pt" : "en";
  const pedir = criarPedido(deps, vaga, analise, master, sinal);
  let gerado = await gerarComLastro(pedir, master, analise);

  const textoMaster =
    deps.artefatos.lerTextoMaster() ?? paraTexto(montarDocumento(master, null, master.idioma));
  const textoDe = (g: CurriculoGerado | null): string =>
    paraTexto(montarDocumento(master, g, g ? idioma : master.idioma));
  const atsAntes = scoreAts(textoMaster, analise.keywords, master);
  if (gerado && atsAntes !== null) {
    gerado = await recuperarKeywordsPerdidas(
      pedir,
      gerado,
      { antes: atsAntes, textoMaster, textoDe },
      master,
      analise,
    );
  }

  const encaixe = await renderizarEmUmaPagina(
    deps,
    vaga,
    montarDocumento(master, gerado, gerado ? idioma : master.idioma),
    skillsAderentes(master, analise.keywords),
    sinal,
  );
  const texto = paraTexto(encaixe.documento);
  deps.artefatos.gravarTexto(vaga.id, "curriculo.txt", texto);
  deps.artefatos.gravarJson(vaga.id, "curriculo.json", gerado);

  const saida: SaidaGerarCurriculo = {
    paginas: encaixe.paginas,
    camaleaoFalhou: gerado === null,
    atsAntes,
    atsDepois: scoreAts(texto, analise.keywords, master),
  };
  registrarResultado(deps, vaga, saida);
  return saida;
}

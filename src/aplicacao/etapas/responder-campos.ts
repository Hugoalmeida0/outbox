import { z } from "zod";
import { REGIMES } from "#dominio/analise/analise-vaga.ts";
import { montarCarta } from "#dominio/curriculo/documento.ts";
import type { Master } from "#dominio/curriculo/master.ts";
import { CATEGORIAS_SENSIVEIS, type Campo } from "#dominio/respostas/campo.ts";
import { classificarFormulario, type Classificacao } from "#dominio/respostas/classificar-campo.ts";
import { respostaConsentimento } from "#dominio/respostas/consentimento.ts";
import { respostaDiversidade } from "#dominio/respostas/diversidade.ts";
import {
  esquemaRespostasSalvas,
  type Contato,
  type RespostaSugerida,
} from "#dominio/respostas/pacote.ts";
import type { Perfil } from "#dominio/respostas/perfil.ts";
import { melhorOpcao } from "#dominio/respostas/opcoes.ts";
import {
  calcularSalario,
  escolherFaixa,
  resolverRegime,
  valorSalarioAtual,
} from "#dominio/respostas/salario.ts";
import { valorDocumento, valorPadrao } from "#dominio/respostas/valor-codigo.ts";
import type { Vaga } from "#dominio/vagas/vaga.ts";
import type { ArquivoAnalise } from "../compartilhado/artefatos.ts";
import type { ArmazemArtefatos } from "../portas/armazem-artefatos.ts";
import type { ArmazemCurriculo } from "../portas/armazem-curriculo.ts";
import type { GeradorEstruturado } from "../portas/gerador-estruturado.ts";
import type { RenderizadorDocumentos } from "../portas/renderizador-documentos.ts";

const esquemaRespostasLlm = z.object({
  respostas: z
    .array(
      z.object({
        campoId: z.string(),
        valor: z.string(),
        fonte: z.string().default("gerada"),
        confianca: z.enum(["alta", "baixa"]).default("alta"),
        especificaDaVaga: z.boolean().default(false),
      }),
    )
    .default([]),
  salarios: z
    .array(
      z.object({
        campoId: z.string(),
        regime: z.enum([...REGIMES, "nao_informado"]),
        periodo: z.enum(["mensal", "anual"]),
        moeda: z.enum(["BRL", "USD"]),
      }),
    )
    .default([]),
});

export interface DepsResponderCampos {
  readonly gerador: GeradorEstruturado;
  readonly curriculo: Pick<ArmazemCurriculo, "lerMaster" | "lerPerfil" | "lerBanco">;
  readonly artefatos: Pick<ArmazemArtefatos, "caminho" | "lerTexto" | "pastaLlm">;
  readonly renderizador: RenderizadorDocumentos;
  readonly cartaMaxPalavras: number;
}

export interface ContextoResposta {
  readonly vaga: Vaga;
  readonly analise: ArquivoAnalise | null;
}

export interface SaidaResponderCampos {
  readonly respostas: RespostaSugerida[];
  readonly carta?: string;
  readonly pdfCarta?: string;
}

export function contatoDo(master: Master): Contato {
  return { ...master.pessoal };
}

function base(
  campo: Campo,
  categoria: Campo["categoria"],
): Pick<RespostaSugerida, "campoId" | "rotulo" | "categoria" | "tipoCampo" | "sensivel"> {
  return {
    campoId: campo.id,
    rotulo: campo.rotulo,
    categoria,
    tipoCampo: campo.tipo,
    sensivel: CATEGORIAS_SENSIVEIS.has(categoria),
  };
}

/** Resposta por código para campos determinísticos; `null` quando o campo exige o LLM. */
function respostaPorCodigo(
  campo: Campo,
  classificacao: Classificacao,
  perfil: Perfil,
  contato: Contato,
): RespostaSugerida | null {
  const r = (
    valor: string | null,
    confianca: "alta" | "baixa" = valor === null ? "baixa" : "alta",
  ): RespostaSugerida => ({
    ...base(campo, classificacao.categoria),
    valor,
    fonte: "codigo",
    confianca,
    especificaDaVaga: false,
  });
  switch (classificacao.categoria) {
    case "padrao":
      return r(valorPadrao(classificacao.chave, contato));
    case "documento":
      return r(valorDocumento(classificacao.chave, campo.tipo, perfil.documentos, perfil.endereco));
    case "diversidade": {
      const d = respostaDiversidade(
        classificacao.chave,
        campo.opcoes,
        perfil.diversidade,
        perfil.consentimentos.diversidade ?? true,
      );
      return r(d.valor, d.confianca);
    }
    case "consentimento": {
      const c = respostaConsentimento(campo, classificacao.chave, perfil.consentimentos);
      return r(c.valor, c.confianca);
    }
    case "salario_atual":
      return r(valorSalarioAtual(perfil.salario.atual, campo.tipo === "numero"));
    case "curriculo":
      return null;
    case "salario":
    case "carta":
    case "pergunta":
      return null;
  }
}

/**
 * Valor de campo-padrão ou documento que não está entre as opções do campo: o rótulo enganou a
 * classificação ("familiar como pais..." não é país) e o campo vira pergunta para o LLM.
 */
function foraDasOpcoes(campo: Campo, resposta: RespostaSugerida): boolean {
  if (resposta.categoria !== "padrao" && resposta.categoria !== "documento") return false;
  if (!campo.opcoes || campo.opcoes.length === 0 || resposta.valor === null) return false;
  return melhorOpcao(campo.opcoes, resposta.valor) === null;
}

/**
 * Responde os campos de um formulário. Padrão, documentos, diversidade e consentimento saem por código; o
 * salário é calculado pela tabela do perfil (o LLM só identifica regime, período e moeda); perguntas e
 * carta vão numa única chamada ao LLM, que nunca recebe documentos, salário, diversidade nem endereço.
 */
export async function responderCampos(
  deps: DepsResponderCampos,
  contexto: ContextoResposta,
  campos: readonly Campo[],
  sinal: AbortSignal,
): Promise<SaidaResponderCampos> {
  const master = deps.curriculo.lerMaster();
  const perfil = deps.curriculo.lerPerfil();
  const contato = contatoDo(master);
  const classificacoes = classificarFormulario(
    campos.map((c) => ({ rotulo: c.rotulo, nome: c.id, tipo: c.tipo })),
  );
  const respostas = new Map<string, RespostaSugerida>();
  const paraLlm: { campo: Campo; categoria: Campo["categoria"] }[] = [];

  campos.forEach((campo, i) => {
    const classificacao = classificacoes[i] ?? { categoria: "pergunta" as const };
    if (campo.tipo === "arquivo" && classificacao.categoria === "curriculo") return;
    const porCodigo = respostaPorCodigo(campo, classificacao, perfil, contato);
    // Consentimento sem opção afirmativa/negativa reconhecível vira pergunta, em vez de ficar vazio.
    const consentimentoIndefinido =
      porCodigo?.categoria === "consentimento" && porCodigo.valor === null;
    if (porCodigo && !foraDasOpcoes(campo, porCodigo) && !consentimentoIndefinido)
      respostas.set(campo.id, porCodigo);
    else if (porCodigo) paraLlm.push({ campo, categoria: "pergunta" });
    else paraLlm.push({ campo, categoria: classificacao.categoria });
  });

  let carta: string | undefined;
  let pdfCarta: string | undefined;
  if (paraLlm.length > 0) {
    const banco = deps.curriculo.lerBanco();
    const idsBanco = new Set(banco.map((e) => e.id));
    const descricao = deps.artefatos.lerTexto(contexto.vaga.id, "descricao.md") ?? "";
    const saida = await deps.gerador.gerar(
      {
        tarefa: "responder-perguntas",
        variaveis: {
          cargo: contexto.vaga.cargo ?? "a vaga",
          empresa: contexto.vaga.empresa ?? "a empresa",
          idioma: contexto.analise?.idioma === "pt" ? "pt" : "en",
          comoSoube: perfil.comoSoube,
          maxPalavras: String(deps.cartaMaxPalavras),
          campos: JSON.stringify(
            paraLlm.map(({ campo, categoria }) => ({
              campoId: campo.id,
              rotulo: campo.rotulo,
              tipo: campo.tipo,
              categoria,
              ...(campo.opcoes ? { opcoes: campo.opcoes } : {}),
            })),
          ),
          banco: JSON.stringify(banco),
          analise: JSON.stringify(
            contexto.analise
              ? { requisitos: contexto.analise.requisitos, regime: contexto.analise.regime }
              : {},
          ),
          preferencias: JSON.stringify(perfil.preferencias),
          disponibilidade: JSON.stringify(perfil.disponibilidade),
          autorizacao: JSON.stringify(perfil.autorizacaoTrabalho),
          master: JSON.stringify(master),
        },
        conteudoNaoConfiavel: { descricao },
        schema: esquemaRespostasLlm,
        pastaLog: deps.artefatos.pastaLlm(contexto.vaga.id),
      },
      sinal,
    );

    for (const { campo, categoria } of paraLlm) {
      if (categoria === "salario") {
        const pedido = saida.salarios.find((s) => s.campoId === campo.id);
        const { regime, confianca } = resolverRegime(
          pedido?.regime ?? contexto.analise?.regime ?? "nao_informado",
          perfil.preferencias.regimes,
        );
        const valor = calcularSalario(
          {
            regime,
            periodo: pedido?.periodo ?? "mensal",
            moeda: pedido?.moeda ?? (regime === "contractor" ? "USD" : "BRL"),
          },
          perfil.salario,
        );
        const texto =
          campo.opcoes && campo.opcoes.length > 0
            ? escolherFaixa(campo.opcoes, valor)
            : String(valor);
        respostas.set(campo.id, {
          ...base(campo, "salario"),
          valor: texto,
          fonte: "codigo",
          confianca: pedido && texto !== null ? confianca : "baixa",
          especificaDaVaga: false,
        });
        continue;
      }
      const resposta = saida.respostas.find((r) => r.campoId === campo.id);
      const fonteValida =
        resposta && /^banco:r-\d{4}$/.test(resposta.fonte) && idsBanco.has(resposta.fonte.slice(6));
      respostas.set(campo.id, {
        ...base(campo, categoria),
        valor: resposta?.valor ?? null,
        fonte: fonteValida ? resposta.fonte : "gerada",
        confianca: resposta ? resposta.confianca : "baixa",
        especificaDaVaga: categoria === "carta" ? true : (resposta?.especificaDaVaga ?? false),
      });
      if (categoria === "carta" && resposta?.valor) {
        carta = resposta.valor;
        if (campo.tipo === "arquivo") {
          pdfCarta = deps.artefatos.caminho(contexto.vaga.id, "pdf-carta");
          await deps.renderizador.renderizarCarta(
            montarCarta(contato, carta, contexto.analise?.idioma === "pt" ? "pt" : "en"),
            pdfCarta,
            sinal,
          );
        }
      }
    }
  }
  return {
    respostas: campos.flatMap((c) => {
      const r = respostas.get(c.id);
      return r ? [r] : [];
    }),
    ...(carta ? { carta } : {}),
    ...(pdfCarta ? { pdfCarta } : {}),
  };
}

/** Carta para vagas MANUAL (Easy Apply, e-mail): uma resposta a um campo de carta sintético. */
export async function gerarCartaAvulsa(
  deps: DepsResponderCampos & { readonly artefatos: Pick<ArmazemArtefatos, "gravarTexto"> },
  contexto: ContextoResposta,
  sinal: AbortSignal,
): Promise<string | undefined> {
  const { carta } = await responderCampos(
    deps,
    contexto,
    [
      {
        id: "carta",
        rotulo: "Carta de apresentação",
        tipo: "textarea",
        obrigatorio: false,
        categoria: "carta",
      },
    ],
    sinal,
  );
  if (carta) deps.artefatos.gravarTexto(contexto.vaga.id, "carta.md", `${carta}\n`);
  return carta;
}

/**
 * Mescla respostas em `respostas.json` (por campoId), atribuindo a chave protegida `p<n>` às sensíveis,
 * e grava a carta em `carta.md` quando houver.
 */
export function salvarRespostas(
  artefatos: Pick<ArmazemArtefatos, "lerJson" | "gravarJson" | "gravarTexto">,
  vaga: Pick<Vaga, "id">,
  saida: SaidaResponderCampos,
): RespostaSugerida[] {
  const existentes = artefatos.lerJson(vaga.id, "respostas.json", esquemaRespostasSalvas) ?? [];
  const porId = new Map(existentes.map((r) => [r.campoId ?? r.rotulo, r]));
  for (const r of saida.respostas) porId.set(r.campoId ?? r.rotulo, r);
  let proxima =
    Math.max(0, ...[...porId.values()].map((r) => Number(r.chaveProtegida?.slice(1) ?? 0))) + 1;
  const todas = [...porId.values()].map((r) =>
    r.sensivel && !r.chaveProtegida ? { ...r, chaveProtegida: `p${String(proxima++)}` } : r,
  );
  artefatos.gravarJson(vaga.id, "respostas.json", todas);
  if (saida.carta) artefatos.gravarTexto(vaga.id, "carta.md", `${saida.carta}\n`);
  return todas;
}

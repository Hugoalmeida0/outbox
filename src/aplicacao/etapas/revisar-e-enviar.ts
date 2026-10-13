import { normalizarTexto } from "#dominio/compartilhado/texto.ts";
import { aplicarAprendizado, type RespostaFinal } from "#dominio/respostas/aprendizado.ts";
import type { PacoteCandidatura, RespostaSugerida } from "#dominio/respostas/pacote.ts";
import type { RespostaEnviada, Vaga } from "#dominio/vagas/vaga.ts";
import type { ArmazemArtefatos } from "../portas/armazem-artefatos.ts";
import type { ArmazemCurriculo } from "../portas/armazem-curriculo.ts";
import type { FormularioAberto, ValorLido } from "../portas/formulario-aberto.ts";
import type { Interacao, ResumoRevisao } from "../portas/interacao.ts";
import type { Relogio } from "../portas/relogio.ts";
import type { RepositorioVagas } from "../portas/repositorio-vagas.ts";
import { lerAnalise } from "./analisar-vaga.ts";

export interface DepsRevisarEEnviar {
  readonly vagas: Pick<
    RepositorioVagas,
    "registrarRespostasEnviadas" | "atualizar" | "transicionar" | "listarGapsAbertos"
  >;
  readonly curriculo: Pick<ArmazemCurriculo, "lerBanco" | "gravarBanco">;
  readonly artefatos: Pick<ArmazemArtefatos, "caminho" | "lerJson">;
  readonly interacao: Interacao;
  readonly relogio: Relogio;
}

export type DesfechoRevisao =
  "enviada" | "pendente_teste" | "pulada" | "manual" | "mantida" | "sair";

const OPCOES = [
  { valor: "enviar", rotulo: "[e]nviar a candidatura" },
  { valor: "pular", rotulo: "[p]ular esta vaga" },
  { valor: "manual", rotulo: "[m]anual: termino por conta própria" },
  { valor: "ver_pdf", rotulo: "[v]er o PDF do currículo" },
  { valor: "sair", rotulo: "[s]air (a vaga continua PRONTA)" },
] as const;

const TIMEOUT_CONFIRMACAO_MS = 120_000;

function acharValor(
  valores: readonly ValorLido[],
  resposta: RespostaSugerida,
): ValorLido | undefined {
  const alvo = normalizarTexto(resposta.rotulo);
  return valores.find((v) => !v.ehArquivo && normalizarTexto(v.rotulo) === alvo);
}

function montarResumo(
  deps: DepsRevisarEEnviar,
  vaga: Vaga,
  formulario: FormularioAberto,
  pacote: PacoteCandidatura,
  perguntasNaHora: readonly { rotulo: string; valor: string }[],
): ResumoRevisao {
  const analise = lerAnalise(deps.artefatos, vaga);
  const gaps = deps.vagas.listarGapsAbertos([vaga.id]).map((g) => g.termo);
  return {
    vagaId: vaga.id,
    empresa: vaga.empresa ?? "(empresa não identificada)",
    cargo: vaga.cargo ?? "(cargo não identificado)",
    motor: vaga.motor,
    rota: formulario.rota,
    url: formulario.urlAtual(),
    aderencia: vaga.aderencia,
    atsAntes: vaga.atsAntes,
    atsDepois: vaga.atsDepois,
    gapsRestantes: gaps,
    alertas: analise?.alertas ?? [],
    respostas: [
      ...pacote.respostas.map((r) => ({
        rotulo: r.rotulo,
        valor: r.valor ?? "(sem resposta)",
        nova: r.fonte === "gerada" || r.confianca === "baixa",
      })),
      ...perguntasNaHora.map((p) => ({ rotulo: p.rotulo, valor: p.valor, nova: true })),
    ],
    ...(pacote.carta ? { cartaInicio: pacote.carta.split("\n").slice(0, 3).join("\n") } : {}),
    caminhoPdf: pacote.pdfCurriculo,
  };
}

/**
 * Revisão humana obrigatória (arquitetura.md, ADR "sempre revisar"): tela, resumo e menu. O envio só
 * acontece com a escolha `enviar` e nunca em simulação. Fecha o formulário ao final.
 */
export async function revisarEEnviar(
  deps: DepsRevisarEEnviar,
  vaga: Vaga,
  formulario: FormularioAberto,
  pacote: PacoteCandidatura,
  perguntasNaHora: readonly { rotulo: string; valor: string }[],
  opcoes: { readonly simular: boolean },
): Promise<DesfechoRevisao> {
  try {
    await formulario.capturarTela(deps.artefatos.caminho(vaga.id, "antes-envio.png"));
    deps.interacao.exibirResumoRevisao(
      montarResumo(deps, vaga, formulario, pacote, perguntasNaHora),
    );

    for (;;) {
      const escolha = await deps.interacao.escolher("O que fazer com esta vaga?", OPCOES);
      switch (escolha) {
        case "ver_pdf":
          await deps.interacao.abrirArquivo(pacote.pdfCurriculo);
          continue;
        case "pular":
          deps.vagas.transicionar(vaga.id, "PULADA");
          return "pulada";
        case "manual":
          deps.vagas.transicionar(vaga.id, "MANUAL", { motivo: "escolha_usuario" });
          return "manual";
        case "sair":
          return "sair";
        case "enviar":
          return await enviar(deps, vaga, formulario, pacote, perguntasNaHora, opcoes.simular);
      }
    }
  } finally {
    await formulario.fechar();
  }
}

async function enviar(
  deps: DepsRevisarEEnviar,
  vaga: Vaga,
  formulario: FormularioAberto,
  pacote: PacoteCandidatura,
  perguntasNaHora: readonly { rotulo: string; valor: string }[],
  simular: boolean,
): Promise<DesfechoRevisao> {
  const valores = await formulario.lerValores();
  const finais: RespostaFinal[] = pacote.respostas.map((resposta) => {
    const lido = acharValor(valores, resposta);
    const valorFinal = lido?.valor ?? resposta.valor ?? "";
    const editada =
      lido !== undefined && normalizarTexto(lido.valor) !== normalizarTexto(resposta.valor ?? "");
    return { resposta, valorFinal, editada };
  });
  const naHora: RespostaFinal[] = perguntasNaHora.map((p) => ({
    resposta: {
      rotulo: p.rotulo,
      categoria: "pergunta",
      valor: p.valor,
      fonte: "gerada",
      confianca: "baixa",
      especificaDaVaga: false,
      sensivel: false,
    },
    valorFinal: p.valor,
    editada: false,
  }));
  const enviadas: RespostaEnviada[] = [...finais, ...naHora].map((f) => ({
    rotulo: f.resposta.rotulo,
    valor: f.valorFinal,
    fonte: f.resposta.fonte,
    editada: f.editada,
    sensivel: f.resposta.sensivel,
  }));
  const nomePdf = pacote.pdfCurriculo.split(/[\\/]/).at(-1) ?? "";
  const anexos = valores.filter((v) => v.ehArquivo && v.valor.trim() !== "");
  const anexoManual = anexos.length > 0 && !anexos.some((v) => v.valor.includes(nomePdf));
  deps.vagas.registrarRespostasEnviadas(vaga.id, enviadas);
  if (anexoManual) deps.vagas.atualizar(vaga.id, { anexoManual: true });

  if (simular) {
    deps.interacao.informar("simulação: nada enviado (a vaga continua PRONTA)");
    return "mantida";
  }

  await formulario.enviar();
  let desfecho = await formulario.confirmarEnvio(TIMEOUT_CONFIRMACAO_MS);
  if (desfecho === "indeterminada") {
    desfecho = (await deps.interacao.perguntarSimNao("A confirmação de envio apareceu na página?"))
      ? "enviada"
      : "nao_confirmada";
  }
  if (desfecho === "nao_confirmada") {
    const marcar = await deps.interacao.perguntarSimNao(
      "Não detectei a confirmação. Marcar como enviada mesmo assim?",
    );
    if (!marcar) return "mantida";
    desfecho = "enviada";
  }
  await formulario
    .capturarTela(deps.artefatos.caminho(vaga.id, "confirmacao.png"))
    .catch(() => undefined);
  const status = desfecho === "pendente_teste" ? "PENDENTE_TESTE" : "ENVIADA";
  deps.vagas.transicionar(vaga.id, status);

  const banco = deps.curriculo.lerBanco();
  const novo = aplicarAprendizado(
    banco,
    [...finais, ...naHora],
    pacote.idioma,
    deps.relogio.hoje(),
  );
  if (JSON.stringify(novo) !== JSON.stringify(banco)) deps.curriculo.gravarBanco(novo);
  return status === "PENDENTE_TESTE" ? "pendente_teste" : "enviada";
}

import { ErroOutbox, ErroUsuario } from "#dominio/compartilhado/erros.ts";
import type { Campo } from "#dominio/respostas/campo.ts";
import type { RespostaSugerida } from "#dominio/respostas/pacote.ts";
import type { IdVaga, Vaga } from "#dominio/vagas/vaga.ts";
import type { ConfigAplicacao } from "../compartilhado/config.ts";
import { lerAnalise } from "../etapas/analisar-vaga.ts";
import { montarPacote, type DepsMontarPacote } from "../etapas/montar-pacote.ts";
import {
  preencherFormulario,
  type DepsPreencherFormulario,
} from "../etapas/preencher-formulario.ts";
import {
  responderCampos,
  salvarRespostas,
  type DepsResponderCampos,
} from "../etapas/responder-campos.ts";
import {
  revisarEEnviar,
  type DepsRevisarEEnviar,
  type DesfechoRevisao,
} from "../etapas/revisar-e-enviar.ts";
import { rodadaGaps, type DepsRodadaGaps } from "../etapas/rodada-gaps.ts";
import type { ArmazemArtefatos } from "../portas/armazem-artefatos.ts";
import type { ArmazemCurriculo } from "../portas/armazem-curriculo.ts";
import { ErroLimiteUso } from "../portas/erros.ts";
import type { Registrador } from "../portas/registrador.ts";
import type { RepositorioVagas } from "../portas/repositorio-vagas.ts";

export type DepsAplicarVagas = Omit<DepsRodadaGaps, "paralelo"> &
  Omit<DepsPreencherFormulario, "agenteMaxTurnos" | "agenteTimeoutMin"> &
  Omit<DepsResponderCampos, "cartaMaxPalavras"> &
  Omit<DepsMontarPacote, "gupyAnexoPorCandidatura"> &
  DepsRevisarEEnviar & {
    readonly vagas: Pick<
      RepositorioVagas,
      | "listarPorStatus"
      | "listarGapsAbertos"
      | "responderGaps"
      | "termosConfirmados"
      | "buscar"
      | "atualizar"
      | "transicionar"
      | "registrarRespostasEnviadas"
    >;
    readonly curriculo: Pick<
      ArmazemCurriculo,
      | "lerMaster"
      | "lerPerfil"
      | "lerBanco"
      | "gravarBanco"
      | "adicionarSkill"
      | "definirIdioma"
      | "negarGap"
    >;
    readonly artefatos: Pick<
      ArmazemArtefatos,
      | "caminho"
      | "caminhoMaster"
      | "existe"
      | "gravarJson"
      | "gravarTexto"
      | "lerJson"
      | "lerTexto"
      | "lerTextoMaster"
      | "pastaLlm"
    >;
    readonly registrador: Registrador;
    readonly config: ConfigAplicacao;
  };

export interface EntradaAplicarVagas {
  readonly simular: boolean;
  readonly id?: IdVaga;
}

export interface ResumoAplicacao {
  readonly revisadas: number;
  readonly desfechos: Partial<Record<DesfechoRevisao | "manual_automatica" | "erro", number>>;
  readonly interrompido: "limite" | "cancelado" | "usuario" | null;
}

/**
 * `outbox aplicar`: rodada de gaps e, para cada vaga PRONTA (maior aderência primeiro), preenche o
 * formulário (conector ou agente) e abre a revisão. Um erro inesperado numa vaga não interrompe as demais.
 */
export async function aplicarVagas(
  deps: DepsAplicarVagas,
  entrada: EntradaAplicarVagas,
  sinal: AbortSignal,
): Promise<ResumoAplicacao> {
  const filtro = entrada.id === undefined ? {} : { ids: [entrada.id] };
  const iniciais = deps.vagas.listarPorStatus(["PRONTA"], filtro);
  if (entrada.id !== undefined && iniciais.length === 0) {
    throw new ErroUsuario(`a vaga #${String(entrada.id)} não está PRONTA`);
  }
  const desfechos: Record<string, number> = {};
  const contar = (chave: string): void => {
    desfechos[chave] = (desfechos[chave] ?? 0) + 1;
  };
  let interrompido: ResumoAplicacao["interrompido"] = null;

  try {
    await rodadaGaps(
      { ...deps, paralelo: deps.config.paralelo },
      iniciais.map((v) => v.id),
      sinal,
    );
  } catch (erro) {
    if (erro instanceof ErroLimiteUso) return { revisadas: 0, desfechos, interrompido: "limite" };
    throw erro;
  }

  const prontas = deps.vagas
    .listarPorStatus(["PRONTA"], filtro)
    .sort((a, b) => (b.aderencia ?? -1) - (a.aderencia ?? -1));
  let revisadas = 0;
  // Lido por função: um `await` (ou Ctrl+C num prompt) pode abortar o sinal entre as checagens.
  const cancelado = (): boolean => sinal.aborted;

  for (const [indice, vaga] of prontas.entries()) {
    if (cancelado()) {
      interrompido = "cancelado";
      break;
    }
    try {
      const nome = [vaga.empresa, vaga.cargo].filter(Boolean).join(" · ");
      const posicao = `${String(indice + 1)} de ${String(prontas.length)}`;
      deps.interacao.informar(
        `\nVaga #${String(vaga.id)} ${nome} (${posicao}): abrindo o formulário no navegador do Outbox…`,
      );
      const desfecho = await aplicarUma(deps, vaga, entrada, sinal);
      contar(desfecho);
      revisadas++;
      if (desfecho === "sair") {
        interrompido = "usuario";
        break;
      }
    } catch (erro) {
      if (cancelado()) {
        interrompido = "cancelado";
        break;
      }
      if (erro instanceof ErroLimiteUso) {
        deps.interacao.informar("limite de uso do Claude atingido: retome o `aplicar` mais tarde");
        interrompido = "limite";
        break;
      }
      contar("erro");
      deps.registrador.erro(`erro ao aplicar a vaga #${String(vaga.id)}`, { erro });
      const mensagem =
        erro instanceof ErroOutbox ? erro.message : "erro inesperado (detalhes no log)";
      deps.interacao.informar(`vaga #${String(vaga.id)}: ${mensagem}; ela continua PRONTA`);
    }
  }
  return { revisadas, desfechos, interrompido };
}

async function aplicarUma(
  deps: DepsAplicarVagas,
  vaga: Vaga,
  entrada: EntradaAplicarVagas,
  sinal: AbortSignal,
): Promise<DesfechoRevisao | "manual_automatica"> {
  const analise = lerAnalise(deps.artefatos, vaga);
  const depsPacote = { ...deps, gupyAnexoPorCandidatura: deps.config.gupyAnexoPorCandidatura };
  const depsRespostas = { ...deps, cartaMaxPalavras: deps.config.cartaMaxPalavras };
  const informar = (mensagem: string): void => {
    deps.interacao.informar(`  ${mensagem}`);
  };
  // Só avisa quando há chamada ao LLM: os campos respondidos por código são instantâneos.
  const aoConsultarLlm = (quantidade: number): void => {
    informar(`${String(quantidade)} campo(s) sem resposta pronta: consultando o Claude…`);
  };
  const responderAoVivo = async (campos: readonly Campo[]): Promise<RespostaSugerida[]> => {
    const saida = await responderCampos(
      depsRespostas,
      { vaga, analise, aoConsultarLlm },
      campos,
      sinal,
    );
    salvarRespostas(deps.artefatos, vaga, saida);
    return saida.respostas;
  };

  const resultado = await preencherFormulario(
    {
      ...deps,
      agenteMaxTurnos: deps.config.agenteMaxTurnos,
      agenteTimeoutMin: deps.config.agenteTimeoutMin,
    },
    vaga,
    montarPacote(depsPacote, vaga),
    { responderAoVivo, aguardarUsuario: (m) => deps.interacao.aguardarUsuario(m), informar },
    sinal,
  );
  if (resultado.tipo === "manual") {
    deps.vagas.transicionar(vaga.id, "MANUAL", { motivo: resultado.motivo });
    deps.interacao.informar(`vaga #${String(vaga.id)}: marcada como MANUAL (${resultado.motivo})`);
    return "manual_automatica";
  }
  // As respostas dadas ao vivo entram no pacote usado na revisão e no aprendizado.
  const pacote = montarPacote(depsPacote, deps.vagas.buscar(vaga.id) ?? vaga);
  return revisarEEnviar(deps, vaga, resultado.formulario, pacote, resultado.perguntasNaHora, {
    simular: entrada.simular,
  });
}

import { calcularAderencia, recalcularComGaps } from "#dominio/analise/aderencia.ts";
import { ErroDominio, ErroOutbox } from "#dominio/compartilhado/erros.ts";
import { decidirDeduplicacaoChave } from "#dominio/vagas/deduplicacao.ts";
import { canonizar } from "#dominio/vagas/motores.ts";
import type { MotivoDe, Status } from "#dominio/vagas/status.ts";
import type { IdVaga, Vaga } from "#dominio/vagas/vaga.ts";
import type { ArquivoAnalise } from "../compartilhado/artefatos.ts";
import { executarComLimite } from "../compartilhado/concorrencia.ts";
import type { ConfigAplicacao } from "../compartilhado/config.ts";
import {
  analisarVaga,
  atualizarAnalise,
  lerAnalise,
  type DepsAnalisarVaga,
} from "../etapas/analisar-vaga.ts";
import { extrairVaga, type DepsExtrairVaga } from "../etapas/extrair-vaga.ts";
import { gerarCurriculo, type DepsGerarCurriculo } from "../etapas/gerar-curriculo.ts";
import {
  gerarCartaAvulsa,
  responderCampos,
  salvarRespostas,
  type DepsResponderCampos,
} from "../etapas/responder-campos.ts";
import { resolverVaga, type DepsResolverVaga } from "../etapas/resolver-vaga.ts";
import type { ArmazemArtefatos } from "../portas/armazem-artefatos.ts";
import type { ArmazemCurriculo } from "../portas/armazem-curriculo.ts";
import type { CatalogoConectores } from "../portas/catalogo-conectores.ts";
import {
  ErroAgregadorExigeLogin,
  ErroExtracao,
  ErroHttp,
  ErroLimiteUso,
  ErroLlm,
  ErroNavegador,
  ErroResolucao,
  ErroTimeoutLlm,
} from "../portas/erros.ts";
import type { Notificador } from "../portas/notificador.ts";
import type { EtapaPreparo, ProgressoPreparo } from "../portas/progresso-preparo.ts";
import type { Registrador } from "../portas/registrador.ts";
import type { RepositorioVagas } from "../portas/repositorio-vagas.ts";
import { garantirMasterGenerico, type DepsRenderizarMaster } from "./renderizar-master.ts";

export type DepsPrepararVagas = DepsResolverVaga &
  DepsExtrairVaga &
  DepsAnalisarVaga &
  DepsGerarCurriculo &
  DepsResponderCampos &
  DepsRenderizarMaster & {
    readonly vagas: Pick<
      RepositorioVagas,
      | "transacao"
      | "buscar"
      | "buscarPorUrlCanonica"
      | "buscarPorChave"
      | "listarPorStatus"
      | "atualizar"
      | "transicionar"
      | "inserirGaps"
      | "termosConfirmados"
    >;
    readonly curriculo: Pick<
      ArmazemCurriculo,
      "lerMaster" | "lerPerfil" | "lerGapsNegados" | "lerBanco" | "atualizadoEm"
    >;
    readonly artefatos: Pick<
      ArmazemArtefatos,
      | "caminho"
      | "caminhoMaster"
      | "gravarJson"
      | "gravarTexto"
      | "lerJson"
      | "lerTexto"
      | "lerTextoMaster"
      | "gravarTextoMaster"
      | "masterGeradoEm"
      | "pastaLlm"
    >;
    readonly catalogo: CatalogoConectores;
    readonly notificador: Notificador;
    readonly progresso: ProgressoPreparo;
    readonly registrador: Registrador;
    readonly config: ConfigAplicacao;
  };

export interface EntradaPrepararVagas {
  readonly forcar: boolean;
  readonly paralelo?: number;
  readonly reavaliar: boolean;
}

export interface ErroPreparo {
  readonly id: IdVaga;
  readonly motivo: MotivoDe<"ERRO_PREPARO">;
  readonly mensagem: string;
}

export interface ResumoPreparo {
  readonly processadas: number;
  readonly contagens: Partial<Record<Status, number>>;
  readonly erros: readonly ErroPreparo[];
  readonly reavaliadas: number;
  readonly interrompido: "limite" | "cancelado" | null;
}

/** Mapeia o erro de uma vaga para o motivo de ERRO_PREPARO (arquitetura.md §10.1). */
export function motivoDoErro(erro: unknown): MotivoDe<"ERRO_PREPARO"> {
  if (erro instanceof ErroAgregadorExigeLogin) return "agregador_exige_login";
  if (erro instanceof ErroResolucao) return "resolucao_falhou";
  if (erro instanceof ErroLlm || erro instanceof ErroTimeoutLlm || erro instanceof ErroDominio)
    return "llm_falhou";
  if (erro instanceof ErroExtracao || erro instanceof ErroHttp || erro instanceof ErroNavegador)
    return "extracao_falhou";
  return "extracao_falhou";
}

function aplicarAderencia(
  deps: DepsPrepararVagas,
  vaga: Vaga,
  analise: ArquivoAnalise,
): { score: number; eliminada: boolean } {
  const perfil = deps.curriculo.lerPerfil();
  const r = calcularAderencia(
    analise,
    perfil.preferencias,
    perfil.diversidade,
    perfil.documentos.dataNascimento,
    deps.relogio.hoje(),
  );
  atualizarAnalise(deps.artefatos, vaga, (atual) => ({
    ...atual,
    aderencia: { score: r.score, detalhes: r.detalhes },
    alertas: [...new Set([...atual.alertas.filter((a) => !r.alertas.includes(a)), ...r.alertas])],
  }));
  deps.vagas.atualizar(vaga.id, { aderencia: r.score });
  return { score: r.score, eliminada: r.eliminacao !== undefined };
}

/** Dedup por chave: decisão no domínio, aplicada atomicamente. Devolve `true` se a vaga atual foi descartada. */
function deduplicarPorChave(deps: DepsPrepararVagas, id: IdVaga): boolean {
  return deps.vagas.transacao(() => {
    const atual = deps.vagas.buscar(id);
    if (!atual?.chaveDedup) return false;
    const acoes = decidirDeduplicacaoChave(atual, deps.vagas.buscarPorChave(atual.chaveDedup, id));
    for (const acao of acoes) {
      deps.vagas.transicionar(acao.id, "DESCARTADA", {
        motivo: "duplicada_antiga",
        duplicadaDe: acao.duplicadaDe,
      });
    }
    return acoes.some((a) => a.id === id);
  });
}

/** Avisa a etapa com a vaga relida, para a interface mostrar empresa e cargo assim que forem extraídos. */
function avisarEtapa(deps: DepsPrepararVagas, id: IdVaga, etapa: EtapaPreparo): void {
  const vaga = deps.vagas.buscar(id);
  if (vaga) deps.progresso.emitir({ tipo: "etapa", vaga, etapa });
}

async function processarVaga(
  deps: DepsPrepararVagas,
  original: Vaga,
  entrada: EntradaPrepararVagas,
  sinal: AbortSignal,
): Promise<void> {
  const etapa = (nome: EtapaPreparo): void => {
    avisarEtapa(deps, original.id, nome);
  };
  etapa("resolver");
  const resolvida = await resolverVaga(deps, original, sinal);
  if (resolvida.tipo === "duplicada") return;
  let { vaga, resolucao } = resolvida;
  const url = resolucao.urlResolvida;

  if (resolucao.rota === "manual") {
    // Easy Apply: gera o que for possível (currículo e carta) e deixa a vaga para o usuário.
    try {
      etapa("extrair");
      const extraida = await extrairVaga(deps, vaga, url, sinal);
      etapa("analisar");
      const analise = await analisarVaga(deps, vaga, extraida, sinal);
      etapa("gerar_curriculo");
      await gerarCurriculo(deps, vaga, analise, sinal);
      etapa("gerar_carta");
      await gerarCartaAvulsa(deps, { vaga: deps.vagas.buscar(vaga.id) ?? vaga, analise }, sinal);
    } catch (erro) {
      if (sinal.aborted || erro instanceof ErroLimiteUso) throw erro;
      deps.registrador.avisar(`vaga #${String(vaga.id)}: materiais do Easy Apply incompletos`, {
        erro,
      });
    }
    deps.vagas.transicionar(vaga.id, "MANUAL", {
      motivo: resolucao.manual?.motivo ?? "easy_apply",
    });
    return;
  }

  etapa("extrair");
  const extraida = await extrairVaga(deps, vaga, url, sinal);
  etapa("analisar");
  let analise = await analisarVaga(deps, vaga, extraida, sinal);
  let destinoManual: MotivoDe<"MANUAL"> | null = null;

  if (resolucao.rota === "a_definir") {
    const como = analise.comoCandidatar;
    if (como?.tipo === "link") {
      const { canonica, motor } = canonizar(como.valor);
      etapa("resolver");
      const proxima = await deps.resolvedor.resolver(canonica, motor, sinal);
      deps.vagas.atualizar(vaga.id, {
        motor: proxima.motor,
        urlResolvida: proxima.urlResolvida,
        rota: proxima.rota,
      });
      resolucao = proxima;
      if (proxima.rota === "manual") destinoManual = proxima.manual?.motivo ?? "sem_formulario";
    } else if (como?.tipo === "email") {
      destinoManual = "candidatura_por_email";
      analise =
        atualizarAnalise(deps.artefatos, vaga, (a) => ({ ...a, destinoEmail: como.valor })) ??
        analise;
    } else {
      destinoManual = "sem_formulario";
    }
  }

  if (deduplicarPorChave(deps, vaga.id)) return;
  vaga = deps.vagas.buscar(vaga.id) ?? vaga;

  const { score, eliminada } = aplicarAderencia(deps, vaga, analise);
  if (eliminada) {
    deps.vagas.transicionar(vaga.id, "DESCARTADA", { motivo: "afirmativa_inelegivel" });
    return;
  }
  if (score < deps.config.scoreMinimo && !entrada.forcar) {
    deps.vagas.transicionar(vaga.id, "DESCARTADA", { motivo: "aderencia_baixa" });
    return;
  }

  analise = lerAnalise(deps.artefatos, vaga) ?? analise;
  etapa("gerar_curriculo");
  await gerarCurriculo(deps, vaga, analise, sinal);
  vaga = deps.vagas.buscar(vaga.id) ?? vaga;

  if (destinoManual !== null) {
    etapa("gerar_carta");
    await gerarCartaAvulsa(deps, { vaga, analise }, sinal);
    deps.vagas.transicionar(vaga.id, "MANUAL", { motivo: destinoManual });
    return;
  }
  if (resolucao.rota === "conector") {
    etapa("responder_campos");
    const campos = await deps.catalogo.para(resolucao.motor)?.lerCampos?.(url, sinal);
    if (campos && campos.length > 0) {
      deps.artefatos.gravarJson(vaga.id, "campos.json", campos);
      salvarRespostas(
        deps.artefatos,
        vaga,
        await responderCampos(deps, { vaga, analise }, campos, sinal),
      );
    }
  }
  deps.vagas.transicionar(vaga.id, "PRONTA");
}

function reavaliarDescartadas(deps: DepsPrepararVagas): number {
  const confirmados = new Set(deps.vagas.termosConfirmados());
  const idiomas = deps.curriculo.lerMaster().idiomas;
  let reabertas = 0;
  for (const vaga of deps.vagas.listarPorStatus(["DESCARTADA"])) {
    if (vaga.motivo !== "aderencia_baixa") continue;
    const analise = lerAnalise(deps.artefatos, vaga);
    if (!analise) continue;
    const recalculada = {
      ...analise,
      requisitos: recalcularComGaps(analise, confirmados, idiomas).requisitos,
    };
    deps.artefatos.gravarJson(vaga.id, "analise.json", recalculada);
    const { score, eliminada } = aplicarAderencia(deps, vaga, recalculada);
    if (!eliminada && score >= deps.config.scoreMinimo) {
      deps.vagas.transicionar(vaga.id, "NOVA");
      reabertas++;
    }
  }
  return reabertas;
}

/**
 * `outbox preparar`: para cada vaga NOVA (ou com erro dentro do limite de tentativas), resolve, extrai,
 * analisa, deduplica, aplica o corte de aderência, gera o currículo camaleão e pré-responde os campos.
 * A falha de uma vaga não interrompe o lote; limite de uso e cancelamento encerram de forma ordenada.
 */
export async function prepararVagas(
  deps: DepsPrepararVagas,
  entrada: EntradaPrepararVagas,
  sinal: AbortSignal,
): Promise<ResumoPreparo> {
  const reavaliadas = entrada.reavaliar ? reavaliarDescartadas(deps) : 0;
  const elegiveis = deps.vagas
    .listarPorStatus(["NOVA", "ERRO_PREPARO"])
    .filter((v) => v.status === "NOVA" || v.tentativasPreparo < deps.config.maxTentativas);
  const erros: ErroPreparo[] = [];
  let interrompido: ResumoPreparo["interrompido"] = null;

  if (elegiveis.length > 0) {
    deps.curriculo.lerMaster();
    deps.curriculo.lerPerfil();
    const paralelo = entrada.paralelo ?? deps.config.paralelo;
    deps.progresso.emitir({
      tipo: "inicio",
      total: elegiveis.length,
      paralelo: Math.min(paralelo, elegiveis.length),
    });
    await garantirMasterGenerico(deps, sinal);
    try {
      await executarComLimite(
        elegiveis,
        paralelo,
        async (vaga, s) => {
          try {
            await processarVaga(deps, vaga, entrada, s);
            const final = deps.vagas.buscar(vaga.id) ?? vaga;
            deps.progresso.emitir({ tipo: "concluida", vaga: final, erro: null });
          } catch (erro) {
            if (s.aborted || erro instanceof ErroLimiteUso) throw erro;
            const motivo = motivoDoErro(erro);
            const mensagem = erro instanceof Error ? erro.message : String(erro);
            if (!(erro instanceof ErroOutbox)) {
              deps.registrador.erro(`erro inesperado na vaga #${String(vaga.id)}`, { erro });
            }
            const atual = deps.vagas.buscar(vaga.id);
            if (atual && (atual.status === "NOVA" || atual.status === "ERRO_PREPARO")) {
              deps.vagas.atualizar(vaga.id, { tentativasPreparo: atual.tentativasPreparo + 1 });
              deps.vagas.transicionar(vaga.id, "ERRO_PREPARO", { motivo });
            }
            erros.push({ id: vaga.id, motivo, mensagem });
            const final = deps.vagas.buscar(vaga.id) ?? vaga;
            deps.progresso.emitir({ tipo: "concluida", vaga: final, erro: mensagem });
          }
        },
        sinal,
      );
    } catch (erro) {
      if (erro instanceof ErroLimiteUso) interrompido = "limite";
      else if (sinal.aborted) interrompido = "cancelado";
      else throw erro;
    }
    if (sinal.aborted) interrompido = "cancelado";
  }

  const ids = new Set(elegiveis.map((v) => v.id));
  const finais = deps.vagas.listarPorStatus(
    ["NOVA", "PRONTA", "ERRO_PREPARO", "DESCARTADA", "DUPLICADA", "MANUAL"],
    { ids: [...ids] },
  );
  const contagens: Partial<Record<Status, number>> = {};
  for (const v of finais) contagens[v.status] = (contagens[v.status] ?? 0) + 1;

  if (interrompido === "limite") {
    deps.notificador.notificar(
      "Outbox",
      `Outbox: limite de uso do Claude atingido. ${String(contagens.NOVA ?? 0)} vagas aguardando novo \`preparar\`.`,
    );
  } else if (interrompido === null && elegiveis.length > 0) {
    deps.notificador.notificar(
      "Outbox",
      `Outbox: preparar concluído. ${String(contagens.PRONTA ?? 0)} prontas, ${String(contagens.DESCARTADA ?? 0)} descartadas, ` +
        `${String(contagens.ERRO_PREPARO ?? 0)} com erro, ${String(contagens.MANUAL ?? 0)} manuais.`,
    );
  }
  return { processadas: elegiveis.length, contagens, erros, reavaliadas, interrompido };
}

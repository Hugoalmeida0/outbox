import { calcularAderencia, recalcularComGaps } from "#dominio/analise/aderencia.ts";
import { ErroDominio, ErroCamaleao } from "#dominio/compartilhado/erros.ts";
import {
  contarTentativaPreparo,
  registrarAderencia,
  registrarResolucao,
} from "#dominio/vagas/atualizacoes.ts";
import { decidirDeduplicacaoChave } from "#dominio/vagas/deduplicacao.ts";
import { canonizar } from "#dominio/vagas/motores.ts";
import type { MotivoDe, Status } from "#dominio/vagas/status.ts";
import type { IdVaga, Vaga } from "#dominio/vagas/vaga.ts";
import type { ArquivoAnalise } from "../compartilhado/artefatos.ts";
import { executarComLimite } from "../compartilhado/concorrencia.ts";
import type { ConfigAplicacao } from "../compartilhado/config.ts";
import { transicionarVaga } from "../compartilhado/transicionar-vaga.ts";
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
  ErroVagaIndisponivel,
} from "../portas/erros.ts";
import type { Notificador } from "../portas/notificador.ts";
import type { EtapaPreparo, ProgressoPreparo } from "../portas/progresso-preparo.ts";
import type { Registrador } from "../portas/registrador.ts";
import type { Resolucao } from "../portas/resolvedor-vagas.ts";
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
      | "gravarTransicao"
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

/**
 * Vaga encerrada vira DESCARTADA (não volta a cada `preparar`) e perde a aderência de uma análise antiga,
 * que não vale mais.
 */
function descartarEncerrada(deps: DepsPrepararVagas, id: IdVaga): void {
  const atual = deps.vagas.buscar(id);
  if (!atual || (atual.status !== "NOVA" && atual.status !== "ERRO_PREPARO")) return;
  deps.vagas.atualizar(id, registrarAderencia(null));
  transicionarVaga(deps.vagas, id, "DESCARTADA", { motivo: "vaga_encerrada" });
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
  deps.vagas.atualizar(vaga.id, registrarAderencia(r.score));
  return { score: r.score, eliminada: r.eliminacao !== undefined };
}

/** Dedup por chave: decisão no domínio, aplicada atomicamente. Devolve `true` se a vaga atual foi descartada. */
function deduplicarPorChave(deps: DepsPrepararVagas, id: IdVaga): boolean {
  return deps.vagas.transacao(() => {
    const atual = deps.vagas.buscar(id);
    if (!atual?.chaveDedup) return false;
    const acoes = decidirDeduplicacaoChave(atual, deps.vagas.buscarPorChave(atual.chaveDedup, id));
    for (const acao of acoes) {
      transicionarVaga(deps.vagas, acao.id, "DESCARTADA", {
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

type AvisarEtapa = (nome: EtapaPreparo) => void;

/** Easy Apply: gera o que for possível (currículo e carta) e deixa a vaga para o usuário. */
async function prepararManual(
  deps: DepsPrepararVagas,
  vaga: Vaga,
  resolucao: Resolucao,
  etapa: AvisarEtapa,
  sinal: AbortSignal,
): Promise<void> {
  try {
    etapa("extrair");
    const extraida = await extrairVaga(deps, vaga, resolucao.urlResolvida, sinal);
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
  transicionarVaga(deps.vagas, vaga.id, "MANUAL", {
    motivo: resolucao.manual?.motivo ?? "easy_apply",
  });
}

interface Destino {
  readonly resolucao: Resolucao;
  readonly analise: ArquivoAnalise;
  readonly destinoManual: MotivoDe<"MANUAL"> | null;
}

/** Rota `a_definir`: segue o "como se candidatar" da análise (link, e-mail ou nada). */
async function definirDestino(
  deps: DepsPrepararVagas,
  vaga: Vaga,
  analise: ArquivoAnalise,
  etapa: AvisarEtapa,
  sinal: AbortSignal,
): Promise<Omit<Destino, "resolucao"> & { readonly resolucao?: Resolucao }> {
  const como = analise.comoCandidatar;
  if (como?.tipo === "link") {
    const { canonica, motor } = canonizar(como.valor);
    etapa("resolver");
    const proxima = await deps.resolvedor.resolver(canonica, motor, sinal);
    deps.vagas.atualizar(
      vaga.id,
      registrarResolucao({
        motor: proxima.motor,
        urlResolvida: proxima.urlResolvida,
        rota: proxima.rota,
      }),
    );
    return {
      resolucao: proxima,
      analise,
      destinoManual:
        proxima.rota === "manual" ? (proxima.manual?.motivo ?? "sem_formulario") : null,
    };
  }
  if (como?.tipo === "email") {
    return {
      analise:
        atualizarAnalise(deps.artefatos, vaga, (a) => ({ ...a, destinoEmail: como.valor })) ??
        analise,
      destinoManual: "candidatura_por_email",
    };
  }
  return { analise, destinoManual: "sem_formulario" };
}

/** Descarta a vaga inelegível ou abaixo do score mínimo. Devolve `true` se descartou. */
function descartarPorAderencia(
  deps: DepsPrepararVagas,
  vaga: Vaga,
  analise: ArquivoAnalise,
  forcar: boolean,
): boolean {
  const { score, eliminada } = aplicarAderencia(deps, vaga, analise);
  if (eliminada) {
    transicionarVaga(deps.vagas, vaga.id, "DESCARTADA", { motivo: "afirmativa_inelegivel" });
    return true;
  }
  if (score < deps.config.scoreMinimo && !forcar) {
    transicionarVaga(deps.vagas, vaga.id, "DESCARTADA", { motivo: "aderencia_baixa" });
    return true;
  }
  return false;
}

/**
 * Com conector, lê os campos do formulário e já deixa as respostas sugeridas. Usa a URL da resolução
 * final: na rota `a_definir`, é a do ATS para onde o anúncio apontou, não a do anúncio.
 */
async function preResponderCampos(
  deps: DepsPrepararVagas,
  vaga: Vaga,
  analise: ArquivoAnalise,
  resolucao: Resolucao,
  sinal: AbortSignal,
): Promise<void> {
  const campos = await deps.catalogo
    .para(resolucao.motor)
    ?.lerCampos?.(resolucao.urlResolvida, sinal);
  if (!campos || campos.length === 0) return;
  deps.artefatos.gravarJson(vaga.id, "campos.json", campos);
  salvarRespostas(
    deps.artefatos,
    vaga,
    await responderCampos(deps, { vaga, analise }, campos, sinal),
  );
}

async function processarVaga(
  deps: DepsPrepararVagas,
  original: Vaga,
  entrada: EntradaPrepararVagas,
  sinal: AbortSignal,
): Promise<void> {
  const etapa: AvisarEtapa = (nome) => {
    avisarEtapa(deps, original.id, nome);
  };
  etapa("resolver");
  const resolvida = await resolverVaga(deps, original, sinal);
  if (resolvida.tipo === "duplicada") return;
  let { vaga } = resolvida;
  const url = resolvida.resolucao.urlResolvida;
  if (resolvida.resolucao.rota === "manual") {
    await prepararManual(deps, vaga, resolvida.resolucao, etapa, sinal);
    return;
  }

  etapa("extrair");
  const extraida = await extrairVaga(deps, vaga, url, sinal);
  etapa("analisar");
  const analisada = await analisarVaga(deps, vaga, extraida, sinal);
  const destino: Destino =
    resolvida.resolucao.rota === "a_definir"
      ? {
          resolucao: resolvida.resolucao,
          ...(await definirDestino(deps, vaga, analisada, etapa, sinal)),
        }
      : { resolucao: resolvida.resolucao, analise: analisada, destinoManual: null };

  if (deduplicarPorChave(deps, vaga.id)) return;
  vaga = deps.vagas.buscar(vaga.id) ?? vaga;
  if (descartarPorAderencia(deps, vaga, destino.analise, entrada.forcar)) return;

  const analise = lerAnalise(deps.artefatos, vaga) ?? destino.analise;
  etapa("gerar_curriculo");
  await gerarCurriculo(deps, vaga, analise, sinal);
  vaga = deps.vagas.buscar(vaga.id) ?? vaga;

  if (destino.destinoManual !== null) {
    etapa("gerar_carta");
    await gerarCartaAvulsa(deps, { vaga, analise }, sinal);
    transicionarVaga(deps.vagas, vaga.id, "MANUAL", { motivo: destino.destinoManual });
    return;
  }
  if (destino.resolucao.rota === "conector") {
    etapa("responder_campos");
    await preResponderCampos(deps, vaga, analise, destino.resolucao, sinal);
  }
  transicionarVaga(deps.vagas, vaga.id, "PRONTA");
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
      transicionarVaga(deps.vagas, vaga.id, "NOVA");
      reabertas++;
    }
  }
  return reabertas;
}

/**
 * `camaleao preparar`: para cada vaga NOVA (ou com erro dentro do limite de tentativas), resolve, extrai,
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
            if (erro instanceof ErroVagaIndisponivel) {
              descartarEncerrada(deps, vaga.id);
              const final = deps.vagas.buscar(vaga.id) ?? vaga;
              deps.progresso.emitir({ tipo: "concluida", vaga: final, erro: null });
              return;
            }
            const motivo = motivoDoErro(erro);
            const mensagem = erro instanceof Error ? erro.message : String(erro);
            if (!(erro instanceof ErroCamaleao)) {
              deps.registrador.erro(`erro inesperado na vaga #${String(vaga.id)}`, { erro });
            }
            const atual = deps.vagas.buscar(vaga.id);
            if (atual && (atual.status === "NOVA" || atual.status === "ERRO_PREPARO")) {
              deps.vagas.atualizar(vaga.id, contarTentativaPreparo(atual));
              transicionarVaga(deps.vagas, vaga.id, "ERRO_PREPARO", { motivo });
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
      "Camaleão",
      `Camaleão: limite de uso do Claude atingido. ${String(contagens.NOVA ?? 0)} vagas aguardando novo \`preparar\`.`,
    );
  } else if (interrompido === null && elegiveis.length > 0) {
    deps.notificador.notificar(
      "Camaleão",
      `Camaleão: preparar concluído. ${String(contagens.PRONTA ?? 0)} prontas, ${String(contagens.DESCARTADA ?? 0)} descartadas, ` +
        `${String(contagens.ERRO_PREPARO ?? 0)} com erro, ${String(contagens.MANUAL ?? 0)} manuais.`,
    );
  }
  return { processadas: elegiveis.length, contagens, erros, reavaliadas, interrompido };
}

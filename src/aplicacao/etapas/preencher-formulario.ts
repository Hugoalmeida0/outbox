import { listaPii } from "#dominio/falhas/pii.ts";
import { sanitizarHtml } from "#dominio/falhas/sanitizar.ts";
import type { PacoteCandidatura } from "#dominio/respostas/pacote.ts";
import { padroesHostDoMotor } from "#dominio/vagas/motores.ts";
import type { MotivoDe } from "#dominio/vagas/status.ts";
import type { Vaga } from "#dominio/vagas/vaga.ts";
import type { ArmazemCurriculo } from "../portas/armazem-curriculo.ts";
import type { CatalogoConectores } from "../portas/catalogo-conectores.ts";
import type { CtxPreenchimento } from "../portas/conector-ats.ts";
import { ErroFalhaConector, ErroLimiteUso } from "../portas/erros.ts";
import type { ExecutorAgente, ResultadoAgente } from "../portas/executor-agente.ts";
import type { FormularioAberto } from "../portas/formulario-aberto.ts";
import type { RegistroFalhas } from "../portas/registro-falhas.ts";
import type { Relogio } from "../portas/relogio.ts";

export interface DepsPreencherFormulario {
  readonly catalogo: CatalogoConectores;
  readonly agente: ExecutorAgente;
  readonly falhas: RegistroFalhas;
  readonly curriculo: Pick<ArmazemCurriculo, "lerMaster" | "lerPerfil">;
  readonly relogio: Relogio;
  readonly agenteMaxTurnos: number;
  readonly agenteTimeoutMin: number;
}

export type ResultadoPreenchimento =
  | {
      readonly tipo: "formulario";
      readonly formulario: FormularioAberto;
      readonly perguntasNaHora: readonly { readonly rotulo: string; readonly valor: string }[];
    }
  | { readonly tipo: "manual"; readonly motivo: MotivoDe<"MANUAL"> };

function paraResultado(agente: ResultadoAgente): ResultadoPreenchimento {
  switch (agente.tipo) {
    case "pronto":
      return {
        tipo: "formulario",
        formulario: agente.formulario,
        perguntasNaHora: agente.perguntasRespondidasNaHora,
      };
    case "sem_formulario":
      return { tipo: "manual", motivo: "sem_formulario" };
    case "easy_apply":
      return { tipo: "manual", motivo: "easy_apply" };
    case "teto":
      return { tipo: "manual", motivo: "teto_agente" };
  }
}

async function htmlSanitizado(
  deps: DepsPreencherFormulario,
  formulario: FormularioAberto | undefined,
): Promise<string> {
  if (!formulario) return "";
  const html = await formulario.capturarHtml().catch(() => "");
  let pii: string[];
  try {
    const perfil = deps.curriculo.lerPerfil();
    pii = listaPii(deps.curriculo.lerMaster().pessoal, perfil);
  } catch {
    pii = listaPii(deps.curriculo.lerMaster().pessoal);
  }
  return sanitizarHtml(html, pii);
}

type ExecucaoAgente =
  | { readonly tipo: "ok"; readonly resultado: ResultadoAgente }
  | { readonly tipo: "erro"; readonly mensagem: string; readonly stack: string | null };

/**
 * Roda o agente convertendo um erro inesperado (ex.: o `claude -p` quebrou) em resultado, para que a falha
 * seja registrada. Cancelamento e limite de uso continuam interrompendo o `aplicar`.
 */
async function executarAgente(
  deps: DepsPreencherFormulario,
  entrada: EntradaAgente,
  ctx: CtxPreenchimento,
  sinal: AbortSignal,
): Promise<ExecucaoAgente> {
  try {
    const resultado = await deps.agente.preencher(
      entrada,
      { aguardarUsuario: (m) => ctx.aguardarUsuario(m) },
      sinal,
    );
    return { tipo: "ok", resultado };
  } catch (erro) {
    if (sinal.aborted || erro instanceof ErroLimiteUso) throw erro;
    const e = erro instanceof Error ? erro : new Error(String(erro));
    return { tipo: "erro", mensagem: e.message.slice(0, 500), stack: e.stack ?? null };
  }
}

/** Dados comuns a uma tentativa de preenchimento: entrada do agente e base do registro de falha. */
interface Tentativa {
  readonly url: string;
  readonly entradaAgente: EntradaAgente;
  readonly registroBase: {
    readonly motor: Vaga["motor"];
    readonly dominio: string;
    readonly url: string;
    readonly idVaga: Vaga["id"];
    readonly data: string;
    readonly resolvida: false;
  };
}

type EntradaAgente = Parameters<ExecutorAgente["preencher"]>[0];

function montarTentativa(
  deps: DepsPreencherFormulario,
  vaga: Vaga,
  pacote: PacoteCandidatura,
): Tentativa {
  const url = vaga.urlResolvida ?? vaga.urlCanonica;
  const host = new URL(url).hostname;
  return {
    url,
    entradaAgente: {
      vaga,
      urlCandidatura: url,
      pacote,
      hostsPermitidos: [host, ...padroesHostDoMotor(vaga.motor)],
      saldo: { turnos: deps.agenteMaxTurnos, ms: deps.agenteTimeoutMin * 60_000 },
    },
    registroBase: {
      motor: vaga.motor,
      dominio: host,
      url,
      idVaga: vaga.id,
      data: deps.relogio.agoraIso(),
      resolvida: false,
    },
  };
}

function agenteFalhou(ctx: CtxPreenchimento, mensagem: string): ResultadoPreenchimento {
  ctx.informar(`o agente falhou (${mensagem}); a vaga fica para você`);
  return { tipo: "manual", motivo: "teto_agente" };
}

/** O conector parou: registra a falha em `falhas/` e o agente assume com o contexto do passo. */
async function assumirAposConector(
  deps: DepsPreencherFormulario,
  conector: { readonly motor: string; readonly versao: string },
  erro: ErroFalhaConector,
  tentativa: Tentativa,
  ctx: CtxPreenchimento,
  sinal: AbortSignal,
): Promise<ResultadoPreenchimento> {
  ctx.informar(
    `o conector parou em "${erro.passo}"; o agente (Claude) assume a partir daí, o que pode levar alguns minutos…`,
  );
  const idRegistro = deps.falhas.registrar(
    {
      ...tentativa.registroBase,
      tipo: "falha_conector",
      conector: conector.motor,
      versaoConector: conector.versao,
      passo: erro.passo,
      seletor: erro.seletor,
      erro: erro.message,
      stack: erro.stack ?? null,
      resultadoAgente: null,
      passosAgente: [],
    },
    await htmlSanitizado(deps, erro.formulario),
  );
  const execucao = await executarAgente(
    deps,
    {
      ...tentativa.entradaAgente,
      contextoFalha: {
        passo: erro.passo,
        erro: erro.message,
        url: erro.formulario?.urlAtual() ?? tentativa.url,
      },
    },
    ctx,
    sinal,
  );
  if (execucao.tipo === "erro") {
    deps.falhas.atualizar(idRegistro, { resultadoAgente: `erro: ${execucao.mensagem}` });
    return agenteFalhou(ctx, execucao.mensagem);
  }
  const resultado = execucao.resultado;
  deps.falhas.atualizar(idRegistro, {
    resultadoAgente: resultado.tipo,
    passosAgente: resultado.passos,
  });
  return paraResultado(resultado);
}

/** Sem conector: o agente preenche e a vaga fica registrada em `_sem-conector`. */
async function preencherComAgente(
  deps: DepsPreencherFormulario,
  vaga: Vaga,
  tentativa: Tentativa,
  ctx: CtxPreenchimento,
  sinal: AbortSignal,
): Promise<ResultadoPreenchimento> {
  ctx.informar(
    `sem conector para ${vaga.motor}: o agente (Claude) preenche o formulário, o que pode levar alguns minutos…`,
  );
  const registroSemConector = {
    ...tentativa.registroBase,
    tipo: "sem_conector",
    conector: null,
    versaoConector: null,
    passo: null,
    seletor: null,
  } as const;
  const execucao = await executarAgente(deps, tentativa.entradaAgente, ctx, sinal);
  if (execucao.tipo === "erro") {
    // Mesmo quebrando, o agente deixa registro: sem ele, a vaga some de `camaleao falhas`.
    deps.falhas.registrar(
      {
        ...registroSemConector,
        erro: execucao.mensagem,
        stack: execucao.stack,
        resultadoAgente: "erro",
        passosAgente: [],
      },
      "",
    );
    return agenteFalhou(ctx, execucao.mensagem);
  }
  const resultado = execucao.resultado;
  deps.falhas.registrar(
    {
      ...registroSemConector,
      erro: null,
      stack: null,
      resultadoAgente: resultado.tipo,
      passosAgente: resultado.passos,
    },
    await htmlSanitizado(deps, resultado.tipo === "pronto" ? resultado.formulario : undefined),
  );
  return paraResultado(resultado);
}

/**
 * Abre e preenche o formulário: com conector, usa-o; se ele falhar, registra a falha em `falhas/` e o
 * agente assume com o contexto; sem conector, o agente preenche e a vaga é registrada em `_sem-conector`.
 */
export async function preencherFormulario(
  deps: DepsPreencherFormulario,
  vaga: Vaga,
  pacote: PacoteCandidatura,
  ctx: CtxPreenchimento,
  sinal: AbortSignal,
): Promise<ResultadoPreenchimento> {
  const tentativa = montarTentativa(deps, vaga, pacote);
  const conector = vaga.rota === "conector" ? deps.catalogo.para(vaga.motor) : null;
  if (!conector) return preencherComAgente(deps, vaga, tentativa, ctx, sinal);
  try {
    const formulario = await conector.abrirEPreencher(tentativa.url, pacote, ctx, sinal);
    return { tipo: "formulario", formulario, perguntasNaHora: [] };
  } catch (erro) {
    if (!(erro instanceof ErroFalhaConector)) throw erro;
    return assumirAposConector(deps, conector, erro, tentativa, ctx, sinal);
  }
}

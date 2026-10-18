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
  entrada: Parameters<ExecutorAgente["preencher"]>[0],
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
  const url = vaga.urlResolvida ?? vaga.urlCanonica;
  const host = new URL(url).hostname;
  const entradaAgente = {
    vaga,
    urlCandidatura: url,
    pacote,
    hostsPermitidos: [host, ...padroesHostDoMotor(vaga.motor)],
    saldo: { turnos: deps.agenteMaxTurnos, ms: deps.agenteTimeoutMin * 60_000 },
  };
  const registroBase = {
    motor: vaga.motor,
    dominio: host,
    url,
    idVaga: vaga.id,
    data: deps.relogio.agoraIso(),
    resolvida: false,
  };
  const conector = vaga.rota === "conector" ? deps.catalogo.para(vaga.motor) : null;

  if (conector) {
    try {
      const formulario = await conector.abrirEPreencher(url, pacote, ctx, sinal);
      return { tipo: "formulario", formulario, perguntasNaHora: [] };
    } catch (erro) {
      if (!(erro instanceof ErroFalhaConector)) throw erro;
      ctx.informar(
        `o conector parou em "${erro.passo}"; o agente (Claude) assume a partir daí, o que pode levar alguns minutos…`,
      );
      const idRegistro = deps.falhas.registrar(
        {
          ...registroBase,
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
          ...entradaAgente,
          contextoFalha: {
            passo: erro.passo,
            erro: erro.message,
            url: erro.formulario?.urlAtual() ?? url,
          },
        },
        ctx,
        sinal,
      );
      if (execucao.tipo === "erro") {
        deps.falhas.atualizar(idRegistro, { resultadoAgente: `erro: ${execucao.mensagem}` });
        ctx.informar(`o agente falhou (${execucao.mensagem}); a vaga fica para você`);
        return { tipo: "manual", motivo: "teto_agente" };
      }
      const resultado = execucao.resultado;
      deps.falhas.atualizar(idRegistro, {
        resultadoAgente: resultado.tipo,
        passosAgente: resultado.passos,
      });
      return paraResultado(resultado);
    }
  }

  ctx.informar(
    `sem conector para ${vaga.motor}: o agente (Claude) preenche o formulário, o que pode levar alguns minutos…`,
  );
  const execucao = await executarAgente(deps, entradaAgente, ctx, sinal);
  if (execucao.tipo === "erro") {
    // Mesmo quebrando, o agente deixa registro: sem ele, a vaga some de `outbox falhas`.
    deps.falhas.registrar(
      {
        ...registroBase,
        tipo: "sem_conector",
        conector: null,
        versaoConector: null,
        passo: null,
        seletor: null,
        erro: execucao.mensagem,
        stack: execucao.stack,
        resultadoAgente: "erro",
        passosAgente: [],
      },
      "",
    );
    ctx.informar(`o agente falhou (${execucao.mensagem}); a vaga fica para você`);
    return { tipo: "manual", motivo: "teto_agente" };
  }
  const resultado = execucao.resultado;
  deps.falhas.registrar(
    {
      ...registroBase,
      tipo: "sem_conector",
      conector: null,
      versaoConector: null,
      passo: null,
      seletor: null,
      erro: null,
      stack: null,
      resultadoAgente: resultado.tipo,
      passosAgente: resultado.passos,
    },
    await htmlSanitizado(deps, resultado.tipo === "pronto" ? resultado.formulario : undefined),
  );
  return paraResultado(resultado);
}

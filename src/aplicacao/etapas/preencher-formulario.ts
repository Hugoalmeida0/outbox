import { listaPii } from "#dominio/falhas/pii.ts";
import { sanitizarHtml } from "#dominio/falhas/sanitizar.ts";
import type { PacoteCandidatura } from "#dominio/respostas/pacote.ts";
import { padroesHostDoMotor } from "#dominio/vagas/motores.ts";
import type { MotivoDe } from "#dominio/vagas/status.ts";
import type { Vaga } from "#dominio/vagas/vaga.ts";
import type { ArmazemCurriculo } from "../portas/armazem-curriculo.ts";
import type { CatalogoConectores } from "../portas/catalogo-conectores.ts";
import type { CtxPreenchimento } from "../portas/conector-ats.ts";
import { ErroFalhaConector } from "../portas/erros.ts";
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
      const resultado = await deps.agente.preencher(
        {
          ...entradaAgente,
          contextoFalha: {
            passo: erro.passo,
            erro: erro.message,
            url: erro.formulario?.urlAtual() ?? url,
          },
        },
        { aguardarUsuario: (m) => ctx.aguardarUsuario(m) },
        sinal,
      );
      deps.falhas.atualizar(idRegistro, {
        resultadoAgente: resultado.tipo,
        passosAgente: resultado.passos,
      });
      return paraResultado(resultado);
    }
  }

  const resultado = await deps.agente.preencher(
    entradaAgente,
    { aguardarUsuario: (m) => ctx.aguardarUsuario(m) },
    sinal,
  );
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

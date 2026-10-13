// Monta as dependências dos casos de uso com fakes de porta e SQLite :memory: (arquitetura.md §11.1).
import type { ConfigAplicacao } from "#aplicacao/compartilhado/config.ts";
import type { DepsAplicarVagas } from "#aplicacao/casos-de-uso/aplicar-vagas.ts";
import type { DepsPrepararVagas } from "#aplicacao/casos-de-uso/preparar-vagas.ts";
import type { Master } from "#dominio/curriculo/master.ts";
import type { Perfil } from "#dominio/respostas/perfil.ts";
import type { NovaVaga, Vaga } from "#dominio/vagas/vaga.ts";
import { canonizar } from "#dominio/vagas/motores.ts";
import { umMaster, umPerfil } from "./builders.ts";
import {
  ArmazemArtefatosMemoria,
  ArmazemCurriculoMemoria,
  ExtratorFake,
  RegistroFalhasMemoria,
  RenderizadorFake,
  ResolvedorFake,
} from "./fakes/armazens.ts";
import {
  InteracaoRoteirizada,
  NotificadorEspiao,
  RegistradorMemoria,
  RelogioFixo,
} from "./fakes/basicos.ts";
import { CatalogoConectoresFake, ExecutorAgenteFake } from "./fakes/formularios.ts";
import { GeradorEstruturadoRoteirizado } from "./fakes/llm.ts";
import { criarRepositorioMemoria } from "./repositorio-memoria.ts";

export const CONFIG_TESTE: ConfigAplicacao = {
  scoreMinimo: 60,
  paralelo: 2,
  maxTentativas: 3,
  gupyAnexoPorCandidatura: true,
  agenteMaxTurnos: 40,
  agenteTimeoutMin: 10,
  cartaMaxPalavras: 200,
};

export interface AmbienteAplicacao {
  readonly vagas: ReturnType<typeof criarRepositorioMemoria>;
  readonly curriculo: ArmazemCurriculoMemoria;
  readonly artefatos: ArmazemArtefatosMemoria;
  readonly falhas: RegistroFalhasMemoria;
  readonly gerador: GeradorEstruturadoRoteirizado;
  readonly resolvedor: ResolvedorFake;
  readonly extrator: ExtratorFake;
  readonly renderizador: RenderizadorFake;
  readonly catalogo: CatalogoConectoresFake;
  readonly agente: ExecutorAgenteFake;
  readonly notificador: NotificadorEspiao;
  readonly registrador: RegistradorMemoria;
  readonly relogio: RelogioFixo;
  interacao: InteracaoRoteirizada;
  config: ConfigAplicacao;
  readonly deps: () => DepsPrepararVagas & DepsAplicarVagas;
  inserirVaga(url: string, extra?: Partial<NovaVaga>): Vaga;
}

export function criarAmbienteAplicacao(
  opcoes: {
    master?: Master;
    perfil?: Perfil;
    catalogo?: CatalogoConectoresFake;
    agente?: ExecutorAgenteFake;
  } = {},
): AmbienteAplicacao {
  const relogio = new RelogioFixo();
  const ambiente: AmbienteAplicacao = {
    vagas: criarRepositorioMemoria(relogio),
    curriculo: new ArmazemCurriculoMemoria(
      opcoes.master ?? umMaster(),
      opcoes.perfil ?? umPerfil(),
    ),
    artefatos: new ArmazemArtefatosMemoria(),
    falhas: new RegistroFalhasMemoria(),
    gerador: new GeradorEstruturadoRoteirizado(),
    resolvedor: new ResolvedorFake(),
    extrator: new ExtratorFake(),
    renderizador: new RenderizadorFake(),
    catalogo: opcoes.catalogo ?? new CatalogoConectoresFake(),
    agente: opcoes.agente ?? new ExecutorAgenteFake(),
    notificador: new NotificadorEspiao(),
    registrador: new RegistradorMemoria(),
    relogio,
    interacao: new InteracaoRoteirizada(),
    config: CONFIG_TESTE,
    deps: () => ({
      vagas: ambiente.vagas,
      curriculo: ambiente.curriculo,
      artefatos: ambiente.artefatos,
      falhas: ambiente.falhas,
      gerador: ambiente.gerador,
      resolvedor: ambiente.resolvedor,
      extrator: ambiente.extrator,
      renderizador: ambiente.renderizador,
      catalogo: ambiente.catalogo,
      agente: ambiente.agente,
      notificador: ambiente.notificador,
      registrador: ambiente.registrador,
      relogio: ambiente.relogio,
      interacao: ambiente.interacao,
      config: ambiente.config,
      cartaMaxPalavras: ambiente.config.cartaMaxPalavras,
    }),
    inserirVaga(url, extra = {}) {
      const { canonica, motor } = canonizar(url);
      return ambiente.vagas.inserir({
        urlOriginal: url,
        canal: motor,
        urlCanonica: canonica,
        motor,
        status: "NOVA",
        ...extra,
      });
    },
  };
  return ambiente;
}

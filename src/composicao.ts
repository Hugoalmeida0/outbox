// Raiz de composição (ADR-006): instancia a infra sob demanda e entrega os casos de uso prontos.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { abrirNavegador } from "#aplicacao/casos-de-uso/abrir-navegador.ts";
import { adicionarVagas, type ItemAdicao } from "#aplicacao/casos-de-uso/adicionar-vagas.ts";
import {
  aplicarVagas,
  type EntradaAplicarVagas,
  type ResumoAplicacao,
} from "#aplicacao/casos-de-uso/aplicar-vagas.ts";
import {
  importarCurriculo,
  type EntradaImportarCurriculo,
  type SaidaImportarCurriculo,
} from "#aplicacao/casos-de-uso/importar-curriculo.ts";
import { listarFalhas, type DadosFalhas } from "#aplicacao/casos-de-uso/listar-falhas.ts";
import { listarStatus, type DadosStatus } from "#aplicacao/casos-de-uso/listar-status.ts";
import {
  prepararVagas,
  type EntradaPrepararVagas,
  type ResumoPreparo,
} from "#aplicacao/casos-de-uso/preparar-vagas.ts";
import {
  registrarRetorno,
  type EntradaRegistrarRetorno,
} from "#aplicacao/casos-de-uso/registrar-retorno.ts";
import { renderizarMaster } from "#aplicacao/casos-de-uso/renderizar-master.ts";
import type { ConfigAplicacao } from "#aplicacao/compartilhado/config.ts";
import type { Interacao } from "#aplicacao/portas/interacao.ts";
import type { ProgressoPreparo } from "#aplicacao/portas/progresso-preparo.ts";
import { listaPii } from "#dominio/falhas/pii.ts";
import type { Status } from "#dominio/vagas/status.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { ExecutorAgenteClaude } from "#infra/agente/executor-agente-claude.ts";
import { ArmazemArtefatosFs } from "#infra/armazenamento/armazem-artefatos-fs.ts";
import { ArmazemCurriculoYaml } from "#infra/armazenamento/armazem-curriculo-yaml.ts";
import { CacheRespostasJson } from "#infra/armazenamento/cache-respostas-json.ts";
import { RegistroFalhasFs } from "#infra/armazenamento/registro-falhas-fs.ts";
import { migrarBancoLegado } from "#infra/banco/banco-legado.ts";
import { abrirConexao } from "#infra/banco/conexao.ts";
import { migrar } from "#infra/banco/migrador.ts";
import { RepositorioVagasSqlite } from "#infra/banco/repositorio-vagas-sqlite.ts";
import { CatalogoConectoresPlaywright } from "#infra/conectores/registry/catalogo.ts";
import { DEFINICOES_V1 } from "#infra/conectores/registry/definicoes.ts";
import { carregarConfig } from "#infra/config/carregar-config.ts";
import type { Config } from "#infra/config/esquema-config.ts";
import { lerVariavel } from "#infra/config/variaveis.ts";
import { CofreCredenciaisJson } from "#infra/credenciais/cofre-credenciais-json.ts";
import { ServicoSegredos } from "#infra/credenciais/servico-segredos.ts";
import { RenderizadorPdfPlaywright } from "#infra/documentos/renderizador-pdf-playwright.ts";
import { ExtratorEstrutural } from "#infra/extracao/extrator-estrutural.ts";
import { GeradorEstruturadoClaude } from "#infra/llm/gerador-estruturado-claude.ts";
import { executarClaude } from "#infra/llm/processo-claude.ts";
import { nivelDoAmbiente, RegistradorJsonl, type NivelLog } from "#infra/log/registrador-jsonl.ts";
import { LeitorHeadless } from "#infra/navegador/leitor-headless.ts";
import { NavegadorCamaleao } from "#infra/navegador/navegador-camaleao.ts";
import { NotificadorWindows } from "#infra/notificacao/notificador-windows.ts";
import {
  eloAgregadores,
  eloDetectarAts,
  eloDireto,
  eloGithub,
  eloPortalGupy,
  ResolvedorEncadeado,
} from "#infra/resolucao/chain-of-responsibility/resolvedor-encadeado.ts";
import { criarCaminhos, RAIZ, type Caminhos } from "#infra/sistema/caminhos.ts";
import { ClienteHttpFetch } from "#infra/sistema/cliente-http.ts";
import { RelogioSistema } from "#infra/sistema/relogio-sistema.ts";
import { adquirirTrava, type Trava } from "#infra/sistema/trava-processo.ts";

export type { NivelLog };

export interface OpcoesContainer {
  /** Raiz dos dados do usuário (`curriculo/`, `dados/`, `falhas/`, `config.yaml`); os testes usam uma pasta temporária. */
  readonly raiz?: string;
  /** Raiz do código (`prompts/`, `curriculo.exemplo/`, migrações). */
  readonly raizCodigo?: string;
  readonly config?: Config;
  readonly nivelLog?: NivelLog;
  readonly escreverTerminal?: (linha: string, nivel: NivelLog) => void;
}

/** Casos de uso com as dependências já resolvidas: o que a interface chama. */
export interface CasosDeUso {
  importarCurriculo(
    entrada: EntradaImportarCurriculo,
    sinal: AbortSignal,
  ): Promise<SaidaImportarCurriculo>;
  adicionarVagas(urls: readonly string[]): ItemAdicao[];
  prepararVagas(
    entrada: EntradaPrepararVagas,
    progresso: ProgressoPreparo,
    sinal: AbortSignal,
  ): Promise<ResumoPreparo>;
  aplicarVagas(
    entrada: EntradaAplicarVagas,
    interacao: Interacao,
    sinal: AbortSignal,
  ): Promise<ResumoAplicacao>;
  listarStatus(entrada: { readonly status?: Status }): DadosStatus;
  registrarRetorno(entrada: EntradaRegistrarRetorno): void;
  listarFalhas(): DadosFalhas;
  renderizarMaster(sinal: AbortSignal): Promise<{ pdf: string; paginas: number }>;
  abrirNavegador(): Promise<void>;
}

export interface Container {
  readonly caminhos: Caminhos;
  readonly config: Config;
  readonly casos: CasosDeUso;
  /** Garante execução exclusiva de `preparar` e `aplicar` (ADR-016). */
  adquirirTrava(comando: "preparar" | "aplicar"): Trava;
  /** Registro de erros e avisos da interface (o stack vai só para o log). */
  registrarErro(mensagem: string, erro: unknown): void;
  /** Serviço das ferramentas do MCP `camaleao-segredos`, ligado ao navegador do Camaleão por CDP. */
  criarServicoSegredos(opcoes: {
    readonly vagaId: IdVaga | null;
    readonly hostsPermitidos: readonly string[];
  }): ServicoSegredos;
  /** Nomes das implementações já instanciadas (diagnóstico e testes de inicialização preguiçosa). */
  instanciados(): ReadonlySet<string>;
  /** Fecha o banco, o leitor headless e a conexão CDP. Idempotente. */
  encerrar(): Promise<void>;
}

/** Converte a configuração da infra no recorte que os casos de uso conhecem. */
export function configAplicacao(config: Config): ConfigAplicacao {
  return {
    scoreMinimo: config.aderencia.scoreMinimo,
    paralelo: config.preparar.paralelo,
    maxTentativas: config.preparar.maxTentativas,
    gupyAnexoPorCandidatura: config.gupy.anexoPorCandidatura,
    agenteMaxTurnos: config.agente.maxTurnos,
    agenteTimeoutMin: config.agente.timeoutMin,
    cartaMaxPalavras: config.carta.maxPalavras,
  };
}

type Preguicoso = <T>(nome: string, criar: () => T) => () => T;

/** Getter preguiçoso: a implementação só é criada no primeiro acesso, e o nome entra em `criados`. */
function criarPreguicoso(criados: Set<string>): Preguicoso {
  return <T>(nome: string, criar: () => T): (() => T) => {
    let instancia: { valor: T } | null = null;
    return () => {
      if (!instancia) {
        instancia = { valor: criar() };
        criados.add(nome);
      }
      return instancia.valor;
    };
  };
}

/** Relógio, currículo, log e persistência local (banco, artefatos, falhas e cache). */
function criarLocais(caminhos: Caminhos, opcoes: OpcoesContainer, preguicoso: Preguicoso) {
  const relogio = preguicoso("relogio", () => new RelogioSistema());
  const curriculo = preguicoso("curriculo", () => new ArmazemCurriculoYaml(caminhos, relogio()));
  const registrador = preguicoso(
    "registrador",
    () =>
      new RegistradorJsonl({
        pastaLogs: caminhos.logsDir,
        relogio: relogio(),
        obterPii: () => {
          const master = curriculo().lerMaster();
          try {
            return listaPii(master.pessoal, curriculo().lerPerfil());
          } catch {
            return listaPii(master.pessoal);
          }
        },
        nivel: opcoes.nivelLog ?? nivelDoAmbiente(lerVariavel("LOG")),
        ...(opcoes.escreverTerminal ? { escreverTerminal: opcoes.escreverTerminal } : {}),
      }),
  );
  const db = preguicoso("banco", (): DatabaseSync => {
    mkdirSync(caminhos.dadosDir, { recursive: true });
    migrarBancoLegado(caminhos.dadosDir, (mensagem) => {
      registrador().avisar(mensagem);
    });
    const conexao = abrirConexao(caminhos.db);
    migrar(conexao, caminhos.migracoesDir);
    return conexao;
  });
  const vagas = preguicoso("vagas", () => new RepositorioVagasSqlite(db(), relogio()));
  const artefatos = preguicoso(
    "artefatos",
    () =>
      new ArmazemArtefatosFs(
        caminhos,
        () => curriculo().lerMaster().pessoal.nome,
        (id) => vagas().buscar(id)?.empresa ?? undefined,
      ),
  );
  const falhas = preguicoso("falhas", () => new RegistroFalhasFs(caminhos.falhasDir));
  const cache = preguicoso(
    "cache",
    () =>
      new CacheRespostasJson({
        arquivo: join(caminhos.dadosDir, "cache-respostas.json"),
        dependencias: [caminhos.master, caminhos.perfil],
        relogio: relogio(),
      }),
  );
  return { relogio, curriculo, registrador, db, vagas, artefatos, falhas, cache };
}

type Locais = ReturnType<typeof criarLocais>;

/** HTTP, navegadores, cofre, conectores e resolução de vagas. */
function criarWeb(caminhos: Caminhos, config: Config, locais: Locais, preguicoso: Preguicoso) {
  const { curriculo, registrador, relogio } = locais;
  const http = preguicoso("http", () => new ClienteHttpFetch());
  const leitor = preguicoso("leitor", () => new LeitorHeadless());
  const navegador = preguicoso(
    "navegador",
    () =>
      new NavegadorCamaleao({
        portaCdp: config.navegador.portaCdp,
        executavel: config.navegador.executavel,
        pastaPerfil: caminhos.navegadorDir,
      }),
  );
  const cofre = preguicoso(
    "cofre",
    () =>
      new CofreCredenciaisJson(
        caminhos.credenciais,
        () => curriculo().lerMaster().pessoal.email,
        relogio(),
      ),
  );
  const catalogo = preguicoso(
    "catalogo",
    () =>
      new CatalogoConectoresPlaywright(DEFINICOES_V1, {
        abrirPagina: () => navegador().paginaNova(),
        leitor: leitor(),
        http: http(),
        cofre: cofre(),
      }),
  );
  const resolvedor = preguicoso(
    "resolvedor",
    () =>
      new ResolvedorEncadeado([
        eloDireto,
        eloAgregadores(() => navegador().paginaNova()),
        eloGithub,
        eloPortalGupy(leitor()),
        eloDetectarAts(leitor()),
      ]),
  );
  const extrator = preguicoso(
    "extrator",
    () =>
      new ExtratorEstrutural({
        catalogo: catalogo(),
        leitor: leitor(),
        http: http(),
        registrador: registrador(),
      }),
  );
  const renderizador = preguicoso("renderizador", () => new RenderizadorPdfPlaywright(leitor()));
  return { http, leitor, navegador, cofre, catalogo, resolvedor, extrator, renderizador };
}

type Web = ReturnType<typeof criarWeb>;

/** LLM (gerador estruturado e agente) e notificações. */
function criarAssistentes(
  caminhos: Caminhos,
  config: Config,
  opcoes: OpcoesContainer,
  dependencias: Locais & Web,
  preguicoso: Preguicoso,
) {
  const { artefatos, navegador, registrador } = dependencias;
  const gerador = preguicoso("gerador", () => {
    // Pasta vazia como cwd: o claude não carrega CLAUDE.md, skills nem MCPs do repositório.
    const cwd = join(caminhos.tmpDir, "llm-cwd");
    mkdirSync(cwd, { recursive: true });
    return new GeradorEstruturadoClaude({
      pastaPrompts: caminhos.promptsDir,
      cwd,
      modelo: config.llm.modeloTexto,
      modeloPorTarefa: { tailoring: config.llm.modeloTailoring },
      maxTokensThinking: config.llm.maxTokensThinking,
      timeoutMs: config.llm.timeoutTextoSeg * 1000,
      executar: executarClaude,
    });
  });
  const agente = preguicoso(
    "agente",
    () =>
      new ExecutorAgenteClaude({
        executar: executarClaude,
        paginaMaisRecente: (hosts) => navegador().paginaMaisRecente(hosts),
        garantirNavegador: () => navegador().garantir(),
        endpointCdp: navegador().endpointCdp,
        raiz: opcoes.raizCodigo ?? RAIZ,
        pastaTmp: caminhos.tmpDir,
        pastaPrompts: caminhos.promptsDir,
        modelo: config.llm.modeloAgente,
        modeloReserva: config.llm.modeloAgenteReserva,
        maxTokensThinking: config.llm.maxTokensThinking,
        artefatos: artefatos(),
        registrador: registrador(),
      }),
  );
  const notificador = preguicoso(
    "notificador",
    () => new NotificadorWindows(config.notificacao.toast, registrador()),
  );
  return { gerador, agente, notificador };
}

type Implementacoes = Locais & Web & ReturnType<typeof criarAssistentes>;

/** Liga cada caso de uso às implementações (instanciadas só quando o caso de uso roda). */
function criarCasos(impl: Implementacoes, cfgAplicacao: ConfigAplicacao): CasosDeUso {
  const { vagas, curriculo, artefatos, falhas, gerador, renderizador, catalogo, registrador } =
    impl;
  return {
    importarCurriculo: (entrada, sinal) =>
      importarCurriculo({ curriculo: curriculo(), gerador: gerador() }, entrada, sinal),
    adicionarVagas: (urls) => adicionarVagas({ vagas: vagas() }, { urls }),
    prepararVagas: (entrada, progresso, sinal) =>
      prepararVagas(
        {
          vagas: vagas(),
          curriculo: curriculo(),
          artefatos: artefatos(),
          gerador: gerador(),
          resolvedor: impl.resolvedor(),
          extrator: impl.extrator(),
          renderizador: renderizador(),
          catalogo: catalogo(),
          notificador: impl.notificador(),
          progresso,
          registrador: registrador(),
          relogio: impl.relogio(),
          config: cfgAplicacao,
          cartaMaxPalavras: cfgAplicacao.cartaMaxPalavras,
          cache: impl.cache(),
        },
        entrada,
        sinal,
      ),
    aplicarVagas: (entrada, interacao, sinal) =>
      aplicarVagas(
        {
          vagas: vagas(),
          curriculo: curriculo(),
          artefatos: artefatos(),
          falhas: falhas(),
          gerador: gerador(),
          renderizador: renderizador(),
          catalogo: catalogo(),
          agente: impl.agente(),
          registrador: registrador(),
          relogio: impl.relogio(),
          cache: impl.cache(),
          interacao,
          config: cfgAplicacao,
        },
        entrada,
        sinal,
      ),
    listarStatus: (entrada) => listarStatus({ vagas: vagas(), artefatos: artefatos() }, entrada),
    registrarRetorno: (entrada) => {
      registrarRetorno({ vagas: vagas() }, entrada);
    },
    listarFalhas: () => listarFalhas({ falhas: falhas() }),
    renderizarMaster: (sinal) =>
      renderizarMaster(
        { curriculo: curriculo(), artefatos: artefatos(), renderizador: renderizador() },
        sinal,
      ),
    abrirNavegador: () => abrirNavegador({ navegador: impl.navegador() }),
  };
}

export function criarContainer(opcoes: OpcoesContainer = {}): Container {
  const caminhos = criarCaminhos(opcoes.raiz ?? RAIZ, opcoes.raizCodigo ?? RAIZ);
  const config = opcoes.config ?? carregarConfig(caminhos.config);
  const criados = new Set<string>();
  const preguicoso = criarPreguicoso(criados);

  const locais = criarLocais(caminhos, opcoes, preguicoso);
  const web = criarWeb(caminhos, config, locais, preguicoso);
  const impl: Implementacoes = {
    ...locais,
    ...web,
    ...criarAssistentes(caminhos, config, opcoes, { ...locais, ...web }, preguicoso),
  };
  const { registrador, navegador, leitor, db } = impl;

  let encerrado = false;
  return {
    caminhos,
    config,
    casos: criarCasos(impl, configAplicacao(config)),
    adquirirTrava: (comando) => adquirirTrava(caminhos.travasDir, comando),
    registrarErro: (mensagem, erro) => {
      registrador().erro(mensagem, { erro });
    },
    criarServicoSegredos: ({ vagaId, hostsPermitidos }) =>
      new ServicoSegredos({
        obterPagina: () => navegador().paginaMaisRecente(hostsPermitidos),
        cofre: impl.cofre(),
        curriculo: impl.curriculo(),
        artefatos: impl.artefatos(),
        hostsPermitidos,
        vagaId,
        registrador: registrador(),
      }),
    instanciados: () => new Set(criados),
    async encerrar() {
      if (encerrado) return;
      encerrado = true;
      if (criados.has("leitor")) await leitor().fechar();
      if (criados.has("navegador")) await navegador().desconectar();
      if (criados.has("banco")) db().close();
    },
  };
}

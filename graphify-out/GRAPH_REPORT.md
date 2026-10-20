# Graph Report - outbox  (2026-10-19)

## Corpus Check
- 256 files · ~127,532 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 5)

## Summary
- 1817 nodes · 5620 edges · 111 communities (89 shown, 22 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 543 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `86c6778f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- responder-campos.ts
- motores.ts
- api.ts
- agente.test.ts
- 17. Registro de decisões arquiteturais (ADR)
- zod
- progresso.ts
- 5. Portas
- ArmazemArtefatosFs
- composicao.ts
- resolucao.test.ts
- sensiveis.test.ts
- rodada-gaps.ts
- principal.ts
- FormularioAberto
- preencher-formulario.ts
- vaga.ts
- registrador-jsonl.ts
- extrator-estrutural.ts
- package.json
- ArmazemArtefatos
- apresentacao.test.ts
- gerar-curriculo.ts
- RepositorioVagasSqlite
- repositorio-vagas-sqlite.ts
- curriculo-ats.test.ts
- campos.ts
- infra-base.test.ts
- InteracaoTerminal
- ArmazemCurriculoMemoria
- agregadores.ts
- claude-falso.ts
- ArmazemCurriculo
- compilerOptions
- GeradorEstruturado
- Outbox: arquitetura e convenções
- spec-curriculo-ats-1-pagina/spec.md
- outbox-segredos.ts
- renderizador-pdf-playwright.ts
- 7. Tarefas
- preparar-vagas.ts
- GeradorEstruturadoClaude
- aplicar-vagas.test.ts
- Motor
- conectores.test.ts
- RepositorioVagas
- DefinicaoConector
- NavegadorOutbox
- escreverAtomico
- conector-formulario.ts
- ref_node_path
- ref_node_path
- aplicar-vagas.ts
- ProgressoTerminal
- RegistroFalhas
- devDependencies
- Outbox
- ArmazemArtefatosMemoria
- revisar-e-enviar.ts
- Progresso da implementação da V1
- dependencies
- portas/erros.ts
- RenderizadorPdfPlaywright
- passo.ts
- FormularioAbertoFake
- progresso-terminal.test.ts
- capturar-fixture.ts
- cliente-http.ts
- preparar
- vitest
- CacheRespostasJson
- agente.test.ts
- Arquitetura do Outbox
- eslint.config.js
- pt
- 11.1 Estratégia de testes
- armazem-curriculo-yaml.ts
- 6. Catálogo de portas
- Interacao
- imports
- scripts
- FormularioPlaywright
- Convenções do Outbox
- Relogio
- espiar-modulos.ts
- Spike: Gupy
- titulo
- trava-processo.ts
- Spike: InHire
- armazenamento.test.ts
- ErroTransicaoInvalida
- agente-candidatura.md
- responder-perguntas.md
- 12. Segurança
- setup.ts
- SKILL.md
- SPEC-TEMPLATE.md
- 0001-hexagonal-enxuto.md
- 0002-camada-no-topo.md
- 0004-typescript-nativo-node24.md
- 0005-imports-subpath-e-fronteiras.md
- 0006-injecao-manual-preguicosa.md
- 0012-fronteira-de-confianca.md
- 0013-ferramentas-de-qualidade.md
- 0015-configuracao-padroes-no-schema.md
- 0017-sem-envio-implicito.md
- 0018-agente-pasta-de-trabalho-e-origens.md
- .prettierrc.json
- deduplicacao.ts
- Como adicionar um conector de ATS
- CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `IdVaga` - 81 edges
2. `criarContainer()` - 57 edges
3. `ErroUsuario` - 51 edges
4. `zod` - 46 edges
5. `vitest` - 46 edges
6. `RepositorioVagas` - 45 edges
7. `Vaga` - 45 edges
8. `ArmazemCurriculo` - 44 edges
9. `ArmazemArtefatos` - 43 edges
10. `6. Catálogo de portas` - 40 edges

## Surprising Connections (you probably didn't know these)
- `Tarefas` --references--> `preparar()`  [INFERRED]
  docs/progresso.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts
- `O que foi implementado sem o spike` --references--> `preparar()`  [INFERRED]
  docs/spikes/gupy.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts
- `Comandos e códigos de saída` --references--> `preparar()`  [INFERRED]
  README.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts
- `T25: Documentação viva` --references--> `preparar()`  [INFERRED]
  specs/v1/spec-outbox/spec.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts
- `11. Qualidade` --references--> `FormularioAberto`  [INFERRED]
  docs/arquitetura.md → src/aplicacao/portas/formulario-aberto.ts

## Import Cycles
- None detected.

## Communities (111 total, 22 thin omitted)

### Community 0 - "responder-campos.ts"
Cohesion: 0.06
Nodes (65): ADR-0019: Consentimento como categoria de campo, base(), chaveCache(), contatoDo(), corrigirNoCache(), esquemaRespostasLlm, foraDasOpcoes(), gerarCartaAvulsa() (+57 more)

### Community 1 - "motores.ts"
Cohesion: 0.16
Nodes (17): 1. Garanta o motor no domínio, adicionarVagas(), ErroValidacao, canonicaGenerica(), canonicaGreenhouse(), canonicaPorMotor(), canonizar(), detectarMotor() (+9 more)

### Community 2 - "api.ts"
Cohesion: 0.13
Nodes (22): Entrada, Regras, Tarefa, enderecoApi(), esquemaCampoApi, esquemaPergunta, esquemaVagaGreenhouse, obterVagaGreenhouse() (+14 more)

### Community 3 - "agente.test.ts"
Cohesion: 0.14
Nodes (17): playwright, LeitorHeadless, ClienteHttp, lerFixture(), MapaFixtures, RespostaFixture, servirFixtures(), AmbienteConector (+9 more)

### Community 4 - "17. Registro de decisões arquiteturais (ADR)"
Cohesion: 0.12
Nodes (15): ADR-0003: Idioma único em português ASCII, 17. Registro de decisões arquiteturais (ADR), ADR-001: hexagonal enxuto em quatro camadas, ADR-002: camada no topo, contexto de negócio dentro, ADR-003: idioma único em português ASCII, ADR-004: TypeScript executado nativamente pelo Node 24, sem build, ADR-005: imports por subpath e fronteiras verificadas por lint, ADR-006: injeção manual com raiz de composição preguiçosa (+7 more)

### Community 5 - "zod"
Cohesion: 0.13
Nodes (25): zod, T20: Casos de uso de entrada, STATUS_DE_RETORNO, ErroUsuario, formatarResumoAplicacao(), comandoAdicionar(), esquema, urlsDoArquivo() (+17 more)

### Community 6 - "progresso.ts"
Cohesion: 0.15
Nodes (18): EtapaPreparo, colunasDe(), cortarNaLargura(), DadosRotulo, ETAPAS, formatarCabecalhoPreparo(), formatarConclusao(), formatarDuracao() (+10 more)

### Community 7 - "5. Portas"
Cohesion: 0.10
Nodes (13): ADR-0014: Logging mínimo com redação, ADR-0021: Progresso do `preparar` por porta de eventos, 5. Portas, 14. Política de dependências, 16.2 Nomenclatura, ADR-014: logging mínimo com redação, T7: Toast que abre o painel, Notificador (+5 more)

### Community 9 - "composicao.ts"
Cohesion: 0.11
Nodes (22): ADR-0006, abrirNavegador(), EntradaAplicarVagas, ResumoAplicacao, EntradaImportarCurriculo, importarCurriculo(), SaidaImportarCurriculo, DadosFalhas (+14 more)

### Community 10 - "resolucao.test.ts"
Cohesion: 0.13
Nodes (18): T12: Resolução e extração, ErroAgregadorExigeLogin, ErroResolucao, OpcoesLeitor, PaginaLida, ADR-0012, ehPortalGupy(), eloDetectarAts() (+10 more)

### Community 11 - "sensiveis.test.ts"
Cohesion: 0.11
Nodes (21): DepsAplicarVagas, DepsPrepararVagas, ambienteComConector(), ConfigAplicacao, EventoPreparo, umPerfil(), AmbienteAplicacao, CONFIG_TESTE (+13 more)

### Community 12 - "rodada-gaps.ts"
Cohesion: 0.07
Nodes (44): T22: Etapas de aplicação e caso de uso `aplicar`, executarComLimite(), DepsRodadaGaps, GapAgrupado, idSkillLivre(), perguntarNivelIdioma(), rodadaGaps(), ROTULO_NIVEL (+36 more)

### Community 13 - "principal.ts"
Cohesion: 0.10
Nodes (21): emitirAvisoOriginal, ADR-0004, ADR-0007: Casos de uso como funções com dependências estreitas, commander, Container, codigoDoErro(), CODIGOS_SAIDA, ehErroPrevisto() (+13 more)

### Community 14 - "FormularioAberto"
Cohesion: 0.24
Nodes (4): 7.2 `outbox aplicar`, revisarEEnviar(), ErroFalhaConector, FormularioAberto

### Community 15 - "preencher-formulario.ts"
Cohesion: 0.15
Nodes (17): T2: Schemas do domínio e exemplos, ExecucaoAgente, executarAgente(), htmlSanitizado(), paraResultado(), preencherFormulario(), ResultadoPreenchimento, CtxPreenchimento (+9 more)

### Community 16 - "vaga.ts"
Cohesion: 0.20
Nodes (17): T3: Domínio de vagas, LinhaStatus, EntradaRegistrarRetorno, StatusRetorno, vagaPronta(), NOMES_ARTEFATO, OpcoesTransicaoVaga, ADR-0008 (+9 more)

### Community 17 - "registrador-jsonl.ts"
Cohesion: 0.25
Nodes (4): ContextoLog, RegistradorJsonl, EntradaLog, RegistradorMemoria

### Community 18 - "extrator-estrutural.ts"
Cohesion: 0.17
Nodes (12): DepsExtrairVaga, esquemaPaginaIndisponivel, extrairVaga(), ErroExtracao, ErroVagaIndisponivel, ExtratorVagas, ResultadoExtracao, esquemaVagaExtraida (+4 more)

### Community 19 - "package.json"
Cohesion: 0.10
Nodes (19): bin, outbox, description, engines, node, name, private, type (+11 more)

### Community 20 - "ArmazemArtefatos"
Cohesion: 0.13
Nodes (6): 5. Fora do Escopo, DepsRenderizarMaster, DepsGerarCurriculo, DepsResponderCampos, ArmazemArtefatos, RenderizadorDocumentos

### Community 21 - "apresentacao.test.ts"
Cohesion: 0.16
Nodes (17): ResultadoAdicao, DadosStatus, formatarAdicao(), ROTULOS, cores, Formato, formatarFalhas(), formatarResumoRevisao() (+9 more)

### Community 22 - "gerar-curriculo.ts"
Cohesion: 0.09
Nodes (10): ALERTA_ATS_CAIU, ALERTA_CAMALEAO_FALHOU, ALERTA_PDF_LONGO, ArquivoAnalise, esquemaArquivoCampos, descreverViolacoes(), SaidaGerarCurriculo, ContextoResposta (+2 more)

### Community 23 - "RepositorioVagasSqlite"
Cohesion: 0.17
Nodes (5): GapAberto, marcadores(), paraVaga(), RepositorioVagasSqlite, valorSql()

### Community 24 - "repositorio-vagas-sqlite.ts"
Cohesion: 0.13
Nodes (20): T8: Persistência SQLite, ehMotivoDe(), ehStatusComMotivo(), ETAPAS, ETAPAS_ENTREVISTA, MOTIVOS, ROTAS, STATUS_COM_RESPOSTA (+12 more)

### Community 25 - "curriculo-ats.test.ts"
Cohesion: 0.10
Nodes (15): @napi-rs/canvas, pdfjs-dist, contarFontes(), inspecionarPdf(), OPERADORES_DE_IMAGEM, PdfInspecionado, PdfLido, pngDaPagina() (+7 more)

### Community 26 - "campos.ts"
Cohesion: 0.15
Nodes (24): normalizarTexto(), consultasLocalizacao(), Uf, ufDe(), UFS, casarTexto(), IDIOMAS, indice() (+16 more)

### Community 27 - "infra-base.test.ts"
Cohesion: 0.22
Nodes (8): ADR-0015, yaml, OpcoesContainer, carregarConfig(), Config, CONFIG_PADRAO, esquemaConfig, NivelLog

### Community 28 - "InteracaoTerminal"
Cohesion: 0.14
Nodes (7): @inquirer/prompts, open, T24: Composição e CLI, OpcaoEscolha, ResumoRevisao, InteracaoTerminal, OpcoesInteracaoTerminal

### Community 29 - "ArmazemCurriculoMemoria"
Cohesion: 0.17
Nodes (3): BancoRespostas, Perfil, ArmazemCurriculoMemoria

### Community 30 - "agregadores.ts"
Cohesion: 0.19
Nodes (14): AGREGADORES, ehMotorConhecido(), BOTAO_EXTERNO, BOTAO_SIMPLIFICADO, DesfechoAgregador, destinoDeRedirecionamento(), EXIGE_LOGIN, PARAMETROS_REDIRECIONAMENTO (+6 more)

### Community 31 - "claude-falso.ts"
Cohesion: 0.14
Nodes (8): BINARIO_FALSO, ChamadaRegistrada, ClaudeFalso, RegraClaude, respostaJson(), usarClaudeFalso(), ESPIAO, RAIZ

### Community 32 - "ArmazemCurriculo"
Cohesion: 0.12
Nodes (3): DepsImportarCurriculo, ArmazemCurriculo, validar()

### Community 33 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+11 more)

### Community 34 - "GeradorEstruturado"
Cohesion: 0.11
Nodes (20): ADR-0010: Conectores ATS com Strategy, catálogo e handle comum, ADR-0011: LLM com portas separadas, schema único e prompts versionados, 5. Prompts, 15.1 Receitas de extensão, 15.2 Não construir agora (YAGNI), 15. Evolução, 16.4 Prompts, 8.1 Adotados (+12 more)

### Community 35 - "Outbox: arquitetura e convenções"
Cohesion: 0.10
Nodes (19): 10.2 Validação, 10.3 Logging (ADR-014), 10.4 Configuração (ADR-015), 10.5 Concorrência, transações e cancelamento (ADR-008, ADR-016), 10. Erros, validação, logging, config e concorrência, 13. Desempenho, 16.1 Idioma (ADR-003), 16.3 Código (+11 more)

### Community 36 - "spec-curriculo-ats-1-pagina/spec.md"
Cohesion: 0.11
Nodes (19): 1. Contexto e Objetivo, 2. Premissas, 3. Decisões, 4. Glossário, 6. Contrato de Aceite, 7. Tarefas, 8. Questões em aberto, Anexo A — Valores visuais (B = tamanho base em pt) (+11 more)

### Community 37 - "outbox-segredos.ts"
Cohesion: 0.18
Nodes (14): @modelcontextprotocol/sdk, T5: Domínio de respostas e falhas, criarServidorSegredos(), hostsDoAmbiente(), principal(), resposta(), Resultado, seletor (+6 more)

### Community 38 - "renderizador-pdf-playwright.ts"
Cohesion: 0.15
Nodes (12): 12.2 Classificação de dados, ADR-0012, cabecalho(), documento(), escaparHtml(), htmlCarta(), htmlCurriculo(), lista() (+4 more)

### Community 39 - "7. Tarefas"
Cohesion: 0.07
Nodes (24): 7. Tarefas, T14: Conectores Greenhouse, Lever e Ashby, T15: Conectores SmartRecruiters, Workable e Teamtailor, T16: Conectores Gupy e InHire, com spikes, T17: Cofre de credenciais e MCP `outbox-segredos`, T19: Notificação, T1: Fundação do repositório, qualidade e CI, T23: Casos de uso de consulta (+16 more)

### Community 40 - "preparar-vagas.ts"
Cohesion: 0.21
Nodes (18): 6. Fluxos, 3. Camadas e responsabilidades, T21: Etapas de preparo e caso de uso `preparar`, aplicarAderencia(), avisarEtapa(), deduplicarPorChave(), descartarEncerrada(), processarVaga() (+10 more)

### Community 41 - "GeradorEstruturadoClaude"
Cohesion: 0.29
Nodes (6): PedidoGeracao, TarefaLlm, TAREFAS_LLM, ADR-0012, GeradorEstruturadoRoteirizado, Resposta

### Community 43 - "Motor"
Cohesion: 0.25
Nodes (8): Resolucao, Motor, MotivoDe, Rota, AtualizacaoVaga, UrlCanonica, AtsDetectado, EloResolucao

### Community 44 - "conectores.test.ts"
Cohesion: 0.15
Nodes (19): definicaoAshby, esquemaQuadroAshby, comParametro(), comSufixo(), dataCurta(), nomeDoSlug(), DEFINICOES_V1, definicaoGreenhouse (+11 more)

### Community 45 - "RepositorioVagas"
Cohesion: 0.15
Nodes (7): ADR-0008: Persistência com `node:sqlite`, repositório síncrono do agregado, tabelas STRICT e migrações, DepsAdicionarVagas, ItemAdicao, DepsListarStatus, ErroPreparo, RepositorioVagas, IdVaga

### Community 46 - "DefinicaoConector"
Cohesion: 0.18
Nodes (8): 7. Conectores, 3. Escreva a definição, TipoCampo, DescricaoCampo, DescritorCampo, CatalogoConectoresPlaywright, DefinicaoConector, DepsConector

### Community 47 - "NavegadorOutbox"
Cohesion: 0.14
Nodes (5): T11: Navegador, leitor headless e documentos, NavegadorUsuario, caminhosChrome(), NavegadorOutbox, OpcoesNavegadorOutbox

### Community 48 - "escreverAtomico"
Cohesion: 0.17
Nodes (7): T9: Armazenamento em arquivos, ArmazemCurriculoYaml, RegistroFalhasFs, editarYaml(), lerYaml(), validarOuFalhar(), escreverAtomico()

### Community 49 - "conector-formulario.ts"
Cohesion: 0.16
Nodes (17): listarOpcoes(), paraCampos(), acharResposta(), chaveRotulo(), criarConector(), indexar(), IndiceRespostas, lerCamposDaPagina() (+9 more)

### Community 50 - "ref_node_path"
Cohesion: 0.18
Nodes (11): esquemaSaidaAgente, FERRAMENTAS_AGENTE, SaidaAgente, extrairJson(), ResultadoClaude, carregarPrompt(), envolverNaoConfiavel(), PromptCarregado (+3 more)

### Community 51 - "ref_node_path"
Cohesion: 0.25
Nodes (8): abrirConexao(), migrar(), ADR-0008, versaoAtual(), criarRepositorioMemoria(), PASTA_MIGRACOES, args, indice

### Community 52 - "aplicar-vagas.ts"
Cohesion: 0.23
Nodes (11): aplicarUma(), aplicarVagas(), esquemaArquivoAnalise, DepsMontarPacote, montarPacote(), salvarRespostas(), CATEGORIAS_CAMPO, TIPOS_CAMPO (+3 more)

### Community 53 - "ProgressoTerminal"
Cohesion: 0.29
Nodes (5): ResumoPreparo, formatarResumoPreparo(), comandoPreparar(), esquema, ProgressoTerminal

### Community 55 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-prettier, @eslint/js, @napi-rs/canvas, pdfjs-dist, prettier, @types/cross-spawn (+6 more)

### Community 56 - "Outbox"
Cohesion: 0.12
Nodes (15): Checklist de smoke manual, Comandos e códigos de saída, Configuração, Currículo em 1 página, Desenvolvimento, Documentação, Fluxo diário, Grafo de conhecimento (Graphify) (+7 more)

### Community 58 - "revisar-e-enviar.ts"
Cohesion: 0.24
Nodes (11): acharValor(), enviar(), esperaValor(), montarResumo(), OPCOES, aplicarAprendizado(), proximoId(), RespostaFinal (+3 more)

### Community 59 - "Progresso da implementação da V1"
Cohesion: 0.17
Nodes (8): Bloqueios e pendências, Critérios de aceite, Decisões tomadas durante a implementação, Progresso da implementação da V1, Tarefas, Validação real do agente (2026-10-10), Verificação final, Verificações de ambiente

### Community 60 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, commander, cross-spawn, @inquirer/prompts, mammoth, @modelcontextprotocol/sdk, node-notifier, open (+4 more)

### Community 61 - "portas/erros.ts"
Cohesion: 0.16
Nodes (18): 10.1 Modelo de erros (ADR-009), T10: LLM: processo claude, gerador estruturado e prompts, T18: Agente, T6: Portas, erros de porta, concorrência e apoio de testes, ErroInfra, ErroLimiteUso, ErroLlm, ErroMaxTurnos (+10 more)

### Community 63 - "passo.ts"
Cohesion: 0.31
Nodes (8): bloqueioPendente(), ContextoPasso, DESCRICOES, esperarDesbloqueio(), passo(), Bloqueio, detectarBloqueio(), IFRAMES_CAPTCHA

### Community 64 - "FormularioAbertoFake"
Cohesion: 0.23
Nodes (3): DesfechoEnvio, ValorLido, FormularioAbertoFake

### Community 65 - "progresso-terminal.test.ts"
Cohesion: 0.32
Nodes (4): RegiaoViva, montar(), puro(), relogio()

### Community 66 - "capturar-fixture.ts"
Cohesion: 0.23
Nodes (5): ArgumentosCaptura, lerArgumentos(), montarFixture(), principal(), SCRIPT

### Community 67 - "cliente-http.ts"
Cohesion: 0.36
Nodes (4): ClienteHttpFetch, esperar(), esperaRetryAfter(), OpcoesClienteHttp

### Community 68 - "preparar"
Cohesion: 0.09
Nodes (21): ADR-0016: Execução exclusiva por comando e cancelamento cooperativo, ADR-0020: Bloqueio anti-bot tratado como CAPTCHA, ADR-016: execução exclusiva por comando e cancelamento cooperativo, 1. Contexto e Objetivo, 2. Premissas, 3. Decisões, 4. Glossário, 5. Fora do Escopo (+13 more)

### Community 69 - "vitest"
Cohesion: 0.22
Nodes (12): vitest, CAMPOS, criar(), prontas(), sinal(), ambiente(), motivoDoErro(), prepararVagas() (+4 more)

### Community 70 - "CacheRespostasJson"
Cohesion: 0.20
Nodes (5): CacheRespostas, CacheRespostasJson, Entradas, esquemaCache, OpcoesCacheRespostas

### Community 71 - "agente.test.ts"
Cohesion: 0.19
Nodes (11): EntradaAgente, ExecutorAgenteClaude, umaResposta(), umaVaga(), descreverContratoFormulario(), ADR-0010, criarExecutor(), entrada() (+3 more)

### Community 72 - "Arquitetura do Outbox"
Cohesion: 0.22
Nodes (8): 10. Desempenho, 11. Qualidade, 1. Forças, 2. Visão geral, 3. Estrutura, 4. Contextos do domínio, 9. Segurança, Arquitetura do Outbox

### Community 73 - "eslint.config.js"
Cohesion: 0.20
Nodes (7): FRONTEIRAS, SUBIDA_PROIBIDA, eslint, eslint-config-prettier, @eslint/js, typescript-eslint, eslint

### Community 74 - "pt"
Cohesion: 0.20
Nodes (8): Entrada, Regras, Tarefa, Entrada, Regras, Tarefa, css(), pt()

### Community 75 - "11.1 Estratégia de testes"
Cohesion: 0.27
Nodes (8): 11.1 Estratégia de testes, 11.2 Verificação local e CI, 11.3 Regras de lint obrigatórias, 11. Qualidade e testabilidade, ResultadoAgente, umMaster(), umPacote(), ExecutorAgenteFake

### Community 76 - "armazem-curriculo-yaml.ts"
Cohesion: 0.21
Nodes (7): esquemaGapsNegados, GapsNegados, esquemaBancoRespostas, esquemaEntradaBanco, TIPOS_RESPOSTA, esquemaPerfil, AUXILIARES

### Community 77 - "6. Catálogo de portas"
Cohesion: 0.31
Nodes (9): 6. Catálogo de portas, 7.1 `outbox preparar`, 6. Contrato de Aceite, DepsResolverVaga, DesfechoResolucao, resolverVaga(), ResolvedorVagas, decidirDeduplicacaoUrl() (+1 more)

### Community 79 - "imports"
Cohesion: 0.25
Nodes (8): imports, #aplicacao/*, #composicao, #dominio/*, #infra/*, #interfaces/*, #scripts/*, #testes/*

### Community 80 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, capturar-fixture, formatar, lint, outbox, test, tipos, verificar

### Community 81 - "FormularioPlaywright"
Cohesion: 0.22
Nodes (3): 12. Diferenças em relação à spec, T13: Base de conectores, contratos e captura de fixtures, FormularioPlaywright

### Community 82 - "Convenções do Outbox"
Cohesion: 0.22
Nodes (8): 1. Idioma (ADR-0003), 2. Nomenclatura, 3. Código, 4. Conectores e automação de navegador, 6. Testes, 7. Documentação, 8. Definição de pronto, Convenções do Outbox

### Community 83 - "Relogio"
Cohesion: 0.15
Nodes (8): Relogio, NIVEIS_LOG, OpcoesRegistrador, serializar(), ADR-0014, doisDigitos(), isoLocal(), RelogioSistema

### Community 85 - "Spike: Gupy"
Cohesion: 0.29
Nodes (6): Como concluir o spike, Decisão provisória: `gupy.anexoPorCandidatura: true`, O que foi implementado sem o spike, Objetivo, Por que está bloqueado, Spike: Gupy

### Community 86 - "titulo"
Cohesion: 0.40
Nodes (4): Como escrever cada bullet, Entrada, Regras de lastro (obrigatórias), Tarefa

### Community 87 - "trava-processo.ts"
Cohesion: 0.32
Nodes (5): adquirirTrava(), processoVivo(), tentarCriar(), Trava, ADR-0016

### Community 88 - "Spike: InHire"
Cohesion: 0.33
Nodes (5): Como concluir o spike, O que foi implementado sem o spike, Objetivo, Por que está bloqueado, Spike: InHire

### Community 89 - "armazenamento.test.ts"
Cohesion: 0.39
Nodes (3): criarCaminhos(), RAIZ, ambiente()

### Community 90 - "ErroTransicaoInvalida"
Cohesion: 0.12
Nodes (14): ADR-0009: Erros como exceções tipadas, 8. Erros, validação, logging, config e concorrência, ADR-009: erros como exceções tipadas, 7. Tarefas, T1: Domínio de acompanhamento e porta de consulta com implementação SQLite, T2: Casos de uso do painel, T3: Servidor web, segurança, layout e comando `painel`, T4: Rotas de fila e detalhe (+6 more)

### Community 91 - "agente-candidatura.md"
Cohesion: 0.40
Nodes (4): Dados do candidato, Regras (obrigatórias), Resposta final, Tarefa

### Community 92 - "responder-perguntas.md"
Cohesion: 0.50
Nodes (3): Entrada, Regras, Tarefa

### Community 93 - "12. Segurança"
Cohesion: 0.50
Nodes (4): 12.1 Modelo de ameaças, 12.3 Fronteira de confiança e injeção de prompt (ADR-012), 12.4 Segredos e credenciais, 12. Segurança

### Community 108 - "deduplicacao.ts"
Cohesion: 0.29
Nodes (7): AcaoDeduplicacaoUrl, AcaoDescartarDuplicada, dataReferencia(), ehMaisRecente(), STATUS_IGNORADOS_DEDUP, STATUS_NA_FILA, STATUS_POS_ENVIO

### Community 109 - "Como adicionar um conector de ATS"
Cohesion: 0.33
Nodes (5): 2. Capture fixtures sanitizadas, 4. Registre no catálogo, 5. Passe na suíte de contrato, 6. Valide com uma vaga real, Como adicionar um conector de ATS

## Knowledge Gaps
- **33 isolated node(s):** `ADR-0004`, `@playwright/mcp`, `node-notifier`, `@types/cross-spawn`, `@types/node` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 589 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `responder-campos.ts`, `motores.ts`, `agente.test.ts`, `zod`, `5. Portas`, `composicao.ts`, `resolucao.test.ts`, `sensiveis.test.ts`, `rodada-gaps.ts`, `principal.ts`, `extrator-estrutural.ts`, `package.json`, `apresentacao.test.ts`, `repositorio-vagas-sqlite.ts`, `curriculo-ats.test.ts`, `campos.ts`, `infra-base.test.ts`, `claude-falso.ts`, `outbox-segredos.ts`, `renderizador-pdf-playwright.ts`, `preparar-vagas.ts`, `conectores.test.ts`, `NavegadorOutbox`, `ref_node_path`, `ref_node_path`, `aplicar-vagas.ts`, `progresso-terminal.test.ts`, `capturar-fixture.ts`, `agente.test.ts`, `eslint.config.js`, `armazem-curriculo-yaml.ts`, `armazenamento.test.ts`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `IdVaga` (e.g. with `8.1 Adotados` and `T3: Domínio de vagas`) actually correct?**
  _`IdVaga` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ADR-0004`, `@playwright/mcp`, `node-notifier` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `responder-campos.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05964912280701754 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `zod` to `responder-campos.ts`, `api.ts`, `agente.test.ts`, `resolucao.test.ts`, `rodada-gaps.ts`, `vaga.ts`, `extrator-estrutural.ts`, `package.json`, `gerar-curriculo.ts`, `repositorio-vagas-sqlite.ts`, `campos.ts`, `infra-base.test.ts`, `ArmazemCurriculo`, `outbox-segredos.ts`, `7. Tarefas`, `GeradorEstruturadoClaude`, `conectores.test.ts`, `escreverAtomico`, `ref_node_path`, `aplicar-vagas.ts`, `ProgressoTerminal`, `portas/erros.ts`, `cliente-http.ts`, `CacheRespostasJson`, `armazem-curriculo-yaml.ts`, `armazenamento.test.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `ErroUsuario` (e.g. with `8. Erros, validação, logging, config e concorrência` and `10.1 Modelo de erros (ADR-009)`) actually correct?**
  _`ErroUsuario` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12807881773399016 - nodes in this community are weakly interconnected._
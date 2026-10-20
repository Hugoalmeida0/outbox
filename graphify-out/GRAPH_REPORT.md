# Graph Report - Outbox  (2026-10-20)

## Corpus Check
- 272 files · ~144,474 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 5, .ico 1)

## Summary
- 1947 nodes · 6020 edges · 111 communities (89 shown, 22 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 600 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d1c5822e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api.ts
- resolvedor-encadeado.ts
- json-ld.ts
- vitest
- 17. Registro de decisões arquiteturais (ADR)
- zod
- progresso.ts
- basicos.ts
- aplicar-vagas.ts
- criarContainer
- pdf.ts
- sensiveis.test.ts
- normalizarTexto
- codigos-saida.test.ts
- preparar-vagas.ts
- formularios.ts
- vaga.ts
- 6. Catálogo de portas
- LeitorHeadless
- package.json
- infra-base.test.ts
- apresentacao.test.ts
- gerar-curriculo.ts
- IdVaga
- T21: Etapas de preparo e caso de uso `preparar`
- curriculo-ats.test.ts
- campos.ts
- RepositorioVagas
- InteracaoTerminal
- FormularioAberto
- preparar
- ref_node_fs
- ArmazemCurriculo
- compilerOptions
- 7. Tarefas
- Outbox: arquitetura e convenções
- spec-curriculo-ats-1-pagina/spec.md
- camaleao-segredos.ts
- template-html.ts
- Interacao
- nome.test.ts
- GeradorEstruturadoRoteirizado
- InteracaoRoteirizada
- Camaleão — Brand Guidelines
- conectores.test.ts
- motores.ts
- versao
- 7. Tarefas
- preencher-formulario.ts
- conector-formulario.ts
- responder-campos.ts
- banco.test.ts
- respostas.test.ts
- composicao.ts
- registro-falhas-fs.ts
- devDependencies
- Camaleão
- ArmazemArtefatosFs
- 7. Tarefas
- adicionar.ts
- dependencies
- portas/erros.ts
- ErroCamaleao
- ServicoSegredos
- FormularioPlaywright
- progresso-terminal.test.ts
- ArmazemCurriculoMemoria
- NavegadorCamaleao
- cliente-http.ts
- aplicar-vagas.test.ts
- Relogio
- ExecutorAgenteClaude
- DefinicaoConector
- eslint.config.js
- analisar-vaga.md
- renderizador-pdf-playwright.ts
- ErroUsuario
- variaveis.ts
- 0009-erros-como-excecoes-tipadas.md
- imports
- scripts
- UrlCanonica
- Convenções do Camaleão
- logoloom
- espiar-modulos.ts
- Spike: Gupy
- tailoring.md
- Spike: InHire
- agente-candidatura.md
- responder-perguntas.md
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
- extrair-vaga.md
- importar-curriculo.md
- CLAUDE.md
- 12. Segurança
- atualizacoes.ts
- camaleao.js
- Motor

## God Nodes (most connected - your core abstractions)
1. `IdVaga` - 84 edges
2. `ErroUsuario` - 53 edges
3. `vitest` - 49 edges
4. `Vaga` - 49 edges
5. `zod` - 46 edges
6. `ArmazemCurriculo` - 45 edges
7. `ArmazemArtefatos` - 43 edges
8. `Motor` - 40 edges
9. `6. Catálogo de portas` - 39 edges
10. `normalizarTexto()` - 38 edges

## Surprising Connections (you probably didn't know these)
- `T5 — Rotas síncronas dos comandos` --references--> `ItemAdicao`  [INFERRED]
  specs/spec-mvp-web/spec.md → src/aplicacao/casos-de-uso/adicionar-vagas.ts
- `Tarefas` --references--> `preparar()`  [INFERRED]
  docs/progresso.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts
- `O que foi implementado sem o spike` --references--> `preparar()`  [INFERRED]
  docs/spikes/gupy.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts
- `Comandos e códigos de saída` --references--> `preparar()`  [INFERRED]
  README.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts
- `ADR-016: execução exclusiva por comando e cancelamento cooperativo` --references--> `preparar()`  [INFERRED]
  specs/v1/spec-outbox/arquitetura.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts

## Import Cycles
- None detected.

## Communities (111 total, 22 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.21
Nodes (9): enderecoApi(), esquemaCampoApi, esquemaPergunta, esquemaVagaGreenhouse, obterVagaGreenhouse(), paraCampos(), TIPOS, VagaGreenhouse (+1 more)

### Community 1 - "resolvedor-encadeado.ts"
Cohesion: 0.21
Nodes (14): AGREGADORES, ehMotorConhecido(), BOTAO_EXTERNO, BOTAO_SIMPLIFICADO, DesfechoAgregador, destinoDeRedirecionamento(), EXIGE_LOGIN, PARAMETROS_REDIRECIONAMENTO (+6 more)

### Community 2 - "json-ld.ts"
Cohesion: 0.25
Nodes (13): esquemaVagaExtraida, normalizarEmpresa(), paraVagaExtraida(), vagaDoNextData(), decodificarEntidades(), ENTIDADES, htmlParaTexto(), acharVaga() (+5 more)

### Community 3 - "vitest"
Cohesion: 0.09
Nodes (34): vitest, FERRAMENTAS_AGENTE, paraCampos(), OpcoesLeitor, PaginaLida, ADR-0012, umaResposta(), umaVaga() (+26 more)

### Community 4 - "17. Registro de decisões arquiteturais (ADR)"
Cohesion: 0.11
Nodes (17): ADR-0003: Idioma único em português ASCII, 17. Registro de decisões arquiteturais (ADR), ADR-001: hexagonal enxuto em quatro camadas, ADR-002: camada no topo, contexto de negócio dentro, ADR-003: idioma único em português ASCII, ADR-004: TypeScript executado nativamente pelo Node 24, sem build, ADR-005: imports por subpath e fronteiras verificadas por lint, ADR-006: injeção manual com raiz de composição preguiçosa (+9 more)

### Community 5 - "zod"
Cohesion: 0.10
Nodes (30): ADR-0007: Casos de uso como funções com dependências estreitas, mammoth, zod, T20: Casos de uso de entrada, STATUS_DE_RETORNO, Container, formatarResumoAplicacao(), codigoDoErro() (+22 more)

### Community 6 - "progresso.ts"
Cohesion: 0.11
Nodes (23): ADR-0021: Progresso do `preparar` por porta de eventos, EntradaPrepararVagas, EtapaPreparo, EventoPreparo, ProgressoPreparo, colunasDe(), cortarNaLargura(), DadosRotulo (+15 more)

### Community 7 - "basicos.ts"
Cohesion: 0.14
Nodes (8): Notificador, ContextoLog, ADR-0014, RegistradorJsonl, MotorToast, EntradaLog, RegistradorMemoria, RespostaRoteiro

### Community 8 - "aplicar-vagas.ts"
Cohesion: 0.11
Nodes (32): 6. Fluxos, 3. Decisões, 7.2 `outbox aplicar`, 7. Fluxos principais por camada, T22: Etapas de aplicação e caso de uso `aplicar`, aplicarUma(), EntradaAplicarVagas, ResumoAplicacao (+24 more)

### Community 9 - "criarContainer"
Cohesion: 0.11
Nodes (15): configAplicacao(), criarContainer(), criarPreguicoso(), adquirirTrava(), processoVivo(), tentarCriar(), Trava, ADR-0016 (+7 more)

### Community 10 - "pdf.ts"
Cohesion: 0.22
Nodes (8): @napi-rs/canvas, pdfjs-dist, contarFontes(), inspecionarPdf(), OPERADORES_DE_IMAGEM, PdfInspecionado, PdfLido, pngDaPagina()

### Community 11 - "sensiveis.test.ts"
Cohesion: 0.15
Nodes (19): 11.1 Estratégia de testes, DepsAplicarVagas, DepsPrepararVagas, ConfigAplicacao, umMaster(), umPerfil(), AmbienteAplicacao, CONFIG_TESTE (+11 more)

### Community 12 - "normalizarTexto"
Cohesion: 0.05
Nodes (55): acharValor(), enviar(), esperaValor(), montarResumo(), perguntarNivelIdioma(), ALERTA_AFIRMATIVA, calcularAderencia(), DetalhesAderencia (+47 more)

### Community 13 - "codigos-saida.test.ts"
Cohesion: 0.22
Nodes (7): commander, CODIGOS_SAIDA, ehErroPrevisto(), ehInterrupcao(), AlvoSinais, instalarSinais(), ADR-0016

### Community 14 - "preparar-vagas.ts"
Cohesion: 0.23
Nodes (19): adicionarVagas(), aplicarAderencia(), avisarEtapa(), deduplicarPorChave(), definirDestino(), descartarEncerrada(), descartarPorAderencia(), motivoDoErro() (+11 more)

### Community 15 - "formularios.ts"
Cohesion: 0.14
Nodes (12): 15.1 Receitas de extensão, 15.2 Não construir agora (YAGNI), 15. Evolução, CampoPendente, ADR-0010, ConectorAts, CtxPreenchimento, ADR-0010 (+4 more)

### Community 16 - "vaga.ts"
Cohesion: 0.09
Nodes (40): T3: Domínio de vagas, T8: Persistência SQLite, DadosStatus, LinhaStatus, EntradaRegistrarRetorno, StatusRetorno, RepositorioTransicao, EscritaVagas (+32 more)

### Community 17 - "6. Catálogo de portas"
Cohesion: 0.11
Nodes (17): ADR-0014: Logging mínimo com redação, ADR-0022: Pastas nomeadas pelo design pattern, em inglês, 5. Portas, 6. Catálogo de portas, 8.1 Adotados, 9. Princípios aplicados, ADR-010: conectores ATS com Strategy, catálogo e handle comum, 8. Registro da revisão de 2026-10-09 (revisão 2) (+9 more)

### Community 18 - "LeitorHeadless"
Cohesion: 0.11
Nodes (13): 3. Decisões, T11: Navegador, leitor headless e documentos, contarPaginas(), RenderizadorPdfPlaywright, escaparHtml(), LeitorHeadless, eloDetectarAts(), gerar() (+5 more)

### Community 19 - "package.json"
Cohesion: 0.09
Nodes (20): bin, camaleao, description, engines, node, name, private, type (+12 more)

### Community 20 - "infra-base.test.ts"
Cohesion: 0.15
Nodes (10): ADR-0015, yaml, ArgumentosCaptura, carregarConfig(), Config, CONFIG_PADRAO, esquemaConfig, doisDigitos() (+2 more)

### Community 21 - "apresentacao.test.ts"
Cohesion: 0.13
Nodes (20): T2: Schemas do domínio e exemplos, T4: Domínio de currículo e análise, ResumoPreparo, AnaliseVaga, GapsNegados, TODOS_STATUS, cores, Formato (+12 more)

### Community 22 - "gerar-curriculo.ts"
Cohesion: 0.09
Nodes (16): 3. Camadas e responsabilidades, ALERTA_ATS_CAIU, ALERTA_CAMALEAO_FALHOU, ALERTA_PDF_LONGO, esquemaArquivoAnalise, esquemaArquivoCampos, criarPedido(), descreverViolacoes() (+8 more)

### Community 23 - "IdVaga"
Cohesion: 0.08
Nodes (11): ArmazemArtefatos, NOMES_ARTEFATO, ConsultaVagas, GapsVagas, GapAberto, IdVaga, Vaga, marcadores() (+3 more)

### Community 24 - "T21: Etapas de preparo e caso de uso `preparar`"
Cohesion: 0.21
Nodes (14): 7.1 `outbox preparar`, 6. Contrato de Aceite, T21: Etapas de preparo e caso de uso `preparar`, DesfechoResolucao, resolverVaga(), AcaoDeduplicacaoUrl, AcaoDescartarDuplicada, dataReferencia() (+6 more)

### Community 25 - "curriculo-ats.test.ts"
Cohesion: 0.12
Nodes (7): leitor, masterDenso(), masterExemplo, pasta, PdfGerado, renderizador, TITULOS

### Community 26 - "campos.ts"
Cohesion: 0.16
Nodes (22): casarTexto(), IDIOMAS, indice(), melhorOpcao(), nomesDoPais(), definirMarcado(), escolherNoSelect(), marcarCheckbox() (+14 more)

### Community 27 - "RepositorioVagas"
Cohesion: 0.12
Nodes (12): ADR-0008: Persistência com `node:sqlite`, repositório síncrono do agregado, tabelas STRICT e migrações, DepsAdicionarVagas, ItemAdicao, DepsListarStatus, DepsExtrairVaga, esquemaPaginaIndisponivel, DepsResolverVaga, TAREFAS_LLM (+4 more)

### Community 28 - "InteracaoTerminal"
Cohesion: 0.10
Nodes (16): 7. Tarefas, T2 — Contrato da API e núcleo do servidor do agente, T3 — Comando `agente`, abertura do site e isolamento da aba, T4 — Execuções, eventos, `ProgressoWeb` e `InteracaoWeb`, T5 — Rotas síncronas dos comandos, T7 — Fundação do site, T8 — Telas dos comandos e do perfil, T9 — Testes e2e, CI, deploy e documentação (+8 more)

### Community 29 - "FormularioAberto"
Cohesion: 0.17
Nodes (10): ADR-0010: Conectores ATS com Strategy, catálogo e handle comum, ErroFalhaConector, FormularioAberto, bloqueioPendente(), ContextoPasso, DESCRICOES, esperarDesbloqueio(), Bloqueio (+2 more)

### Community 30 - "preparar"
Cohesion: 0.12
Nodes (15): ADR-0016: Execução exclusiva por comando e cancelamento cooperativo, ADR-0020: Bloqueio anti-bot tratado como CAPTCHA, T25: Documentação viva, 1. Contexto e Objetivo, 2. Premissas, 3.1 Produto, 3.2 Arquitetura (ADRs da v2, complementando os ADR-001 a ADR-016), 3. Decisões (+7 more)

### Community 31 - "ref_node_fs"
Cohesion: 0.18
Nodes (7): ADR-0008, OpcoesFormularioPlaywright, criarCaminhos(), RAIZ, args, indice, ambiente()

### Community 32 - "ArmazemCurriculo"
Cohesion: 0.08
Nodes (19): 5. Fora do Escopo, T6 — Perfil: casos de uso, porta e salário opcional, DepsImportarCurriculo, DepsRenderizarMaster, DepsAnalisarVaga, DepsGerarCurriculo, DepsMontarPacote, DepsResponderCampos (+11 more)

### Community 33 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+11 more)

### Community 34 - "7. Tarefas"
Cohesion: 0.11
Nodes (17): 1. Contexto e Objetivo, 2. Premissas, 3. Decisões, 4. Glossário, 5. Fora do Escopo, 7. Tarefas, Outbox v1: candidatura assistida com currículo camaleão, T12: Resolução e extração (+9 more)

### Community 35 - "Outbox: arquitetura e convenções"
Cohesion: 0.11
Nodes (17): 10.2 Validação, 10.3 Logging (ADR-014), 10.4 Configuração (ADR-015), 10.5 Concorrência, transações e cancelamento (ADR-008, ADR-016), 10. Erros, validação, logging, config e concorrência, 11.2 Verificação local e CI, 11.3 Regras de lint obrigatórias, 11. Qualidade e testabilidade (+9 more)

### Community 36 - "spec-curriculo-ats-1-pagina/spec.md"
Cohesion: 0.22
Nodes (8): 1. Contexto e Objetivo, 2. Premissas, 4. Glossário, 6. Contrato de Aceite, 8. Questões em aberto, Anexo A — Valores visuais (B = tamanho base em pt), Anexo B — Correções de revisão, lerPdf()

### Community 37 - "camaleao-segredos.ts"
Cohesion: 0.19
Nodes (13): @modelcontextprotocol/sdk, criarServidorSegredos(), hostsDoAmbiente(), principal(), resposta(), Resultado, seletor, ServicoFerramentas (+5 more)

### Community 38 - "template-html.ts"
Cohesion: 0.29
Nodes (8): cabecalho(), css(), documento(), htmlCarta(), htmlCurriculo(), lista(), pt(), secao()

### Community 39 - "Interacao"
Cohesion: 0.11
Nodes (10): 1. Contexto e Objetivo, 2. Premissas, 4. Glossário, 5. Fora do Escopo, 6. Contrato de Aceite, 8. Questões em aberto, Camaleão: MVP web (site hospedado + agente local), Fase 1, T17: Cofre de credenciais e MCP `outbox-segredos` (+2 more)

### Community 40 - "nome.test.ts"
Cohesion: 0.12
Nodes (12): lerArgumentos(), montarFixture(), ALVOS, arquivos(), COMPATIBILIDADE, IGNORADOS, RAIZ, TEXTO (+4 more)

### Community 41 - "GeradorEstruturadoRoteirizado"
Cohesion: 0.39
Nodes (4): PedidoGeracao, TarefaLlm, GeradorEstruturadoRoteirizado, Resposta

### Community 43 - "Camaleão — Brand Guidelines"
Cohesion: 0.22
Nodes (8): 1. Full Logo (icon + wordmark), 2. Icon Only (avatar, favicon, app icon), 4. Social Media, Camaleão — Brand Guidelines, Colors, Logo Files, Typography, Usage Rules

### Community 44 - "conectores.test.ts"
Cohesion: 0.12
Nodes (26): consultasLocalizacao(), Uf, ufDe(), UFS, comParametro(), comSufixo(), dataCurta(), nomeDoSlug() (+18 more)

### Community 45 - "motores.ts"
Cohesion: 0.12
Nodes (15): 1. Garanta o motor no domínio, montarTentativa(), canonicaGenerica(), canonizar(), detectarMotor(), ehRastreamento(), hostCasaPadrao(), MotorConhecido (+7 more)

### Community 46 - "versao"
Cohesion: 0.15
Nodes (12): ADR-0011: LLM com portas separadas, schema único e prompts versionados, 5. Prompts, T1 — Renomear Outbox → Camaleão, com migração, 16.1 Idioma (ADR-003), 16.2 Nomenclatura, 16.3 Código, 16.4 Prompts, 16.5 Documentação (+4 more)

### Community 47 - "7. Tarefas"
Cohesion: 0.22
Nodes (9): 7. Tarefas, T1 — CSS do Anexo A, T2 — Documento, T3 — Campos opcionais no master, T4 — Laço de encaixe e corte, T5 — Lastro e prompt, T6 — Testes de integração, T7 — Nome do arquivo e metadados (+1 more)

### Community 48 - "preencher-formulario.ts"
Cohesion: 0.32
Nodes (10): agenteFalhou(), assumirAposConector(), EntradaAgente, ExecucaoAgente, executarAgente(), htmlSanitizado(), paraResultado(), preencherComAgente() (+2 more)

### Community 49 - "conector-formulario.ts"
Cohesion: 0.19
Nodes (16): T23: Casos de uso de consulta, T5: Domínio de respostas e falhas, acharResposta(), chaveRotulo(), criarConector(), indexar(), IndiceRespostas, lerCamposDaPagina() (+8 more)

### Community 50 - "responder-campos.ts"
Cohesion: 0.18
Nodes (21): ArquivoAnalise, base(), chaveCache(), consultarLlm(), contatoDo(), ContextoResposta, esquemaRespostasLlm, foraDasOpcoes() (+13 more)

### Community 51 - "banco.test.ts"
Cohesion: 0.24
Nodes (6): abrirConexao(), migrar(), versaoAtual(), RelogioFixo, criarRepositorioMemoria(), PASTA_MIGRACOES

### Community 52 - "respostas.test.ts"
Cohesion: 0.07
Nodes (50): ADR-0019: Consentimento como categoria de campo, Regime, aplicarAprendizado(), proximoId(), tipoResposta(), EntradaBanco, esquemaEntradaBanco, TipoResposta (+42 more)

### Community 53 - "composicao.ts"
Cohesion: 0.07
Nodes (30): ADR-0006, EntradaImportarCurriculo, importarCurriculo(), SaidaImportarCurriculo, DadosFalhas, GrupoFalha, listarFalhas(), listarStatus() (+22 more)

### Community 55 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-prettier, @eslint/js, @napi-rs/canvas, pdfjs-dist, prettier, @types/cross-spawn (+6 more)

### Community 56 - "Camaleão"
Cohesion: 0.12
Nodes (15): Camaleão, Checklist de smoke manual, Comandos e códigos de saída, Configuração, Currículo em 1 página, Desenvolvimento, Documentação, Fluxo diário (+7 more)

### Community 57 - "ArmazemArtefatosFs"
Cohesion: 0.15
Nodes (3): NomeArtefato, ArmazemArtefatosFs, ArmazemArtefatosMemoria

### Community 58 - "7. Tarefas"
Cohesion: 0.25
Nodes (8): 7. Tarefas, T1: Domínio de acompanhamento e porta de consulta com implementação SQLite, T2: Casos de uso do painel, T3: Servidor web, segurança, layout e comando `painel`, T4: Rotas de fila e detalhe, T5: Rotas de ações, T6: Rotas de métricas e falhas, T8: Documentação

### Community 59 - "adicionar.ts"
Cohesion: 0.36
Nodes (6): ResultadoAdicao, formatarAdicao(), ROTULOS, comandoAdicionar(), esquema, urlsDoArquivo()

### Community 60 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, commander, cross-spawn, @inquirer/prompts, mammoth, @modelcontextprotocol/sdk, node-notifier, open (+4 more)

### Community 61 - "portas/erros.ts"
Cohesion: 0.10
Nodes (30): 10.1 Modelo de erros (ADR-009), T10: LLM: processo claude, gerador estruturado e prompts, T18: Agente, T6: Portas, erros de porta, concorrência e apoio de testes, ErroAgregadorExigeLogin, ErroInfra, ErroLimiteUso, ErroLlm (+22 more)

### Community 62 - "ErroCamaleao"
Cohesion: 0.40
Nodes (4): ADR-0026: Renomeação de Outbox para Camaleão, com migração automática, 8. Erros, validação, logging, config e concorrência, ErroCamaleao, ErroDominio

### Community 64 - "FormularioPlaywright"
Cohesion: 0.11
Nodes (5): DesfechoEnvio, ADR-0010, ValorLido, FormularioPlaywright, FormularioAbertoFake

### Community 65 - "progresso-terminal.test.ts"
Cohesion: 0.24
Nodes (6): RegiaoViva, montar(), puro(), relogio(), criarSaidaTerminal(), FluxoTerminal

### Community 66 - "ArmazemCurriculoMemoria"
Cohesion: 0.12
Nodes (4): DadosConsulta, BancoRespostas, Perfil, ArmazemCurriculoMemoria

### Community 67 - "NavegadorCamaleao"
Cohesion: 0.13
Nodes (8): playwright, principal(), abrirNavegador(), ErroNavegador, NavegadorUsuario, caminhosChrome(), NavegadorCamaleao, OpcoesNavegadorCamaleao

### Community 68 - "cliente-http.ts"
Cohesion: 0.31
Nodes (5): ErroHttp, ClienteHttpFetch, esperar(), esperaRetryAfter(), OpcoesClienteHttp

### Community 69 - "aplicar-vagas.test.ts"
Cohesion: 0.17
Nodes (15): aplicarVagas(), CAMPOS, criar(), prontas(), roteiro(), sinal(), ambiente(), ambienteComConector() (+7 more)

### Community 70 - "Relogio"
Cohesion: 0.06
Nodes (24): Bloqueios e pendências, Critérios de aceite, Decisões tomadas durante a implementação, Progresso da implementação da V1, Tarefas, Validação real do agente (2026-10-10), Verificação final, Verificações de ambiente (+16 more)

### Community 71 - "ExecutorAgenteClaude"
Cohesion: 0.35
Nodes (4): EntradaAgente, ResultadoAgente, ADR-0012, ExecutorAgenteClaude

### Community 72 - "DefinicaoConector"
Cohesion: 0.09
Nodes (19): 10. Desempenho, 11. Qualidade, 12. Diferenças em relação à spec, 1. Forças, 2. Visão geral, 3. Estrutura, 4. Contextos do domínio, 7. Conectores (+11 more)

### Community 73 - "eslint.config.js"
Cohesion: 0.20
Nodes (7): FRONTEIRAS, SUBIDA_PROIBIDA, eslint, eslint-config-prettier, @eslint/js, typescript-eslint, eslint

### Community 74 - "analisar-vaga.md"
Cohesion: 0.50
Nodes (3): Entrada, Regras, Tarefa

### Community 76 - "ErroUsuario"
Cohesion: 0.13
Nodes (13): T9: Armazenamento em arquivos, esquemaGapsNegados, ErroUsuario, esquemaBancoRespostas, esquemaPerfil, ArmazemCurriculoYaml, AUXILIARES, editarYaml() (+5 more)

### Community 77 - "variaveis.ts"
Cohesion: 0.40
Nodes (3): criarLeitorVariaveis(), NomeVariavel, ADR-0026

### Community 79 - "imports"
Cohesion: 0.25
Nodes (8): imports, #aplicacao/*, #composicao, #dominio/*, #infra/*, #interfaces/*, #scripts/*, #testes/*

### Community 80 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, camaleao, capturar-fixture, formatar, lint, test, tipos, verificar

### Community 81 - "UrlCanonica"
Cohesion: 0.17
Nodes (11): Destino, ErroPreparo, Resolucao, ResolvedorVagas, DadosResolucao, MotivoDe, Rota, UrlCanonica (+3 more)

### Community 82 - "Convenções do Camaleão"
Cohesion: 0.22
Nodes (8): 1. Idioma (ADR-0003), 2. Nomenclatura, 3. Código, 4. Conectores e automação de navegador, 6. Testes, 7. Documentação, 8. Definição de pronto, Convenções do Camaleão

### Community 83 - "logoloom"
Cohesion: 0.50
Nodes (3): npx, logoloom, @mcpware/logoloom

### Community 85 - "Spike: Gupy"
Cohesion: 0.29
Nodes (6): Como concluir o spike, Decisão provisória: `gupy.anexoPorCandidatura: true`, O que foi implementado sem o spike, Objetivo, Por que está bloqueado, Spike: Gupy

### Community 86 - "tailoring.md"
Cohesion: 0.40
Nodes (4): Como escrever cada bullet, Entrada, Regras de lastro (obrigatórias), Tarefa

### Community 88 - "Spike: InHire"
Cohesion: 0.33
Nodes (5): Como concluir o spike, O que foi implementado sem o spike, Objetivo, Por que está bloqueado, Spike: InHire

### Community 91 - "agente-candidatura.md"
Cohesion: 0.40
Nodes (4): Dados do candidato, Regras (obrigatórias), Resposta final, Tarefa

### Community 92 - "responder-perguntas.md"
Cohesion: 0.50
Nodes (3): Entrada, Regras, Tarefa

### Community 108 - "extrair-vaga.md"
Cohesion: 0.50
Nodes (3): Entrada, Regras, Tarefa

### Community 109 - "importar-curriculo.md"
Cohesion: 0.50
Nodes (3): Entrada, Regras, Tarefa

### Community 111 - "12. Segurança"
Cohesion: 0.40
Nodes (5): 12.1 Modelo de ameaças, 12.2 Classificação de dados, 12.3 Fronteira de confiança e injeção de prompt (ADR-012), 12.4 Segredos e credenciais, 12. Segurança

### Community 112 - "atualizacoes.ts"
Cohesion: 0.27
Nodes (14): ADR-0023: Invariantes da vaga no domínio, com valores marcados, ErroValidacao, atualizacao(), contarTentativaPreparo(), DadosExtracao, marcarAnexoManual(), percentual(), registrarAderencia() (+6 more)

### Community 123 - "Motor"
Cohesion: 0.20
Nodes (6): ErroExtracao, ErroVagaIndisponivel, ExtratorVagas, ResultadoExtracao, Motor, esquemaIssueGithub

## Knowledge Gaps
- **38 isolated node(s):** `npx`, `@mcpware/logoloom`, `ADR-0004`, `@playwright/mcp`, `node-notifier` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 635 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `json-ld.ts`, `zod`, `basicos.ts`, `criarContainer`, `sensiveis.test.ts`, `normalizarTexto`, `codigos-saida.test.ts`, `preparar-vagas.ts`, `vaga.ts`, `LeitorHeadless`, `package.json`, `infra-base.test.ts`, `apresentacao.test.ts`, `gerar-curriculo.ts`, `curriculo-ats.test.ts`, `campos.ts`, `ref_node_fs`, `camaleao-segredos.ts`, `nome.test.ts`, `conectores.test.ts`, `motores.ts`, `banco.test.ts`, `respostas.test.ts`, `portas/erros.ts`, `progresso-terminal.test.ts`, `NavegadorCamaleao`, `aplicar-vagas.test.ts`, `eslint.config.js`, `ErroUsuario`, `variaveis.ts`, `atualizacoes.ts`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `IdVaga` (e.g. with `8.1 Adotados` and `T3: Domínio de vagas`) actually correct?**
  _`IdVaga` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx`, `@mcpware/logoloom`, `ADR-0004` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `vitest` be split into smaller, more focused modules?**
  _Cohesion score 0.09250693802035152 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `zod` to `api.ts`, `json-ld.ts`, `vitest`, `sensiveis.test.ts`, `normalizarTexto`, `vaga.ts`, `package.json`, `infra-base.test.ts`, `apresentacao.test.ts`, `gerar-curriculo.ts`, `IdVaga`, `RepositorioVagas`, `ref_node_fs`, `ArmazemCurriculo`, `camaleao-segredos.ts`, `conectores.test.ts`, `responder-campos.ts`, `respostas.test.ts`, `composicao.ts`, `adicionar.ts`, `portas/erros.ts`, `cliente-http.ts`, `Relogio`, `ErroUsuario`, `Motor`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `ErroUsuario` (e.g. with `8. Erros, validação, logging, config e concorrência` and `T2 — Contrato da API e núcleo do servidor do agente`) actually correct?**
  _`ErroUsuario` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Should `17. Registro de decisões arquiteturais (ADR)` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
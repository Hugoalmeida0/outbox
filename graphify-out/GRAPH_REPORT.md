# Graph Report - Outbox  (2026-10-20)

## Corpus Check
- 302 files · ~160,198 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 5, .ico 2)

## Summary
- 2250 nodes · 6906 edges · 139 communities (118 shown, 21 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 615 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `533bb1b0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api.ts
- resolvedor-encadeado.ts
- extrair-vaga.ts
- resolucao.test.ts
- 17. Registro de decisões arquiteturais (ADR)
- ref_zod
- progresso.ts
- basicos.ts
- aplicar-vagas.ts
- composicao.ts
- contrato.ts
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
- repositorio-vagas-sqlite.ts
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
- documentos.test.ts
- camaleao-segredos.ts
- template-html.ts
- revisar-e-enviar.ts
- nome.test.ts
- gerador-estruturado-claude.ts
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
- classificar-campo.ts
- criarCasos
- web/package.json
- devDependencies
- Camaleão
- ArmazemArtefatosFs
- ErroTransicaoInvalida
- servidor.ts
- dependencies
- portas/erros.ts
- ErroCamaleao
- servico-segredos.ts
- FormularioPlaywright
- progresso-terminal.test.ts
- ArmazemCurriculoMemoria
- NavegadorCamaleao
- cliente-http.ts
- aplicar-vagas.test.ts
- Relogio
- ExecutorAgenteClaude
- Arquitetura do Camaleão
- eslint.config.js
- analisar-vaga.md
- InteracaoWeb
- ArmazemCurriculoYaml
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
- ProgressoPreparo
- Spike: InHire
- pareamento.ts
- http/execucoes.ts
- agente-candidatura.md
- responder-perguntas.md
- agente-http.ts
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
- normalizarTexto
- importar-curriculo.md
- CLAUDE.md
- respostas/perfil.ts
- atualizacoes.ts
- principal.ts
- sensiveis.test.ts
- executor-agente-claude.ts
- FormularioPlaywright
- pacote.ts
- agente.test.ts
- entrada-consultas.test.ts
- etapas.test.ts
- respostas.test.ts
- DefinicaoConector
- extrator-estrutural.ts
- cache-respostas-json.ts
- basicos.ts
- Container
- rotas/execucoes.ts
- Registrador
- importar-curriculo.ts
- respostas-bordas.test.ts
- importar.ts
- ExecutorAgente
- Como adicionar um conector de ATS
- GapsVagas
- deduplicacao.test.ts
- 10. Erros, validação, logging, config e concorrência
- ADR-0021: Progresso do `preparar` por porta de eventos

## God Nodes (most connected - your core abstractions)
1. `IdVaga` - 86 edges
2. `ErroUsuario` - 77 edges
3. `vitest` - 54 edges
4. `ArmazemCurriculo` - 52 edges
5. `Vaga` - 50 edges
6. `ArmazemArtefatos` - 43 edges
7. `Motor` - 40 edges
8. `6. Catálogo de portas` - 39 edges
9. `normalizarTexto()` - 38 edges
10. `5. Portas` - 38 edges

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

## Communities (139 total, 21 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.22
Nodes (9): classificarFormulario(), enderecoApi(), esquemaCampoApi, esquemaPergunta, esquemaVagaGreenhouse, obterVagaGreenhouse(), paraCampos(), TIPOS (+1 more)

### Community 1 - "resolvedor-encadeado.ts"
Cohesion: 0.15
Nodes (19): AGREGADORES, ehMotorConhecido(), MOTORES_COM_CONECTOR_V1, BOTAO_EXTERNO, BOTAO_SIMPLIFICADO, DesfechoAgregador, destinoDeRedirecionamento(), EXIGE_LOGIN (+11 more)

### Community 2 - "extrair-vaga.ts"
Cohesion: 0.11
Nodes (22): Entrada, Regras, Tarefa, esquemaPaginaIndisponivel, extrairVaga(), ErroExtracao, ErroVagaIndisponivel, ResultadoExtracao (+14 more)

### Community 3 - "resolucao.test.ts"
Cohesion: 0.16
Nodes (21): paraCampos(), ClienteHttp, lerFixture(), MapaFixtures, RespostaFixture, servirFixtures(), AmbienteConector, aquecerNavegador() (+13 more)

### Community 4 - "17. Registro de decisões arquiteturais (ADR)"
Cohesion: 0.11
Nodes (18): ADR-0003: Idioma único em português ASCII, 17. Registro de decisões arquiteturais (ADR), ADR-001: hexagonal enxuto em quatro camadas, ADR-002: camada no topo, contexto de negócio dentro, ADR-003: idioma único em português ASCII, ADR-004: TypeScript executado nativamente pelo Node 24, sem build, ADR-005: imports por subpath e fronteiras verificadas por lint, ADR-006: injeção manual com raiz de composição preguiçosa (+10 more)

### Community 5 - "ref_zod"
Cohesion: 0.15
Nodes (21): formatarResumoPreparo(), formatarResumoAplicacao(), comandoAdicionar(), esquema, urlsDoArquivo(), comandoAplicar(), esquema, containerDuble() (+13 more)

### Community 6 - "progresso.ts"
Cohesion: 0.16
Nodes (17): EtapaPreparo, colunasDe(), cortarNaLargura(), DadosRotulo, ETAPAS, formatarCabecalhoPreparo(), formatarConclusao(), formatarDuracao() (+9 more)

### Community 7 - "basicos.ts"
Cohesion: 0.25
Nodes (4): ContextoLog, RegistradorJsonl, serializar(), RegistradorMemoria

### Community 8 - "aplicar-vagas.ts"
Cohesion: 0.13
Nodes (24): 6. Fluxos, T2 — Contrato da API e núcleo do servidor do agente, 3. Camadas e responsabilidades, T22: Etapas de aplicação e caso de uso `aplicar`, aplicarUma(), ResumoAplicacao, preResponderCampos(), ResumoPreparo (+16 more)

### Community 9 - "composicao.ts"
Cohesion: 0.09
Nodes (24): ADR-0006, registrarRetorno(), configAplicacao(), criarAssistentes(), criarContainer(), criarPreguicoso(), Implementacoes, Locais (+16 more)

### Community 10 - "contrato.ts"
Cohesion: 0.05
Nodes (42): STATUS_DE_RETORNO, CODIGOS_ERRO_EXECUCAO, COMANDOS_EXECUCAO, contagens, ErroApi, esquemaEntradaAdicionar, esquemaEntradaPareamento, esquemaEntradaRetorno (+34 more)

### Community 11 - "sensiveis.test.ts"
Cohesion: 0.14
Nodes (17): 11.1 Estratégia de testes, DepsAplicarVagas, DepsPrepararVagas, umMaster(), umPerfil(), AmbienteAplicacao, criarAmbienteAplicacao(), ExtratorFake (+9 more)

### Community 12 - "normalizarTexto"
Cohesion: 0.09
Nodes (33): perguntarNivelIdioma(), ALERTA_AFIRMATIVA, calcularAderencia(), DetalhesAderencia, pontosCobertura(), pontosModelo(), pontosRegime(), pontosSenioridade() (+25 more)

### Community 13 - "codigos-saida.test.ts"
Cohesion: 0.19
Nodes (11): ADR-0007: Casos de uso como funções com dependências estreitas, commander, codigoDoErro(), CODIGOS_SAIDA, ehErroPrevisto(), ehInterrupcao(), mensagemDoErro(), executar() (+3 more)

### Community 14 - "preparar-vagas.ts"
Cohesion: 0.33
Nodes (15): aplicarAderencia(), avisarEtapa(), deduplicarPorChave(), definirDestino(), descartarEncerrada(), descartarPorAderencia(), motivoDoErro(), prepararManual() (+7 more)

### Community 15 - "formularios.ts"
Cohesion: 0.18
Nodes (6): ADR-0010, ConectorAts, CtxPreenchimento, ADR-0010, Campo, PacoteCandidatura

### Community 16 - "vaga.ts"
Cohesion: 0.14
Nodes (25): T8: Persistência SQLite, ItemAdicao, LinhaStatus, listarStatus(), paraLinha(), pdfDaVaga(), EntradaRegistrarRetorno, StatusRetorno (+17 more)

### Community 17 - "6. Catálogo de portas"
Cohesion: 0.21
Nodes (9): ADR-0022: Pastas nomeadas pelo design pattern, em inglês, 5. Portas, 6. Catálogo de portas, 8.1 Adotados, DepsPreencherFormulario, CatalogoConectores, ExtratorVagas, RegistroFalhas (+1 more)

### Community 18 - "LeitorHeadless"
Cohesion: 0.17
Nodes (9): playwright, T11: Navegador, leitor headless e documentos, criarWeb(), RenderizadorPdfPlaywright, escaparHtml(), LeitorHeadless, eloDetectarAts(), eloPortalGupy() (+1 more)

### Community 19 - "package.json"
Cohesion: 0.08
Nodes (23): bin, camaleao, description, engines, node, zod, name, private (+15 more)

### Community 20 - "infra-base.test.ts"
Cohesion: 0.14
Nodes (15): ADR-0015, yaml, ArgumentosCaptura, lerArgumentos(), montarFixture(), principal(), ErroUsuario, carregarConfig() (+7 more)

### Community 21 - "apresentacao.test.ts"
Cohesion: 0.16
Nodes (17): ResultadoAdicao, DadosStatus, TODOS_STATUS, formatarAdicao(), ROTULOS, cores, Formato, formatarFalhas() (+9 more)

### Community 22 - "gerar-curriculo.ts"
Cohesion: 0.09
Nodes (11): garantirMasterGenerico(), renderizarMaster(), criarPedido(), descreverViolacoes(), gerarComLastro(), gerarCurriculo(), PedirTailoring, recuperarKeywordsPerdidas() (+3 more)

### Community 23 - "IdVaga"
Cohesion: 0.11
Nodes (12): T3: Domínio de vagas, ConsultaVagas, EscritaVagas, TransicaoVaga, AtualizacaoVaga, ChaveDedup, IdVaga, Vaga (+4 more)

### Community 24 - "repositorio-vagas-sqlite.ts"
Cohesion: 0.11
Nodes (20): AcaoDeduplicacaoUrl, AcaoDescartarDuplicada, dataReferencia(), ehMaisRecente(), ETAPAS, ETAPAS_ENTREVISTA, MOTIVOS, ROTAS (+12 more)

### Community 25 - "curriculo-ats.test.ts"
Cohesion: 0.12
Nodes (13): contarFontes(), inspecionarPdf(), OPERADORES_DE_IMAGEM, PdfInspecionado, PdfLido, pngDaPagina(), leitor, masterDenso() (+5 more)

### Community 26 - "campos.ts"
Cohesion: 0.21
Nodes (17): TipoCampo, melhorOpcao(), definirMarcado(), escolherNoSelect(), marcarCheckbox(), marcarRadio(), preencherCampo(), rotuloDaOpcao() (+9 more)

### Community 27 - "RepositorioVagas"
Cohesion: 0.22
Nodes (7): ADR-0008: Persistência com `node:sqlite`, repositório síncrono do agregado, tabelas STRICT e migrações, DepsAdicionarVagas, DepsListarStatus, DepsResolverVaga, DesfechoResolucao, RepositorioVagas, TransacaoVagas

### Community 28 - "InteracaoTerminal"
Cohesion: 0.22
Nodes (4): open, T24: Composição e CLI, abrirPadrao(), InteracaoTerminal

### Community 29 - "FormularioAberto"
Cohesion: 0.15
Nodes (11): ADR-0010: Conectores ATS com Strategy, catálogo e handle comum, ErroFalhaConector, FormularioAberto, bloqueioPendente(), ContextoPasso, DESCRICOES, esperarDesbloqueio(), passo() (+3 more)

### Community 30 - "preparar"
Cohesion: 0.08
Nodes (30): ADR-0016: Execução exclusiva por comando e cancelamento cooperativo, ADR-0020: Bloqueio anti-bot tratado como CAPTCHA, 3. Decisões, 7.1 `outbox preparar`, 1. Contexto e Objetivo, 2. Premissas, 3. Decisões, 4. Glossário (+22 more)

### Community 31 - "ref_node_fs"
Cohesion: 0.13
Nodes (11): esquemaGapsNegados, esquemaBancoRespostas, esquemaPerfil, AUXILIARES, Caminhos, criarCaminhos(), RAIZ, ADR-0016 (+3 more)

### Community 32 - "ArmazemCurriculo"
Cohesion: 0.06
Nodes (17): 1. Contexto e Objetivo, 2. Premissas, 4. Glossário, 5. Fora do Escopo, 8. Questões em aberto, Anexo A — Valores visuais (B = tamanho base em pt), Anexo B — Correções de revisão, DepsObterPerfil (+9 more)

### Community 33 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+11 more)

### Community 34 - "7. Tarefas"
Cohesion: 0.15
Nodes (12): 6. Contrato de Aceite, 7. Tarefas, T14: Conectores Greenhouse, Lever e Ashby, T15: Conectores SmartRecruiters, Workable e Teamtailor, T16: Conectores Gupy e InHire, com spikes, T17: Cofre de credenciais e MCP `outbox-segredos`, T18: Agente, T1: Fundação do repositório, qualidade e CI (+4 more)

### Community 35 - "Outbox: arquitetura e convenções"
Cohesion: 0.12
Nodes (16): 11.2 Verificação local e CI, 11.3 Regras de lint obrigatórias, 11. Qualidade e testabilidade, 12.1 Modelo de ameaças, 12.2 Classificação de dados, 12.3 Fronteira de confiança e injeção de prompt (ADR-012), 12.4 Segredos e credenciais, 12. Segurança (+8 more)

### Community 36 - "documentos.test.ts"
Cohesion: 0.20
Nodes (7): 3. Decisões, 6. Contrato de Aceite, contarPaginas(), lerPdf(), leitor, pasta, renderizador

### Community 37 - "camaleao-segredos.ts"
Cohesion: 0.18
Nodes (14): @modelcontextprotocol/sdk, T5: Domínio de respostas e falhas, criarServidorSegredos(), hostsDoAmbiente(), principal(), resposta(), Resultado, seletor (+6 more)

### Community 38 - "template-html.ts"
Cohesion: 0.22
Nodes (9): ADR-0012, cabecalho(), css(), documento(), htmlCarta(), htmlCurriculo(), lista(), pt() (+1 more)

### Community 39 - "revisar-e-enviar.ts"
Cohesion: 0.13
Nodes (13): Critérios de aceite, 7.2 `outbox aplicar`, 7. Fluxos principais por camada, acharValor(), DepsRevisarEEnviar, ehSemPretensao(), enviar(), esperaValor() (+5 more)

### Community 40 - "nome.test.ts"
Cohesion: 0.14
Nodes (9): ALVOS, arquivos(), COMPATIBILIDADE, IGNORADOS, RAIZ, TEXTO, ADR-0026, ESPIAO (+1 more)

### Community 41 - "gerador-estruturado-claude.ts"
Cohesion: 0.16
Nodes (9): T10: LLM: processo claude, gerador estruturado e prompts, PedidoGeracao, TarefaLlm, TAREFAS_LLM, ADR-0012, extrairJson(), GeradorEstruturadoClaude, OpcoesGerador (+1 more)

### Community 43 - "Camaleão — Brand Guidelines"
Cohesion: 0.22
Nodes (8): 1. Full Logo (icon + wordmark), 2. Icon Only (avatar, favicon, app icon), 4. Social Media, Camaleão — Brand Guidelines, Colors, Logo Files, Typography, Usage Rules

### Community 44 - "conectores.test.ts"
Cohesion: 0.15
Nodes (19): comParametro(), comSufixo(), dataCurta(), nomeDoSlug(), DEFINICOES_V1, definicaoAshby, esquemaQuadroAshby, definicaoGreenhouse (+11 more)

### Community 45 - "motores.ts"
Cohesion: 0.13
Nodes (14): 1. Garanta o motor no domínio, montarTentativa(), canonicaGenerica(), canonizar(), detectarMotor(), ehRastreamento(), hostCasaPadrao(), MotorConhecido (+6 more)

### Community 46 - "versao"
Cohesion: 0.29
Nodes (7): 16.1 Idioma (ADR-003), 16.2 Nomenclatura, 16.3 Código, 16.4 Prompts, 16.5 Documentação, 16.6 Definição de pronto (por tarefa), 16. Convenções

### Community 47 - "7. Tarefas"
Cohesion: 0.22
Nodes (9): 7. Tarefas, T1 — CSS do Anexo A, T2 — Documento, T3 — Campos opcionais no master, T4 — Laço de encaixe e corte, T5 — Lastro e prompt, T6 — Testes de integração, T7 — Nome do arquivo e metadados (+1 more)

### Community 48 - "preencher-formulario.ts"
Cohesion: 0.25
Nodes (10): agenteFalhou(), assumirAposConector(), EntradaAgente, ExecucaoAgente, executarAgente(), htmlSanitizado(), paraResultado(), preencherComAgente() (+2 more)

### Community 49 - "conector-formulario.ts"
Cohesion: 0.19
Nodes (16): acharResposta(), chaveRotulo(), criarConector(), indexar(), IndiceRespostas, lerCamposDaPagina(), preencherEtapa(), reescolherEPreencher() (+8 more)

### Community 50 - "responder-campos.ts"
Cohesion: 0.16
Nodes (21): ArquivoAnalise, base(), CampoPendente, chaveCache(), consultarLlm(), ContextoResposta, corrigirNoCache(), esquemaRespostasLlm (+13 more)

### Community 51 - "banco.test.ts"
Cohesion: 0.16
Nodes (10): criarLocais(), migrarBancoLegado(), ADR-0026, abrirConexao(), migrar(), ADR-0008, versaoAtual(), RelogioFixo (+2 more)

### Community 52 - "classificar-campo.ts"
Cohesion: 0.16
Nodes (17): CategoriaCampo, AUTOCOMPLETE, ChaveDiversidade, Classificacao, classificarCampo(), classificarCampoDetalhado(), DescricaoCampo, normalizarRotulo() (+9 more)

### Community 53 - "criarCasos"
Cohesion: 0.18
Nodes (6): EntradaAplicarVagas, DadosFalhas, GrupoFalha, listarFalhas(), CasosDeUso, criarCasos()

### Community 54 - "web/package.json"
Cohesion: 0.05
Nodes (42): dependencies, @fontsource/nunito, @fontsource/poppins, react, react-dom, react-router, zod, description (+34 more)

### Community 55 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-prettier, @eslint/js, @napi-rs/canvas, pdfjs-dist, prettier, @types/cross-spawn (+6 more)

### Community 56 - "Camaleão"
Cohesion: 0.12
Nodes (15): Camaleão, Checklist de smoke manual, Comandos e códigos de saída, Configuração, Currículo em 1 página, Desenvolvimento, Documentação, Fluxo diário (+7 more)

### Community 57 - "ArmazemArtefatosFs"
Cohesion: 0.14
Nodes (3): NomeArtefato, ArmazemArtefatosFs, ArmazemArtefatosMemoria

### Community 58 - "ErroTransicaoInvalida"
Cohesion: 0.16
Nodes (12): T2: Schemas do domínio e exemplos, 7. Tarefas, T1: Domínio de acompanhamento e porta de consulta com implementação SQLite, T2: Casos de uso do painel, T4: Rotas de fila e detalhe, T5: Rotas de ações, T6: Rotas de métricas e falhas, T8: Documentação (+4 more)

### Community 59 - "servidor.ts"
Cohesion: 0.15
Nodes (25): hono, registrarRotaArquivos(), idDaRota(), lerJson(), validar(), registrarRotasCurriculo(), DepsRotas, registrarRotasFalhas() (+17 more)

### Community 60 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, commander, cross-spawn, hono, @hono/node-server, @inquirer/prompts, mammoth, @modelcontextprotocol/sdk (+6 more)

### Community 61 - "portas/erros.ts"
Cohesion: 0.15
Nodes (14): 10.1 Modelo de erros (ADR-009), T12: Resolução e extração, T6: Portas, erros de porta, concorrência e apoio de testes, T7: Infra base, ErroAgregadorExigeLogin, ErroHttp, ErroInfra, ErroLimiteUso (+6 more)

### Community 62 - "ErroCamaleao"
Cohesion: 0.33
Nodes (4): ADR-0026: Renomeação de Outbox para Camaleão, com migração automática, 8. Erros, validação, logging, config e concorrência, T1 — Renomear Outbox → Camaleão, com migração, ErroCamaleao

### Community 63 - "servico-segredos.ts"
Cohesion: 0.15
Nodes (9): preencherElemento(), tipoDoElemento(), CofreCredenciais, ChaveSensivel, FormatoData, OpcoesServicoSegredos, ResultadoFerramenta, ServicoSegredos (+1 more)

### Community 64 - "FormularioPlaywright"
Cohesion: 0.18
Nodes (4): DesfechoEnvio, ADR-0010, ValorLido, FormularioAbertoFake

### Community 65 - "progresso-terminal.test.ts"
Cohesion: 0.24
Nodes (6): RegiaoViva, montar(), puro(), relogio(), criarSaidaTerminal(), FluxoTerminal

### Community 66 - "ArmazemCurriculoMemoria"
Cohesion: 0.11
Nodes (4): DadosConsulta, BancoRespostas, Perfil, ArmazemCurriculoMemoria

### Community 67 - "NavegadorCamaleao"
Cohesion: 0.14
Nodes (7): abrirNavegador(), ErroNavegador, NavegadorUsuario, caminhosChrome(), NavegadorCamaleao, OpcoesNavegadorCamaleao, ADR-0025

### Community 68 - "cliente-http.ts"
Cohesion: 0.36
Nodes (4): ClienteHttpFetch, esperar(), esperaRetryAfter(), OpcoesClienteHttp

### Community 69 - "aplicar-vagas.test.ts"
Cohesion: 0.17
Nodes (18): aplicarVagas(), CAMPOS, criar(), prontas(), roteiro(), sinal(), ambiente(), ambienteComConector() (+10 more)

### Community 70 - "Relogio"
Cohesion: 0.14
Nodes (10): Relogio, Aleatorio, CofreCredenciaisJson, esquemaCofre, gerarSenha(), Credencial, NIVEIS_LOG, nivelDoAmbiente() (+2 more)

### Community 71 - "ExecutorAgenteClaude"
Cohesion: 0.30
Nodes (4): EntradaAgente, ResultadoAgente, ADR-0012, ExecutorAgenteClaude

### Community 72 - "Arquitetura do Camaleão"
Cohesion: 0.20
Nodes (9): 10. Desempenho, 11. Qualidade, 12. Diferenças em relação à spec, 1. Forças, 2. Visão geral, 3. Estrutura, 4. Contextos do domínio, 9. Segurança (+1 more)

### Community 73 - "eslint.config.js"
Cohesion: 0.20
Nodes (7): FRONTEIRAS, SUBIDA_PROIBIDA, eslint, eslint-config-prettier, @eslint/js, typescript-eslint, eslint

### Community 74 - "analisar-vaga.md"
Cohesion: 0.50
Nodes (3): Entrada, Regras, Tarefa

### Community 75 - "InteracaoWeb"
Cohesion: 0.12
Nodes (12): OpcaoEscolha, ResumoRevisao, Pergunta, ErroPerguntaCancelada, ErroPerguntaNaoPendente, InteracaoWeb, invalida(), OpcoesInteracaoWeb (+4 more)

### Community 76 - "ArmazemCurriculoYaml"
Cohesion: 0.12
Nodes (13): T9: Armazenamento em arquivos, ArmazemCurriculoYaml, nomeSeguro(), RegistroFalhasFs, editarYaml(), ehObjeto(), lerYaml(), lerYamlBruto() (+5 more)

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
Cohesion: 0.19
Nodes (12): Destino, ErroPreparo, Resolucao, ResolvedorVagas, DadosResolucao, Motor, MotivoDe, Rota (+4 more)

### Community 82 - "Convenções do Camaleão"
Cohesion: 0.20
Nodes (9): 1. Idioma (ADR-0003), 2. Nomenclatura, 3. Código, 4. Conectores e automação de navegador, 5. Prompts, 6. Testes, 7. Documentação, 8. Definição de pronto (+1 more)

### Community 83 - "logoloom"
Cohesion: 0.50
Nodes (3): npx, logoloom, @mcpware/logoloom

### Community 85 - "Spike: Gupy"
Cohesion: 0.29
Nodes (6): Como concluir o spike, Decisão provisória: `gupy.anexoPorCandidatura: true`, O que foi implementado sem o spike, Objetivo, Por que está bloqueado, Spike: Gupy

### Community 86 - "tailoring.md"
Cohesion: 0.40
Nodes (4): Como escrever cada bullet, Entrada, Regras de lastro (obrigatórias), Tarefa

### Community 87 - "ProgressoPreparo"
Cohesion: 0.09
Nodes (21): 1. Contexto e Objetivo, 2. Premissas, 4. Glossário, 5. Fora do Escopo, 7. Tarefas, 8. Questões em aberto, Camaleão: MVP web (site hospedado + agente local), Fase 1, T3 — Comando `agente`, abertura do site e isolamento da aba (+13 more)

### Community 88 - "Spike: InHire"
Cohesion: 0.33
Nodes (5): Como concluir o spike, O que foi implementado sem o spike, Objetivo, Por que está bloqueado, Spike: InHire

### Community 89 - "pareamento.ts"
Cohesion: 0.13
Nodes (14): comandoAgente(), sondarPorta(), ArmazemTokens, esquemaTokens, formatarCodigo(), gerarCodigo(), hashToken(), MAX_ERROS_CODIGO (+6 more)

### Community 90 - "http/execucoes.ts"
Cohesion: 0.15
Nodes (12): ComandoExecucao, EventoExecucao, ResultadoExecucao, Assinante, ContextoExecucao, EstadoExecucao, eventoDeErro(), Execucao (+4 more)

### Community 91 - "agente-candidatura.md"
Cohesion: 0.40
Nodes (4): Dados do candidato, Regras (obrigatórias), Resposta final, Tarefa

### Community 92 - "responder-perguntas.md"
Cohesion: 0.50
Nodes (3): Entrada, Regras, Tarefa

### Community 93 - "agente-http.ts"
Cohesion: 0.11
Nodes (15): T3: Servidor web, segurança, layout e comando `painel`, aguardarCancelamento(), AssinadorArquivos, Assinatura, OpcoesAssinador, real(), TIPOS, VALIDADE_ARQUIVO_MS (+7 more)

### Community 108 - "normalizarTexto"
Cohesion: 0.20
Nodes (16): contemTermo(), escaparRegex(), normalizarTexto(), paraKebab(), consultasLocalizacao(), Uf, ufDe(), UFS (+8 more)

### Community 109 - "importar-curriculo.md"
Cohesion: 0.50
Nodes (3): Entrada, Regras, Tarefa

### Community 111 - "respostas/perfil.ts"
Cohesion: 0.12
Nodes (16): ADR-0019: Consentimento como categoria de campo, aceitaConsentimento(), respostaConsentimento(), Consentimentos, dataIso, esquemaConsentimentos, esquemaDiversidade, esquemaDocumentos (+8 more)

### Community 112 - "atualizacoes.ts"
Cohesion: 0.30
Nodes (13): ADR-0023: Invariantes da vaga no domínio, com valores marcados, atualizacao(), contarTentativaPreparo(), DadosExtracao, marcarAnexoManual(), percentual(), registrarAderencia(), registrarAnalise() (+5 more)

### Community 113 - "principal.ts"
Cohesion: 0.24
Nodes (7): emitirAvisoOriginal, ADR-0004, esquema, EstadoPorta, COR_DO_NIVEL, TITULOS_AJUDA, versaoDoPacote()

### Community 114 - "sensiveis.test.ts"
Cohesion: 0.15
Nodes (12): vitest, BINARIO_FALSO, ChamadaRegistrada, ClaudeFalso, RegraClaude, respostaJson(), usarClaudeFalso(), CONFIG_TESTE (+4 more)

### Community 115 - "executor-agente-claude.ts"
Cohesion: 0.18
Nodes (14): ErroLlm, ErroMaxTurnos, ErroTimeoutLlm, esquemaSaidaAgente, FERRAMENTAS_AGENTE, OpcoesExecutorAgente, SaidaAgente, lerVariavel (+6 more)

### Community 116 - "FormularioPlaywright"
Cohesion: 0.12
Nodes (9): Bloqueios e pendências, Decisões tomadas durante a implementação, Progresso da implementação da V1, Tarefas, Validação real do agente (2026-10-10), Verificação final, Verificações de ambiente, T13: Base de conectores, contratos e captura de fixtures (+1 more)

### Community 117 - "pacote.ts"
Cohesion: 0.18
Nodes (12): proximoId(), RespostaFinal, tipoResposta(), EntradaBanco, esquemaEntradaBanco, TipoResposta, TIPOS_RESPOSTA, CATEGORIAS_CAMPO (+4 more)

### Community 118 - "agente.test.ts"
Cohesion: 0.20
Nodes (10): umaResposta(), umPacote(), descreverContratoFormulario(), ADR-0010, criarExecutor(), entrada(), leitor, paginaNaVaga() (+2 more)

### Community 119 - "entrada-consultas.test.ts"
Cohesion: 0.30
Nodes (9): EstadoCurriculo, obterEstadoCurriculo(), obterPerfil(), SaidaObterPerfil, DepsSalvarPerfil, salvarPerfil(), ErroEntradaInvalida, ProblemaCampo (+1 more)

### Community 120 - "etapas.test.ts"
Cohesion: 0.20
Nodes (11): ALERTA_ATS_CAIU, ALERTA_CAMALEAO_FALHOU, ALERTA_PDF_LONGO, esquemaArquivoAnalise, esquemaArquivoCampos, analisarVaga(), vagaPronta(), esquemaAnaliseVaga (+3 more)

### Community 121 - "respostas.test.ts"
Cohesion: 0.27
Nodes (12): ChaveDocumento, ChavePadrao, localizacaoCompleta(), Contato, Documentos, Endereco, empresaAtual(), formatarData() (+4 more)

### Community 122 - "DefinicaoConector"
Cohesion: 0.23
Nodes (5): 7. Conectores, 3. Escreva a definição, DefinicaoConector, DepsConector, CatalogoConectoresPlaywright

### Community 123 - "extrator-estrutural.ts"
Cohesion: 0.33
Nodes (4): esquemaIssueGithub, OpcoesLeitor, PaginaLida, ADR-0012

### Community 124 - "cache-respostas-json.ts"
Cohesion: 0.20
Nodes (5): CacheRespostas, CacheRespostasJson, Entradas, esquemaCache, OpcoesCacheRespostas

### Community 125 - "basicos.ts"
Cohesion: 0.22
Nodes (6): 14. Política de dependências, Notificador, ADR-0014, MotorToast, EntradaLog, RespostaRoteiro

### Community 126 - "Container"
Cohesion: 0.17
Nodes (5): Container, Saida, OpcoesInteracaoTerminal, DependenciasCli, OpcoesProgressoTerminal

### Community 127 - "rotas/execucoes.ts"
Cohesion: 0.24
Nodes (12): esquemaEntradaAplicar, esquemaEntradaPreparar, esquemaEntradaResposta, ErroExecucaoEmAndamento, iniciarExclusivo(), LIMITE_UPLOAD_BYTES, ocupado(), registrarRotasExecucoes() (+4 more)

### Community 128 - "Registrador"
Cohesion: 0.21
Nodes (5): ADR-0014: Logging mínimo com redação, T19: Notificação, T7: Toast que abre o painel, Registrador, NotificadorWindows

### Community 129 - "importar-curriculo.ts"
Cohesion: 0.22
Nodes (5): DepsImportarCurriculo, EntradaImportarCurriculo, importarCurriculo(), SaidaImportarCurriculo, validar()

### Community 130 - "respostas-bordas.test.ts"
Cohesion: 0.31
Nodes (9): respostaSalario(), Regime, calcularSalario(), escolherFaixa(), Faixa, interpretarFaixa(), numerosDe(), PedidoSalario (+1 more)

### Community 131 - "importar.ts"
Cohesion: 0.33
Nodes (7): mammoth, comandoImportar(), esquema, EXTENSOES_CURRICULO, lerCurriculo(), textoDocx(), validarExtensao()

### Community 132 - "ExecutorAgente"
Cohesion: 0.22
Nodes (7): ADR-0011: LLM com portas separadas, schema único e prompts versionados, 15.1 Receitas de extensão, 15.2 Não construir agora (YAGNI), 15. Evolução, 9. Princípios aplicados, ADR-011: LLM com portas separadas, schema único e prompts versionados, ExecutorAgente

### Community 133 - "Como adicionar um conector de ATS"
Cohesion: 0.33
Nodes (5): 2. Capture fixtures sanitizadas, 4. Registre no catálogo, 5. Passe na suíte de contrato, 6. Valide com uma vaga real, Como adicionar um conector de ATS

### Community 135 - "deduplicacao.test.ts"
Cohesion: 0.53
Nodes (3): chaveDedup(), normalizarCargo(), umaVaga()

### Community 136 - "10. Erros, validação, logging, config e concorrência"
Cohesion: 0.40
Nodes (5): 10.2 Validação, 10.3 Logging (ADR-014), 10.4 Configuração (ADR-015), 10.5 Concorrência, transações e cancelamento (ADR-008, ADR-016), 10. Erros, validação, logging, config e concorrência

## Knowledge Gaps
- **61 isolated node(s):** `npx`, `@mcpware/logoloom`, `@fontsource/nunito`, `@fontsource/poppins`, `react` (+56 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 743 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `sensiveis.test.ts` to `respostas-bordas.test.ts`, `extrair-vaga.ts`, `resolucao.test.ts`, `ref_zod`, `deduplicacao.test.ts`, `composicao.ts`, `contrato.ts`, `navegador.test.ts`, `normalizarTexto`, `codigos-saida.test.ts`, `vaga.ts`, `package.json`, `infra-base.test.ts`, `apresentacao.test.ts`, `curriculo-ats.test.ts`, `campos.ts`, `ref_node_fs`, `documentos.test.ts`, `camaleao-segredos.ts`, `nome.test.ts`, `conectores.test.ts`, `motores.ts`, `banco.test.ts`, `ErroTransicaoInvalida`, `portas/erros.ts`, `progresso-terminal.test.ts`, `aplicar-vagas.test.ts`, `eslint.config.js`, `InteracaoWeb`, `variaveis.ts`, `http/execucoes.ts`, `normalizarTexto`, `atualizacoes.ts`, `agente.test.ts`, `entrada-consultas.test.ts`, `etapas.test.ts`, `respostas.test.ts`, `basicos.ts`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `IdVaga` (e.g. with `8.1 Adotados` and `T3: Domínio de vagas`) actually correct?**
  _`IdVaga` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx`, `@mcpware/logoloom`, `@fontsource/nunito` to the rest of the system?**
  _61 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `extrair-vaga.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Why does `ErroUsuario` connect `infra-base.test.ts` to `importar-curriculo.ts`, `importar.ts`, `ref_zod`, `aplicar-vagas.ts`, `10. Erros, validação, logging, config e concorrência`, `composicao.ts`, `sensiveis.test.ts`, `codigos-saida.test.ts`, `vaga.ts`, `InteracaoTerminal`, `ref_node_fs`, `7. Tarefas`, `ErroTransicaoInvalida`, `servidor.ts`, `portas/erros.ts`, `ErroCamaleao`, `ArmazemCurriculoMemoria`, `aplicar-vagas.test.ts`, `InteracaoWeb`, `ArmazemCurriculoYaml`, `ProgressoPreparo`, `http/execucoes.ts`, `normalizarTexto`, `entrada-consultas.test.ts`, `rotas/execucoes.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `ErroUsuario` (e.g. with `8. Erros, validação, logging, config e concorrência` and `T2 — Contrato da API e núcleo do servidor do agente`) actually correct?**
  _`ErroUsuario` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Should `17. Registro de decisões arquiteturais (ADR)` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
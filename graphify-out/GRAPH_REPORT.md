# Graph Report - outbox  (2026-10-20)

## Corpus Check
- 266 files · ~138,184 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 5, .ico 1)

## Summary
- 1908 nodes · 5937 edges · 116 communities (94 shown, 22 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 568 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3f70aa16`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api.ts
- agregadores.ts
- json-ld.ts
- harness-conector.ts
- 17. Registro de decisões arquiteturais (ADR)
- zod
- apresentacao.test.ts
- registrador-jsonl.ts
- rodada-gaps.ts
- composicao.ts
- pdf.ts
- deps-aplicacao.ts
- analise-vaga.ts
- codigos-saida.test.ts
- preparar-vagas.ts
- pacote.ts
- repositorio-vagas-sqlite.ts
- 6. Catálogo de portas
- LeitorHeadless
- package.json
- smartrecruiters/conector.ts
- apresentacao/status.ts
- gerar-curriculo.ts
- IdVaga
- vagas/status.ts
- curriculo-ats.test.ts
- campos.ts
- ProgressoTerminal
- aplicar.ts
- normalizarTexto
- 7. Tarefas
- sensiveis.test.ts
- ArmazemCurriculo
- compilerOptions
- Motor
- Relogio
- spec-curriculo-ats-1-pagina/spec.md
- outbox-segredos.ts
- renderizador-pdf-playwright.ts
- builders.ts
- DefinicaoConector
- GeradorEstruturadoRoteirizado
- InteracaoRoteirizada
- Camaleão — Brand Guidelines
- conectores.test.ts
- motores.ts
- Como adicionar um conector de ATS
- NavegadorOutbox
- preencher-formulario.ts
- conector-formulario.ts
- responder-campos.ts
- basicos.ts
- respostas.test.ts
- entrada-consultas.test.ts
- RegistroFalhasFs
- devDependencies
- Outbox
- ArmazemArtefatosFs
- respostas-bordas.test.ts
- Progresso da implementação da V1
- dependencies
- executor-agente-claude.ts
- RenderizadorPdfPlaywright
- ServicoSegredos
- FormularioAberto
- progresso-terminal.test.ts
- ArmazemCurriculoMemoria
- portas/erros.ts
- 7. Tarefas
- aplicar-vagas.test.ts
- cache-respostas-json.ts
- ExecutorAgenteClaude
- Arquitetura do Outbox
- eslint.config.js
- analisar-vaga.md
- cores.ts
- ErroUsuario
- transicoes.ts
- aplicar-vagas.ts
- imports
- scripts
- ResolvedorEncadeado
- Convenções do Outbox
- logoloom
- espiar-modulos.ts
- Spike: Gupy
- tailoring.md
- armazens.ts
- Spike: InHire
- perfil.ts
- exemplos.test.ts
- agente-candidatura.md
- responder-perguntas.md
- documentos.test.ts
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
- vaga.ts
- outbox.js
- claude.mjs
- resolucao.test.ts

## God Nodes (most connected - your core abstractions)
1. `IdVaga` - 84 edges
2. `ErroUsuario` - 51 edges
3. `Vaga` - 49 edges
4. `vitest` - 47 edges
5. `zod` - 46 edges
6. `ArmazemCurriculo` - 44 edges
7. `ArmazemArtefatos` - 43 edges
8. `Motor` - 40 edges
9. `6. Catálogo de portas` - 40 edges
10. `normalizarTexto()` - 38 edges

## Surprising Connections (you probably didn't know these)
- `Tarefas` --references--> `preparar()`  [INFERRED]
  docs/progresso.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts
- `O que foi implementado sem o spike` --references--> `preparar()`  [INFERRED]
  docs/spikes/gupy.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts
- `Comandos e códigos de saída` --references--> `preparar()`  [INFERRED]
  README.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts
- `ADR-016: execução exclusiva por comando e cancelamento cooperativo` --references--> `preparar()`  [INFERRED]
  specs/v1/spec-outbox/arquitetura.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts
- `T25: Documentação viva` --references--> `preparar()`  [INFERRED]
  specs/v1/spec-outbox/spec.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts

## Import Cycles
- None detected.

## Communities (116 total, 22 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.23
Nodes (9): enderecoApi(), esquemaCampoApi, esquemaPergunta, esquemaVagaGreenhouse, obterVagaGreenhouse(), paraCampos(), paraVagaExtraida(), TIPOS (+1 more)

### Community 1 - "agregadores.ts"
Cohesion: 0.31
Nodes (8): BOTAO_EXTERNO, BOTAO_SIMPLIFICADO, DesfechoAgregador, destinoDeRedirecionamento(), EXIGE_LOGIN, PARAMETROS_REDIRECIONAMENTO, resolverNoAgregador(), saiuDoAgregador()

### Community 2 - "json-ld.ts"
Cohesion: 0.33
Nodes (11): esquemaVagaExtraida, vagaDoNextData(), decodificarEntidades(), ENTIDADES, htmlParaTexto(), acharVaga(), ehObjeto(), extrairJsonLd() (+3 more)

### Community 3 - "harness-conector.ts"
Cohesion: 0.18
Nodes (18): lerCamposDaPagina(), lerDescritores(), paraCampos(), lerFixture(), MapaFixtures, PASTA_FIXTURES, RespostaFixture, servirFixtures() (+10 more)

### Community 4 - "17. Registro de decisões arquiteturais (ADR)"
Cohesion: 0.11
Nodes (17): ADR-0003: Idioma único em português ASCII, 17. Registro de decisões arquiteturais (ADR), ADR-001: hexagonal enxuto em quatro camadas, ADR-002: camada no topo, contexto de negócio dentro, ADR-003: idioma único em português ASCII, ADR-004: TypeScript executado nativamente pelo Node 24, sem build, ADR-005: imports por subpath e fronteiras verificadas por lint, ADR-006: injeção manual com raiz de composição preguiçosa (+9 more)

### Community 5 - "zod"
Cohesion: 0.11
Nodes (28): zod, STATUS_DE_RETORNO, Container, formatarAdicao(), comandoAdicionar(), esquema, urlsDoArquivo(), containerDuble() (+20 more)

### Community 6 - "apresentacao.test.ts"
Cohesion: 0.13
Nodes (19): EtapaPreparo, EventoPreparo, ProgressoPreparo, colunasDe(), cortarNaLargura(), DadosRotulo, ETAPAS, formatarCabecalhoPreparo() (+11 more)

### Community 7 - "registrador-jsonl.ts"
Cohesion: 0.13
Nodes (9): ContextoLog, NIVEIS_LOG, nivelDoAmbiente(), OpcoesRegistrador, RegistradorJsonl, serializar(), ADR-0014, EntradaLog (+1 more)

### Community 8 - "rodada-gaps.ts"
Cohesion: 0.17
Nodes (26): 6. Fluxos, 3. Camadas e responsabilidades, 7.1 `outbox preparar`, 6. Contrato de Aceite, T21: Etapas de preparo e caso de uso `preparar`, T22: Etapas de aplicação e caso de uso `aplicar`, executarComLimite(), atualizarAnalise() (+18 more)

### Community 9 - "composicao.ts"
Cohesion: 0.09
Nodes (27): ADR-0006, ADR-0015, yaml, aplicarVagas(), importarCurriculo(), configAplicacao(), criarAssistentes(), criarContainer() (+19 more)

### Community 10 - "pdf.ts"
Cohesion: 0.22
Nodes (8): @napi-rs/canvas, pdfjs-dist, contarFontes(), inspecionarPdf(), OPERADORES_DE_IMAGEM, PdfInspecionado, PdfLido, pngDaPagina()

### Community 11 - "deps-aplicacao.ts"
Cohesion: 0.16
Nodes (9): DepsAplicarVagas, DepsPrepararVagas, ConfigAplicacao, AmbienteAplicacao, CONFIG_TESTE, ExtratorFake, RenderizadorFake, ResolvedorFake (+1 more)

### Community 12 - "analise-vaga.ts"
Cohesion: 0.08
Nodes (32): perguntarNivelIdioma(), ALERTA_AFIRMATIVA, DetalhesAderencia, pontosCobertura(), pontosModelo(), pontosRegime(), pontosSenioridade(), ResultadoAderencia (+24 more)

### Community 13 - "codigos-saida.test.ts"
Cohesion: 0.19
Nodes (11): ADR-0007: Casos de uso como funções com dependências estreitas, commander, codigoDoErro(), CODIGOS_SAIDA, ehErroPrevisto(), ehInterrupcao(), mensagemDoErro(), executar() (+3 more)

### Community 14 - "preparar-vagas.ts"
Cohesion: 0.12
Nodes (37): adicionarVagas(), aplicarAderencia(), avisarEtapa(), deduplicarPorChave(), definirDestino(), descartarEncerrada(), descartarPorAderencia(), Destino (+29 more)

### Community 15 - "pacote.ts"
Cohesion: 0.13
Nodes (13): T2: Schemas do domínio e exemplos, CtxPreenchimento, ADR-0010, Campo, CATEGORIAS_CAMPO, TIPOS_CAMPO, esquemaContato, esquemaRespostaSugerida (+5 more)

### Community 16 - "repositorio-vagas-sqlite.ts"
Cohesion: 0.11
Nodes (15): EscritaVagas, RespostasEnviadasVagas, TransacaoVagas, ADR-0008, TransicaoVaga, Evento, NovaVaga, RespostaEnviada (+7 more)

### Community 17 - "6. Catálogo de portas"
Cohesion: 0.10
Nodes (17): ADR-0014: Logging mínimo com redação, 5. Portas, 6. Catálogo de portas, T7: Toast que abre o painel, ExtratorVagas, Notificador, Registrador, ADR-0014 (+9 more)

### Community 18 - "LeitorHeadless"
Cohesion: 0.31
Nodes (3): T11: Navegador, leitor headless e documentos, LeitorHeadless, servico()

### Community 19 - "package.json"
Cohesion: 0.09
Nodes (20): bin, outbox, description, engines, node, name, private, type (+12 more)

### Community 20 - "smartrecruiters/conector.ts"
Cohesion: 0.31
Nodes (7): comParametro(), comSufixo(), dataCurta(), nomeDoSlug(), esquemaQuadroAshby, esquemaPostagemSr, secao

### Community 21 - "apresentacao/status.ts"
Cohesion: 0.26
Nodes (12): ResultadoAdicao, DadosStatus, ROTULOS, formatarFalhas(), ats(), formatarStatus(), titulo(), dataHora() (+4 more)

### Community 22 - "gerar-curriculo.ts"
Cohesion: 0.09
Nodes (15): ALERTA_ATS_CAIU, ALERTA_CAMALEAO_FALHOU, ALERTA_PDF_LONGO, esquemaArquivoAnalise, esquemaArquivoCampos, vagaPronta(), descreverViolacoes(), gerarComLastro() (+7 more)

### Community 23 - "IdVaga"
Cohesion: 0.15
Nodes (7): GapsVagas, GapAberto, IdVaga, marcadores(), paraVaga(), RepositorioVagasSqlite, valorSql()

### Community 24 - "vagas/status.ts"
Cohesion: 0.15
Nodes (16): ItemAdicao, RepositorioTransicao, AcaoDeduplicacaoUrl, AcaoDescartarDuplicada, dataReferencia(), ehMaisRecente(), ETAPAS, ETAPAS_ENTREVISTA (+8 more)

### Community 25 - "curriculo-ats.test.ts"
Cohesion: 0.11
Nodes (9): garantirMasterGenerico(), renderizarMaster(), leitor, masterDenso(), masterExemplo, pasta, PdfGerado, renderizador (+1 more)

### Community 26 - "campos.ts"
Cohesion: 0.18
Nodes (20): playwright, TipoCampo, casarTexto(), IDIOMAS, indice(), melhorOpcao(), nomesDoPais(), definirMarcado() (+12 more)

### Community 28 - "aplicar.ts"
Cohesion: 0.17
Nodes (8): OpcaoEscolha, ResumoRevisao, formatarResumoAplicacao(), formatarResumoRevisao(), ROTULOS_DESFECHO, comandoAplicar(), esquema, InteracaoTerminal

### Community 29 - "normalizarTexto"
Cohesion: 0.18
Nodes (15): ErroValidacao, contemTermo(), escaparRegex(), normalizarTexto(), paraKebab(), validar(), consultasLocalizacao(), Uf (+7 more)

### Community 30 - "7. Tarefas"
Cohesion: 0.10
Nodes (18): 1. Contexto e Objetivo, 2. Premissas, 3.1 Produto, 3.2 Arquitetura (ADRs da v2, complementando os ADR-001 a ADR-016), 3. Decisões, 4. Glossário, 5. Fora do Escopo, 6. Contrato de Aceite (+10 more)

### Community 31 - "sensiveis.test.ts"
Cohesion: 0.09
Nodes (21): vitest, OpcoesNavegadorOutbox, RAIZ, BINARIO_FALSO, ChamadaRegistrada, ClaudeFalso, RegraClaude, respostaJson() (+13 more)

### Community 32 - "ArmazemCurriculo"
Cohesion: 0.06
Nodes (23): ADR-0008: Persistência com `node:sqlite`, repositório síncrono do agregado, tabelas STRICT e migrações, 5. Fora do Escopo, 16.1 Idioma (ADR-003), 16.2 Nomenclatura, 16.3 Código, 16.4 Prompts, 16.5 Documentação, 16.6 Definição de pronto (por tarefa) (+15 more)

### Community 33 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+11 more)

### Community 34 - "Motor"
Cohesion: 0.17
Nodes (11): ADR-0010: Conectores ATS com Strategy, catálogo e handle comum, 8.1 Adotados, ADR-010: conectores ATS com Strategy, catálogo e handle comum, 4. Glossário, CatalogoConectores, ADR-0010, ConectorAts, Motor (+3 more)

### Community 35 - "Relogio"
Cohesion: 0.04
Nodes (38): ADR-0011: LLM com portas separadas, schema único e prompts versionados, ADR-0016: Execução exclusiva por comando e cancelamento cooperativo, ADR-0020: Bloqueio anti-bot tratado como CAPTCHA, ADR-0021: Progresso do `preparar` por porta de eventos, 10.2 Validação, 10.3 Logging (ADR-014), 10.4 Configuração (ADR-015), 10.5 Concorrência, transações e cancelamento (ADR-008, ADR-016) (+30 more)

### Community 36 - "spec-curriculo-ats-1-pagina/spec.md"
Cohesion: 0.11
Nodes (19): 1. Contexto e Objetivo, 2. Premissas, 3. Decisões, 4. Glossário, 6. Contrato de Aceite, 7. Tarefas, 8. Questões em aberto, Anexo A — Valores visuais (B = tamanho base em pt) (+11 more)

### Community 37 - "outbox-segredos.ts"
Cohesion: 0.18
Nodes (14): @modelcontextprotocol/sdk, T5: Domínio de respostas e falhas, criarServidorSegredos(), hostsDoAmbiente(), principal(), resposta(), Resultado, seletor (+6 more)

### Community 38 - "renderizador-pdf-playwright.ts"
Cohesion: 0.18
Nodes (11): 12.2 Classificação de dados, ADR-0012, cabecalho(), css(), documento(), escaparHtml(), htmlCarta(), htmlCurriculo() (+3 more)

### Community 39 - "builders.ts"
Cohesion: 0.13
Nodes (16): 11.1 Estratégia de testes, 11.2 Verificação local e CI, 11.3 Regras de lint obrigatórias, 11. Qualidade e testabilidade, T17: Cofre de credenciais e MCP `outbox-segredos`, Aleatorio, CofreCredenciaisJson, esquemaCofre (+8 more)

### Community 40 - "DefinicaoConector"
Cohesion: 0.33
Nodes (3): 7. Conectores, 3. Escreva a definição, DefinicaoConector

### Community 41 - "GeradorEstruturadoRoteirizado"
Cohesion: 0.33
Nodes (5): PedidoGeracao, TarefaLlm, OpcoesGerador, GeradorEstruturadoRoteirizado, Resposta

### Community 43 - "Camaleão — Brand Guidelines"
Cohesion: 0.22
Nodes (8): 1. Full Logo (icon + wordmark), 2. Icon Only (avatar, favicon, app icon), 4. Social Media, Camaleão — Brand Guidelines, Colors, Logo Files, Typography, Usage Rules

### Community 44 - "conectores.test.ts"
Cohesion: 0.28
Nodes (10): DEFINICOES_V1, definicaoAshby, definicaoGreenhouse, definicaoGupy, definicaoInhire, definicaoLever, definicaoSmartRecruiters, definicaoTeamtailor (+2 more)

### Community 45 - "motores.ts"
Cohesion: 0.10
Nodes (27): 1. Garanta o motor no domínio, montarTentativa(), criarWeb(), AGREGADORES, canonicaGenerica(), canonizar(), detectarMotor(), ehMotorConhecido() (+19 more)

### Community 46 - "Como adicionar um conector de ATS"
Cohesion: 0.33
Nodes (5): 2. Capture fixtures sanitizadas, 4. Registre no catálogo, 5. Passe na suíte de contrato, 6. Valide com uma vaga real, Como adicionar um conector de ATS

### Community 48 - "preencher-formulario.ts"
Cohesion: 0.28
Nodes (10): agenteFalhou(), assumirAposConector(), EntradaAgente, ExecucaoAgente, executarAgente(), htmlSanitizado(), paraResultado(), preencherComAgente() (+2 more)

### Community 49 - "conector-formulario.ts"
Cohesion: 0.15
Nodes (20): acharResposta(), chaveRotulo(), criarConector(), indexar(), IndiceRespostas, preencherEtapa(), ADR-0010, RegrasConfirmacao (+12 more)

### Community 50 - "responder-campos.ts"
Cohesion: 0.11
Nodes (29): ArquivoAnalise, base(), CampoPendente, chaveCache(), consultarLlm(), contatoDo(), ContextoResposta, corrigirNoCache() (+21 more)

### Community 51 - "basicos.ts"
Cohesion: 0.17
Nodes (9): criarLocais(), abrirConexao(), migrar(), ADR-0008, versaoAtual(), RelogioFixo, RespostaRoteiro, criarRepositorioMemoria() (+1 more)

### Community 52 - "respostas.test.ts"
Cohesion: 0.15
Nodes (23): respostaPorCodigo(), CategoriaCampo, AUTOCOMPLETE, ChaveDocumento, ChavePadrao, Classificacao, classificarCampo(), classificarCampoDetalhado() (+15 more)

### Community 53 - "entrada-consultas.test.ts"
Cohesion: 0.11
Nodes (13): abrirNavegador(), EntradaAplicarVagas, EntradaImportarCurriculo, SaidaImportarCurriculo, DadosFalhas, GrupoFalha, listarFalhas(), listarStatus() (+5 more)

### Community 55 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-prettier, @eslint/js, @napi-rs/canvas, pdfjs-dist, prettier, @types/cross-spawn (+6 more)

### Community 56 - "Outbox"
Cohesion: 0.12
Nodes (15): Checklist de smoke manual, Comandos e códigos de saída, Configuração, Currículo em 1 página, Desenvolvimento, Documentação, Fluxo diário, Grafo de conhecimento (Graphify) (+7 more)

### Community 57 - "ArmazemArtefatosFs"
Cohesion: 0.14
Nodes (3): NomeArtefato, ArmazemArtefatosFs, ArmazemArtefatosMemoria

### Community 58 - "respostas-bordas.test.ts"
Cohesion: 0.15
Nodes (17): aplicarAprendizado(), proximoId(), RespostaFinal, tipoResposta(), EntradaBanco, esquemaBancoRespostas, esquemaEntradaBanco, TipoResposta (+9 more)

### Community 59 - "Progresso da implementação da V1"
Cohesion: 0.18
Nodes (8): Bloqueios e pendências, Critérios de aceite, Decisões tomadas durante a implementação, Progresso da implementação da V1, Tarefas, Validação real do agente (2026-10-10), Verificação final, Verificações de ambiente

### Community 60 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, commander, cross-spawn, @inquirer/prompts, mammoth, @modelcontextprotocol/sdk, node-notifier, open (+4 more)

### Community 61 - "executor-agente-claude.ts"
Cohesion: 0.13
Nodes (19): cross-spawn, ErroLlm, esquemaSaidaAgente, FERRAMENTAS_AGENTE, OpcoesExecutorAgente, SaidaAgente, extrairJson(), GeradorEstruturadoClaude (+11 more)

### Community 62 - "RenderizadorPdfPlaywright"
Cohesion: 0.32
Nodes (4): RenderizadorPdfPlaywright, gerar(), sinal(), resolver()

### Community 63 - "ServicoSegredos"
Cohesion: 0.33
Nodes (3): preencherElemento(), tipoDoElemento(), ServicoSegredos

### Community 64 - "FormularioAberto"
Cohesion: 0.09
Nodes (12): 9. Princípios aplicados, T13: Base de conectores, contratos e captura de fixtures, ADR-0012, DesfechoEnvio, FormularioAberto, ADR-0010, ValorLido, lerValoresGenerico() (+4 more)

### Community 65 - "progresso-terminal.test.ts"
Cohesion: 0.15
Nodes (9): RegiaoViva, Saida, OpcoesInteracaoTerminal, OpcoesProgressoTerminal, montar(), puro(), relogio(), criarSaidaTerminal() (+1 more)

### Community 66 - "ArmazemCurriculoMemoria"
Cohesion: 0.13
Nodes (4): DadosConsulta, BancoRespostas, Perfil, ArmazemCurriculoMemoria

### Community 67 - "portas/erros.ts"
Cohesion: 0.13
Nodes (16): ADR-0009: Erros como exceções tipadas, 8. Erros, validação, logging, config e concorrência, 10.1 Modelo de erros (ADR-009), T10: LLM: processo claude, gerador estruturado e prompts, T18: Agente, T6: Portas, erros de porta, concorrência e apoio de testes, ErroAgregadorExigeLogin, ErroFalhaConector (+8 more)

### Community 68 - "7. Tarefas"
Cohesion: 0.12
Nodes (16): 7. Tarefas, T14: Conectores Greenhouse, Lever e Ashby, T15: Conectores SmartRecruiters, Workable e Teamtailor, T16: Conectores Gupy e InHire, com spikes, T19: Notificação, T1: Fundação do repositório, qualidade e CI, T23: Casos de uso de consulta, T25: Documentação viva (+8 more)

### Community 69 - "aplicar-vagas.test.ts"
Cohesion: 0.22
Nodes (13): CAMPOS, criar(), prontas(), sinal(), ambiente(), sinal(), ambienteComConector(), CAMPOS (+5 more)

### Community 70 - "cache-respostas-json.ts"
Cohesion: 0.22
Nodes (4): CacheRespostas, CacheRespostasJson, Entradas, esquemaCache

### Community 71 - "ExecutorAgenteClaude"
Cohesion: 0.38
Nodes (4): EntradaAgente, ResultadoAgente, ExecutorAgenteClaude, ExecutorAgenteFake

### Community 72 - "Arquitetura do Outbox"
Cohesion: 0.20
Nodes (9): 10. Desempenho, 11. Qualidade, 12. Diferenças em relação à spec, 1. Forças, 2. Visão geral, 3. Estrutura, 4. Contextos do domínio, 9. Segurança (+1 more)

### Community 73 - "eslint.config.js"
Cohesion: 0.20
Nodes (7): FRONTEIRAS, SUBIDA_PROIBIDA, eslint, eslint-config-prettier, @eslint/js, typescript-eslint, eslint

### Community 74 - "analisar-vaga.md"
Cohesion: 0.50
Nodes (3): Entrada, Regras, Tarefa

### Community 75 - "cores.ts"
Cohesion: 0.29
Nodes (4): ResumoPreparo, cores, Formato, formatarResumoPreparo()

### Community 76 - "ErroUsuario"
Cohesion: 0.11
Nodes (19): ArgumentosCaptura, lerArgumentos(), montarFixture(), principal(), T9: Armazenamento em arquivos, ErroUsuario, ArmazemCurriculoYaml, AUXILIARES (+11 more)

### Community 77 - "transicoes.ts"
Cohesion: 0.21
Nodes (15): T8: Persistência SQLite, LinhaStatus, EntradaRegistrarRetorno, registrarRetorno(), StatusRetorno, ErroTransicaoInvalida, OpcoesTransicao, OpcoesTransicaoVaga (+7 more)

### Community 78 - "aplicar-vagas.ts"
Cohesion: 0.18
Nodes (15): 7.2 `outbox aplicar`, aplicarUma(), ResumoAplicacao, lerAnalise(), DepsMontarPacote, montarPacote(), salvarRespostas(), acharValor() (+7 more)

### Community 79 - "imports"
Cohesion: 0.25
Nodes (8): imports, #aplicacao/*, #composicao, #dominio/*, #infra/*, #interfaces/*, #scripts/*, #testes/*

### Community 80 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, capturar-fixture, formatar, lint, outbox, test, tipos, verificar

### Community 81 - "ResolvedorEncadeado"
Cohesion: 0.29
Nodes (3): T12: Resolução e extração, EloResolucao, ResolvedorEncadeado

### Community 82 - "Convenções do Outbox"
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

### Community 87 - "armazens.ts"
Cohesion: 0.17
Nodes (3): ADR-0022: Pastas nomeadas pelo design pattern, em inglês, RegistroFalhas, RegistroFalhasMemoria

### Community 88 - "Spike: InHire"
Cohesion: 0.33
Nodes (5): Como concluir o spike, O que foi implementado sem o spike, Objetivo, Por que está bloqueado, Spike: InHire

### Community 89 - "perfil.ts"
Cohesion: 0.12
Nodes (16): ADR-0019: Consentimento como categoria de campo, aceitaConsentimento(), respostaConsentimento(), Consentimentos, dataIso, Documentos, Endereco, esquemaConsentimentos (+8 more)

### Community 90 - "exemplos.test.ts"
Cohesion: 0.33
Nodes (3): esquemaGapsNegados, GapsNegados, esquemaPerfil

### Community 91 - "agente-candidatura.md"
Cohesion: 0.40
Nodes (4): Dados do candidato, Regras (obrigatórias), Resposta final, Tarefa

### Community 92 - "responder-perguntas.md"
Cohesion: 0.50
Nodes (3): Entrada, Regras, Tarefa

### Community 93 - "documentos.test.ts"
Cohesion: 0.33
Nodes (3): leitor, pasta, renderizador

### Community 108 - "extrair-vaga.md"
Cohesion: 0.50
Nodes (3): Entrada, Regras, Tarefa

### Community 109 - "importar-curriculo.md"
Cohesion: 0.50
Nodes (3): Entrada, Regras, Tarefa

### Community 111 - "12. Segurança"
Cohesion: 0.50
Nodes (4): 12.1 Modelo de ameaças, 12.3 Fronteira de confiança e injeção de prompt (ADR-012), 12.4 Segredos e credenciais, 12. Segurança

### Community 112 - "vaga.ts"
Cohesion: 0.17
Nodes (13): ADR-0023: Invariantes da vaga no domínio, com valores marcados, T3: Domínio de vagas, ConsultaVagas, Marca, DadosResolucao, chaveDedup(), normalizarCargo(), Rota (+5 more)

### Community 123 - "resolucao.test.ts"
Cohesion: 0.14
Nodes (13): ErroExtracao, ErroVagaIndisponivel, ResultadoExtracao, esquemaIssueGithub, OpcoesLeitor, PaginaLida, ADR-0012, eloDireto (+5 more)

## Knowledge Gaps
- **35 isolated node(s):** `npx`, `@mcpware/logoloom`, `ADR-0004`, `@playwright/mcp`, `node-notifier` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 617 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `sensiveis.test.ts` to `harness-conector.ts`, `zod`, `apresentacao.test.ts`, `composicao.ts`, `analise-vaga.ts`, `codigos-saida.test.ts`, `preparar-vagas.ts`, `pacote.ts`, `6. Catálogo de portas`, `package.json`, `gerar-curriculo.ts`, `curriculo-ats.test.ts`, `campos.ts`, `normalizarTexto`, `outbox-segredos.ts`, `builders.ts`, `conectores.test.ts`, `motores.ts`, `basicos.ts`, `respostas.test.ts`, `entrada-consultas.test.ts`, `respostas-bordas.test.ts`, `progresso-terminal.test.ts`, `portas/erros.ts`, `aplicar-vagas.test.ts`, `eslint.config.js`, `ErroUsuario`, `transicoes.ts`, `exemplos.test.ts`, `documentos.test.ts`, `vaga.ts`, `resolucao.test.ts`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `IdVaga` (e.g. with `8.1 Adotados` and `T3: Domínio de vagas`) actually correct?**
  _`IdVaga` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx`, `@mcpware/logoloom`, `ADR-0004` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `17. Registro de decisões arquiteturais (ADR)` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `zod` to `api.ts`, `harness-conector.ts`, `composicao.ts`, `analise-vaga.ts`, `preparar-vagas.ts`, `pacote.ts`, `repositorio-vagas-sqlite.ts`, `package.json`, `smartrecruiters/conector.ts`, `gerar-curriculo.ts`, `aplicar.ts`, `normalizarTexto`, `sensiveis.test.ts`, `outbox-segredos.ts`, `builders.ts`, `responder-campos.ts`, `respostas-bordas.test.ts`, `executor-agente-claude.ts`, `7. Tarefas`, `cache-respostas-json.ts`, `ErroUsuario`, `aplicar-vagas.ts`, `armazens.ts`, `perfil.ts`, `exemplos.test.ts`, `resolucao.test.ts`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `ErroUsuario` (e.g. with `8. Erros, validação, logging, config e concorrência` and `10.1 Modelo de erros (ADR-009)`) actually correct?**
  _`ErroUsuario` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Should `zod` be split into smaller, more focused modules?**
  _Cohesion score 0.11033681765389082 - nodes in this community are weakly interconnected._
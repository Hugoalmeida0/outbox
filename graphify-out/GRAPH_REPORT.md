# Graph Report - outbox  (2026-10-20)

## Corpus Check
- 258 files · ~134,357 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 5, .ico 1)

## Summary
- 1830 nodes · 5631 edges · 107 communities (88 shown, 19 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 543 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `37ca0d06`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- responder-campos.ts
- resolucao.test.ts
- json-ld.ts
- harness-conector.ts
- 17. Registro de decisões arquiteturais (ADR)
- ErroUsuario
- progresso.ts
- 6. Catálogo de portas
- rodada-gaps.ts
- composicao.ts
- documentos.test.ts
- deps-aplicacao.ts
- perfil.ts
- principal.ts
- preparar-vagas.ts
- preencher-formulario.ts
- vaga.ts
- basicos.ts
- ErroOutbox
- package.json
- IdVaga
- apresentacao.test.ts
- gerar-curriculo.ts
- Vaga
- repositorio-vagas-sqlite.ts
- curriculo-ats.test.ts
- normalizarTexto
- ref_node_fs
- aplicar.ts
- lever/conector.ts
- Outbox v2: painel local e métricas
- sensiveis.test.ts
- ArmazemCurriculo
- compilerOptions
- api.ts
- Outbox: arquitetura e convenções
- spec-curriculo-ats-1-pagina/spec.md
- outbox-segredos.ts
- renderizador-pdf-playwright.ts
- segredos.test.ts
- T21: Etapas de preparo e caso de uso `preparar`
- gerador-estruturado.ts
- InteracaoRoteirizada
- Camaleão — Brand Guidelines
- conectores.test.ts
- servico-segredos.ts
- DefinicaoConector
- NavegadorOutbox
- etapas.test.ts
- conector-formulario.ts
- ServicoSegredos
- ref_node_path
- campo.ts
- comandos.test.ts
- RegistroFalhas
- devDependencies
- Outbox
- ArmazemArtefatosFs
- aprendizado.ts
- Progresso da implementação da V1
- dependencies
- portas/erros.ts
- LeitorHeadless
- 16.2 Nomenclatura
- FormularioPlaywright
- progresso-terminal.test.ts
- aplicar-vagas.test.ts
- cliente-http.ts
- 7. Tarefas
- builders.ts
- Relogio
- ExecutorAgenteClaude
- Arquitetura do Outbox
- eslint.config.js
- analisar-vaga.md
- RelogioFixo
- armazens.ts
- CacheRespostasJson
- aplicar-vagas.ts
- imports
- scripts
- 10. Erros, validação, logging, config e concorrência
- Convenções do Outbox
- logoloom
- espiar-modulos.ts
- Spike: Gupy
- tailoring.md
- importar-curriculo.md
- Spike: InHire
- entrada-consultas.test.ts
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
- `3.1 Produto` --references--> `preparar()`  [INFERRED]
  specs/v2/spec-outbox/spec.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts
- `5. Fora do Escopo` --references--> `preparar()`  [INFERRED]
  specs/v2/spec-outbox/spec.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts
- `11. Qualidade` --references--> `FormularioAberto`  [INFERRED]
  docs/arquitetura.md → src/aplicacao/portas/formulario-aberto.ts

## Import Cycles
- None detected.

## Communities (107 total, 19 thin omitted)

### Community 0 - "responder-campos.ts"
Cohesion: 0.12
Nodes (31): ADR-0019: Consentimento como categoria de campo, base(), esquemaRespostasLlm, respostaPorCodigo(), Regime, ChaveDocumento, ChavePadrao, aceitaConsentimento() (+23 more)

### Community 1 - "resolucao.test.ts"
Cohesion: 0.06
Nodes (55): 1. Garanta o motor no domínio, T12: Resolução e extração, DepsResolverVaga, DesfechoResolucao, ErroAgregadorExigeLogin, ErroResolucao, Resolucao, ResolvedorVagas (+47 more)

### Community 2 - "json-ld.ts"
Cohesion: 0.21
Nodes (15): Entrada, Regras, Tarefa, esquemaVagaExtraida, paraVagaExtraida(), vagaDoNextData(), decodificarEntidades(), ENTIDADES (+7 more)

### Community 3 - "harness-conector.ts"
Cohesion: 0.17
Nodes (19): paraCampos(), ClienteHttp, umPacote(), lerFixture(), MapaFixtures, PASTA_FIXTURES, RespostaFixture, servirFixtures() (+11 more)

### Community 4 - "17. Registro de decisões arquiteturais (ADR)"
Cohesion: 0.17
Nodes (12): 17. Registro de decisões arquiteturais (ADR), ADR-001: hexagonal enxuto em quatro camadas, ADR-002: camada no topo, contexto de negócio dentro, ADR-004: TypeScript executado nativamente pelo Node 24, sem build, ADR-005: imports por subpath e fronteiras verificadas por lint, ADR-006: injeção manual com raiz de composição preguiçosa, ADR-007: casos de uso como funções com dependências estreitas, ADR-008: persistência com `node:sqlite`, repositório síncrono do agregado, tabelas STRICT e migrações (+4 more)

### Community 5 - "ErroUsuario"
Cohesion: 0.13
Nodes (18): zod, T20: Casos de uso de entrada, T24: Composição e CLI, ErroUsuario, validarOuFalhar(), formatarAdicao(), comandoAdicionar(), esquema (+10 more)

### Community 6 - "progresso.ts"
Cohesion: 0.16
Nodes (17): EtapaPreparo, colunasDe(), cortarNaLargura(), DadosRotulo, ETAPAS, formatarCabecalhoPreparo(), formatarConclusao(), formatarDuracao() (+9 more)

### Community 7 - "6. Catálogo de portas"
Cohesion: 0.06
Nodes (26): ADR-0014: Logging mínimo com redação, 5. Portas, 6. Catálogo de portas, T19: Notificação, T7: Toast que abre o painel, esquemaPaginaIndisponivel, extrairVaga(), ErroExtracao (+18 more)

### Community 8 - "rodada-gaps.ts"
Cohesion: 0.18
Nodes (15): DepsRodadaGaps, GapAgrupado, idSkillLivre(), perguntarNivelIdioma(), rodadaGaps(), ROTULO_NIVEL, recalcularComGaps(), AnaliseVaga (+7 more)

### Community 9 - "composicao.ts"
Cohesion: 0.11
Nodes (18): ADR-0006, EntradaImportarCurriculo, SaidaImportarCurriculo, DadosFalhas, GrupoFalha, listarFalhas(), CasosDeUso, configAplicacao() (+10 more)

### Community 10 - "documentos.test.ts"
Cohesion: 0.15
Nodes (8): 6. Contrato de Aceite, OpcoesLeitor, PaginaLida, ADR-0012, lerPdf(), leitor, pasta, renderizador

### Community 11 - "deps-aplicacao.ts"
Cohesion: 0.16
Nodes (9): DepsAplicarVagas, DepsPrepararVagas, ConfigAplicacao, AmbienteAplicacao, CONFIG_TESTE, RegistroFalhasMemoria, RenderizadorFake, ResolvedorFake (+1 more)

### Community 12 - "perfil.ts"
Cohesion: 0.07
Nodes (39): ALERTA_AFIRMATIVA, calcularAderencia(), DetalhesAderencia, pontosCobertura(), pontosModelo(), pontosRegime(), pontosSenioridade(), ResultadoAderencia (+31 more)

### Community 13 - "principal.ts"
Cohesion: 0.14
Nodes (17): emitirAvisoOriginal, ADR-0004, ADR-0007: Casos de uso como funções com dependências estreitas, commander, codigoDoErro(), CODIGOS_SAIDA, ehErroPrevisto(), ehInterrupcao() (+9 more)

### Community 14 - "preparar-vagas.ts"
Cohesion: 0.26
Nodes (15): aplicarAderencia(), avisarEtapa(), deduplicarPorChave(), descartarEncerrada(), motivoDoErro(), prepararVagas(), processarVaga(), reavaliarDescartadas() (+7 more)

### Community 15 - "preencher-formulario.ts"
Cohesion: 0.08
Nodes (31): ADR-0010: Conectores ATS com Strategy, catálogo e handle comum, 15.1 Receitas de extensão, 15.2 Não construir agora (YAGNI), 15. Evolução, 8.1 Adotados, 9. Princípios aplicados, ADR-010: conectores ATS com Strategy, catálogo e handle comum, 4. Glossário (+23 more)

### Community 16 - "vaga.ts"
Cohesion: 0.09
Nodes (24): ADR-0008: Persistência com `node:sqlite`, repositório síncrono do agregado, tabelas STRICT e migrações, T3: Domínio de vagas, DadosStatus, DepsListarStatus, LinhaStatus, listarStatus(), paraLinha(), EntradaRegistrarRetorno (+16 more)

### Community 17 - "basicos.ts"
Cohesion: 0.31
Nodes (5): EventoPreparo, ProgressoPreparo, EntradaLog, ProgressoEspiao, RespostaRoteiro

### Community 18 - "ErroOutbox"
Cohesion: 0.18
Nodes (9): ADR-0003: Idioma único em português ASCII, ADR-0009: Erros como exceções tipadas, 8. Erros, validação, logging, config e concorrência, ADR-003: idioma único em português ASCII, ADR-009: erros como exceções tipadas, 8. Registro da revisão de 2026-10-09 (revisão 2), ErroDominio, ErroOutbox (+1 more)

### Community 19 - "package.json"
Cohesion: 0.09
Nodes (21): bin, outbox, description, engines, node, name, private, type (+13 more)

### Community 20 - "IdVaga"
Cohesion: 0.14
Nodes (5): ErroPreparo, ArmazemArtefatos, NOMES_ARTEFATO, IdVaga, Caminhos

### Community 21 - "apresentacao.test.ts"
Cohesion: 0.24
Nodes (10): cores, Formato, formatarFalhas(), ats(), formatarStatus(), titulo(), dataHora(), formatarTabela() (+2 more)

### Community 22 - "gerar-curriculo.ts"
Cohesion: 0.09
Nodes (7): DepsRenderizarMaster, garantirMasterGenerico(), renderizarMaster(), ALERTA_CAMALEAO_FALHOU, descreverViolacoes(), SaidaGerarCurriculo, RenderizadorDocumentos

### Community 23 - "Vaga"
Cohesion: 0.19
Nodes (6): ContextoResposta, Vaga, marcadores(), paraVaga(), RepositorioVagasSqlite, valorSql()

### Community 24 - "repositorio-vagas-sqlite.ts"
Cohesion: 0.10
Nodes (27): T8: Persistência SQLite, AcaoDeduplicacaoUrl, AcaoDescartarDuplicada, dataReferencia(), ehMaisRecente(), ehMotivoDe(), ehStatusComMotivo(), ETAPAS (+19 more)

### Community 25 - "curriculo-ats.test.ts"
Cohesion: 0.11
Nodes (16): @napi-rs/canvas, pdfjs-dist, umMaster(), contarFontes(), inspecionarPdf(), OPERADORES_DE_IMAGEM, PdfInspecionado, PdfLido (+8 more)

### Community 26 - "normalizarTexto"
Cohesion: 0.14
Nodes (21): foraDasOpcoes(), contemTermo(), escaparRegex(), normalizarTexto(), paraKebab(), casarTexto(), IDIOMAS, indice() (+13 more)

### Community 27 - "ref_node_fs"
Cohesion: 0.11
Nodes (16): ADR-0015, ArgumentosCaptura, lerArgumentos(), montarFixture(), principal(), carregarConfig(), Config, CONFIG_PADRAO (+8 more)

### Community 28 - "aplicar.ts"
Cohesion: 0.17
Nodes (8): OpcaoEscolha, ResumoRevisao, formatarResumoAplicacao(), formatarResumoRevisao(), ROTULOS_DESFECHO, comandoAplicar(), esquema, InteracaoTerminal

### Community 29 - "lever/conector.ts"
Cohesion: 0.32
Nodes (10): consultasLocalizacao(), localizacaoCompleta(), Uf, ufDe(), UFS, ErroSemOpcao, esperarSugestoes(), esquemaPostagemLever (+2 more)

### Community 30 - "Outbox v2: painel local e métricas"
Cohesion: 0.18
Nodes (10): 1. Contexto e Objetivo, 2. Premissas, 3.1 Produto, 3.2 Arquitetura (ADRs da v2, complementando os ADR-001 a ADR-016), 3. Decisões, 4. Glossário, 5. Fora do Escopo, 6. Contrato de Aceite (+2 more)

### Community 31 - "sensiveis.test.ts"
Cohesion: 0.09
Nodes (22): vitest, FERRAMENTAS_AGENTE, criarCaminhos(), RAIZ, BINARIO_FALSO, ChamadaRegistrada, ClaudeFalso, RegraClaude (+14 more)

### Community 32 - "ArmazemCurriculo"
Cohesion: 0.11
Nodes (12): ADR-0011: LLM com portas separadas, schema único e prompts versionados, 5. Prompts, 16.4 Prompts, ADR-011: LLM com portas separadas, schema único e prompts versionados, DepsImportarCurriculo, DepsExtrairVaga, DepsGerarCurriculo, DepsMontarPacote (+4 more)

### Community 33 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+11 more)

### Community 34 - "api.ts"
Cohesion: 0.22
Nodes (9): classificarFormulario(), enderecoApi(), esquemaCampoApi, esquemaPergunta, esquemaVagaGreenhouse, obterVagaGreenhouse(), paraCampos(), TIPOS (+1 more)

### Community 35 - "Outbox: arquitetura e convenções"
Cohesion: 0.14
Nodes (13): 12.1 Modelo de ameaças, 12.2 Classificação de dados, 12.3 Fronteira de confiança e injeção de prompt (ADR-012), 12.4 Segredos e credenciais, 12. Segurança, 14. Política de dependências, 1. Forças que orientam a arquitetura, 2. Visão geral (+5 more)

### Community 36 - "spec-curriculo-ats-1-pagina/spec.md"
Cohesion: 0.11
Nodes (18): 1. Contexto e Objetivo, 2. Premissas, 3. Decisões, 4. Glossário, 5. Fora do Escopo, 7. Tarefas, 8. Questões em aberto, Anexo A — Valores visuais (B = tamanho base em pt) (+10 more)

### Community 37 - "outbox-segredos.ts"
Cohesion: 0.18
Nodes (14): @modelcontextprotocol/sdk, T5: Domínio de respostas e falhas, criarServidorSegredos(), hostsDoAmbiente(), principal(), resposta(), Resultado, seletor (+6 more)

### Community 38 - "renderizador-pdf-playwright.ts"
Cohesion: 0.22
Nodes (9): ADR-0012, cabecalho(), css(), documento(), htmlCarta(), htmlCurriculo(), lista(), pt() (+1 more)

### Community 39 - "segredos.test.ts"
Cohesion: 0.26
Nodes (5): Aleatorio, CofreCredenciaisJson, esquemaCofre, gerarSenha(), Credencial

### Community 40 - "T21: Etapas de preparo e caso de uso `preparar`"
Cohesion: 0.22
Nodes (14): 6. Fluxos, 3. Camadas e responsabilidades, 7.1 `outbox preparar`, 6. Contrato de Aceite, T21: Etapas de preparo e caso de uso `preparar`, analisarVaga(), gerarCurriculo(), resolverVaga() (+6 more)

### Community 41 - "gerador-estruturado.ts"
Cohesion: 0.29
Nodes (6): PedidoGeracao, TarefaLlm, TAREFAS_LLM, ADR-0012, GeradorEstruturadoRoteirizado, Resposta

### Community 43 - "Camaleão — Brand Guidelines"
Cohesion: 0.22
Nodes (8): 1. Full Logo (icon + wordmark), 2. Icon Only (avatar, favicon, app icon), 4. Social Media, Camaleão — Brand Guidelines, Colors, Logo Files, Typography, Usage Rules

### Community 44 - "conectores.test.ts"
Cohesion: 0.17
Nodes (17): definicaoAshby, esquemaQuadroAshby, comParametro(), comSufixo(), dataCurta(), nomeDoSlug(), DEFINICOES_V1, definicaoGreenhouse (+9 more)

### Community 45 - "servico-segredos.ts"
Cohesion: 0.25
Nodes (7): T16: Conectores Gupy e InHire, com spikes, CofreCredenciais, ChaveSensivel, FormatoData, OpcoesServicoSegredos, ResultadoFerramenta, ADR-0012

### Community 46 - "DefinicaoConector"
Cohesion: 0.15
Nodes (10): 7. Conectores, 2. Capture fixtures sanitizadas, 3. Escreva a definição, 4. Registre no catálogo, 5. Passe na suíte de contrato, 6. Valide com uma vaga real, Como adicionar um conector de ATS, DescritorCampo (+2 more)

### Community 47 - "NavegadorOutbox"
Cohesion: 0.12
Nodes (7): T17: Cofre de credenciais e MCP `outbox-segredos`, abrirNavegador(), ErroNavegador, NavegadorUsuario, caminhosChrome(), NavegadorOutbox, OpcoesNavegadorOutbox

### Community 48 - "etapas.test.ts"
Cohesion: 0.31
Nodes (6): ALERTA_ATS_CAIU, ALERTA_PDF_LONGO, esquemaArquivoAnalise, esquemaArquivoCampos, vagaPronta(), esquemaCampo

### Community 49 - "conector-formulario.ts"
Cohesion: 0.12
Nodes (23): playwright, CatalogoConectoresPlaywright, acharResposta(), chaveRotulo(), criarConector(), DepsConector, indexar(), IndiceRespostas (+15 more)

### Community 51 - "ref_node_path"
Cohesion: 0.35
Nodes (6): abrirConexao(), migrar(), ADR-0008, versaoAtual(), criarRepositorioMemoria(), PASTA_MIGRACOES

### Community 52 - "campo.ts"
Cohesion: 0.14
Nodes (17): T13: Base de conectores, contratos e captura de fixtures, CategoriaCampo, CATEGORIAS_CAMPO, CATEGORIAS_SENSIVEIS, TipoCampo, TIPOS_CAMPO, AUTOCOMPLETE, ChaveDiversidade (+9 more)

### Community 53 - "comandos.test.ts"
Cohesion: 0.18
Nodes (13): ResumoPreparo, Container, formatarResumoPreparo(), containerDuble(), rodar(), comandoFalhas(), comandoNavegador(), comandoPreparar() (+5 more)

### Community 54 - "RegistroFalhas"
Cohesion: 0.18
Nodes (3): RegistroFalhas, nomeSeguro(), RegistroFalhasFs

### Community 55 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-prettier, @eslint/js, @napi-rs/canvas, pdfjs-dist, prettier, @types/cross-spawn (+6 more)

### Community 56 - "Outbox"
Cohesion: 0.13
Nodes (14): Checklist de smoke manual, Configuração, Currículo em 1 página, Desenvolvimento, Documentação, Fluxo diário, Grafo de conhecimento (Graphify), Instalação (+6 more)

### Community 57 - "ArmazemArtefatosFs"
Cohesion: 0.15
Nodes (3): NomeArtefato, ArmazemArtefatosFs, ArmazemArtefatosMemoria

### Community 58 - "aprendizado.ts"
Cohesion: 0.38
Nodes (6): aplicarAprendizado(), proximoId(), RespostaFinal, tipoResposta(), EntradaBanco, TipoResposta

### Community 59 - "Progresso da implementação da V1"
Cohesion: 0.17
Nodes (8): Bloqueios e pendências, Critérios de aceite, Decisões tomadas durante a implementação, Progresso da implementação da V1, Tarefas, Validação real do agente (2026-10-10), Verificação final, Verificações de ambiente

### Community 60 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, commander, cross-spawn, @inquirer/prompts, mammoth, @modelcontextprotocol/sdk, node-notifier, open (+4 more)

### Community 61 - "portas/erros.ts"
Cohesion: 0.11
Nodes (28): 10.1 Modelo de erros (ADR-009), T10: LLM: processo claude, gerador estruturado e prompts, T18: Agente, T6: Portas, erros de porta, concorrência e apoio de testes, ErroInfra, ErroLimiteUso, ErroLlm, ErroMaxTurnos (+20 more)

### Community 62 - "LeitorHeadless"
Cohesion: 0.18
Nodes (7): T11: Navegador, leitor headless e documentos, RenderizadorPdfPlaywright, escaparHtml(), LeitorHeadless, gerar(), abrirPagina(), servico()

### Community 63 - "16.2 Nomenclatura"
Cohesion: 0.33
Nodes (6): 16.1 Idioma (ADR-003), 16.2 Nomenclatura, 16.3 Código, 16.5 Documentação, 16.6 Definição de pronto (por tarefa), 16. Convenções

### Community 64 - "FormularioPlaywright"
Cohesion: 0.13
Nodes (4): DesfechoEnvio, ValorLido, FormularioPlaywright, FormularioAbertoFake

### Community 65 - "progresso-terminal.test.ts"
Cohesion: 0.15
Nodes (9): RegiaoViva, Saida, OpcoesInteracaoTerminal, OpcoesProgressoTerminal, montar(), puro(), relogio(), criarSaidaTerminal() (+1 more)

### Community 66 - "aplicar-vagas.test.ts"
Cohesion: 0.40
Nodes (4): CAMPOS, prontas(), roteiro(), sinal()

### Community 67 - "cliente-http.ts"
Cohesion: 0.24
Nodes (7): 13. Desempenho, T7: Infra base, ErroHttp, ClienteHttpFetch, esperar(), esperaRetryAfter(), OpcoesClienteHttp

### Community 68 - "7. Tarefas"
Cohesion: 0.11
Nodes (18): ADR-0016: Execução exclusiva por comando e cancelamento cooperativo, ADR-0020: Bloqueio anti-bot tratado como CAPTCHA, Comandos e códigos de saída, ADR-016: execução exclusiva por comando e cancelamento cooperativo, 1. Contexto e Objetivo, 2. Premissas, 3. Decisões, 5. Fora do Escopo (+10 more)

### Community 69 - "builders.ts"
Cohesion: 0.27
Nodes (12): 11.1 Estratégia de testes, criar(), ambiente(), ambienteComConector(), CAMPOS, roteiroPadrao(), umaAnalise(), umaVaga() (+4 more)

### Community 70 - "Relogio"
Cohesion: 0.18
Nodes (6): CacheRespostas, Relogio, Entradas, esquemaCache, OpcoesCacheRespostas, OpcoesRegistrador

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

### Community 75 - "RelogioFixo"
Cohesion: 0.22
Nodes (4): 11.2 Verificação local e CI, 11.3 Regras de lint obrigatórias, 11. Qualidade e testabilidade, RelogioFixo

### Community 76 - "armazens.ts"
Cohesion: 0.06
Nodes (18): yaml, T9: Armazenamento em arquivos, importarCurriculo(), esquemaGapsNegados, GapsNegados, validar(), BancoRespostas, esquemaBancoRespostas (+10 more)

### Community 78 - "aplicar-vagas.ts"
Cohesion: 0.07
Nodes (27): ADR-0021: Progresso do `preparar` por porta de eventos, 7.2 `outbox aplicar`, 7. Fluxos principais por camada, T22: Etapas de aplicação e caso de uso `aplicar`, aplicarUma(), aplicarVagas(), EntradaAplicarVagas, ResumoAplicacao (+19 more)

### Community 79 - "imports"
Cohesion: 0.25
Nodes (8): imports, #aplicacao/*, #composicao, #dominio/*, #infra/*, #interfaces/*, #scripts/*, #testes/*

### Community 80 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, capturar-fixture, formatar, lint, outbox, test, tipos, verificar

### Community 81 - "10. Erros, validação, logging, config e concorrência"
Cohesion: 0.40
Nodes (5): 10.2 Validação, 10.3 Logging (ADR-014), 10.4 Configuração (ADR-015), 10.5 Concorrência, transações e cancelamento (ADR-008, ADR-016), 10. Erros, validação, logging, config e concorrência

### Community 82 - "Convenções do Outbox"
Cohesion: 0.22
Nodes (8): 1. Idioma (ADR-0003), 2. Nomenclatura, 3. Código, 4. Conectores e automação de navegador, 6. Testes, 7. Documentação, 8. Definição de pronto, Convenções do Outbox

### Community 83 - "logoloom"
Cohesion: 0.50
Nodes (3): npx, logoloom, @mcpware/logoloom

### Community 85 - "Spike: Gupy"
Cohesion: 0.29
Nodes (6): Como concluir o spike, Decisão provisória: `gupy.anexoPorCandidatura: true`, O que foi implementado sem o spike, Objetivo, Por que está bloqueado, Spike: Gupy

### Community 86 - "tailoring.md"
Cohesion: 0.40
Nodes (4): Como escrever cada bullet, Entrada, Regras de lastro (obrigatórias), Tarefa

### Community 87 - "importar-curriculo.md"
Cohesion: 0.50
Nodes (3): Entrada, Regras, Tarefa

### Community 88 - "Spike: InHire"
Cohesion: 0.33
Nodes (5): Como concluir o spike, O que foi implementado sem o spike, Objetivo, Por que está bloqueado, Spike: InHire

### Community 90 - "entrada-consultas.test.ts"
Cohesion: 0.13
Nodes (15): 7. Tarefas, T1: Domínio de acompanhamento e porta de consulta com implementação SQLite, T2: Casos de uso do painel, T3: Servidor web, segurança, layout e comando `painel`, T4: Rotas de fila e detalhe, T5: Rotas de ações, T6: Rotas de métricas e falhas, T8: Documentação (+7 more)

### Community 91 - "agente-candidatura.md"
Cohesion: 0.40
Nodes (4): Dados do candidato, Regras (obrigatórias), Resposta final, Tarefa

### Community 92 - "responder-perguntas.md"
Cohesion: 0.50
Nodes (3): Entrada, Regras, Tarefa

## Knowledge Gaps
- **35 isolated node(s):** `npx`, `@mcpware/logoloom`, `ADR-0004`, `@playwright/mcp`, `node-notifier` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 599 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `sensiveis.test.ts` to `responder-campos.ts`, `resolucao.test.ts`, `harness-conector.ts`, `ErroUsuario`, `6. Catálogo de portas`, `documentos.test.ts`, `perfil.ts`, `principal.ts`, `package.json`, `apresentacao.test.ts`, `repositorio-vagas-sqlite.ts`, `curriculo-ats.test.ts`, `normalizarTexto`, `ref_node_fs`, `outbox-segredos.ts`, `segredos.test.ts`, `T21: Etapas de preparo e caso de uso `preparar``, `conectores.test.ts`, `NavegadorOutbox`, `etapas.test.ts`, `ref_node_path`, `comandos.test.ts`, `portas/erros.ts`, `progresso-terminal.test.ts`, `aplicar-vagas.test.ts`, `builders.ts`, `eslint.config.js`, `armazens.ts`, `entrada-consultas.test.ts`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `IdVaga` (e.g. with `8.1 Adotados` and `T3: Domínio de vagas`) actually correct?**
  _`IdVaga` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx`, `@mcpware/logoloom`, `ADR-0004` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `responder-campos.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11794871794871795 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `ErroUsuario` to `responder-campos.ts`, `resolucao.test.ts`, `harness-conector.ts`, `6. Catálogo de portas`, `perfil.ts`, `preencher-formulario.ts`, `package.json`, `IdVaga`, `repositorio-vagas-sqlite.ts`, `normalizarTexto`, `ref_node_fs`, `aplicar.ts`, `lever/conector.ts`, `sensiveis.test.ts`, `api.ts`, `outbox-segredos.ts`, `segredos.test.ts`, `gerador-estruturado.ts`, `conectores.test.ts`, `etapas.test.ts`, `campo.ts`, `comandos.test.ts`, `portas/erros.ts`, `cliente-http.ts`, `Relogio`, `armazens.ts`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `ErroUsuario` (e.g. with `8. Erros, validação, logging, config e concorrência` and `10.1 Modelo de erros (ADR-009)`) actually correct?**
  _`ErroUsuario` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Should `resolucao.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06210526315789474 - nodes in this community are weakly interconnected._
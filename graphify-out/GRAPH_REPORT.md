# Graph Report - outbox  (2026-10-20)

## Corpus Check
- 267 files · ~139,201 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 5, .ico 1)

## Summary
- 1916 nodes · 5959 edges · 124 communities (100 shown, 24 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 583 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d118aa95`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- valor-codigo.ts
- resolucao.test.ts
- api.ts
- agente.test.ts
- 17. Registro de decisões arquiteturais (ADR)
- zod
- progresso.ts
- RegistradorJsonl
- ArmazemArtefatosFs
- composicao.ts
- documentos.test.ts
- sensiveis.test.ts
- rodada-gaps.ts
- principal.ts
- FormularioAberto
- preencher-formulario.ts
- repositorio-vagas.ts
- basicos.ts
- compartilhado/erros.ts
- package.json
- playwright
- apresentacao.test.ts
- gerar-curriculo.ts
- RepositorioVagasSqlite
- vagas/status.ts
- curriculo-ats.test.ts
- campos.ts
- capturar-fixture.ts
- InteracaoTerminal
- lever/conector.ts
- agregadores.ts
- claude-falso.ts
- aplicar-vagas.ts
- compilerOptions
- 6. Catálogo de portas
- Outbox: arquitetura e convenções
- spec-curriculo-ats-1-pagina/spec.md
- outbox-segredos.ts
- renderizador-pdf-playwright.ts
- servico-segredos.ts
- T21: Etapas de preparo e caso de uso `preparar`
- GeradorEstruturadoClaude
- aplicar-vagas.test.ts
- Motor
- conectores.test.ts
- motores.ts
- Como adicionar um conector de ATS
- NavegadorOutbox
- preencher-formulario.ts
- conector-formulario.ts
- responder-campos.ts
- ref_node_path
- aplicar-vagas.ts
- entrada-consultas.test.ts
- RegistroFalhas
- devDependencies
- Outbox
- ArmazemArtefatosMemoria
- revisar-e-enviar.ts
- Progresso da implementação da V1
- dependencies
- portas/erros.ts
- RenderizadorPdfPlaywright
- GeradorEstruturado
- FormularioAbertoFake
- progresso-terminal.test.ts
- ArmazemCurriculoMemoria
- portas/erros.ts
- preparar
- vitest
- Relogio
- agente.test.ts
- Arquitetura do Outbox
- eslint.config.js
- pt
- 11.1 Estratégia de testes
- ErroUsuario
- transicoes.ts
- revisar-e-enviar.ts
- imports
- scripts
- FormularioPlaywright
- Convenções do Outbox
- Relogio
- espiar-modulos.ts
- Spike: Gupy
- titulo
- armazens.ts
- Spike: InHire
- perfil.ts
- 7. Tarefas
- agente-candidatura.md
- responder-perguntas.md
- atualizacoes.ts
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
- Registrador
- repositorio-vagas-sqlite.ts
- CLAUDE.md
- RenderizadorDocumentos
- Vaga
- vaga.ts
- importar-curriculo.ts
- salario.ts
- respostas-bordas.test.ts
- pacote.ts
- diversidade.ts
- Relatório de arquitetura — outbox
- Outbox v1: candidatura assistida com currículo camaleão
- NavegadorUsuario
- ExecutorAgenteFake
- ResultadoExtracao

## God Nodes (most connected - your core abstractions)
1. `IdVaga` - 85 edges
2. `ErroUsuario` - 52 edges
3. `Vaga` - 51 edges
4. `vitest` - 47 edges
5. `zod` - 46 edges
6. `ArmazemCurriculo` - 44 edges
7. `ArmazemArtefatos` - 43 edges
8. `Motor` - 40 edges
9. `6. Catálogo de portas` - 40 edges
10. `RepositorioVagas` - 39 edges

## Surprising Connections (you probably didn't know these)
- `Tarefas` --references--> `preparar()`  [INFERRED]
  docs/progresso.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts
- `O que foi implementado sem o spike` --references--> `preparar()`  [INFERRED]
  docs/spikes/gupy.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts
- `ADR-016: execução exclusiva por comando e cancelamento cooperativo` --references--> `preparar()`  [INFERRED]
  specs/v1/spec-outbox/arquitetura.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts
- `1. Contexto e Objetivo` --references--> `preparar()`  [INFERRED]
  specs/v1/spec-outbox/spec.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts
- `3.1 Produto` --references--> `preparar()`  [INFERRED]
  specs/v2/spec-outbox/spec.md → src/aplicacao/casos-de-uso/casos-bordas.test.ts

## Import Cycles
- None detected.

## Communities (124 total, 24 thin omitted)

### Community 0 - "valor-codigo.ts"
Cohesion: 0.35
Nodes (9): respostaPorCodigo(), ChaveDocumento, ChavePadrao, Contato, formatarData(), partesNome(), contato, valorDocumento() (+1 more)

### Community 1 - "resolucao.test.ts"
Cohesion: 0.10
Nodes (32): Resolucao, DadosResolucao, AGREGADORES, ehMotorConhecido(), Motor, MOTORES_COM_CONECTOR_V1, UrlCanonica, BOTAO_EXTERNO (+24 more)

### Community 2 - "api.ts"
Cohesion: 0.11
Nodes (25): Entrada, Regras, Tarefa, esquemaVagaExtraida, normalizarEmpresa(), VagaExtraida, enderecoApi(), esquemaCampoApi (+17 more)

### Community 3 - "agente.test.ts"
Cohesion: 0.10
Nodes (22): paraCampos(), LeitorHeadless, OpcoesLeitor, PaginaLida, ADR-0012, lerFixture(), MapaFixtures, PASTA_FIXTURES (+14 more)

### Community 4 - "17. Registro de decisões arquiteturais (ADR)"
Cohesion: 0.12
Nodes (16): ADR-0003: Idioma único em português ASCII, 17. Registro de decisões arquiteturais (ADR), ADR-001: hexagonal enxuto em quatro camadas, ADR-002: camada no topo, contexto de negócio dentro, ADR-003: idioma único em português ASCII, ADR-004: TypeScript executado nativamente pelo Node 24, sem build, ADR-005: imports por subpath e fronteiras verificadas por lint, ADR-006: injeção manual com raiz de composição preguiçosa (+8 more)

### Community 5 - "zod"
Cohesion: 0.13
Nodes (26): zod, STATUS_DE_RETORNO, formatarResumoPreparo(), formatarResumoAplicacao(), comandoAdicionar(), esquema, urlsDoArquivo(), comandoAplicar() (+18 more)

### Community 6 - "progresso.ts"
Cohesion: 0.10
Nodes (23): ADR-0021: Progresso do `preparar` por porta de eventos, EntradaPrepararVagas, EtapaPreparo, EventoPreparo, ProgressoPreparo, colunasDe(), cortarNaLargura(), DadosRotulo (+15 more)

### Community 7 - "RegistradorJsonl"
Cohesion: 0.27
Nodes (3): ContextoLog, RegistradorJsonl, RegistradorMemoria

### Community 8 - "ArmazemArtefatosFs"
Cohesion: 0.15
Nodes (17): T22: Etapas de aplicação e caso de uso `aplicar`, executarComLimite(), analisarVaga(), idSkillLivre(), perguntarNivelIdioma(), rodadaGaps(), ROTULO_NIVEL, recalcularComGaps() (+9 more)

### Community 9 - "composicao.ts"
Cohesion: 0.11
Nodes (25): ADR-0006, ADR-0015, yaml, aplicarVagas(), configAplicacao(), criarAssistentes(), criarContainer(), criarPreguicoso() (+17 more)

### Community 10 - "documentos.test.ts"
Cohesion: 0.12
Nodes (14): @napi-rs/canvas, pdfjs-dist, 6. Contrato de Aceite, escaparHtml(), contarFontes(), inspecionarPdf(), lerPdf(), OPERADORES_DE_IMAGEM (+6 more)

### Community 11 - "sensiveis.test.ts"
Cohesion: 0.18
Nodes (9): DepsAplicarVagas, DepsPrepararVagas, ConfigAplicacao, AmbienteAplicacao, CONFIG_TESTE, RegistroFalhasMemoria, RenderizadorFake, ResolvedorFake (+1 more)

### Community 12 - "rodada-gaps.ts"
Cohesion: 0.10
Nodes (28): 2. Nomenclatura, 16.2 Nomenclatura, ALERTA_AFIRMATIVA, calcularAderencia(), DetalhesAderencia, pontosCobertura(), pontosModelo(), pontosRegime() (+20 more)

### Community 13 - "principal.ts"
Cohesion: 0.12
Nodes (18): emitirAvisoOriginal, ADR-0004, ADR-0007: Casos de uso como funções com dependências estreitas, commander, Container, codigoDoErro(), CODIGOS_SAIDA, ehErroPrevisto() (+10 more)

### Community 14 - "FormularioAberto"
Cohesion: 0.21
Nodes (22): aplicarAderencia(), avisarEtapa(), deduplicarPorChave(), definirDestino(), descartarEncerrada(), descartarPorAderencia(), Destino, ErroPreparo (+14 more)

### Community 15 - "preencher-formulario.ts"
Cohesion: 0.10
Nodes (20): ADR-0010: Conectores ATS com Strategy, catálogo e handle comum, 15.1 Receitas de extensão, 15.2 Não construir agora (YAGNI), 15. Evolução, 9. Princípios aplicados, ADR-010: conectores ATS com Strategy, catálogo e handle comum, 4. Glossário, 8. Registro da revisão de 2026-10-09 (revisão 2) (+12 more)

### Community 16 - "repositorio-vagas.ts"
Cohesion: 0.16
Nodes (7): EscritaVagas, RespostasEnviadasVagas, TransacaoVagas, ADR-0008, TransicaoVaga, Evento, RespostaEnviada

### Community 17 - "basicos.ts"
Cohesion: 0.18
Nodes (6): 14. Política de dependências, Notificador, ADR-0014, MotorToast, EntradaLog, RespostaRoteiro

### Community 18 - "compartilhado/erros.ts"
Cohesion: 0.27
Nodes (7): ADR-0009: Erros como exceções tipadas, 8. Erros, validação, logging, config e concorrência, T2: Schemas do domínio e exemplos, ErroDominio, ErroOutbox, ErroTransicaoInvalida, ErroValidacao

### Community 19 - "package.json"
Cohesion: 0.09
Nodes (20): bin, outbox, description, engines, node, name, private, type (+12 more)

### Community 20 - "playwright"
Cohesion: 0.15
Nodes (16): playwright, ADR-0010, ValorLido, lerDescritores(), lerValoresGenerico(), valorExibido(), OpcoesFormularioPlaywright, RegrasConfirmacao (+8 more)

### Community 21 - "apresentacao.test.ts"
Cohesion: 0.15
Nodes (17): ResultadoAdicao, ResumoPreparo, formatarAdicao(), ROTULOS, cores, Formato, formatarFalhas(), formatarResumoRevisao() (+9 more)

### Community 22 - "gerar-curriculo.ts"
Cohesion: 0.08
Nodes (17): ALERTA_ATS_CAIU, ALERTA_CAMALEAO_FALHOU, ALERTA_PDF_LONGO, esquemaArquivoAnalise, esquemaArquivoCampos, vagaPronta(), criarPedido(), descreverViolacoes() (+9 more)

### Community 23 - "RepositorioVagasSqlite"
Cohesion: 0.13
Nodes (9): GapAgrupado, GapsVagas, AcaoDescartarDuplicada, GapAberto, IdVaga, marcadores(), paraVaga(), RepositorioVagasSqlite (+1 more)

### Community 24 - "vagas/status.ts"
Cohesion: 0.17
Nodes (16): DepsAdicionarVagas, ItemAdicao, DadosStatus, LinhaStatus, AcaoDeduplicacaoUrl, dataReferencia(), ehMaisRecente(), ETAPAS_ENTREVISTA (+8 more)

### Community 25 - "curriculo-ats.test.ts"
Cohesion: 0.13
Nodes (7): leitor, masterDenso(), masterExemplo, pasta, PdfGerado, renderizador, TITULOS

### Community 26 - "campos.ts"
Cohesion: 0.15
Nodes (22): contemTermo(), escaparRegex(), normalizarTexto(), casarTexto(), IDIOMAS, indice(), melhorOpcao(), nomesDoPais() (+14 more)

### Community 27 - "capturar-fixture.ts"
Cohesion: 0.12
Nodes (8): ArgumentosCaptura, lerArgumentos(), montarFixture(), OpcoesNavegadorOutbox, doisDigitos(), isoLocal(), RelogioSistema, SCRIPT

### Community 28 - "InteracaoTerminal"
Cohesion: 0.10
Nodes (6): Interacao, OpcaoEscolha, ResumoRevisao, Saida, InteracaoTerminal, OpcoesInteracaoTerminal

### Community 29 - "lever/conector.ts"
Cohesion: 0.35
Nodes (9): consultasLocalizacao(), localizacaoCompleta(), Uf, ufDe(), UFS, esperarSugestoes(), esquemaPostagemLever, preencherLocalizacaoLever() (+1 more)

### Community 30 - "agregadores.ts"
Cohesion: 0.18
Nodes (10): 1. Contexto e Objetivo, 2. Premissas, 3.1 Produto, 3.2 Arquitetura (ADRs da v2, complementando os ADR-001 a ADR-016), 3. Decisões, 4. Glossário, 5. Fora do Escopo, 6. Contrato de Aceite (+2 more)

### Community 31 - "claude-falso.ts"
Cohesion: 0.10
Nodes (21): vitest, criarCaminhos(), RAIZ, BINARIO_FALSO, ChamadaRegistrada, ClaudeFalso, RegraClaude, respostaJson() (+13 more)

### Community 32 - "aplicar-vagas.ts"
Cohesion: 0.06
Nodes (29): ADR-0008: Persistência com `node:sqlite`, repositório síncrono do agregado, tabelas STRICT e migrações, 6. Fluxos, 3. Números medidos, 3. Camadas e responsabilidades, aplicarUma(), ResumoAplicacao, DepsListarStatus, preResponderCampos() (+21 more)

### Community 33 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+11 more)

### Community 34 - "6. Catálogo de portas"
Cohesion: 0.12
Nodes (14): 5. Portas, 6. Catálogo de portas, 8.1 Adotados, T12: Resolução e extração, T13: Base de conectores, contratos e captura de fixtures, CatalogoConectores, ResolvedorVagas, criarWeb() (+6 more)

### Community 35 - "Outbox: arquitetura e convenções"
Cohesion: 0.12
Nodes (16): 11.2 Verificação local e CI, 11.3 Regras de lint obrigatórias, 11. Qualidade e testabilidade, 12.1 Modelo de ameaças, 12.2 Classificação de dados, 12.3 Fronteira de confiança e injeção de prompt (ADR-012), 12.4 Segredos e credenciais, 12. Segurança (+8 more)

### Community 36 - "spec-curriculo-ats-1-pagina/spec.md"
Cohesion: 0.12
Nodes (17): 1. Contexto e Objetivo, 2. Premissas, 3. Decisões, 4. Glossário, 7. Tarefas, 8. Questões em aberto, Anexo A — Valores visuais (B = tamanho base em pt), Anexo B — Correções de revisão (+9 more)

### Community 37 - "outbox-segredos.ts"
Cohesion: 0.18
Nodes (14): @modelcontextprotocol/sdk, T5: Domínio de respostas e falhas, criarServidorSegredos(), hostsDoAmbiente(), principal(), resposta(), Resultado, seletor (+6 more)

### Community 38 - "renderizador-pdf-playwright.ts"
Cohesion: 0.31
Nodes (7): cabecalho(), css(), documento(), htmlCarta(), htmlCurriculo(), lista(), secao()

### Community 39 - "servico-segredos.ts"
Cohesion: 0.10
Nodes (16): T16: Conectores Gupy e InHire, com spikes, T17: Cofre de credenciais e MCP `outbox-segredos`, preencherElemento(), tipoDoElemento(), CofreCredenciais, Aleatorio, CofreCredenciaisJson, esquemaCofre (+8 more)

### Community 40 - "T21: Etapas de preparo e caso de uso `preparar`"
Cohesion: 0.33
Nodes (9): 7.1 `outbox preparar`, 6. Contrato de Aceite, T21: Etapas de preparo e caso de uso `preparar`, adicionarVagas(), DepsResolverVaga, DesfechoResolucao, resolverVaga(), decidirDeduplicacaoChave() (+1 more)

### Community 41 - "GeradorEstruturadoClaude"
Cohesion: 0.29
Nodes (6): PedidoGeracao, TarefaLlm, TAREFAS_LLM, ADR-0012, GeradorEstruturadoRoteirizado, Resposta

### Community 43 - "Motor"
Cohesion: 0.22
Nodes (8): 1. Full Logo (icon + wordmark), 2. Icon Only (avatar, favicon, app icon), 4. Social Media, Camaleão — Brand Guidelines, Colors, Logo Files, Typography, Usage Rules

### Community 44 - "conectores.test.ts"
Cohesion: 0.17
Nodes (17): comParametro(), comSufixo(), dataCurta(), nomeDoSlug(), DEFINICOES_V1, definicaoAshby, esquemaQuadroAshby, definicaoGreenhouse (+9 more)

### Community 45 - "motores.ts"
Cohesion: 0.13
Nodes (13): 1. Garanta o motor no domínio, Critérios de aceite, canonicaGenerica(), canonizar(), detectarMotor(), ehRastreamento(), hostCasaPadrao(), MotorConhecido (+5 more)

### Community 46 - "Como adicionar um conector de ATS"
Cohesion: 0.33
Nodes (5): 2. Capture fixtures sanitizadas, 4. Registre no catálogo, 5. Passe na suíte de contrato, 6. Valide com uma vaga real, Como adicionar um conector de ATS

### Community 47 - "NavegadorOutbox"
Cohesion: 0.22
Nodes (4): T11: Navegador, leitor headless e documentos, ErroNavegador, caminhosChrome(), NavegadorOutbox

### Community 48 - "preencher-formulario.ts"
Cohesion: 0.15
Nodes (14): ADR-0022: Pastas nomeadas pelo design pattern, em inglês, agenteFalhou(), assumirAposConector(), EntradaAgente, ExecucaoAgente, executarAgente(), htmlSanitizado(), montarTentativa() (+6 more)

### Community 49 - "conector-formulario.ts"
Cohesion: 0.17
Nodes (17): 7. Conectores, 3. Escreva a definição, acharResposta(), chaveRotulo(), criarConector(), DefinicaoConector, indexar(), IndiceRespostas (+9 more)

### Community 50 - "responder-campos.ts"
Cohesion: 0.16
Nodes (17): base(), chaveCache(), consultarLlm(), corrigirNoCache(), esquemaRespostasLlm, foraDasOpcoes(), Idioma, responderDoCache() (+9 more)

### Community 51 - "ref_node_path"
Cohesion: 0.33
Nodes (7): criarLocais(), abrirConexao(), migrar(), ADR-0008, versaoAtual(), criarRepositorioMemoria(), PASTA_MIGRACOES

### Community 52 - "aplicar-vagas.ts"
Cohesion: 0.21
Nodes (13): TipoCampo, AUTOCOMPLETE, Classificacao, classificarCampo(), classificarCampoDetalhado(), classificarFormulario(), DescricaoCampo, normalizarRotulo() (+5 more)

### Community 53 - "entrada-consultas.test.ts"
Cohesion: 0.16
Nodes (10): EntradaAplicarVagas, DadosFalhas, GrupoFalha, listarFalhas(), listarStatus(), paraLinha(), registrarRetorno(), renderizarMaster() (+2 more)

### Community 55 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-prettier, @eslint/js, @napi-rs/canvas, pdfjs-dist, prettier, @types/cross-spawn (+6 more)

### Community 56 - "Outbox"
Cohesion: 0.13
Nodes (14): Checklist de smoke manual, Configuração, Currículo em 1 página, Desenvolvimento, Documentação, Fluxo diário, Grafo de conhecimento (Graphify), Instalação (+6 more)

### Community 57 - "ArmazemArtefatosMemoria"
Cohesion: 0.14
Nodes (3): NomeArtefato, ArmazemArtefatosFs, ArmazemArtefatosMemoria

### Community 58 - "revisar-e-enviar.ts"
Cohesion: 0.22
Nodes (11): SaidaResponderCampos, aplicarAprendizado(), proximoId(), RespostaFinal, tipoResposta(), EntradaBanco, esquemaBancoRespostas, esquemaEntradaBanco (+3 more)

### Community 59 - "Progresso da implementação da V1"
Cohesion: 0.22
Nodes (7): Bloqueios e pendências, Decisões tomadas durante a implementação, Progresso da implementação da V1, Tarefas, Validação real do agente (2026-10-10), Verificação final, Verificações de ambiente

### Community 60 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, commander, cross-spawn, @inquirer/prompts, mammoth, @modelcontextprotocol/sdk, node-notifier, open (+4 more)

### Community 61 - "portas/erros.ts"
Cohesion: 0.12
Nodes (21): cross-spawn, esquemaSaidaAgente, FERRAMENTAS_AGENTE, OpcoesExecutorAgente, SaidaAgente, extrairJson(), GeradorEstruturadoClaude, OpcoesGerador (+13 more)

### Community 63 - "GeradorEstruturado"
Cohesion: 0.19
Nodes (11): ADR-0011: LLM com portas separadas, schema único e prompts versionados, 5. Prompts, 16.1 Idioma (ADR-003), 16.3 Código, 16.4 Prompts, 16.5 Documentação, 16.6 Definição de pronto (por tarefa), 16. Convenções (+3 more)

### Community 65 - "progresso-terminal.test.ts"
Cohesion: 0.24
Nodes (6): RegiaoViva, montar(), puro(), relogio(), criarSaidaTerminal(), FluxoTerminal

### Community 66 - "ArmazemCurriculoMemoria"
Cohesion: 0.13
Nodes (4): DadosConsulta, BancoRespostas, Perfil, ArmazemCurriculoMemoria

### Community 67 - "portas/erros.ts"
Cohesion: 0.12
Nodes (20): 10.1 Modelo de erros (ADR-009), T10: LLM: processo claude, gerador estruturado e prompts, T18: Agente, T6: Portas, erros de porta, concorrência e apoio de testes, ErroAgregadorExigeLogin, ErroExtracao, ErroHttp, ErroInfra (+12 more)

### Community 68 - "preparar"
Cohesion: 0.14
Nodes (14): ADR-0016: Execução exclusiva por comando e cancelamento cooperativo, ADR-0020: Bloqueio anti-bot tratado como CAPTCHA, Comandos e códigos de saída, 7. Tarefas, T14: Conectores Greenhouse, Lever e Ashby, T15: Conectores SmartRecruiters, Workable e Teamtailor, T1: Fundação do repositório, qualidade e CI, T23: Casos de uso de consulta (+6 more)

### Community 69 - "vitest"
Cohesion: 0.21
Nodes (14): CAMPOS, criar(), prontas(), roteiro(), sinal(), ambiente(), ambienteComConector(), CAMPOS (+6 more)

### Community 70 - "Relogio"
Cohesion: 0.12
Nodes (10): Relogio, CacheRespostasJson, Entradas, esquemaCache, OpcoesCacheRespostas, NIVEIS_LOG, nivelDoAmbiente(), OpcoesRegistrador (+2 more)

### Community 72 - "Arquitetura do Outbox"
Cohesion: 0.20
Nodes (9): 10. Desempenho, 11. Qualidade, 12. Diferenças em relação à spec, 1. Forças, 2. Visão geral, 3. Estrutura, 4. Contextos do domínio, 9. Segurança (+1 more)

### Community 73 - "eslint.config.js"
Cohesion: 0.20
Nodes (7): FRONTEIRAS, SUBIDA_PROIBIDA, eslint, eslint-config-prettier, @eslint/js, typescript-eslint, eslint

### Community 74 - "pt"
Cohesion: 0.22
Nodes (7): Entrada, Regras, Tarefa, Entrada, Regras, Tarefa, pt()

### Community 76 - "ErroUsuario"
Cohesion: 0.13
Nodes (14): principal(), T9: Armazenamento em arquivos, esquemaGapsNegados, GapsNegados, ErroUsuario, esquemaPerfil, ArmazemCurriculoYaml, AUXILIARES (+6 more)

### Community 77 - "transicoes.ts"
Cohesion: 0.25
Nodes (12): T8: Persistência SQLite, EntradaRegistrarRetorno, StatusRetorno, RepositorioTransicao, OpcoesTransicao, OpcoesTransicaoVaga, transicionar(), TRANSICOES_VALIDAS (+4 more)

### Community 78 - "revisar-e-enviar.ts"
Cohesion: 0.26
Nodes (8): 7.2 `outbox aplicar`, 7. Fluxos principais por camada, acharValor(), enviar(), esperaValor(), montarResumo(), OPCOES, revisarEEnviar()

### Community 79 - "imports"
Cohesion: 0.25
Nodes (8): imports, #aplicacao/*, #composicao, #dominio/*, #infra/*, #interfaces/*, #scripts/*, #testes/*

### Community 80 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, capturar-fixture, formatar, lint, outbox, test, tipos, verificar

### Community 81 - "FormularioPlaywright"
Cohesion: 0.40
Nodes (5): 10.2 Validação, 10.3 Logging (ADR-014), 10.4 Configuração (ADR-015), 10.5 Concorrência, transações e cancelamento (ADR-008, ADR-016), 10. Erros, validação, logging, config e concorrência

### Community 82 - "Convenções do Outbox"
Cohesion: 0.25
Nodes (7): 1. Idioma (ADR-0003), 3. Código, 4. Conectores e automação de navegador, 6. Testes, 7. Documentação, 8. Definição de pronto, Convenções do Outbox

### Community 83 - "Relogio"
Cohesion: 0.50
Nodes (3): npx, logoloom, @mcpware/logoloom

### Community 85 - "Spike: Gupy"
Cohesion: 0.29
Nodes (6): Como concluir o spike, Decisão provisória: `gupy.anexoPorCandidatura: true`, O que foi implementado sem o spike, Objetivo, Por que está bloqueado, Spike: Gupy

### Community 86 - "titulo"
Cohesion: 0.40
Nodes (4): Como escrever cada bullet, Entrada, Regras de lastro (obrigatórias), Tarefa

### Community 87 - "armazens.ts"
Cohesion: 0.26
Nodes (7): 11.1 Estratégia de testes, umaAtualizacao(), umaVaga(), umMaster(), umPacote(), umPerfil(), entrada()

### Community 88 - "Spike: InHire"
Cohesion: 0.33
Nodes (5): Como concluir o spike, O que foi implementado sem o spike, Objetivo, Por que está bloqueado, Spike: InHire

### Community 89 - "perfil.ts"
Cohesion: 0.15
Nodes (12): dataIso, Diversidade, Documentos, Endereco, esquemaConsentimentos, esquemaDiversidade, esquemaDocumentos, esquemaEndereco (+4 more)

### Community 90 - "7. Tarefas"
Cohesion: 0.22
Nodes (8): 7. Tarefas, T1: Domínio de acompanhamento e porta de consulta com implementação SQLite, T2: Casos de uso do painel, T3: Servidor web, segurança, layout e comando `painel`, T4: Rotas de fila e detalhe, T5: Rotas de ações, T6: Rotas de métricas e falhas, T8: Documentação

### Community 91 - "agente-candidatura.md"
Cohesion: 0.40
Nodes (4): Dados do candidato, Regras (obrigatórias), Resposta final, Tarefa

### Community 92 - "responder-perguntas.md"
Cohesion: 0.50
Nodes (3): Entrada, Regras, Tarefa

### Community 93 - "atualizacoes.ts"
Cohesion: 0.38
Nodes (11): atualizacao(), contarTentativaPreparo(), DadosExtracao, marcarAnexoManual(), percentual(), registrarAderencia(), registrarAnalise(), registrarCurriculo() (+3 more)

### Community 108 - "Registrador"
Cohesion: 0.21
Nodes (6): ADR-0014: Logging mínimo com redação, ADR-014: logging mínimo com redação, T19: Notificação, T7: Toast que abre o painel, Registrador, NotificadorWindows

### Community 109 - "repositorio-vagas-sqlite.ts"
Cohesion: 0.18
Nodes (10): ETAPAS, MOTIVOS, ROTAS, COLUNAS, esquemaLinhaEvento, esquemaLinhaVaga, esquemaMotor, esquemaStatus (+2 more)

### Community 111 - "RenderizadorDocumentos"
Cohesion: 0.29
Nodes (3): 5. Fora do Escopo, RenderizadorDocumentos, ADR-0012

### Community 112 - "Vaga"
Cohesion: 0.31
Nodes (5): T3: Domínio de vagas, ConsultaVagas, ChaveDedup, NovaVaga, Vaga

### Community 113 - "vaga.ts"
Cohesion: 0.36
Nodes (5): ADR-0023: Invariantes da vaga no domínio, com valores marcados, Marca, Rota, AtualizacaoVaga, CamposAtualizaveisVaga

### Community 114 - "importar-curriculo.ts"
Cohesion: 0.28
Nodes (5): DepsImportarCurriculo, EntradaImportarCurriculo, importarCurriculo(), SaidaImportarCurriculo, validar()

### Community 115 - "salario.ts"
Cohesion: 0.31
Nodes (8): Regime, TabelaSalario, escolherFaixa(), Faixa, interpretarFaixa(), numerosDe(), PedidoSalario, valorSalarioAtual()

### Community 116 - "respostas-bordas.test.ts"
Cohesion: 0.32
Nodes (5): ADR-0019: Consentimento como categoria de campo, aceitaConsentimento(), respostaConsentimento(), Consentimentos, umaResposta()

### Community 117 - "pacote.ts"
Cohesion: 0.32
Nodes (6): CategoriaCampo, CATEGORIAS_CAMPO, CATEGORIAS_SENSIVEIS, TIPOS_CAMPO, esquemaContato, esquemaRespostaSugerida

### Community 118 - "diversidade.ts"
Cohesion: 0.43
Nodes (7): ChaveDiversidade, contemPalavras(), normalizar(), respostaDiversidade(), Sinonimos, valorDaOpcao(), valorDoPerfil()

### Community 119 - "Relatório de arquitetura — outbox"
Cohesion: 0.29
Nodes (6): 1. Veredito geral, 2. Tabela de critérios, 4. Top 5 prioridades, 5. Proposta: patterns em pastas nomeadas, 6. Limitações, Relatório de arquitetura — outbox

### Community 120 - "Outbox v1: candidatura assistida com currículo camaleão"
Cohesion: 0.33
Nodes (5): 1. Contexto e Objetivo, 2. Premissas, 3. Decisões, 5. Fora do Escopo, Outbox v1: candidatura assistida com currículo camaleão

### Community 121 - "NavegadorUsuario"
Cohesion: 0.40
Nodes (3): T20: Casos de uso de entrada, abrirNavegador(), NavegadorUsuario

## Knowledge Gaps
- **35 isolated node(s):** `npx`, `@mcpware/logoloom`, `ADR-0004`, `@playwright/mcp`, `node-notifier` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 621 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `claude-falso.ts` to `valor-codigo.ts`, `resolucao.test.ts`, `api.ts`, `agente.test.ts`, `zod`, `ArmazemArtefatosFs`, `composicao.ts`, `documentos.test.ts`, `rodada-gaps.ts`, `principal.ts`, `basicos.ts`, `compartilhado/erros.ts`, `package.json`, `apresentacao.test.ts`, `gerar-curriculo.ts`, `curriculo-ats.test.ts`, `campos.ts`, `capturar-fixture.ts`, `outbox-segredos.ts`, `servico-segredos.ts`, `conectores.test.ts`, `motores.ts`, `ref_node_path`, `aplicar-vagas.ts`, `entrada-consultas.test.ts`, `portas/erros.ts`, `progresso-terminal.test.ts`, `vitest`, `eslint.config.js`, `ErroUsuario`, `transicoes.ts`, `atualizacoes.ts`, `respostas-bordas.test.ts`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `IdVaga` (e.g. with `3. Números medidos` and `8.1 Adotados`) actually correct?**
  _`IdVaga` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx`, `@mcpware/logoloom`, `ADR-0004` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `resolucao.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09745293466223699 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `zod` to `resolucao.test.ts`, `api.ts`, `agente.test.ts`, `composicao.ts`, `rodada-gaps.ts`, `compartilhado/erros.ts`, `package.json`, `gerar-curriculo.ts`, `capturar-fixture.ts`, `lever/conector.ts`, `claude-falso.ts`, `aplicar-vagas.ts`, `outbox-segredos.ts`, `servico-segredos.ts`, `GeradorEstruturadoClaude`, `conectores.test.ts`, `responder-campos.ts`, `revisar-e-enviar.ts`, `portas/erros.ts`, `portas/erros.ts`, `Relogio`, `ErroUsuario`, `armazens.ts`, `perfil.ts`, `repositorio-vagas-sqlite.ts`, `pacote.ts`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `ErroUsuario` (e.g. with `8. Erros, validação, logging, config e concorrência` and `3. Números medidos`) actually correct?**
  _`ErroUsuario` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10588235294117647 - nodes in this community are weakly interconnected._
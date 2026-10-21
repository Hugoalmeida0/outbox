# Graph Report - outbox  (2026-10-21)

## Corpus Check
- 339 files · ~176,613 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .ico 2, .css 1)

## Summary
- 2475 nodes · 7591 edges · 145 communities (123 shown, 22 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 621 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9725440e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api.ts
- motores.ts
- json-ld.ts
- harness-conector.ts
- Outbox: arquitetura e convenções
- ref_zod
- ProgressoTerminal
- basicos.ts
- aplicar-vagas.ts
- composicao.ts
- contrato.ts
- armazens.ts
- analise-vaga.ts
- codigos-saida.test.ts
- preparar-vagas.ts
- FormularioAberto
- vaga.ts
- extrator-estrutural.ts
- renderizador-pdf-playwright.ts
- package.json
- infra-base.test.ts
- apresentacao.test.ts
- gerar-curriculo.ts
- IdVaga
- repositorio-vagas-sqlite.ts
- curriculo-ats.test.ts
- normalizarTexto
- Vaga
- InteracaoTerminal
- Vagas.tsx
- preparar
- sensiveis.test.ts
- ArmazemCurriculo
- compilerOptions
- 7. Tarefas
- 12. Segurança
- documentos.test.ts
- camaleao-segredos.ts
- template-html.ts
- revisar-e-enviar.ts
- nome.test.ts
- entrada-consultas.test.ts
- etapas.test.ts
- Camaleão — Brand Guidelines
- conectores.test.ts
- conexao.tsx
- 16.2 Nomenclatura
- 7. Tarefas
- preencher-formulario.ts
- conector-formulario.ts
- responder-campos.ts
- banco.test.ts
- classificar-campo.ts
- Perfil.tsx
- web/package.json
- devDependencies
- Camaleão
- ArmazemArtefatosFs
- 7. Tarefas
- servidor.ts
- dependencies
- 6. Contrato de Aceite
- 7. Tarefas
- ServicoSegredos
- FormularioPlaywright
- progresso-terminal.test.ts
- criarCasos
- NavegadorCamaleao
- cliente-http.ts
- vitest
- servico-segredos.ts
- agente-falso.tsx
- Arquitetura do Camaleão
- eslint.config.js
- analisar-vaga.md
- InteracaoWeb
- ErroUsuario
- variaveis.ts
- 0009-erros-como-excecoes-tipadas.md
- imports
- scripts
- Motor
- Convenções do Camaleão
- logoloom
- espiar-modulos.ts
- Spike: Gupy
- tailoring.md
- Interacao
- Spike: InHire
- agente-http.test.ts
- http/execucoes.ts
- agente-candidatura.md
- responder-perguntas.md
- arquivos.ts
- apoio/setup.ts
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
- App.tsx
- importar-curriculo.md
- CLAUDE.md
- respostas/perfil.ts
- compartilhado/erros.ts
- agente.ts
- compilerOptions
- portas/erros.ts
- Progresso da implementação da V1
- respostas-bordas.test.ts
- builders.ts
- execucao.ts
- rodada-gaps.ts
- respostas.test.ts
- DefinicaoConector
- progresso.ts
- cache-respostas-json.ts
- devDependencies
- interacao-terminal.ts
- rotas/execucoes.ts
- 5. Portas
- pdf.ts
- salario.ts
- tokens.test.ts
- adicionar.ts
- registrador-jsonl.ts
- pacote.ts
- deduplicacao.test.ts
- .paginaMaisRecente
- diversidade.ts
- vercel.json
- Camaleão: MVP web (site hospedado + agente local), Fase 1
- NavegadorUsuario
- dist.test.ts
- camaleao.js
- claude.mjs

## God Nodes (most connected - your core abstractions)
1. `IdVaga` - 86 edges
2. `ErroUsuario` - 77 edges
3. `vitest` - 61 edges
4. `ArmazemCurriculo` - 52 edges
5. `Vaga` - 50 edges
6. `ArmazemArtefatos` - 43 edges
7. `Motor` - 40 edges
8. `5. Portas` - 40 edges
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

## Communities (145 total, 22 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.14
Nodes (11): CampoPendente, Campo, classificarFormulario(), enderecoApi(), esquemaCampoApi, esquemaPergunta, esquemaVagaGreenhouse, obterVagaGreenhouse() (+3 more)

### Community 1 - "motores.ts"
Cohesion: 0.08
Nodes (39): 1. Garanta o motor no domínio, AGREGADORES, canonicaGenerica(), canonizar(), detectarMotor(), ehMotorConhecido(), ehRastreamento(), hostCasaPadrao() (+31 more)

### Community 2 - "json-ld.ts"
Cohesion: 0.21
Nodes (15): Entrada, Regras, Tarefa, esquemaVagaExtraida, paraVagaExtraida(), vagaDoNextData(), decodificarEntidades(), ENTIDADES (+7 more)

### Community 3 - "harness-conector.ts"
Cohesion: 0.09
Nodes (24): DepsConector, lerDescritores(), lerValoresGenerico(), paraCampos(), valorExibido(), LeitorHeadless, OpcoesLeitor, PaginaLida (+16 more)

### Community 4 - "Outbox: arquitetura e convenções"
Cohesion: 0.07
Nodes (26): 10.2 Validação, 10.3 Logging (ADR-014), 10.4 Configuração (ADR-015), 10. Erros, validação, logging, config e concorrência, 11.2 Verificação local e CI, 11.3 Regras de lint obrigatórias, 11. Qualidade e testabilidade, 17. Registro de decisões arquiteturais (ADR) (+18 more)

### Community 5 - "ref_zod"
Cohesion: 0.18
Nodes (19): cores, formatarResumoAplicacao(), comandoAplicar(), esquema, containerDuble(), rodar(), esquema, comandoNavegador() (+11 more)

### Community 6 - "ProgressoTerminal"
Cohesion: 0.24
Nodes (9): colunasDe(), cortarNaLargura(), formatarConclusao(), formatarDuracao(), formatarEmAndamento(), formatarRodape(), rotuloVaga(), comandoPreparar() (+1 more)

### Community 7 - "basicos.ts"
Cohesion: 0.19
Nodes (5): ContextoLog, RegistradorJsonl, EntradaLog, RegistradorMemoria, RespostaRoteiro

### Community 8 - "aplicar-vagas.ts"
Cohesion: 0.17
Nodes (17): 6. Fluxos, T2 — Contrato da API e núcleo do servidor do agente, 3. Camadas e responsabilidades, aplicarUma(), ResumoAplicacao, preResponderCampos(), ResumoPreparo, ConfigAplicacao (+9 more)

### Community 9 - "composicao.ts"
Cohesion: 0.07
Nodes (33): ADR-0006, ADR-0015, ADR-0007: Casos de uso como funções com dependências estreitas, configAplicacao(), Container, criarContainer(), criarLocais(), criarPreguicoso() (+25 more)

### Community 10 - "contrato.ts"
Cohesion: 0.07
Nodes (29): Controles(), PerguntaCartao(), PropsPergunta, rotuloLimpo(), Valor, CODIGOS_ERRO_EXECUCAO, COMANDOS_EXECUCAO, contagens (+21 more)

### Community 11 - "armazens.ts"
Cohesion: 0.15
Nodes (13): DepsAplicarVagas, DepsPrepararVagas, umPerfil(), AmbienteAplicacao, CONFIG_TESTE, criarAmbienteAplicacao(), ExtratorFake, RegistroFalhasMemoria (+5 more)

### Community 12 - "analise-vaga.ts"
Cohesion: 0.11
Nodes (27): ALERTA_AFIRMATIVA, calcularAderencia(), DetalhesAderencia, pontosCobertura(), pontosModelo(), pontosRegime(), pontosSenioridade(), ResultadoAderencia (+19 more)

### Community 13 - "codigos-saida.test.ts"
Cohesion: 0.22
Nodes (9): commander, codigoDoErro(), CODIGOS_SAIDA, ehErroPrevisto(), ehInterrupcao(), mensagemDoErro(), AlvoSinais, instalarSinais() (+1 more)

### Community 14 - "preparar-vagas.ts"
Cohesion: 0.31
Nodes (16): aplicarAderencia(), avisarEtapa(), deduplicarPorChave(), definirDestino(), descartarEncerrada(), descartarPorAderencia(), motivoDoErro(), prepararManual() (+8 more)

### Community 15 - "FormularioAberto"
Cohesion: 0.07
Nodes (26): ADR-0003: Idioma único em português ASCII, ADR-0010: Conectores ATS com Strategy, catálogo e handle comum, ADR-0011: LLM com portas separadas, schema único e prompts versionados, 15.1 Receitas de extensão, 15.2 Não construir agora (YAGNI), 15. Evolução, 7.2 `outbox aplicar`, 7. Fluxos principais por camada (+18 more)

### Community 16 - "vaga.ts"
Cohesion: 0.12
Nodes (28): LinhaStatus, listarStatus(), paraLinha(), pdfDaVaga(), EntradaRegistrarRetorno, StatusRetorno, RepositorioTransicao, Marca (+20 more)

### Community 17 - "extrator-estrutural.ts"
Cohesion: 0.16
Nodes (10): esquemaPaginaIndisponivel, extrairVaga(), ErroExtracao, ErroVagaIndisponivel, ExtratorVagas, ResultadoExtracao, normalizarEmpresa(), VagaExtraida (+2 more)

### Community 18 - "renderizador-pdf-playwright.ts"
Cohesion: 0.24
Nodes (4): contarPaginas(), RenderizadorPdfPlaywright, ADR-0012, gerar()

### Community 19 - "package.json"
Cohesion: 0.09
Nodes (22): bin, camaleao, description, engines, node, zod, name, private (+14 more)

### Community 20 - "infra-base.test.ts"
Cohesion: 0.11
Nodes (12): ArgumentosCaptura, lerArgumentos(), montarFixture(), principal(), carregarConfig(), OpcoesNavegadorCamaleao, ADR-0025, criarCaminhos() (+4 more)

### Community 21 - "apresentacao.test.ts"
Cohesion: 0.19
Nodes (12): DadosStatus, Formato, formatarFalhas(), formatarResumoPreparo(), ats(), formatarStatus(), titulo(), dataHora() (+4 more)

### Community 22 - "gerar-curriculo.ts"
Cohesion: 0.09
Nodes (15): ALERTA_ATS_CAIU, ALERTA_CAMALEAO_FALHOU, ALERTA_PDF_LONGO, esquemaArquivoCampos, criarPedido(), descreverViolacoes(), gerarComLastro(), gerarCurriculo() (+7 more)

### Community 23 - "IdVaga"
Cohesion: 0.13
Nodes (9): T8: Persistência SQLite, 6. Contrato de Aceite, GapAgrupado, Relogio, GapsVagas, TransicaoVaga, IdVaga, RepositorioVagasSqlite (+1 more)

### Community 24 - "repositorio-vagas-sqlite.ts"
Cohesion: 0.12
Nodes (14): RespostasEnviadasVagas, ETAPAS, MOTIVOS, ROTAS, GapAberto, RespostaEnviada, COLUNAS, esquemaLinhaEvento (+6 more)

### Community 25 - "curriculo-ats.test.ts"
Cohesion: 0.13
Nodes (7): leitor, masterDenso(), masterExemplo, pasta, PdfGerado, renderizador, TITULOS

### Community 26 - "normalizarTexto"
Cohesion: 0.17
Nodes (22): contemTermo(), escaparRegex(), normalizarTexto(), paraKebab(), casarTexto(), IDIOMAS, indice(), melhorOpcao() (+14 more)

### Community 27 - "Vaga"
Cohesion: 0.15
Nodes (12): T3: Domínio de vagas, ConsultaVagas, EscritaVagas, TransacaoVagas, ADR-0008, Status, AtualizacaoVaga, ChaveDedup (+4 more)

### Community 29 - "Vagas.tsx"
Cohesion: 0.15
Nodes (31): useAgente(), Consulta, useConsulta(), useExecucao(), Ats(), Carregando(), Erro(), LinkArquivo() (+23 more)

### Community 30 - "preparar"
Cohesion: 0.10
Nodes (16): ADR-0016: Execução exclusiva por comando e cancelamento cooperativo, ADR-0020: Bloqueio anti-bot tratado como CAPTCHA, ADR-0021: Progresso do `preparar` por porta de eventos, 3. Decisões, 6. Contrato de Aceite, 10.5 Concorrência, transações e cancelamento (ADR-008, ADR-016), 1. Contexto e Objetivo, 2. Premissas (+8 more)

### Community 31 - "sensiveis.test.ts"
Cohesion: 0.08
Nodes (26): yaml, esquemaGapsNegados, GapsNegados, esquemaPerfil, FERRAMENTAS_AGENTE, AUXILIARES, Caminhos, RAIZ (+18 more)

### Community 32 - "ArmazemCurriculo"
Cohesion: 0.06
Nodes (22): ADR-0008: Persistência com `node:sqlite`, repositório síncrono do agregado, tabelas STRICT e migrações, 1. Contexto e Objetivo, 2. Premissas, 4. Glossário, 5. Fora do Escopo, 8. Questões em aberto, Anexo A — Valores visuais (B = tamanho base em pt), Anexo B — Correções de revisão (+14 more)

### Community 33 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+11 more)

### Community 34 - "7. Tarefas"
Cohesion: 0.20
Nodes (9): 7. Tarefas, T11: Navegador, leitor headless e documentos, T14: Conectores Greenhouse, Lever e Ashby, T15: Conectores SmartRecruiters, Workable e Teamtailor, T1: Fundação do repositório, qualidade e CI, T23: Casos de uso de consulta, T24: Composição e CLI, T4: Domínio de currículo e análise (+1 more)

### Community 35 - "12. Segurança"
Cohesion: 0.50
Nodes (4): 12.1 Modelo de ameaças, 12.3 Fronteira de confiança e injeção de prompt (ADR-012), 12.4 Segredos e credenciais, 12. Segurança

### Community 36 - "documentos.test.ts"
Cohesion: 0.25
Nodes (6): 6. Contrato de Aceite, escaparHtml(), lerPdf(), leitor, pasta, renderizador

### Community 37 - "camaleao-segredos.ts"
Cohesion: 0.18
Nodes (14): @modelcontextprotocol/sdk, T5: Domínio de respostas e falhas, criarServidorSegredos(), hostsDoAmbiente(), principal(), resposta(), Resultado, seletor (+6 more)

### Community 38 - "template-html.ts"
Cohesion: 0.23
Nodes (9): 12.2 Classificação de dados, cabecalho(), css(), documento(), htmlCarta(), htmlCurriculo(), lista(), pt() (+1 more)

### Community 39 - "revisar-e-enviar.ts"
Cohesion: 0.33
Nodes (8): acharValor(), ehSemPretensao(), enviar(), esperaValor(), montarResumo(), OPCOES, revisarEEnviar(), aplicarAprendizado()

### Community 40 - "nome.test.ts"
Cohesion: 0.25
Nodes (7): ALVOS, arquivos(), COMPATIBILIDADE, IGNORADOS, RAIZ, TEXTO, ADR-0026

### Community 41 - "entrada-consultas.test.ts"
Cohesion: 0.27
Nodes (6): PedidoGeracao, TarefaLlm, TAREFAS_LLM, ADR-0012, GeradorEstruturadoRoteirizado, Resposta

### Community 42 - "etapas.test.ts"
Cohesion: 0.12
Nodes (9): CAMPOS, prontas(), roteiro(), sinal(), esquemaArquivoAnalise, vagaPronta(), esquemaRespostasSalvas, umaAtualizacao() (+1 more)

### Community 43 - "Camaleão — Brand Guidelines"
Cohesion: 0.22
Nodes (8): 1. Full Logo (icon + wordmark), 2. Icon Only (avatar, favicon, app icon), 4. Social Media, Camaleão — Brand Guidelines, Colors, Logo Files, Typography, Usage Rules

### Community 44 - "conectores.test.ts"
Cohesion: 0.15
Nodes (21): comParametro(), comSufixo(), dataCurta(), nomeDoSlug(), DEFINICOES_V1, definicaoAshby, esquemaQuadroAshby, definicaoGreenhouse (+13 more)

### Community 45 - "conexao.tsx"
Cohesion: 0.11
Nodes (22): AGENTE_PADRAO, CHAVE_AGENTE, ClienteAgente, codigoDoFragmento(), ErroAgente, ErroSemAgente, gravar(), lembrarEnderecoAgente() (+14 more)

### Community 46 - "16.2 Nomenclatura"
Cohesion: 0.29
Nodes (7): 16.1 Idioma (ADR-003), 16.2 Nomenclatura, 16.3 Código, 16.4 Prompts, 16.5 Documentação, 16.6 Definição de pronto (por tarefa), 16. Convenções

### Community 47 - "7. Tarefas"
Cohesion: 0.20
Nodes (10): 3. Decisões, 7. Tarefas, T1 — CSS do Anexo A, T2 — Documento, T3 — Campos opcionais no master, T4 — Laço de encaixe e corte, T5 — Lastro e prompt, T6 — Testes de integração (+2 more)

### Community 48 - "preencher-formulario.ts"
Cohesion: 0.12
Nodes (16): ADR-0022: Pastas nomeadas pelo design pattern, em inglês, agenteFalhou(), assumirAposConector(), DepsPreencherFormulario, EntradaAgente, ExecucaoAgente, executarAgente(), htmlSanitizado() (+8 more)

### Community 49 - "conector-formulario.ts"
Cohesion: 0.16
Nodes (21): playwright, acharResposta(), chaveRotulo(), criarConector(), indexar(), IndiceRespostas, preencherEtapa(), reescolherEPreencher() (+13 more)

### Community 50 - "responder-campos.ts"
Cohesion: 0.18
Nodes (19): ArquivoAnalise, base(), chaveCache(), consultarLlm(), ContextoResposta, corrigirNoCache(), esquemaRespostasLlm, foraDasOpcoes() (+11 more)

### Community 51 - "banco.test.ts"
Cohesion: 0.21
Nodes (7): abrirConexao(), migrar(), ADR-0008, versaoAtual(), RelogioFixo, criarRepositorioMemoria(), PASTA_MIGRACOES

### Community 52 - "classificar-campo.ts"
Cohesion: 0.23
Nodes (11): TipoCampo, AUTOCOMPLETE, ChaveDiversidade, Classificacao, classificarCampo(), classificarCampoDetalhado(), DescricaoCampo, normalizarRotulo() (+3 more)

### Community 53 - "Perfil.tsx"
Cohesion: 0.13
Nodes (27): Campo(), CampoSensivel(), PropsCampoSensivel, SeloLocal(), Caixa(), booleano(), Bruto, ChaveConsentimento (+19 more)

### Community 54 - "web/package.json"
Cohesion: 0.05
Nodes (35): dependencies, @fontsource/nunito, @fontsource/poppins, react, react-dom, react-router, zod, description (+27 more)

### Community 55 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-prettier, @eslint/js, @napi-rs/canvas, pdfjs-dist, prettier, @types/cross-spawn (+6 more)

### Community 56 - "Camaleão"
Cohesion: 0.12
Nodes (16): Camaleão, Checklist de smoke manual, Comandos e códigos de saída, Configuração, Currículo em 1 página, Desenvolvimento, Documentação, Fluxo diário (+8 more)

### Community 57 - "ArmazemArtefatosFs"
Cohesion: 0.14
Nodes (3): NomeArtefato, ArmazemArtefatosFs, ArmazemArtefatosMemoria

### Community 58 - "7. Tarefas"
Cohesion: 0.13
Nodes (13): 1. Contexto e Objetivo, 2. Premissas, 4. Glossário, 5. Fora do Escopo, 7. Tarefas, 8. Registro da revisão de 2026-10-09 (revisão 2), Outbox v2: painel local e métricas, T1: Domínio de acompanhamento e porta de consulta com implementação SQLite (+5 more)

### Community 59 - "servidor.ts"
Cohesion: 0.14
Nodes (27): hono, registrarRotaArquivos(), esquemaEntradaPareamento, VERSAO_CONTRATO, idDaRota(), lerJson(), validar(), registrarRotasCurriculo() (+19 more)

### Community 60 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, commander, cross-spawn, hono, @hono/node-server, @inquirer/prompts, mammoth, @modelcontextprotocol/sdk (+6 more)

### Community 61 - "6. Contrato de Aceite"
Cohesion: 0.21
Nodes (12): 2. Nomenclatura, Critérios de aceite, 7.1 `outbox preparar`, 6. Contrato de Aceite, T21: Etapas de preparo e caso de uso `preparar`, adicionarVagas(), DesfechoResolucao, resolverVaga() (+4 more)

### Community 62 - "7. Tarefas"
Cohesion: 0.22
Nodes (9): 7. Tarefas, T1 — Renomear Outbox → Camaleão, com migração, T3 — Comando `agente`, abertura do site e isolamento da aba, T5 — Rotas síncronas dos comandos, T6 — Perfil: casos de uso, porta e salário opcional, T7 — Fundação do site, T8 — Telas dos comandos e do perfil, T9 — Testes e2e, CI, deploy e documentação (+1 more)

### Community 63 - "ServicoSegredos"
Cohesion: 0.25
Nodes (4): preencherElemento(), tipoDoElemento(), ServicoSegredos, servico()

### Community 64 - "FormularioPlaywright"
Cohesion: 0.11
Nodes (6): T13: Base de conectores, contratos e captura de fixtures, DesfechoEnvio, ValorLido, FormularioPlaywright, OpcoesFormularioPlaywright, FormularioAbertoFake

### Community 65 - "progresso-terminal.test.ts"
Cohesion: 0.24
Nodes (6): RegiaoViva, montar(), puro(), relogio(), criarSaidaTerminal(), FluxoTerminal

### Community 66 - "criarCasos"
Cohesion: 0.05
Nodes (24): EntradaAplicarVagas, EstadoCurriculo, obterEstadoCurriculo(), DepsImportarCurriculo, EntradaImportarCurriculo, SaidaImportarCurriculo, DadosFalhas, GrupoFalha (+16 more)

### Community 67 - "NavegadorCamaleao"
Cohesion: 0.21
Nodes (3): ADR-0026: Renomeação de Outbox para Camaleão, com migração automática, caminhosChrome(), NavegadorCamaleao

### Community 68 - "cliente-http.ts"
Cohesion: 0.24
Nodes (7): 13. Desempenho, T7: Infra base, ErroHttp, ClienteHttpFetch, esperar(), esperaRetryAfter(), OpcoesClienteHttp

### Community 69 - "vitest"
Cohesion: 0.14
Nodes (20): vitest, aplicarVagas(), criar(), ambiente(), sinal(), ambienteComConector(), CAMPOS, roteiroPadrao() (+12 more)

### Community 70 - "servico-segredos.ts"
Cohesion: 0.15
Nodes (12): T16: Conectores Gupy e InHire, com spikes, CofreCredenciais, Aleatorio, CofreCredenciaisJson, esquemaCofre, gerarSenha(), Credencial, ChaveSensivel (+4 more)

### Community 71 - "agente-falso.tsx"
Cohesion: 0.16
Nodes (19): CHAVE_TOKEN, INTERVALO_RECONEXAO_MS, rotasProntas, STATUS_VAZIO, VAGA, agenteFalso(), Chamada, CURRICULO_OK (+11 more)

### Community 72 - "Arquitetura do Camaleão"
Cohesion: 0.22
Nodes (8): 10. Desempenho, 11. Qualidade, 13. Dependências do agente e do site, 1. Forças, 2. Visão geral, 3. Estrutura, 4. Contextos do domínio, Arquitetura do Camaleão

### Community 73 - "eslint.config.js"
Cohesion: 0.22
Nodes (7): FRONTEIRAS, SUBIDA_PROIBIDA, eslint, eslint-config-prettier, @eslint/js, typescript-eslint, eslint

### Community 74 - "analisar-vaga.md"
Cohesion: 0.50
Nodes (3): Entrada, Regras, Tarefa

### Community 75 - "InteracaoWeb"
Cohesion: 0.14
Nodes (9): OpcaoEscolha, ErroPerguntaCancelada, ErroPerguntaNaoPendente, InteracaoWeb, invalida(), OpcoesInteracaoWeb, criar(), ADR-0024 (+1 more)

### Community 76 - "ErroUsuario"
Cohesion: 0.09
Nodes (20): 8. Erros, validação, logging, config e concorrência, 10.1 Modelo de erros (ADR-009), T9: Armazenamento em arquivos, importarCurriculo(), registrarRetorno(), ErroCamaleao, ErroUsuario, ArmazemCurriculoYaml (+12 more)

### Community 77 - "variaveis.ts"
Cohesion: 0.40
Nodes (3): criarLeitorVariaveis(), NomeVariavel, ADR-0026

### Community 79 - "imports"
Cohesion: 0.25
Nodes (8): imports, #aplicacao/*, #composicao, #dominio/*, #infra/*, #interfaces/*, #scripts/*, #testes/*

### Community 80 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, camaleao, capturar-fixture, formatar, lint, test, tipos, verificar (+1 more)

### Community 81 - "Motor"
Cohesion: 0.24
Nodes (10): Destino, ErroPreparo, Resolucao, DadosResolucao, Motor, MotivoDe, Rota, UrlCanonica (+2 more)

### Community 82 - "Convenções do Camaleão"
Cohesion: 0.22
Nodes (8): 1. Idioma (ADR-0003), 3. Código, 4. Conectores e automação de navegador, 5. Prompts, 6. Testes, 7. Documentação, 8. Definição de pronto, Convenções do Camaleão

### Community 83 - "logoloom"
Cohesion: 0.50
Nodes (3): npx, logoloom, @mcpware/logoloom

### Community 85 - "Spike: Gupy"
Cohesion: 0.29
Nodes (6): Como concluir o spike, Decisão provisória: `gupy.anexoPorCandidatura: true`, O que foi implementado sem o spike, Objetivo, Por que está bloqueado, Spike: Gupy

### Community 86 - "tailoring.md"
Cohesion: 0.40
Nodes (4): Como escrever cada bullet, Entrada, Regras de lastro (obrigatórias), Tarefa

### Community 87 - "Interacao"
Cohesion: 0.11
Nodes (10): ADR-0024: Site estático hospedado e agente HTTP local, 2. Premissas, T4 — Execuções, eventos, `ProgressoWeb` e `InteracaoWeb`, Interacao, EventoPreparo, ProgressoPreparo, VagaResumida, eventoProgresso() (+2 more)

### Community 88 - "Spike: InHire"
Cohesion: 0.33
Nodes (5): Como concluir o spike, O que foi implementado sem o spike, Objetivo, Por que está bloqueado, Spike: InHire

### Community 89 - "agente-http.test.ts"
Cohesion: 0.10
Nodes (21): 12. Diferenças em relação à spec, T25: Documentação viva, STATUS_DE_RETORNO, esquemaSaidaAdicionar, esquemaSaidaFalhas, STATUS_RETORNO, ArmazemTokens, esquemaTokens (+13 more)

### Community 90 - "http/execucoes.ts"
Cohesion: 0.16
Nodes (11): ComandoExecucao, EventoExecucao, Assinante, ContextoExecucao, EstadoExecucao, eventoDeErro(), Execucao, GerenciadorExecucoes (+3 more)

### Community 91 - "agente-candidatura.md"
Cohesion: 0.40
Nodes (4): Dados do candidato, Regras (obrigatórias), Resposta final, Tarefa

### Community 92 - "responder-perguntas.md"
Cohesion: 0.50
Nodes (3): Entrada, Regras, Tarefa

### Community 93 - "arquivos.ts"
Cohesion: 0.17
Nodes (8): T3: Servidor web, segurança, layout e comando `painel`, AssinadorArquivos, Assinatura, OpcoesAssinador, real(), TIPOS, VALIDADE_ARQUIVO_MS, iniciarServidor()

### Community 108 - "App.tsx"
Cohesion: 0.19
Nodes (15): useConexao(), App(), Janela(), Layout(), NAVEGACAO, Adicionar(), Item, ROTULOS_ADICAO (+7 more)

### Community 109 - "importar-curriculo.md"
Cohesion: 0.50
Nodes (3): Entrada, Regras, Tarefa

### Community 111 - "respostas/perfil.ts"
Cohesion: 0.12
Nodes (16): ADR-0019: Consentimento como categoria de campo, aceitaConsentimento(), respostaConsentimento(), Consentimentos, dataIso, Documentos, Endereco, esquemaConsentimentos (+8 more)

### Community 112 - "compartilhado/erros.ts"
Cohesion: 0.17
Nodes (19): ADR-0023: Invariantes da vaga no domínio, com valores marcados, T2: Schemas do domínio e exemplos, DepsAdicionarVagas, ItemAdicao, ErroDominio, ErroTransicaoInvalida, ErroValidacao, atualizacao() (+11 more)

### Community 113 - "agente.ts"
Cohesion: 0.21
Nodes (9): open, abrirPadrao(), aguardarCancelamento(), comandoAgente(), esquema, EstadoPorta, sondarPorta(), versaoDoPacote() (+1 more)

### Community 114 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, exactOptionalPropertyTypes, isolatedModules, jsx, lib, module (+13 more)

### Community 115 - "portas/erros.ts"
Cohesion: 0.12
Nodes (27): T10: LLM: processo claude, gerador estruturado e prompts, T18: Agente, T6: Portas, erros de porta, concorrência e apoio de testes, ErroAgregadorExigeLogin, ErroInfra, ErroLlm, ErroMaxTurnos, ErroTimeoutLlm (+19 more)

### Community 116 - "Progresso da implementação da V1"
Cohesion: 0.22
Nodes (7): Bloqueios e pendências, Decisões tomadas durante a implementação, Progresso da implementação da V1, Tarefas, Validação real do agente (2026-10-10), Verificação final, Verificações de ambiente

### Community 117 - "respostas-bordas.test.ts"
Cohesion: 0.21
Nodes (10): SaidaResponderCampos, proximoId(), RespostaFinal, tipoResposta(), EntradaBanco, esquemaBancoRespostas, esquemaEntradaBanco, TipoResposta (+2 more)

### Community 118 - "builders.ts"
Cohesion: 0.46
Nodes (6): 11.1 Estratégia de testes, umaResposta(), umaVaga(), umMaster(), umPacote(), entrada()

### Community 119 - "execucao.ts"
Cohesion: 0.16
Nodes (16): Acao, aplicarEvento(), atualizarVaga(), esquemaCancelamento, ESTADO_INICIAL, EstadoExecucao, mensagemDe(), reduzir() (+8 more)

### Community 120 - "rodada-gaps.ts"
Cohesion: 0.17
Nodes (16): T22: Etapas de aplicação e caso de uso `aplicar`, executarComLimite(), analisarVaga(), idSkillLivre(), perguntarNivelIdioma(), rodadaGaps(), ROTULO_NIVEL, recalcularComGaps() (+8 more)

### Community 121 - "respostas.test.ts"
Cohesion: 0.25
Nodes (13): ChaveDocumento, ChavePadrao, consultasLocalizacao(), localizacaoCompleta(), Uf, ufDe(), UFS, Contato (+5 more)

### Community 122 - "DefinicaoConector"
Cohesion: 0.15
Nodes (10): 7. Conectores, 2. Capture fixtures sanitizadas, 3. Escreva a definição, 4. Registre no catálogo, 5. Passe na suíte de contrato, 6. Valide com uma vaga real, Como adicionar um conector de ATS, DefinicaoConector (+2 more)

### Community 123 - "progresso.ts"
Cohesion: 0.23
Nodes (9): EtapaPreparo, DadosRotulo, ETAPAS, formatarCabecalhoPreparo(), formatarEtapa(), GRAFEMAS, ICONES, EmAndamento (+1 more)

### Community 124 - "cache-respostas-json.ts"
Cohesion: 0.20
Nodes (5): CacheRespostas, CacheRespostasJson, Entradas, esquemaCache, OpcoesCacheRespostas

### Community 125 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, jsdom, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/react, @types/react-dom, vite (+1 more)

### Community 126 - "interacao-terminal.ts"
Cohesion: 0.21
Nodes (7): ResumoRevisao, formatarResumoRevisao(), ROTULOS_DESFECHO, Saida, OpcoesInteracaoTerminal, DependenciasCli, OpcoesProgressoTerminal

### Community 127 - "rotas/execucoes.ts"
Cohesion: 0.20
Nodes (15): mammoth, comandoImportar(), EXTENSOES_CURRICULO, lerCurriculo(), textoDocx(), validarExtensao(), ErroExecucaoEmAndamento, iniciarExclusivo() (+7 more)

### Community 128 - "5. Portas"
Cohesion: 0.09
Nodes (24): ADR-0014: Logging mínimo com redação, 5. Portas, 14. Política de dependências, 6. Catálogo de portas, 8.1 Adotados, 8.2 Avaliados e rejeitados, 8. Padrões de projeto, ADR-014: logging mínimo com redação (+16 more)

### Community 129 - "pdf.ts"
Cohesion: 0.22
Nodes (8): @napi-rs/canvas, pdfjs-dist, contarFontes(), inspecionarPdf(), OPERADORES_DE_IMAGEM, PdfInspecionado, PdfLido, pngDaPagina()

### Community 130 - "salario.ts"
Cohesion: 0.27
Nodes (10): respostaSalario(), Regime, TabelaSalario, calcularSalario(), escolherFaixa(), Faixa, interpretarFaixa(), numerosDe() (+2 more)

### Community 131 - "tokens.test.ts"
Cohesion: 0.29
Nodes (6): claro, contraste(), css, escuro, luminancia(), PARES

### Community 132 - "adicionar.ts"
Cohesion: 0.36
Nodes (6): ResultadoAdicao, formatarAdicao(), ROTULOS, comandoAdicionar(), esquema, urlsDoArquivo()

### Community 133 - "registrador-jsonl.ts"
Cohesion: 0.25
Nodes (4): NIVEIS_LOG, OpcoesRegistrador, serializar(), ADR-0014

### Community 134 - "pacote.ts"
Cohesion: 0.32
Nodes (6): CategoriaCampo, CATEGORIAS_CAMPO, CATEGORIAS_SENSIVEIS, TIPOS_CAMPO, esquemaContato, esquemaRespostaSugerida

### Community 136 - ".paginaMaisRecente"
Cohesion: 0.29
Nodes (5): ADR-0025: Pareamento e proteções do agente local, 9.1 Modelo de ameaças do agente local (ADR-0025), 9. Segurança, T17: Cofre de credenciais e MCP `outbox-segredos`, origemDe()

### Community 137 - "diversidade.ts"
Cohesion: 0.52
Nodes (6): contemPalavras(), normalizar(), respostaDiversidade(), Sinonimos, valorDaOpcao(), valorDoPerfil()

### Community 138 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, headers, outputDirectory, rewrites, $schema

### Community 139 - "Camaleão: MVP web (site hospedado + agente local), Fase 1"
Cohesion: 0.33
Nodes (5): 1. Contexto e Objetivo, 4. Glossário, 5. Fora do Escopo, 8. Questões em aberto, Camaleão: MVP web (site hospedado + agente local), Fase 1

### Community 140 - "NavegadorUsuario"
Cohesion: 0.40
Nodes (3): T20: Casos de uso de entrada, abrirNavegador(), NavegadorUsuario

### Community 141 - "dist.test.ts"
Cohesion: 0.40
Nodes (4): arquivos(), DIST, SO_TEXTO, TEXTO

## Knowledge Gaps
- **52 isolated node(s):** `npx`, `@mcpware/logoloom`, `zod`, `@types/react`, `@types/react-dom` (+47 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 801 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `motores.ts`, `tokens.test.ts`, `harness-conector.ts`, `ref_zod`, `deduplicacao.test.ts`, `basicos.ts`, `composicao.ts`, `analise-vaga.ts`, `dist.test.ts`, `codigos-saida.test.ts`, `vaga.ts`, `extrator-estrutural.ts`, `package.json`, `infra-base.test.ts`, `apresentacao.test.ts`, `curriculo-ats.test.ts`, `normalizarTexto`, `sensiveis.test.ts`, `documentos.test.ts`, `camaleao-segredos.ts`, `nome.test.ts`, `entrada-consultas.test.ts`, `etapas.test.ts`, `conectores.test.ts`, `banco.test.ts`, `web/package.json`, `progresso-terminal.test.ts`, `agente-falso.tsx`, `eslint.config.js`, `InteracaoWeb`, `variaveis.ts`, `agente-http.test.ts`, `http/execucoes.ts`, `compartilhado/erros.ts`, `portas/erros.ts`, `respostas-bordas.test.ts`, `builders.ts`, `rodada-gaps.ts`, `respostas.test.ts`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `IdVaga` (e.g. with `8.1 Adotados` and `T3: Domínio de vagas`) actually correct?**
  _`IdVaga` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx`, `@mcpware/logoloom`, `zod` to the rest of the system?**
  _52 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14166666666666666 - nodes in this community are weakly interconnected._
- **Why does `DefinicaoConector` connect `DefinicaoConector` to `5. Portas`, `json-ld.ts`, `harness-conector.ts`, `conectores.test.ts`, `FormularioAberto`, `Motor`, `conector-formulario.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `ErroUsuario` (e.g. with `8. Erros, validação, logging, config e concorrência` and `T2 — Contrato da API e núcleo do servidor do agente`) actually correct?**
  _`ErroUsuario` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Should `motores.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
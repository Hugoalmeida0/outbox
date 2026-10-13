# Outbox: arquitetura e convenções

**Data:** 2026-10-09 | **Status:** Rascunho | **Aplica-se a:** `specs/v1/spec-outbox/spec.md` e `specs/v2/spec-outbox/spec.md`

Este documento é a referência técnica do Outbox: como o código é organizado, quais regras de dependência valem, quais padrões são usados (e quais não), como testar, como tratar erros, segurança, desempenho e convenções.

As specs de versão descrevem **o que** o sistema faz; este documento descreve **como** ele deve ser construído. Em caso de conflito, a spec de versão vale para comportamento e este documento vale para estrutura.

Depois de implementado, o conteúdo daqui passa a viver em `docs/arquitetura.md`, `docs/convencoes.md` e `docs/adr/` (tarefa T25 da v1). A partir desse momento, `docs/` é a fonte de verdade viva e as specs ficam como registro histórico.

---

## 1. Forças que orientam a arquitetura

| Força | Consequência no desenho |
| --- | --- |
| CLI pessoal e local, num Windows 11, com um usuário | Sem servidor nem nuvem. Estado em SQLite e arquivos locais. Simplicidade vale mais do que distribuição |
| As interfaces externas mudam sem aviso (HTML dos ATS, agregadores) | O código que conhece cada site fica isolado em conectores substituíveis, cobertos por fixtures e por registro de falhas |
| O LLM não é determinístico e não é confiável como fonte | Toda saída de LLM é validada por schema, e o lastro é verificado por código puro |
| Há dados pessoais e sensíveis (CPF, salário, diversidade, senhas) | Classificação de dados, fronteira de confiança explícita e dado sensível que nunca chega ao LLM, ao log nem ao git |
| Custo marginal zero de LLM (assinatura via `claude -p`) | A integração com o LLM fica atrás de portas, para trocar de provedor sem tocar nas regras |
| A v2 (painel) reusa a lógica da v1 | Casos de uso independentes da interface (CLI, web, MCP) |
| Manutenção futura por outras pessoas | Camadas com responsabilidade única, regras de fronteira verificadas por lint, ADRs e convenções escritas |

## 2. Visão geral

O estilo é **hexagonal enxuto (portas e adaptadores)**, com núcleo funcional e casca imperativa, organizado em quatro camadas mais uma raiz de composição:

```
              ┌───────────────────────────────────────────────┐
              │ interfaces  (CLI · MCP outbox-segredos · web) │  entrada: traduz o mundo externo
              └───────────────────────┬───────────────────────┘
                                      │ chama
              ┌───────────────────────▼───────────────────────┐
              │ aplicacao  (casos de uso · etapas · portas)   │  orquestra; só conhece portas
              └───────────────────────┬───────────────────────┘
                                      │ usa regras puras
              ┌───────────────────────▼───────────────────────┐
              │ dominio  (entidades · regras · schemas)       │  puro, sem IO
              └───────────────────────────────────────────────┘
              ┌───────────────────────────────────────────────┐
              │ infra  (SQLite · YAML · claude -p · Playwright│  implementa as portas
              │         · conectores ATS · PDF · notificação) │
              └───────────────────────────────────────────────┘
   composicao.ts: o único ponto que instancia a infra e injeta nas portas
```

**Regra de dependência:** as setas apontam para dentro.

- `dominio` não depende de nada do projeto.
- `aplicacao` depende só de `dominio`.
- `infra` depende de `aplicacao` (para implementar as portas) e de `dominio`.
- `interfaces` depende de `aplicacao`, `dominio` e `composicao`, e nunca de `infra`.

A regra é verificada por ESLint (seção 11.3) e por teste (`tests/arquitetura/`).

## 3. Camadas e responsabilidades

| Camada | Responsabilidade | Pode importar | Não pode importar | Exemplos |
| --- | --- | --- | --- | --- |
| `src/dominio/` | Regras de negócio puras: schemas (Zod), máquina de estados, deduplicação, aderência, lastro, score ATS, salário, sanitização de HTML. Funções determinísticas, sem relógio, aleatoriedade ou IO | `zod` e o próprio `#dominio/` | `node:*`, qualquer outro pacote npm, `#aplicacao`, `#infra`, `#interfaces` | `calcularAderencia`, `validarLastro`, `decidirDeduplicacaoChave` |
| `src/aplicacao/portas/` | Interfaces (tipos TypeScript) que descrevem o que a aplicação precisa do mundo externo | `#dominio/` | Qualquer implementação | `RepositorioVagas`, `GeradorEstruturado`, `ConectorAts` |
| `src/aplicacao/etapas/` | Passos de orquestração reutilizados por mais de um caso de uso | `#dominio/`, `#aplicacao/` | `node:*`, pacotes de IO, `#infra`, `#interfaces` | `gerarCurriculo`, `responderCampos`, `preencherFormulario` |
| `src/aplicacao/casos-de-uso/` | Um caso de uso por comando ou ação: coordena etapas, portas e regras, decide transições de status e trata erros por vaga | Igual a `etapas` | Igual a `etapas` | `prepararVagas`, `aplicarVagas`, `registrarRetorno` |
| `src/infra/` | Implementações concretas das portas e de toda integração externa (SQLite, arquivos, `claude -p`, Playwright, APIs públicas, notificação) | Tudo, exceto `#interfaces` e `#composicao` | `#interfaces`, `#composicao` | `RepositorioVagasSqlite`, `ConectorGreenhouse` |
| `src/interfaces/` | Pontos de entrada: parse de entrada, chamada do caso de uso, apresentação da saída e códigos de saída. Sem regra de negócio | `#aplicacao/`, `#dominio/`, `#composicao` | `#infra` | `comandoPreparar`, servidor MCP, rotas do painel |
| `src/composicao.ts` | Raiz de composição: carrega config, instancia a infra de forma preguiçosa e monta as dependências de cada caso de uso | Tudo | Nada | `criarContainer(config)` |

## 4. Estrutura de diretórios

```
outbox/
├── bin/
│   └── outbox.js                    # executável: filtra o aviso do node:sqlite e importa a CLI
├── src/
│   ├── dominio/                     # núcleo puro
│   │   ├── compartilhado/           # erros base, normalização de texto, tipos de marca
│   │   ├── vagas/                   # status, motivos, transições, motores e canonização, deduplicação
│   │   ├── curriculo/               # schemas do master e do currículo gerado, documento, lastro, score ATS
│   │   ├── analise/                 # schema da análise, aderência, grupos de vaga afirmativa
│   │   ├── respostas/               # perfil, campos, salário, diversidade, banco de respostas, pacote
│   │   └── falhas/                  # schema do registro de falha, lista de PII, sanitização de HTML
│   ├── aplicacao/
│   │   ├── portas/                  # uma interface por arquivo
│   │   ├── etapas/                  # passos compartilhados entre casos de uso
│   │   ├── casos-de-uso/            # um arquivo por caso de uso
│   │   └── compartilhado/           # concorrência limitada e utilitários de orquestração
│   ├── infra/
│   │   ├── config/                  # schema e carga de config
│   │   ├── log/                     # registrador JSONL com redação
│   │   ├── sistema/                 # relógio, escrita atômica, trava de processo, cliente HTTP
│   │   ├── banco/                   # conexão, migrador, migracoes/*.sql, repositório
│   │   ├── armazenamento/           # YAML (master, perfil, banco), artefatos por vaga, falhas/
│   │   ├── llm/                     # processo claude, gerador estruturado, carga de prompts
│   │   ├── agente/                  # executor do agente e handle de formulário do agente
│   │   ├── navegador/               # navegador do Outbox (CDP), leitor headless, detecção de bloqueio
│   │   ├── documentos/              # template HTML e renderizador PDF
│   │   ├── resolucao/               # cadeia de resolvedores (agregadores, GitHub, portal Gupy, detecção de ATS)
│   │   ├── extracao/                # extração estrutural (API do conector, JSON-LD)
│   │   ├── conectores/
│   │   │   ├── base/                # handle Playwright, utilitários de campos, wrapper de passo, catálogo
│   │   │   └── <motor>/             # um diretório por ATS: conector.ts (+ api.ts quando houver)
│   │   ├── credenciais/             # cofre de senhas por tenant
│   │   └── notificacao/             # toast do Windows
│   ├── interfaces/
│   │   ├── cli/
│   │   │   ├── principal.ts         # definição dos comandos (commander)
│   │   │   ├── comandos/            # um arquivo por comando: parse, caso de uso, apresentação
│   │   │   ├── apresentacao/        # formatação de tabelas, resumo de revisão, cores
│   │   │   ├── interacao-terminal.ts # implementa a porta Interacao (@inquirer/prompts)
│   │   │   ├── sinais.ts            # SIGINT para AbortController
│   │   │   └── codigos-saida.ts     # erro para código de saída
│   │   ├── mcp/                     # servidor MCP outbox-segredos
│   │   └── web/                     # painel (v2)
│   └── composicao.ts
├── prompts/                         # prompts versionados (.md com front-matter)
├── curriculo.exemplo/               # exemplos fictícios de master, perfil, respostas e gaps
├── config.exemplo.yaml              # documentação dos parâmetros; config.yaml local é opcional
├── falhas/                          # registros de falha versionados (sanitizados)
├── docs/                            # arquitetura, convenções, ADRs, spikes, guia de conector
├── tests/
│   ├── apoio/                       # setup (rede bloqueada), builders, fakes de portas, harness de conector
│   ├── contratos/                   # suítes de contrato (ConectorAts, FormularioAberto)
│   ├── integracao/                  # infra real em ambiente isolado
│   ├── arquitetura/                 # testes das regras de fronteira
│   ├── fixtures/                    # HTML sanitizado por motor, PDFs de exemplo
│   └── fakes/claude.mjs             # executável falso do claude
├── scripts/capturar-fixture.ts
├── .github/workflows/verificar.yml
└── (raiz) package.json, package-lock.json, tsconfig.json, eslint.config.js, .prettierrc.json,
           .prettierignore, vitest.config.ts, .editorconfig, .gitattributes, .gitignore, .npmrc, README.md
```

**Não versionados:** `curriculo/`, `dados/` e `config.yaml`. O conteúdo de `dados/` é:

- `outbox.db`
- `navegador/`
- `credenciais.json`
- `vagas/<id>/`
- `master/`
- `logs/`
- `tmp/`
- `travas/`

**Testes unitários** ficam ao lado do código (`aderencia.ts` e `aderencia.test.ts`). Em `tests/` ficam só os testes que atravessam módulos ou usam infra real.

## 5. Contextos do domínio

| Contexto | Conceitos | Arquivos principais |
| --- | --- | --- |
| `vagas` | Vaga, Status, Motivo, Etapa, Motor, UrlCanonica, ChaveDedup | `status.ts`, `transicoes.ts`, `motores.ts`, `chave.ts`, `deduplicacao.ts` |
| `curriculo` | Master, CurriculoGerado, DocumentoCurriculo, Violacao de lastro | `master.ts`, `curriculo-gerado.ts`, `documento.ts`, `lastro.ts`, `score-ats.ts`, `nome-arquivo.ts` |
| `analise` | AnaliseVaga, Requisito, Keyword, Aderencia, GrupoAfirmativo | `analise-vaga.ts`, `aderencia.ts`, `grupos.ts` |
| `respostas` | Perfil, Campo, RespostaSugerida, BancoRespostas, PacoteCandidatura | `perfil.ts`, `campo.ts`, `salario.ts`, `diversidade.ts`, `banco.ts`, `pacote.ts` |
| `falhas` | RegistroFalha, lista de PII | `registro-falha.ts`, `pii.ts`, `sanitizar.ts` |

O agregado persistido é a **Vaga**: a linha em `vagas` mais os seus `eventos`, `gaps` e `respostas_enviadas`. Toda escrita nesses registros passa pelo `RepositorioVagas`.

## 6. Catálogo de portas

As portas são interfaces em `src/aplicacao/portas/`, uma por arquivo, com nome igual ao do arquivo em kebab-case.

| Porta | Responsabilidade | Implementação na infra | Consumidores |
| --- | --- | --- | --- |
| `RepositorioVagas` | CRUD do agregado Vaga, transições com evento e `transacao(fn)`. **Síncrona** (ADR-008) | `RepositorioVagasSqlite` | Todos os casos de uso |
| `ArmazemCurriculo` | Ler e validar master, perfil, banco de respostas e gaps negados. Gravar skill aprendida, gap negado e banco de respostas, preservando comentários | `ArmazemCurriculoYaml` | importar, preparar, aplicar, rodada de gaps |
| `ArmazemArtefatos` | Ler e gravar (de forma atômica) os arquivos de `dados/vagas/<id>/` e `dados/master/`, e resolver caminhos | `ArmazemArtefatosFs` | etapas, preparar, aplicar |
| `RegistroFalhas` | Gravar e atualizar registros em `falhas/` e listá-los | `RegistroFalhasFs` | aplicar, listar falhas |
| `GeradorEstruturado` | Executar uma tarefa de LLM (prompt nomeado + variáveis) e devolver um objeto validado pelo schema | `GeradorEstruturadoClaude` | importar, etapas de análise, tailoring e respostas |
| `ExecutorAgente` | Preencher um formulário com o agente e devolver um `FormularioAberto` ou um desfecho sem formulário | `ExecutorAgenteClaude` | etapa `preencherFormulario` |
| `CatalogoConectores` | Devolver o `ConectorAts` de um motor, ou `null` | `CatalogoConectoresPlaywright` | etapas de extração e de preenchimento |
| `ConectorAts` | `extrairVaga?`, `lerCampos?` e `abrirEPreencher` (que devolve um `FormularioAberto`). Nunca envia | Um por motor em `infra/conectores/<motor>/` | etapas |
| `FormularioAberto` | Handle do formulário preenchido: `urlAtual`, `capturarTela`, `capturarHtml`, `lerValores`, `enviar`, `confirmarEnvio` e `fechar` | `FormularioPlaywright`, `FormularioAgente` | `aplicarVagas`, `revisarEEnviar` |
| `ResolvedorVagas` | Transformar uma URL de entrada em `Resolucao` (motor, URL resolvida, rota, desfecho manual) | `ResolvedorEncadeado` | etapa `resolverVaga` |
| `ExtratorVagas` | Extração estrutural (API do conector ou JSON-LD) mais o texto visível da página | `ExtratorEstrutural` | etapa `extrairVaga` |
| `RenderizadorDocumentos` | Transformar `DocumentoCurriculo` ou carta em PDF e contar as páginas | `RenderizadorPdfPlaywright` | etapas, renderizar master |
| `Interacao` | Perguntas e avisos ao usuário (sim/não, número, texto, escolha, aguardar Enter, exibir resumo, abrir arquivo) | `InteracaoTerminal` (camada `interfaces/cli`) | aplicar, rodada de gaps |
| `Notificador` | Notificação ao usuário fora do terminal | `NotificadorWindows` | preparar |
| `NavegadorUsuario` | Abrir o navegador do Outbox para logins manuais | `NavegadorOutbox` | abrir navegador |
| `Relogio` | Data e hora atuais | `RelogioSistema` | Qualquer caso de uso que grave datas |
| `Registrador` | Log estruturado com níveis | `RegistradorJsonl` | Casos de uso e infra |

**Síncrona ou assíncrona.** Portas de IO local em arquivos pequenos ou SQLite são **síncronas**: `RepositorioVagas`, `ArmazemCurriculo`, `ArmazemArtefatos` e `RegistroFalhas`. Isso mantém as transações atômicas e o código direto. Portas que envolvem rede, processo filho, navegador ou usuário são **assíncronas** e recebem `AbortSignal` quando a operação pode demorar.

**Interfaces internas da infra** (não são portas da aplicação, porque só a infra as consome):

- `CofreCredenciais`, usado pelo conector InHire e pelo MCP.
- `ClienteHttp`, usado por conectores, resolvedores e extração.

O MCP `outbox-segredos` lê `perfil.documentos` pelo `ArmazemCurriculo`, entregue pela composição.

## 7. Fluxos principais por camada

### 7.1 `outbox preparar`

1. **`interfaces/cli/comandos/preparar.ts`:** valida as flags, adquire a trava `preparar`, cria o `AbortController` ligado ao SIGINT e chama `prepararVagas(deps, entrada, sinal)`.
2. **`aplicacao/casos-de-uso/preparar-vagas.ts`:** lista as vagas elegíveis e executa `executarComLimite(vagas, paralelo, processarVaga, sinal)`. Para cada vaga executa as etapas abaixo e, ao fim, chama `Notificador`.
   1. `resolverVaga`: porta `ResolvedorVagas`. Aplica `decidirDeduplicacaoUrl` (domínio) numa transação.
   2. `extrairVaga`: porta `ExtratorVagas`. Se a extração vier vazia, chama `GeradorEstruturado` com o prompt `extrair-vaga`.
   3. `analisarVaga`: `GeradorEstruturado` (`analisar-vaga`) seguido da validação de ids (domínio) e da gravação de gaps.
   4. Deduplicação por chave: `decidirDeduplicacaoChave` (domínio) aplicada numa transação `BEGIN IMMEDIATE`.
   5. Aderência: `calcularAderencia` (domínio), seguida da transição.
   6. `gerarCurriculo`: `GeradorEstruturado` (`tailoring`), `validarLastro` (domínio), `montarDocumento` (domínio), `RenderizadorDocumentos` e `scoreAts` (domínio).
   7. `responderCampos`: regras de domínio para os campos de código, mais `GeradorEstruturado` (`responder-perguntas`) para as perguntas.
3. **`interfaces/cli/apresentacao/resumo-preparo.ts`:** imprime o resumo.

### 7.2 `outbox aplicar`

1. A CLI adquire a trava `aplicar` e chama `aplicarVagas(deps, entrada, sinal)`.
2. `rodadaGaps`: usa `Interacao` e `ArmazemCurriculo` e chama `gerarCurriculo` para as vagas afetadas.
3. Para cada vaga:
   1. `preencherFormulario` decide a rota:
      - Com conector: `ConectorAts.abrirEPreencher`.
      - Se lançar `ErroFalhaConector`: `RegistroFalhas` seguido de `ExecutorAgente`, com o contexto da falha.
      - Sem conector: `ExecutorAgente`.
   2. `revisarEEnviar`: `FormularioAberto.capturarTela`, `Interacao.exibirResumoRevisao`, a escolha do usuário e então `lerValores`, `enviar`, `confirmarEnvio` e a transição. Por fim, aplica `aplicarAprendizado` (domínio) e grava pelo `ArmazemCurriculo`.

Toda decisão de negócio (qual status, qual vaga descartar, se o envio pode acontecer) fica na aplicação ou no domínio. A infra executa, sem decidir.

## 8. Padrões de projeto

### 8.1 Adotados

| Padrão | Onde | Valor concreto |
| --- | --- | --- |
| Portas e Adaptadores (Hexagonal) | Arquitetura inteira | Isola o que muda (ATS, LLM, navegador) do que precisa ficar estável (regras). Casos de uso testáveis com fakes |
| Núcleo funcional, casca imperativa | Domínio devolve **decisões** (`AcaoDeduplicacao[]`, `Violacao[]`, `ResultadoAderencia`) e a aplicação as executa | Regras críticas testadas sem mock, com tabelas de casos |
| Raiz de composição com injeção manual | `src/composicao.ts` | Um único lugar conhece as implementações, sem container mágico (ADR-006) |
| Strategy com Registry | `CatalogoConectores` mapeando motor para `ConectorAts` | Um ATS novo entra sem alterar casos de uso (OCP) |
| Lista ordenada de estratégias (Chain of Responsibility simplificada) | `ResolvedorEncadeado` (agregador, GitHub, portal Gupy, detecção de ATS, domínio próprio) e `ExtratorEstrutural` (API do conector, JSON-LD) | Fallbacks explícitos, cada elo testável isoladamente |
| Adapter (GoF) e handle comum | `FormularioAberto`, implementado por `FormularioPlaywright` e `FormularioAgente`. `GeradorEstruturadoClaude` adapta o CLI `claude` | A política "conector falhou, agente assume" fica na aplicação. A revisão e o envio são iguais para as duas rotas |
| Repository com Unit of Work | `RepositorioVagas.transacao(fn)` | Vaga e evento gravados juntos. A deduplicação fica atômica entre processos (ADR-008) |
| Máquina de estados por tabela | `dominio/vagas/transicoes.ts` | Uma regra única para CLI, painel e casos de uso, sem classes por estado |
| Value Object leve (tipos de marca) | `UrlCanonica`, `ChaveDedup`, `IdVaga` | O compilador impede misturar URL crua com canônica, sem custo em tempo de execução |
| Wrapper de passo | `passo(nome, seletor, fn)` em `infra/conectores/base/` | Toda falha de conector carrega o passo e o seletor, que alimentam o registro em `falhas/` |

### 8.2 Avaliados e rejeitados

| Padrão ou técnica | Por que não |
| --- | --- |
| Container de DI (tsyringe, inversify) | Exige decorators e `reflect-metadata`, incompatíveis com a execução nativa de TypeScript (só sintaxe apagável). A injeção manual cabe em um arquivo |
| Template Method com classe base para conectores | Acopla todos os conectores a uma hierarquia frágil. Utilitários compostos (`base/`) dão o mesmo reuso |
| Event bus ou Observer | Os fluxos são sequenciais e locais. Chamar `Notificador` diretamente é mais legível |
| CQRS ou Event Sourcing | Volume pequeno. A tabela `eventos` já guarda o histórico necessário às métricas |
| Result/Either (neverthrow etc.) | Exceções tipadas com hierarquia única resolvem sem dependência nem ruído de tipos (ADR-009) |
| Framework de pipeline genérico | O `preparar` é uma sequência fixa de 7 etapas. Uma função sequencial é mais clara |
| ORM ou query builder | Quatro tabelas e SQL simples. Repositório com SQL explícito e statements preparados (ADR-008) |
| Barrel files (`index.ts`) | Criam ciclos e imports ambíguos. Importa-se o arquivo exato |
| State pattern (classe por status) | A tabela de transições cobre o comportamento com menos código |
| Mediator ou command bus | Os comandos da CLI chamam o caso de uso diretamente |

## 9. Princípios aplicados

- **SRP:**
  - Um caso de uso por arquivo e uma responsabilidade por etapa.
  - Conectores conhecem só o seu ATS.
  - Apresentadores só formatam, e o domínio não faz IO.
- **OCP:** conectores, resolvedores e migrações entram por registro, sem editar quem os consome.
- **LSP:**
  - Todo `ConectorAts` passa na suíte `tests/contratos/contrato-conector.ts`.
  - `FormularioPlaywright` e `FormularioAgente` passam na suíte `contrato-formulario.ts`.
- **ISP:**
  - Portas pequenas: `GeradorEstruturado` e `ExecutorAgente` são separadas.
  - Cada caso de uso declara as dependências com `Pick<Porta, "metodo">`, para não depender de métodos que não usa.
- **DIP:** a aplicação depende de portas, e só `composicao.ts` conhece as implementações.
- **DRY, com fontes únicas para:**
  - A tabela de motores (detecção, canonização, canal, resolução).
  - A tabela de transições.
  - Os schemas Zod (tipo, validação e JSON Schema enviado ao LLM).
  - A lista de PII (sanitização de falhas e redação de logs).
  - Os padrões de config (schema).
  - As constantes de status usadas nas métricas.

  Não se força abstração por coincidência. Vale a **regra de três**: o código parecido entre dois conectores só vira utilitário em `base/` no terceiro caso.
- **KISS/YAGNI:** veja a seção 15.2 ("Não construir agora").
- **Separation of Concerns:**
  - Regra no domínio, orquestração na aplicação e tecnologia na infra.
  - Tradução de entrada e saída nas interfaces.
  - Prompts em arquivos, fora do código.
- **Fail fast:** config, `master.yaml` e `perfil.yaml` são validados no início do comando que os usa, com mensagem que aponta o campo inválido.
- **Imutabilidade:** tipos de domínio `readonly`, e funções de domínio retornam objetos novos.
- **Composição sobre herança:** em toda a base. Herança só nas classes de erro.
- **Lei de Demeter:** a aplicação manipula `FormularioAberto` e nunca a `Page` do Playwright.

## 10. Erros, validação, logging, config e concorrência

### 10.1 Modelo de erros (ADR-009)

```
ErroOutbox (base: codigo: string, message, cause?)
├── ErroUsuario          entrada inválida do usuário: arquivo inexistente, master já existe, flag inválida
├── ErroDominio          regra violada: ErroTransicaoInvalida, ErroValidacao
└── ErroInfra            falha externa:
    ├── ErroLlm, ErroLimiteUso, ErroTimeoutLlm, ErroMaxTurnos
    ├── ErroHttp, ErroNavegador, ErroResolucao, ErroExtracao, ErroAgregadorExigeLogin
    └── ErroFalhaConector (passo, seletor, formulario?: FormularioAberto)
```

Regras:

- **Domínio:** só lança `ErroDominio`.
- **Infra:** captura erros nativos (Playwright, `fetch`, `child_process`, SQLite) e os relança como `ErroInfra`, com `cause`.
- **Casos de uso em lote:** capturam erros **por vaga** e os convertem em transição (por exemplo, `ErroExtracao` vira ERRO_PREPARO `extracao_falhou`). A falha de uma vaga nunca interrompe o lote. As exceções são `ErroLimiteUso` e o cancelamento (`sinal.aborted`), que encerram o lote de forma ordenada.
- **CLI** (`codigos-saida.ts`):
  - `0`: sucesso.
  - `1`: erro de execução (`ErroDominio`, `ErroInfra` ou inesperado).
  - `2`: uso inválido (`ErroUsuario` ou parse do commander).
  - `130`: interrompido.

  Um erro inesperado imprime uma mensagem curta e grava o stack no log.
- **Silêncio:** nenhum `catch` vazio. A única exceção documentada é a falha do `Notificador`, que vira aviso no log.

### 10.2 Validação

O Zod é aplicado em **toda fronteira de entrada**:

- `config.yaml`.
- `curriculo/*.yaml`.
- Saída do LLM.
- Respostas de APIs públicas.
- Linhas lidas do SQLite (no repositório).
- Argumentos da CLI.
- Entradas das ferramentas MCP.
- Formulários do painel (v2).

Dentro do domínio, os tipos já validados são confiáveis e não há revalidação.

### 10.3 Logging (ADR-014)

- **Porta `Registrador`:** `depurar`, `informar`, `avisar` e `erro`, cada um com `(mensagem, contexto?: { vagaId?, ... })`.
- **Saídas:**
  - Terminal: nível `informar` ou acima, em texto legível.
  - Arquivo: `dados/logs/outbox-AAAA-MM-DD.jsonl`, nível `depurar` ou acima. Uma linha `{ ts, nivel, mensagem, contexto }` por evento.
- **Nível:** a variável `OUTBOX_LOG` aceita `depurar`, `informar`, `avisar` ou `erro`.
- **Redação obrigatória antes de escrever:**
  - Toda string da lista de PII (`dominio/falhas/pii.ts`) é substituída por `[REDACTED]`.
  - Os valores de chaves `senha`, `cpf`, `rg`, `dataNascimento`, `salario` e `diversidade` são omitidos.
- **Logs de chamadas ao LLM** (`dados/vagas/<id>/llm/`) guardam o prompt completo, que contém dados pessoais mas nunca sensíveis (seção 12.2), e ficam em `dados/`, fora do git.

### 10.4 Configuração (ADR-015)

- O schema Zod em `src/infra/config/esquema-config.ts` é a **fonte única dos padrões**.
- `config.yaml` na raiz é opcional, não versionado, e sobrescreve só as chaves presentes.
- `config.exemplo.yaml` é versionado e documenta todas as chaves. Um teste garante que ele valida e que os valores batem com os padrões do schema.
- Variáveis de ambiente: só `OUTBOX_LOG` e `OUTBOX_CLAUDE_BIN` (esta, para testes).

### 10.5 Concorrência, transações e cancelamento (ADR-008, ADR-016)

- **Trava por comando.** `preparar` e `aplicar` adquirem `dados/travas/<comando>.lock`, criado com a flag `wx` e contendo o PID. Se a trava já existir com PID vivo, o comando falha com `ErroUsuario` ("já existe um `preparar` em execução (pid N)"). Uma trava com PID morto é removida.
- **Paralelismo interno.** É limitado por `executarComLimite` (`aplicacao/compartilhado/concorrencia.ts`), sem dependência externa.
- **Transações.** `RepositorioVagas.transacao(fn)` executa `BEGIN IMMEDIATE ... COMMIT`, com `ROLLBACK` em caso de erro.
  - `fn` precisa ser **síncrona**. Se retornar uma Promise, a transação lança erro, porque não se mantém uma transação aberta durante um `await`.
  - Dentro dela ficam só leituras e escritas do banco.
- **Cancelamento.**
  - O primeiro Ctrl+C aborta o `AbortSignal` passado aos casos de uso. As portas de longa duração (LLM, agente, navegador, render) encerram o processo ou a página.
  - As vagas em andamento permanecem no status anterior, sem efeito colateral persistido, porque `tentativas_preparo` só incrementa quando a tentativa termina em ERRO_PREPARO.
  - O segundo Ctrl+C força a saída com código 130.
- **Escrita atômica.** Todo arquivo gravado pela aplicação (artefatos, YAML, JSON de falha, credenciais) é escrito num arquivo temporário e renomeado. Uma interrupção nunca deixa arquivo pela metade.

## 11. Qualidade e testabilidade

### 11.1 Estratégia de testes

| Nível | O que cobre | Onde | Regras |
| --- | --- | --- | --- |
| Unitário de domínio | Funções puras: transições, deduplicação, aderência, lastro, score ATS, salário, faixas, diversidade, sanitização, canonização | Ao lado do código (`*.test.ts`) | Sem mocks. Tabelas de casos com `it.each`. Cobertura mínima de 90% em linhas e ramos |
| Unitário de aplicação | Casos de uso e etapas | Ao lado do código | Fakes das portas (`tests/apoio/fakes/`) e SQLite `:memory:` real no lugar de fake de repositório (mais fiel e menos código). Cobertura mínima de 80% |
| Integração de infra | Repositório e migrador sobre arquivo temporário, YAML com comentários, `GeradorEstruturadoClaude` com o executável falso, renderizador PDF, MCP, cliente HTTP com servidor local | `tests/integracao/` | Isolamento por diretório temporário. Sem rede externa |
| Contrato | `ConectorAts` (cada conector sobre as suas fixtures) e `FormularioAberto` | `tests/contratos/` | Uma suíte, executada para cada implementação |
| Arquitetura | Regras de fronteira entre camadas | `tests/arquitetura/` | ESLint (API `ESLint`) aplicado a trechos sintéticos que devem falhar e passar |
| Smoke manual | `outbox aplicar --simular` contra URLs reais | Checklist em `docs/convencoes.md` | Fora da automação |

Regras gerais:

- **Sem rede em testes.**
  - `tests/apoio/setup.ts` substitui `globalThis.fetch` por uma função que lança "rede bloqueada em testes", a menos que o teste injete um `ClienteHttp` fake.
  - Os testes com Playwright usam `page.route("**/*")` e negam por padrão o que não for fixture.
  - O `claude` é sempre o executável falso (`OUTBOX_CLAUDE_BIN`).
- **Determinismo.** Tempo via `RelogioFixo` e aleatoriedade via gerador injetável (cofre de credenciais). `retry` do Vitest desligado: teste instável é bug.
- **Builders.** `umaVaga()`, `umMaster()`, `umPerfil()`, `umaAnalise()` e `umPacote()` em `tests/apoio/builders.ts`, com padrões válidos e overrides parciais.
- **Fakes de porta.** `GeradorEstruturadoRoteirizado` (respostas por tarefa), `InteracaoRoteirizada` (respostas pré-programadas, que falha se receber uma pergunta não prevista), `ExecutorAgenteFake`, `CatalogoConectoresFake`, `NotificadorEspiao`, `RelogioFixo` e `RegistradorMemoria`.
- **Estilo.** Nomes de teste em PT, descrevendo comportamento (`"descarta a pendente mais antiga quando a chave coincide"`). Estrutura Arrange-Act-Assert. Um comportamento por teste. Snapshot só para saída de apresentadores da CLI.
- **Cobertura.** Medida com `@vitest/coverage-v8`. Limiares por glob em `vitest.config.ts`: `src/dominio/**` 90%, `src/aplicacao/**` 80% e global 70%. Conectores são medidos pelos contratos, não por percentual.

### 11.2 Verificação local e CI

- `npm run verificar` executa `tsc --noEmit`, `eslint .`, `prettier --check .`, `vitest run --coverage` e `npm audit --omit=dev --audit-level=high`.
- `.github/workflows/verificar.yml` roda o mesmo em `windows-latest` (a plataforma-alvo), com `npm ci` e `npx playwright install chromium`, a cada push e pull request.

### 11.3 Regras de lint obrigatórias

As regras usam ESLint flat config com `typescript-eslint` no preset `strictTypeChecked` e `projectService: true`.

- **Assincronia:** `@typescript-eslint/no-floating-promises`, `no-misused-promises` e `await-thenable`. São essenciais com Playwright, onde um `await` esquecido gera falha intermitente.
- **Tipos e exaustividade:** `switch-exhaustiveness-check` (status e motivos) e `no-explicit-any`. Use `unknown` com Zod.
- **Estilo de exportação:** `import/no-default-export`, via a regra nativa `no-restricted-exports` com `default`.
- **Fronteiras**, via `no-restricted-imports` por diretório:
  - `src/dominio/**`: proíbe `node:*`, `#aplicacao/*`, `#infra/*`, `#interfaces/*`, `#composicao` e qualquer pacote diferente de `zod`.
  - `src/aplicacao/**`: proíbe `node:*`, `#infra/*`, `#interfaces/*`, `#composicao` e qualquer pacote diferente de `zod`.
  - `src/infra/**`: proíbe `#interfaces/*` e `#composicao`.
  - `src/interfaces/**`: proíbe `#infra/*`.
  - Em todo `src/`: proíbe imports relativos que sobem mais de um nível (`../../*`). Entre módulos, usa-se `#camada/...`.
- **Formatação:** `eslint-config-prettier` desliga as regras de formatação, que ficam com o Prettier.

## 12. Segurança

### 12.1 Modelo de ameaças

| Ativo | Ameaça | Controle |
| --- | --- | --- |
| Dados pessoais e sensíveis (`curriculo/`, `dados/`) | Vazamento via git | `.gitignore` de `curriculo/`, `dados/` e `config.yaml`. Exemplos só em `curriculo.exemplo/`. `falhas/` versionado apenas depois de sanitizado |
| CPF, salário, diversidade e senhas | Envio ao LLM ou a logs | Classificação de dados (12.2). O código preenche esses campos, o `outbox-segredos` atende o agente e o registrador faz a redação |
| Navegador do usuário e sessões logadas | Injeção de prompt via descrição de vaga ou página maliciosa, levando o agente a navegar e preencher dados em outro site | Fronteira de confiança (12.3) e allowlist de hosts nas ferramentas sensíveis |
| Conta do LinkedIn | Restrição por automação | Uso só de leitura, sem Easy Apply. Nenhuma evasão de detecção nem resolução de CAPTCHA |
| Máquina do usuário | Pacote npm malicioso (supply chain) | Lockfile versionado, `npm ci`, `ignore-scripts=true`, versões exatas de `playwright` e `@playwright/mcp`, `npm audit` no `verificar` e lista mínima de dependências (seção 14) |
| Painel (v2) | DNS rebinding e CSRF a partir do navegador | Bind em `127.0.0.1`, allowlist do cabeçalho `Host`, checagem de `Origin` e `HX-Request` nos POST, CSP restritiva e escape automático (v2) |
| Render do PDF | Script injetado em texto gerado | Escape HTML de todo texto, contexto Playwright com `javaScriptEnabled: false` e bloqueio de toda requisição de rede no render |

### 12.2 Classificação de dados

| Classe | Dados | Pode ir ao LLM | Log e `falhas/` | Git |
| --- | --- | --- | --- | --- |
| Sensível | `perfil.documentos`, `perfil.salario`, `perfil.diversidade`, endereço completo (logradouro, número, complemento, CEP), senhas | Nunca | Nunca. Redigido e omitido | Nunca |
| Pessoal | `master` (nome, contato, histórico), `perfil.preferencias`, `disponibilidade`, `autorizacaoTrabalho`, cidade/UF/país, respostas não sensíveis | Sim, quando necessário à tarefa | Strings de contato redigidas | Nunca |
| Pública | Dados da vaga | Sim, marcados como não confiáveis | Sim | Sim (só em fixtures e falhas sanitizadas) |

`RespostaSugerida` tem `sensivel: boolean`, que é verdadeiro para as categorias `documento`, `salario` e `diversidade`. Respostas sensíveis nunca entram em prompt: o agente as preenche pela ferramenta `preencher_resposta_protegida` do `outbox-segredos`, que lê o valor de `dados/vagas/<id>/respostas.json`.

### 12.3 Fronteira de confiança e injeção de prompt (ADR-012)

- **Conteúdo externo como dado.** Todo conteúdo externo (descrição da vaga, texto ou HTML de página, issue do GitHub) entra nos prompts dentro de `<conteudo_nao_confiavel origem="...">…</conteudo_nao_confiavel>`, com a instrução fixa de tratá-lo como dado e ignorar instruções contidas nele.
- **Saída do LLM nunca é executada.** Ela é sempre validada por schema e, no caso do currículo, também pelo lastro.
- **Ferramentas do agente.** O agente roda com `--allowedTools` explícito: só as ferramentas do Playwright MCP necessárias para navegar, clicar, digitar, selecionar, fazer snapshot, enviar arquivo e trocar de aba, e as ferramentas do `outbox-segredos`. Ferramentas de execução de JavaScript arbitrário do Playwright MCP (avaliação de script) ficam de fora. Os nomes exatos são verificados contra a versão fixada.
- **Allowlist de hosts.** O `outbox-segredos` recebe `OUTBOX_HOSTS_PERMITIDOS` (o host da URL resolvida mais os padrões de host do motor, como `*.myworkdayjobs.com` para o tenant da vaga) e `OUTBOX_VAGA_ID`. Ele recusa preencher senha, documento ou resposta protegida quando a página alvo está fora da allowlist.
- **Restrição de navegação.** Se a versão fixada do Playwright MCP suportar restrição de origens, a mesma allowlist mais os domínios de login comuns do motor é aplicada à navegação.
- **Risco residual aceito.** Uma injeção pode levar o agente a clicar no botão de envio antes da revisão. A mitigação é a instrução do prompt mais o resumo de revisão. O impacto é limitado a uma candidatura enviada antes da hora, com os dados corretos.

### 12.4 Segredos e credenciais

- `dados/credenciais.json` guarda senhas geradas por tenant (20 caracteres, `crypto.randomInt`) em texto puro, num diretório local fora do git.
- O modelo de ameaças assume uma máquina pessoal. O README recomenda criptografia de disco (BitLocker).
- Nenhuma senha aparece em retorno de ferramenta MCP, log ou prompt.

## 13. Desempenho

- **Inicialização rápida.** A composição cria a infra de forma preguiçosa (getters), e `playwright`, `mammoth` e `node-notifier` são importados dinamicamente dentro das implementações. Comandos como `status`, `retorno` e `falhas` não carregam Playwright.
- **Um navegador headless por execução** de `preparar`, com um contexto isolado por vaga, fechado ao final da vaga. O render de PDF reusa o mesmo navegador num contexto sem JavaScript.
- **SQLite:**
  - WAL e `busy_timeout=5000`.
  - Statements preparados criados uma vez por instância do repositório.
  - Índices para todas as consultas por URL, chave, status, `enviada_em`, `vaga_id` e `para_status`.
  - Listagens numa única consulta, sem N+1.
- **HTTP:**
  - `fetch` nativo com `AbortSignal.timeout(15000)`.
  - Até 2 novas tentativas com backoff exponencial (500 ms e 1500 ms) para 429 e 5xx, respeitando `Retry-After`.
  - Rate limit do GitHub vira `ErroHttp` com uma mensagem clara.
- **LLM.** Entre 2 e 3 chamadas por vaga no fluxo normal. O banco de respostas reduz perguntas novas. Não há cache de LLM nesta versão (YAGNI).
- **Paralelismo.** Limitado (`preparar.paralelo`, padrão 2) para respeitar a cota da assinatura e a memória do navegador.

## 14. Política de dependências

Regras:

- Uma dependência entra só com justificativa nesta tabela.
- Prefira a API nativa do Node quando ela resolver sem custo relevante.
- `package-lock.json` é versionado e instalações usam `npm ci`.
- `.npmrc` contém `engine-strict=true`, `save-exact=true` e `ignore-scripts=true`.
- `engines.node` é `>=24`.
- Versões exatas (sem `^`) para todas as dependências, por causa do `save-exact`. Atualização deliberada, com `npm outdated` mensal e changelog lido.

| Dependência | Tipo | Por que | Alternativa considerada |
| --- | --- | --- | --- |
| `playwright` | execução | Automação de navegador (conectores, leitor, PDF) | Puppeteer: menos recursos de fixture e roteamento |
| `@playwright/mcp` | execução | Ferramentas de navegador para o agente via CDP | Implementar ferramentas próprias: custo alto |
| `@modelcontextprotocol/sdk` | execução | Servidor MCP `outbox-segredos` | Protocolo à mão: propenso a erro |
| `zod` (v4) | execução | Schemas, tipos e `z.toJSONSchema` para os prompts | Validação manual: duplicaria tipos e schemas |
| `yaml` | execução | Leitura e edição de YAML **preservando comentários** | `js-yaml`: perde comentários |
| `commander` | execução | Subcomandos, ajuda e validação de flags | `node:util.parseArgs`: sem subcomandos nem ajuda |
| `@inquirer/prompts` | execução | Menus e perguntas da revisão | `node:readline`: menus feitos à mão |
| `cross-spawn` | execução | Executar `claude` no Windows (shims `.cmd`) com segurança, sem `shell: true` | `spawn` com shell: risco de escape de argumentos |
| `open` | execução | Abrir PDF e painel no aplicativo padrão | `cmd /c start`: só Windows, escape frágil |
| `node-notifier` | execução | Toast do Windows com evento de clique (v2) | PowerShell com WinRT: sem clique. Isolado na porta `Notificador`, troca simples |
| `mammoth` | execução | Texto de `.docx` no `importar` | Converter à mão: inviável |
| `typescript`, `@types/node`, `@types/cross-spawn`, `@types/node-notifier` | desenvolvimento | Checagem de tipos (`tsc --noEmit`) | — |
| `vitest`, `@vitest/coverage-v8` | desenvolvimento | Testes com TypeScript nativo, fakes, cobertura por glob | `node:test`: cobertura e mocks menos práticos |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-prettier` | desenvolvimento | Lint com tipos e fronteiras | Biome: regras type-aware limitadas (sem equivalente completo a `no-floating-promises`) |
| `prettier` | desenvolvimento | Formatação única | — |
| `pdfjs-dist` | desenvolvimento | Extrair texto do PDF nos testes | — |

Removidos em relação à spec anterior:

- `tsx`: substituído pela execução nativa do Node 24 (ADR-004).
- `picocolors`: substituído por `node:util.styleText`.

## 15. Evolução

### 15.1 Receitas de extensão

- **Novo conector ATS.**
  1. Criar `src/infra/conectores/<motor>/conector.ts` implementando `ConectorAts`.
  2. Registrar no catálogo.
  3. Garantir que o motor esteja em `dominio/vagas/motores.ts`.
  4. Capturar fixtures com `npm run capturar-fixture`.
  5. Adicionar o motor à suíte de contrato.
  6. Atualizar `docs/como-adicionar-conector.md`, se o processo mudar.

  Nenhum caso de uso muda.
- **Novo provedor de LLM.** Implementar `GeradorEstruturado` e `ExecutorAgente` (por exemplo, com `@anthropic-ai/sdk`) e trocar a escolha na composição por uma chave de config.
- **Novo comando.** Criar o caso de uso em `aplicacao/casos-de-uso/`, o comando em `interfaces/cli/comandos/` e os testes.
- **Nova coluna ou tabela.** Criar uma nova migração `NNNN-descricao.sql`. Nunca editar uma migração já publicada.
- **Novo canal de notificação.** Implementar `Notificador` e escolher na composição.

### 15.2 Não construir agora (YAGNI)

- Cache de LLM.
- Fila persistente ou worker em segundo plano.
- Plugins carregados dinamicamente.
- Internacionalização da interface.
- Multiusuário.
- Criptografia do cofre.
- Abstração genérica de "site" acima de `ConectorAts`.
- API HTTP pública.

## 16. Convenções

### 16.1 Idioma (ADR-003)

Tudo em português, sem acentos e sem cedilha em identificadores:

- Pastas, arquivos, tipos, funções, variáveis, constantes, tabelas, colunas, valores de enum, comandos e flags da CLI, chaves de config e nomes de prompts.
- Texto para humanos (mensagens, docs, comentários, nomes de teste) em PT-BR com acentuação normal.

Exceções (nomes impostos por ferramentas ou padrões):

- Scripts npm `test` e `lint`.
- Campos do `package.json`.
- `README.md`.
- Tipos do Conventional Commits.
- Métodos e cabeçalhos HTTP.
- Palavras-chave SQL.
- APIs de bibliotecas.

### 16.2 Nomenclatura

| Elemento | Convenção | Exemplo |
| --- | --- | --- |
| Pastas e arquivos | kebab-case (evita conflitos de caixa no Windows e no git) | `preparar-vagas.ts`, `repositorio-vagas-sqlite.ts` |
| Tipos, interfaces e classes | PascalCase, sem prefixo `I` | `RepositorioVagas`, `CurriculoGerado` |
| Implementação de porta | `<Porta><Tecnologia>` | `RepositorioVagasSqlite`, `NotificadorWindows` |
| Funções e variáveis | camelCase. Funções com verbo no infinitivo | `calcularAderencia`, `vagaAtual` |
| Booleanos | prefixos `eh`, `tem`, `deve`, `pode` | `ehRemota`, `temCarta` |
| Constantes de módulo | UPPER_SNAKE | `TRANSICOES_VALIDAS`, `PADROES_MOTOR` |
| Enum-like | objeto `as const` com valores UPPER_SNAKE e tipo união derivado. **Sem `enum` do TS** (não é sintaxe apagável) | `STATUS.NOVA`, `type Status = (typeof STATUS)[keyof typeof STATUS]` |
| Erros | `Erro<Nome>` | `ErroTransicaoInvalida`, `ErroLimiteUso` |
| Casos de uso | verbo mais substantivo, com `Deps<Nome>` e `Entrada<Nome>` | `prepararVagas(deps: DepsPrepararVagas, entrada: EntradaPrepararVagas, sinal)` |
| Testes | `<arquivo>.test.ts` | `aderencia.test.ts` |
| Tabelas e colunas | snake_case, tabelas no plural | `vagas.url_canonica`, `respostas_enviadas` |
| Prompts | `prompts/<tarefa>.md` em kebab-case | `prompts/analisar-vaga.md` |
| Branches e commits | `feat/<descricao>`. Conventional Commits com escopo e descrição em PT | `feat(conectores): adiciona conector do greenhouse` |

### 16.3 Código

- **Módulos.** Só ESM, e só **exports nomeados**.
- **Imports.** Entre módulos, por subpath (`#dominio/vagas/status.ts`), sempre com a extensão `.ts`. Tipos com `import type` (exigido por `verbatimModuleSyntax`).
- **Classes.** Ficam na infra, quando há estado ou ciclo de vida (`fechar()`). Domínio e aplicação usam funções e tipos.
- **Parâmetros de construtor.** Sem *parameter properties* (`constructor(private x)`), que não são sintaxe apagável.
- **Tamanho.** Funções com até 40 linhas como orientação, e arquivos com mais de 300 linhas pedem divisão.
- **Comentários.** Explicam o porquê, não o quê. JSDoc obrigatório só em portas, casos de uso e funções públicas do domínio.
- **Datas.** ISO 8601 com offset (`2026-10-09T14:03:00-03:00`), sempre obtidas de `Relogio`.
- **Caminhos.** Sempre com `node:path`. Nunca concatenar com `/` ou `\`.
- **Formatação.** `.editorconfig` com UTF-8, LF, indentação de 2 espaços e newline final. `.gitattributes` com `* text=auto eol=lf`. Prettier com padrões e `printWidth: 100`.

### 16.4 Prompts

- **Formato.** Arquivo Markdown com front-matter `---\nversao: <inteiro>\n---` e as seções `# Tarefa`, `# Regras` e `# Entrada`.
- **Variáveis.** No formato `{{chave}}`. Uma variável ausente lança erro.
- **Instrução de saída.** O `GeradorEstruturado` acrescenta automaticamente a instrução de saída e o JSON Schema gerado por `z.toJSONSchema(schema)`, então o prompt não repete o schema.
- **Rastreabilidade.** A `versao` do prompt é registrada em cada log de chamada. Mudou o comportamento, incrementa a versão.

### 16.5 Documentação

- **`README.md`:** instalação, uso diário e avisos de privacidade.
- **`docs/arquitetura.md` e `docs/convencoes.md`:** versões vivas deste documento.
- **`docs/adr/NNNN-titulo.md`:** formato Contexto, Decisão, Alternativas e Consequências, com status Aceita, Substituída por NNNN ou Obsoleta. Uma decisão que muda camada, dependência, padrão, formato de dados ou política de segurança exige uma ADR nova. ADRs não são editadas depois de aceitas, só substituídas.
- **`docs/spikes/`:** resultados de investigação.
- **`docs/como-adicionar-conector.md`:** passo a passo da seção 15.1.

### 16.6 Definição de pronto (por tarefa)

1. Os critérios de aceite da tarefa estão validados.
2. `npm run verificar` passa.
3. Há testes novos no nível certo (seção 11.1).
4. Não há `TODO` sem explicação.
5. A documentação foi atualizada, com ADR nova se a mudança for arquitetural.
6. Nenhum dado pessoal entrou em arquivo versionado.

## 17. Registro de decisões arquiteturais (ADR)

### ADR-001: hexagonal enxuto em quatro camadas

- **Contexto.** Integrações voláteis (ATS, LLM, navegador) convivem com regras que precisam de testes confiáveis. A spec anterior misturava regra e IO no mesmo módulo (por exemplo, `analisar.ts` gravava no banco e `tailoring.ts` chamava o LLM, renderizava e gravava arquivos).
- **Decisão.** Camadas `dominio`, `aplicacao` (portas, etapas, casos de uso), `infra` e `interfaces`, mais a raiz de composição, com dependências apontando para dentro.
- **Alternativas.**
  - Estrutura plana por módulo técnico (a spec anterior): acoplamento e testes dependentes de IO.
  - Clean Architecture completa, com entidades ricas, presenters e DTOs por camada: cerimônia excessiva para uma CLI pessoal.
  - Vertical slices por funcionalidade: a infra compartilhada (navegador, LLM, banco) ficaria duplicada ou espalhada entre fatias.
- **Consequências.**
  - Positivas: regras testáveis sem mock, troca de LLM e de conectores sem tocar nas regras, painel da v2 reusando casos de uso.
  - Negativas: mais arquivos e a indireção das portas, mitigadas pela regra de só criar uma porta quando há IO real.

### ADR-002: camada no topo, contexto de negócio dentro

- **Contexto.** Era preciso escolher entre agrupar primeiro por camada ou primeiro por funcionalidade.
- **Decisão.** O primeiro nível é a camada (`dominio`, `aplicacao`, `infra`, `interfaces`). Dentro do domínio, a divisão é por contexto (`vagas`, `curriculo`, `analise`, `respostas`, `falhas`). Dentro da infra, por tecnologia ou integração.
- **Alternativas.** Feature-first (`modulos/<contexto>/{dominio,aplicacao,infra}`): a fronteira de camada fica implícita e a regra de lint é mais difícil de escrever.
- **Consequências.** As regras de fronteira viram padrões simples de import, e um conector novo afeta só `infra/conectores/`.

### ADR-003: idioma único em português ASCII

- **Contexto.** A spec anterior misturava comandos em inglês (`import`, `add`, `prepare`, `apply`) e em português (`retorno`, `falhas`, `navegador`).
- **Decisão.** Tudo em português sem acento (seção 16.1), por escolha do usuário. A linguagem do domínio é idêntica no código.
- **Alternativas.**
  - Código em inglês com interface em PT: exige uma camada de tradução de termos.
  - Código em inglês com comandos em PT: mistura.
- **Consequências.** Não há tradução entre negócio e código. As APIs de bibliotecas continuam em inglês, o que é inevitável e aceito.

### ADR-004: TypeScript executado nativamente pelo Node 24, sem build

- **Contexto.** O projeto é uma CLI local e não precisa de bundle. A spec anterior usava `tsx`.
- **Decisão.**
  - O Node 24 executa `.ts` por *type stripping*.
  - `tsconfig` com `erasableSyntaxOnly`, `verbatimModuleSyntax`, `allowImportingTsExtensions` e `noEmit`.
  - `tsc` só checa tipos.
- **Alternativas.**
  - `tsx`: uma dependência a mais e um loader esbuild em tempo de execução.
  - Build com `tsc` para `dist/`: etapa extra e risco de executar código desatualizado.
- **Consequências.**
  - Proibidos `enum`, `namespace` e parameter properties, todos substituíveis.
  - Imports com a extensão `.ts`.
  - JSX não é suportado, então o painel da v2 usa o template literal `html` do Hono.
  - Se a versão instalada do Node exigir uma flag ou emitir um aviso, `bin/outbox.js` trata isso (T1 verifica). Se houver bloqueio real, o fallback documentado é `tsx`.

### ADR-005: imports por subpath e fronteiras verificadas por lint

- **Contexto.** As regras de camada só se sustentam se forem verificadas automaticamente.
- **Decisão.** O campo `imports` do `package.json` define `#dominio/*`, `#aplicacao/*`, `#infra/*`, `#interfaces/*`, `#composicao` e `#testes/*`, um recurso nativo do Node e do TypeScript `nodenext`. O ESLint usa `no-restricted-imports` por diretório (seção 11.3), e há um teste de arquitetura.
- **Alternativas.**
  - `paths` do tsconfig: o Node não os resolve sem loader.
  - `dependency-cruiser` ou `eslint-plugin-boundaries`: mais uma dependência para regras que cabem em `no-restricted-imports`.
- **Consequências.** Imports legíveis, fronteiras quebradas falham no `verificar`, e nenhuma dependência nova.

### ADR-006: injeção manual com raiz de composição preguiçosa

- **Contexto.** Os casos de uso precisam de portas reais em produção e de fakes em teste.
- **Decisão.**
  - `criarContainer(config)` em `src/composicao.ts` expõe getters preguiçosos (a infra só é instanciada no primeiro acesso) e funções que já entregam os casos de uso com as dependências.
  - `encerrar()` fecha o banco e os navegadores headless.
  - Os testes montam as dependências diretamente com fakes.
- **Alternativas.**
  - tsyringe ou inversify: decorators incompatíveis com o ADR-004.
  - Singletons importados diretamente pelos módulos: acoplamento e testes com mocks de módulo.
- **Consequências.** Inicialização rápida (seção 13) e dependências explícitas.

### ADR-007: casos de uso como funções com dependências estreitas

- **Contexto.** Era preciso uma forma uniforme e testável para casos de uso e etapas.
- **Decisão.** Cada caso de uso tem a forma `async function nome(deps: DepsNome, entrada: EntradaNome, sinal: AbortSignal): Promise<SaidaNome>`. `DepsNome` usa `Pick<Porta, ...>`.
- **Alternativas.**
  - Classes com `executar()`: estado desnecessário, `this` e parameter properties proibidas pelo ADR-004.
  - Funções que importam dependências globais: impossíveis de testar sem mock de módulo.
- **Consequências.** Testes simples (passar um objeto `deps`), ISP aplicado em cada assinatura e nada de estado escondido.

### ADR-008: persistência com `node:sqlite`, repositório síncrono do agregado, tabelas STRICT e migrações

- **Contexto.** O CLI e o painel (v2) escrevem ao mesmo tempo, e o schema vai evoluir entre versões.
- **Decisões.**
  - **Banco.** `DatabaseSync` (`node:sqlite`) com WAL e `busy_timeout=5000`.
  - **Repositório.** Um `RepositorioVagas` **síncrono** para o agregado Vaga, com `transacao(fn)` usando `BEGIN IMMEDIATE`, que adquire o lock de escrita logo no início e torna atômica a sequência ler-decidir-escrever entre processos.
  - **Tabelas.** `STRICT` (tipos verificados pelo SQLite).
  - **Valores de enum.** Validados por Zod no repositório, sem `CHECK` (que exigiria recriar a tabela a cada status novo).
  - **Migrações.** Arquivos `src/infra/banco/migracoes/NNNN-descricao.sql`, aplicadas em ordem, cada uma numa transação, conforme `PRAGMA user_version`.
- **Alternativas.**
  - `better-sqlite3`: dependência nativa.
  - ORM (Drizzle, Prisma) ou Kysely: build ou camada extra para 4 tabelas.
  - `CREATE TABLE IF NOT EXISTS` sem versão (a spec anterior): não evolui o schema de bancos existentes.
  - Atomicidade por "não usar `await` entre ler e escrever" (a spec anterior): frágil e sem efeito entre processos.
- **Consequências.**
  - Uma futura troca para armazenamento assíncrono exigiria revisar a porta, o que é aceitável (YAGNI).
  - Se o Node emitir `ExperimentalWarning` para o SQLite, o `bin/outbox.js` filtra só esse aviso.

### ADR-009: erros como exceções tipadas

- **Contexto.** A spec anterior não definia uma estratégia de erros: onde capturar, como mapear para status e quais códigos de saída usar.
- **Decisão.** Hierarquia única `ErroOutbox` (seção 10.1). O erro é capturado por vaga nos casos de uso em lote e mapeado para código de saída na CLI.
- **Alternativas.** `Result` ou `Either` (neverthrow): ruído de tipos em toda assinatura e uma dependência a mais.
- **Consequências.** Fluxo feliz legível. O `switch-exhaustiveness-check` cobre o mapeamento erro→motivo quando os códigos são uniões.

### ADR-010: conectores ATS com Strategy, catálogo e handle comum

- **Contexto.** Há 8 ATS determinísticos, o fallback agêntico e uma política de fallback que é regra de negócio.
- **Decisão.**
  - `ConectorAts` por motor, registrado em `CatalogoConectores`.
  - Conectores e agente devolvem um `FormularioAberto`.
  - A aplicação decide a rota e o fallback.
  - Reuso por utilitários compostos em `conectores/base/` (campos, passo, handle Playwright).
  - Cada conector tem `versao` em semver.
  - O antigo termo "adaptador" para ATS passa a se chamar **conector**, para não colidir com "adaptador" do hexagonal.
- **Alternativas.**
  - Classe base com Template Method: hierarquia frágil.
  - Conectores decidindo o fallback sozinhos: regra de negócio espalhada pela infra.
- **Consequências.** Um ATS novo entra sem mudar a aplicação. A suíte de contrato garante a substituibilidade (LSP).

### ADR-011: LLM com portas separadas, schema único e prompts versionados

- **Contexto.** Há usos de natureza diferente: geração estruturada (análise, tailoring, respostas, importação) e agente (navegação). Os schemas precisam aparecer no prompt e na validação.
- **Decisões.**
  - Portas `GeradorEstruturado` e `ExecutorAgente`.
  - JSON Schema gerado com `z.toJSONSchema` a partir do mesmo schema Zod que valida a saída.
  - Prompts em `prompts/*.md` com `versao`.
  - Toda chamada de LLM para texto parte da camada de aplicação, e o agente encapsula o LLM dentro da infra.
- **Alternativas.**
  - Uma interface `LlmClient` com os dois métodos (a spec anterior): viola ISP.
  - Schema escrito à mão no prompt: diverge do validador.
- **Consequências.** Trocar de provedor implica implementar duas portas, e mudanças de prompt ficam rastreáveis nos logs.

### ADR-012: fronteira de confiança para conteúdo externo

- **Contexto.** A descrição da vaga e as páginas são controladas por terceiros, e o agente opera um navegador com sessões logadas e ferramentas de segredo. A spec anterior também passava ao agente respostas sugeridas que incluíam salário e diversidade.
- **Decisão.**
  - Os controles da seção 12.3.
  - Respostas sensíveis preenchidas por ferramenta protegida.
  - Allowlist de hosts no `outbox-segredos`.
- **Alternativas.** Confiar só na instrução do prompt: insuficiente contra injeção.
- **Consequências.** Dado sensível fora do LLM e exfiltração bloqueada por host. O risco residual (envio antecipado) está documentado.

### ADR-013: ferramentas de qualidade

- **Contexto.** Era preciso garantir tipos, lint, formatação e testes de forma consistente.
- **Decisão.**
  - TypeScript `strict` com `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` e `noImplicitOverride`.
  - ESLint com `typescript-eslint` `strictTypeChecked`.
  - Prettier.
  - Vitest com cobertura v8 e limiares por camada.
  - CI no Windows.
- **Alternativas.**
  - Biome: sem cobertura completa de regras com tipo.
  - `node:test`: menos ergonômico para fakes e cobertura por glob.
- **Consequências.** Quatro dependências de desenvolvimento a mais, compensadas pela prevenção de falhas assíncronas e pelas fronteiras verificadas.

### ADR-014: logging mínimo com redação

- **Contexto.** É preciso diagnosticar conectores e o LLM sem vazar PII.
- **Decisão.** Porta `Registrador` com implementação própria (terminal mais JSONL diário em `dados/logs/`) e redação obrigatória (seção 10.3).
- **Alternativas.** `pino`: recursos (transports, performance) desnecessários para uma CLI local.
- **Consequências.** Cerca de 60 linhas de código próprio e redação centralizada.

### ADR-015: configuração com padrões no schema

- **Contexto.** Na spec anterior, o `config.yaml` versionado misturava padrões com ajustes pessoais.
- **Decisão.** Padrões no schema Zod. `config.yaml` local, opcional e fora do git. `config.exemplo.yaml` documentado e verificado por teste.
- **Alternativas.**
  - Config versionado: ajustes pessoais sujam o git.
  - Só variáveis de ambiente: ruins para estruturas aninhadas.
- **Consequências.** Fonte única dos padrões e documentação que não diverge do código.

### ADR-016: execução exclusiva por comando e cancelamento cooperativo

- **Contexto.** Dois `preparar` simultâneos processariam as mesmas vagas, e um Ctrl+C no meio do lote deixava efeitos parciais.
- **Decisão.**
  - Trava de arquivo por comando (`preparar` e `aplicar`).
  - `AbortSignal` propagado até as portas de longa duração.
  - Efeitos persistidos só ao fim de cada etapa.
  - `tentativas_preparo` incrementado só em ERRO_PREPARO.
  - Escrita atômica.
- **Alternativas.**
  - Status intermediário `PREPARANDO` com reclamação de linhas: mais estados e recuperação de órfãos.
  - Nenhum controle: corrida e dados parciais.
- **Consequências.** Comportamento previsível sob interrupção, sem estado novo na máquina de status.

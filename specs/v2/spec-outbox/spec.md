# Outbox v2: painel local e métricas

**Data:** 2026-10-09 | **Card:** sem card | **Status:** Rascunho (revisão 2: arquitetura)

---

## 1. Contexto e Objetivo

A v1 (`specs/v1/spec-outbox/spec.md`) entrega o CLI que prepara e aplica candidaturas com currículo camaleão, com o estado em `dados/outbox.db`. A arquitetura está em `specs/v1/spec-outbox/arquitetura.md`, que é **normativa também para a v2**.

A v2 adiciona o comando `outbox painel`: um servidor local (Hono com htmx, sem build) para:

- Acompanhar a fila e o histórico.
- Executar três ações leves: adicionar URLs, descartar e marcar retorno.
- Ver duas métricas: o funil por canal e por ATS, e a conversão por faixa de score ATS, de aderência e de idioma.

O objetivo é responder se o camaleão e o corte de aderência estão funcionando, sem tirar a revisão do fluxo terminal + navegador da v1. A v2 também faz o clique no toast abrir o painel.

Na arquitetura, a v2 é só uma nova interface (`src/interfaces/web/`), uma porta de consulta, quatro casos de uso e o domínio de métricas. Nenhuma regra da v1 é duplicada.

## 2. Premissas

- A v1 está implementada: schema da migração `0001-inicial.sql` (com `canal`, `motor` resolvido, `enviada_em` e os índices de métricas), casos de uso `adicionarVagas`, `registrarRetorno` e `listarFalhas`, e as constantes `STATUS_*` e `ETAPAS_ENTREVISTA` em `src/dominio/vagas/status.ts`.
- O painel roda na mesma máquina e é acessado só pelo usuário, em `127.0.0.1`.
- O painel e os comandos da v1 escrevem ao mesmo tempo no banco. WAL, `busy_timeout` e transações `BEGIN IMMEDIATE` (ADR-008) bastam.
- O volume é de centenas a poucos milhares de candidaturas. Agregar em TypeScript as linhas filtradas por SQL responde em milissegundos.
- `node-notifier` no Windows emite `click` quando a notificação é criada com `wait: true`.

## 3. Decisões

### 3.1 Produto

| Decisão | Motivo | Alternativas descartadas |
| --- | --- | --- |
| O painel é de acompanhamento, com ações leves. Revisão e envio continuam no terminal e no navegador do Outbox | Escolha do usuário. O formulário já está no navegador | Painel que substitui o terminal; relatório HTML estático |
| Ações: adicionar URLs, descartar (NOVA, PRONTA ou ERRO_PREPARO para DESCARTADA `manual`) e marcar retorno | Escolha do usuário | Editar master ou perfil; reabrir; disparar `preparar` |
| Métricas: funil por canal, por ATS e por mês, e conversão por faixa de score ATS, de aderência e de idioma | Escolha do usuário | Métricas operacionais; A/B |
| "Com resposta" = status atual em `STATUS_COM_RESPOSTA`. "Entrevista" = algum evento EM_PROCESSO com etapa em `ETAPAS_ENTREVISTA`, ou algum evento OFERTA. "Oferta" = algum evento OFERTA | Definições objetivas a partir de `eventos`, sem perder histórico | Usar só o status atual |
| Faixas ATS (`ats_depois`): 0–49, 50–69, 70–84, 85–100 e "sem score". Faixas de aderência: abaixo de 60 (forçadas), 60–69, 70–79, 80–89, 90–100. Grupos com menos de 5 enviadas recebem o selo "amostra pequena" | Legibilidade e honestidade estatística | Faixas de 10 em 10; esconder amostras pequenas |
| Taxas em tabelas HTML com barra em CSS, sem biblioteca de gráficos | Sem build nem dependência | Chart.js; ECharts |
| O clique no toast abre o painel. Um processo auxiliar destacado espera o clique por 30 s. O servidor iniciado por ele encerra após 60 min sem requisições | O terminal não fica travado e não sobra um servidor eterno | O CLI esperar o clique; servidor sem expiração |

### 3.2 Arquitetura (ADRs da v2, complementando os ADR-001 a ADR-016)

| ADR | Decisão | Motivo | Alternativas descartadas |
| --- | --- | --- | --- |
| ADR-017 | Painel com Hono (`hono` + `@hono/node-server`), HTML renderizado no servidor com o template literal `html` do Hono (escape automático) e htmx servido localmente | Sem build e compatível com a execução nativa de TS (sem JSX, ADR-004). O escape automático reduz XSS. Funciona offline | Vite + React; `node:http` puro; JSX do Hono (exige transformação) |
| ADR-018 | Leituras do painel por uma porta de consulta própria (`ConsultasAcompanhamento`): o SQL filtra e calcula indicadores por linha, e o domínio (`acompanhamento`) agrega por faixa e calcula as taxas | Mantém as definições de métrica no domínio (testáveis sem banco) e o SQL simples. Mesmo banco, sem modelo separado (não é CQRS) | Agregar tudo em SQL (regras de faixa espalhadas no SQL); estender o `RepositorioVagas` com consultas de leitura (porta grande demais, violando ISP) |
| ADR-019 | Proteções do painel: bind em `127.0.0.1`, allowlist do cabeçalho `Host`, `Origin` e `HX-Request` obrigatórios nos POST, CSP restritiva sem script ou estilo inline, `Cache-Control: no-store` e allowlist de artefatos servidos | Impede DNS rebinding, CSRF e XSS e evita cache de páginas com PII | Só `HX-Request` (a revisão 1); autenticação (desnecessária com bind local e `Host` validado) |

## 4. Glossário

- **Canal**: a coluna `vagas.canal`, o motor detectado na URL de entrada (por exemplo, `linkedin`).
- **ATS**: a coluna `vagas.motor`, o motor resolvido onde a candidatura é feita.
- **Enviada (métricas)**: uma vaga com `enviada_em` preenchido dentro do período.
- **Com resposta**: uma enviada cujo status atual está em `STATUS_COM_RESPOSTA`.
- **Amostra pequena**: um grupo com menos de `AMOSTRA_MINIMA` (5) enviadas.
- **Linha de métrica**: uma linha por vaga enviada, com as dimensões (canal, motor, mês, idioma, ATS depois, aderência) e os indicadores (resposta, entrevista, oferta) calculados no SQL.

## 5. Fora do Escopo

- Revisar, editar ou enviar candidaturas pelo painel.
- Disparar `preparar`, `aplicar` ou `importar` pelo painel.
- Editar `master.yaml`, `perfil.yaml` ou `respostas.yaml`.
- Reabrir vagas PULADA ou DESCARTADA. Continua via `outbox adicionar`.
- Métricas operacionais e A/B.
- Leitura de e-mail e expiração automática.
- Acesso remoto, autenticação e bind fora de `127.0.0.1`.
- Bibliotecas de gráficos, frameworks de frontend e JSX.

## 6. Contrato de Aceite

| ID | Critério | Como validar | Tarefas |
| --- | --- | --- | --- |
| AC1 | `outbox painel` sobe o servidor em `127.0.0.1:<painel.porta>` (padrão 4321) e abre o navegador padrão. Com o servidor já rodando (`/saude` igual a `{ app: "outbox" }`), só abre o navegador. Com a porta ocupada por outro processo, mostra erro e sai com código 1 | Testes de `abrirPainel` com servidor real em porta efêmera e com um servidor fake ocupando a porta; verificação de que o socket escuta só em `127.0.0.1` | T3 |
| AC2 | A fila mostra os 4 grupos com as colunas especificadas e atualiza o fragmento a cada 10 s. O detalhe mostra dados, scores, requisitos, gaps, respostas enviadas (sensíveis como "protegido"), eventos e artefatos da allowlist. Qualquer outro nome de arquivo ou tentativa de path traversal retorna 404 | `app.request()` sobre a composição de teste (SQLite `:memory:` semeado e pasta temporária de artefatos) | T2, T4 |
| AC3 | Adicionar URLs produz o mesmo resultado de `outbox adicionar`. Descartar transiciona NOVA, PRONTA ou ERRO_PREPARO para DESCARTADA `manual`. Marcar retorno aplica as mesmas validações de `outbox retorno`, com o erro exibido no fragmento (HTTP 422) | Testes de rota comparando com os casos de uso da v1 | T2, T5 |
| AC4 | O funil (canal, ATS e mês) e a conversão (faixa ATS, faixa de aderência e idioma) batem com os valores esperados de um dataset fixo. O filtro de período (30, 90, 365 dias ou tudo) funciona. Grupos com menos de 5 enviadas são marcados. Todas as faixas aparecem, mesmo com zero | Unitários de `agregarFunil` e `agregarConversao` (domínio); integração de `ConsultasAcompanhamentoSqlite` com o dataset | T1, T2, T6 |
| AC5 | A página de falhas mostra os mesmos grupos e o mesmo ranking de `outbox falhas` (o mesmo caso de uso `listarFalhas`) | Teste de rota sobre uma pasta `falhas/` temporária | T6 |
| AC6 | O toast do `preparar` não bloqueia o CLI. Clicar abre o painel e inicia o servidor em segundo plano se necessário. O servidor iniciado assim encerra após 60 min sem requisições | Teste do processo auxiliar com `node-notifier` mockado emitindo `click`; teste do encerramento por ociosidade com `Relogio` fake | T3, T7 |
| AC7 | Segurança: requisição com `Host` fora da allowlist recebe 403. POST sem `HX-Request: true` ou com `Origin` diferente recebe 403. Todas as respostas HTML trazem a CSP de §T3, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` e `Cache-Control: no-store`. Texto vindo do banco com `<script>` aparece escapado | Testes de middleware e de rota com `app.request()` | T3, T4 |
| AC8 | O painel roda sem build (`npm run outbox -- painel`). Nenhuma página referencia recursos externos, nem tem script ou estilo inline | Teste que varre o HTML renderizado (sem `http` em `src`/`href`, sem `<script>` com conteúdo, sem atributo `style` ou `hx-on`) | T3, T4, T6 |
| AC9 | Escritas simultâneas do painel e de um comando da v1 não perdem atualização | Integração com duas conexões ao mesmo arquivo temporário, uma via `registrarRetorno` e outra via `transicionar` | T5 |

## 7. Tarefas

| Tarefa | Objetivo | Arquivos/Áreas | Depende de | Pode paralelizar com | Critérios |
| --- | --- | --- | --- | --- | --- |
| T1 | Domínio de acompanhamento e porta de consulta com implementação SQLite | `src/dominio/acompanhamento/`, `src/aplicacao/portas/consultas-acompanhamento.ts`, `src/infra/banco/consultas-acompanhamento-sqlite.ts` | v1 concluída | T3, T7 | AC4 |
| T2 | Casos de uso do painel | `src/aplicacao/casos-de-uso/{listar-fila,detalhar-vaga,calcular-metricas,descartar-vaga}.ts` | T1 | T3, T7 | AC2, AC3, AC4 |
| T3 | Servidor web, segurança, layout e comando `painel` | `src/interfaces/web/{servidor,seguranca,layout,abrir-painel}.ts`, `src/interfaces/web/estatico/estilo.css`, `src/interfaces/cli/comandos/painel.ts`, `src/composicao.ts`, `src/infra/config/esquema-config.ts`, `config.exemplo.yaml`, `package.json` | v1 concluída | T1, T2, T7 | AC1, AC6, AC7, AC8 |
| T4 | Rotas de fila e detalhe | `src/interfaces/web/rotas/{fila,vaga}.ts`, `src/interfaces/web/visoes/{fila,vaga}.ts` | T2, T3 | T5, T6 | AC2, AC7, AC8 |
| T5 | Rotas de ações | `src/interfaces/web/rotas/acoes.ts` | T2, T3 | T4, T6 | AC3, AC9 |
| T6 | Rotas de métricas e falhas | `src/interfaces/web/rotas/{metricas,falhas}.ts`, `src/interfaces/web/visoes/{metricas,falhas}.ts` | T2, T3 | T4, T5 | AC4, AC5, AC8 |
| T7 | Toast que abre o painel | `src/infra/notificacao/notificador-windows.ts`, `src/interfaces/toast/processo-toast.ts` | T3 (`abrirPainel`) | T1, T2, T4 a T6 | AC6 |
| T8 | Documentação | `docs/adr/0017-painel-hono-htmx.md`, `docs/adr/0018-porta-de-consulta.md`, `docs/adr/0019-protecoes-do-painel.md`, `docs/arquitetura.md`, `README.md` | T1 a T7 | Nenhuma | — |

### T1: Domínio de acompanhamento e porta de consulta com implementação SQLite

**Arquivo:** `src/dominio/acompanhamento/metricas.ts`, `src/dominio/acompanhamento/faixas.ts`, `src/aplicacao/portas/consultas-acompanhamento.ts`, `src/infra/banco/consultas-acompanhamento-sqlite.ts` (mais os testes) | **Ação:** Criar

**Detalhes:**

- **`faixas.ts`.** Exporta:
  - `FAIXAS_ATS = [{ rotulo: "0–49", min: 0, max: 49 }, { rotulo: "50–69", ... }, { rotulo: "70–84", ... }, { rotulo: "85–100", ... }]` e `SEM_SCORE = "sem score"`.
  - `FAIXAS_ADERENCIA = ["abaixo de 60 (forçadas)", "60–69", "70–79", "80–89", "90–100"]`, com limites.
  - `faixaAts(valor: number | null)` e `faixaAderencia(valor: number | null)`.
  - `AMOSTRA_MINIMA = 5`.
- **`metricas.ts`.**
  - Tipo `LinhaMetrica = { canal, motor, mes: "AAAA-MM", idioma, atsDepois: number | null, aderencia: number | null, comResposta: boolean, entrevista: boolean, oferta: boolean }`.
  - `agregarFunil(linhas, dimensao: "canal", "motor" ou "mes")` e `agregarConversao(linhas, dimensao: "faixaAts", "faixaAderencia" ou "idioma")` devolvem `GrupoMetrica[] = { grupo, enviadas, comResposta, entrevistas, ofertas, taxaResposta, taxaEntrevista, taxaOferta, amostraPequena }`.
  - Taxas arredondadas a 1 casa (0 quando `enviadas = 0`).
  - Na conversão, todas as faixas aparecem, mesmo com zero.
  - Ordenação:
    - Funil: `enviadas` decrescente (por mês, cronológica decrescente).
    - Conversão: ordem das faixas.
- **Porta `ConsultasAcompanhamento`** (síncrona):
  - `listarGrupo(status: readonly Status[], ordem: "aderencia" ou "atualizacao"): LinhaFila[]`.
  - `contarPorStatus(): Record<Status, number>`.
  - `detalhe(id): DetalheVaga | null`, com vaga, eventos, gaps e respostas enviadas.
  - `linhasMetrica(desde: string | null): LinhaMetrica[]`.
- **`ConsultasAcompanhamentoSqlite`.**
  - Statements preparados.
  - `linhasMetrica` seleciona as vagas com `enviada_em IS NOT NULL AND (? IS NULL OR enviada_em >= ?)` e calcula:
    - `comResposta` com `status IN (...)`.
    - `entrevista` e `oferta` com `EXISTS` sobre `eventos`.
    - `mes` com `substr(enviada_em, 1, 7)`.

    As listas de status e etapas são **parâmetros vindos das constantes do domínio** (`STATUS_COM_RESPOSTA`, `ETAPAS_ENTREVISTA`), nunca literais no SQL.
  - Linhas validadas com Zod.

### T2: Casos de uso do painel

**Arquivo:** `src/aplicacao/casos-de-uso/listar-fila.ts`, `src/aplicacao/casos-de-uso/detalhar-vaga.ts`, `src/aplicacao/casos-de-uso/calcular-metricas.ts`, `src/aplicacao/casos-de-uso/descartar-vaga.ts` | **Ação:** Criar

**Detalhes:**

- **`listarFila(deps, { grupo })`.**
  - Grupos:

    | Grupo | Rótulo | Status |
    | --- | --- | --- |
    | `fila` | Na fila | `STATUS_NA_FILA` |
    | `voce` | Aguardando você | MANUAL, PENDENTE_TESTE |
    | `enviadas` | Enviadas | ENVIADA, EM_PROCESSO, OFERTA, RECUSADA |
    | `descartadas` | Descartadas | DESCARTADA, DUPLICADA, PULADA |

  - Ordenação: aderência decrescente em `fila` e atualização decrescente nos demais.
  - Para MANUAL `candidatura_por_email`, inclui o destino lido de `analise.json` via `ArmazemArtefatos`.
  - Retorna também as contagens por grupo.
- **`detalharVaga(deps, { id })`.**
  - Inclui o detalhamento da aderência e os requisitos (de `analise.json`).
  - Lista os artefatos existentes, entre os nomes da allowlist: `pdf-curriculo`, `pdf-carta`, `carta.md`, `antes-envio.png`, `confirmacao.png`, `descricao.md` e `curriculo.txt`.
  - As transições disponíveis vêm de `TRANSICOES_VALIDAS` (status de retorno aceitos e se pode descartar).
  - Retorna `null` se a vaga não existir.
- **`calcularMetricas(deps, { periodo: 30, 90, 365 ou "tudo"; secao: "funil" ou "conversao"; dimensao })`.** `desde = Relogio.agora() - periodo dias`, depois `linhasMetrica` e `agregarFunil` ou `agregarConversao`.
- **`descartarVaga(deps, { id })`.** Executa `transicionar(id, "DESCARTADA", { motivo: "manual" })`. Fora de NOVA, PRONTA ou ERRO_PREPARO, `ErroTransicaoInvalida`.
- **Reusados sem alteração:** `adicionarVagas`, `registrarRetorno` e `listarFalhas` da v1.

### T3: Servidor web, segurança, layout e comando `painel`

**Arquivo:** `src/interfaces/web/servidor.ts`, `src/interfaces/web/seguranca.ts`, `src/interfaces/web/layout.ts`, `src/interfaces/web/abrir-painel.ts`, `src/interfaces/web/estatico/estilo.css`, `src/interfaces/cli/comandos/painel.ts`, `src/composicao.ts`, `src/infra/config/esquema-config.ts`, `config.exemplo.yaml`, `package.json` | **Ação:** Criar (os seis primeiros) e Modificar (os demais)

**Detalhes:**

- **`package.json`.** Adicionar `hono`, `@hono/node-server` e `htmx.org` (versões exatas), com justificativa acrescentada à tabela de dependências em `docs/arquitetura.md`.
- **Config.** `painel: { porta: 4321, ociosoMin: 60 }` no schema e no exemplo.
- **`servidor.ts`.**
  - `criarApp(container): Hono` registra, nesta ordem:
    1. O middleware de `seguranca.ts`.
    2. `GET /saude`, que retorna `{ app: "outbox" }`.
    3. `GET /estatico/htmx.min.js`, que lê o arquivo resolvido por `import.meta.resolve("htmx.org/dist/htmx.min.js")`.
    4. `GET /estatico/estilo.css`.
    5. As rotas das T4 a T6.
  - `iniciarServidor({ porta, ociosoMin? })` usa `serve({ fetch, port, hostname: "127.0.0.1" })`. Com `ociosoMin`, um middleware atualiza o último acesso via `Relogio`, e um intervalo de 60 s encerra o processo quando o último acesso fica mais velho que `ociosoMin`.
- **`seguranca.ts`:**
  1. O cabeçalho `Host` precisa ser `127.0.0.1:<porta>` ou `localhost:<porta>`. Caso contrário, 403.
  2. Em `POST`, exige `HX-Request: true` e `Origin` igual a `http://127.0.0.1:<porta>` ou `http://localhost:<porta>`. Caso contrário, 403.
  3. Em toda resposta, envia `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; form-action 'self'; base-uri 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` e, nas respostas HTML, `Cache-Control: no-store`.
- **`layout.ts`.**
  - `pagina(titulo, corpo)` usa o template literal `html` do Hono (escape automático). Fica proibido o `raw()` com dado vindo do banco.
  - O cabeçalho tem a `meta` `htmx-config` com `{"includeIndicatorStyles": false, "allowEval": false}` (compatível com a CSP).
  - Navegação: Fila (`/`), Métricas (`/metricas`) e Falhas (`/falhas`).
  - HTML semântico (tabelas com `<th scope>`, rótulos em formulários).
- **`estilo.css`.** Tokens de cor em `:root`, redefinidos em `@media (prefers-color-scheme: dark)`, fonte do sistema e uma coluna até 720 px. Classes para a barra de taxa (`.barra` com a largura definida pela classe utilitária `.p-0` a `.p-100` em passos de 5, sem `style` inline) e para o selo "amostra pequena".
- **`abrir-painel.ts`.** `abrirPainel({ fundo })`:
  1. `GET http://127.0.0.1:<porta>/saude`.
  2. Se a resposta for `{ app: "outbox" }`, chama `open(url)`.
  3. Se a conexão for recusada:
     - Sem `fundo`: chama `iniciarServidor` e `open(url)`, e imprime "Painel em <url> (Ctrl+C para parar)".
     - Com `fundo`: dispara `node bin/outbox.js painel --servir-ocioso` destacado, espera `/saude` responder por até 10 s e chama `open(url)`.
  4. Se a resposta for diferente: `ErroUsuario("porta <porta> ocupada por outro processo; ajuste painel.porta no config.yaml")`.
- **`comandos/painel.ts`.** `painel [--fundo]`, mais a opção interna `--servir-ocioso`, oculta na ajuda, que inicia o servidor com `ociosoMin` sem abrir o navegador.
- **`composicao.ts`.** Getter preguiçoso de `ConsultasAcompanhamentoSqlite` e funções prontas dos casos de uso da T2.

### T4: Rotas de fila e detalhe

**Arquivo:** `src/interfaces/web/rotas/fila.ts`, `src/interfaces/web/rotas/vaga.ts`, `src/interfaces/web/visoes/fila.ts`, `src/interfaces/web/visoes/vaga.ts` | **Ação:** Criar

**Detalhes:**

- **`GET /?grupo=<g>`** (padrão `fila`).
  - Mostra abas com as contagens, o formulário de adicionar URLs (T5) e a tabela.
  - Colunas: `id` (link), status, motivo ou etapa, empresa, cargo, canal, ATS, aderência, ATS `antes → depois` e atualização (`dd/mm HH:mm`).
  - A tabela fica num contêiner com `hx-get="/fragmentos/fila?grupo=<g>" hx-trigger="every 10s, atualizarFila from:body" hx-swap="outerHTML"`.
- **`GET /fragmentos/fila`.** Retorna só a tabela.
- **`GET /vagas/:id`.** Retorna 404 se a vaga não existir. Seções:
  1. Cabeçalho, com links para `url_original` e `url_resolvida` (`rel="noreferrer"`).
  2. Scores.
  3. Requisitos.
  4. Gaps.
  5. Respostas enviadas. As sensíveis aparecem como "protegido".
  6. Linha do tempo.
  7. Artefatos.
  8. Ações (T5), exibidas conforme as transições disponíveis.
- **`GET /vagas/:id/arquivos/:nome`.**
  - Só aceita nomes da allowlist da T2. O caminho é resolvido por `ArmazemArtefatos.caminho()`, que garante que fica dentro da pasta da vaga.
  - Em qualquer outro caso, 404.
  - `Content-Type` por extensão. Para `.md` e `.txt`, `text/plain; charset=utf-8`.

### T5: Rotas de ações

**Arquivo:** `src/interfaces/web/rotas/acoes.ts` | **Ação:** Criar

**Detalhes:** a entrada de cada rota é validada com Zod, e um erro vira um fragmento com a mensagem e HTTP 422.

- **`POST /acoes/adicionar`.** Recebe `urls` (textarea, uma URL por linha) e chama `adicionarVagas`. Retorna um fragmento com o resumo por resultado e envia `HX-Trigger: atualizarFila`.
- **`POST /vagas/:id/descartar`.** Chama `descartarVaga` e retorna o fragmento do cabeçalho.
- **`POST /vagas/:id/retorno`.**
  - Recebe `status`, `etapa` (obrigatória para EM_PROCESSO) e `nota` opcional.
  - Chama `registrarRetorno`.
  - `ErroTransicaoInvalida` ou `ErroUsuario` viram um fragmento de erro com HTTP 422.
  - Em caso de sucesso, retorna os fragmentos do cabeçalho e da linha do tempo (`hx-swap-oob`).

### T6: Rotas de métricas e falhas

**Arquivo:** `src/interfaces/web/rotas/metricas.ts`, `src/interfaces/web/rotas/falhas.ts`, `src/interfaces/web/visoes/metricas.ts`, `src/interfaces/web/visoes/falhas.ts` | **Ação:** Criar

**Detalhes:**

- **`GET /metricas?periodo=30|90|365|tudo`** (padrão 90). Mostra:
  1. O seletor de período.
  2. A seção "Funil", com abas Canal, ATS e Mês (`hx-get="/fragmentos/funil?dimensao=..."`).
  3. A seção "Conversão por score", com abas ATS, Aderência e Idioma (`/fragmentos/conversao?dimensao=...`).

  As tabelas têm colunas numéricas alinhadas à direita. Cada taxa tem uma barra (classe `.p-<taxa arredondada a 5>`) com o número ao lado. Linhas com `amostraPequena` recebem o selo e opacidade reduzida. Sem dados no período, a página mostra "Nenhuma candidatura enviada no período".
- **`GET /falhas`.** Mostra as duas tabelas de `listarFalhas`, com a URL mais recente como link `rel="noreferrer"`, e o texto que explica como marcar uma falha como resolvida (`"resolvida": true` no JSON em `falhas/`).

### T7: Toast que abre o painel

**Arquivo:** `src/infra/notificacao/notificador-windows.ts`, `src/interfaces/toast/processo-toast.ts` | **Ação:** Modificar e Criar

**Detalhes:**

- **`NotificadorWindows.notificar`.** Passa a disparar `node <repo>/src/interfaces/toast/processo-toast.ts <titulo> <mensagem>` destacado (`detached`, `stdio: "ignore"`, `unref`) e retornar imediatamente.
  - A fronteira infra → interfaces é atravessada por processo, não por import, então a regra de lint continua valendo.
  - As mensagens ganham o sufixo " Clique para abrir o painel."
- **`processo-toast.ts`.** Chama `notifier.notify({ title, message, appID: "Outbox", wait: true })`.
  - Em `click`, chama `abrirPainel({ fundo: true })` e encerra.
  - Em `timeout` ou `dismissed`, ou sem clique em 30 s, encerra.
  - Erros são registrados pelo `Registrador` e o processo encerra com código 0.

### T8: Documentação

**Arquivo:** `docs/adr/0017-painel-hono-htmx.md`, `docs/adr/0018-porta-de-consulta.md`, `docs/adr/0019-protecoes-do-painel.md`, `docs/arquitetura.md`, `README.md` | **Ação:** Criar e Modificar

**Detalhes:**

- As ADRs 017 a 019 no formato de `arquitetura.md` §16.5, a partir da tabela 3.2.
- `docs/arquitetura.md` ganha:
  - `interfaces/web/`, `interfaces/toast/` e o contexto `dominio/acompanhamento/` na estrutura.
  - A porta `ConsultasAcompanhamento` no catálogo.
  - As novas dependências na tabela.
  - Os controles do painel no modelo de ameaças.
- O README ganha a seção "Painel" (`outbox painel`, porta configurável e o clique no toast).

## 8. Registro da revisão de 2026-10-09 (revisão 2)

| Achado na revisão 1 | Correção |
| --- | --- |
| Consultas SQL e regras de métrica misturadas em `src/painel/` | Porta `ConsultasAcompanhamento` (infra) e domínio `acompanhamento` com faixas e taxas puras (ADR-018) |
| Canal calculado em TypeScript a cada consulta | Coluna `vagas.canal` gravada na entrada (v1) |
| Painel protegido só por `HX-Request` | Allowlist de `Host` (anti DNS rebinding), `Origin`, CSP sem inline, `no-store` e escape automático (ADR-019) |
| `node --import tsx` no processo do toast | Execução nativa de TypeScript (ADR-004) |
| HTML montado com `escapar()` manual | Template literal `html` do Hono, com escape automático e sem `raw()` para dados |
| `src/painel/` fora das camadas | `src/interfaces/web/` com rotas e visões. Leituras pelos casos de uso, regras no domínio |
| Status literais no SQL das métricas | Parâmetros a partir das constantes do domínio (DRY) |
| Comando `painel` sem relação com a convenção da CLI | `src/interfaces/cli/comandos/painel.ts`, no padrão dos demais comandos |

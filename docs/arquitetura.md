# Arquitetura do Camaleão

Versão viva da arquitetura, derivada de `specs/v1/spec-outbox/arquitetura.md` e atualizada com o que a
implementação da v1 confirmou ou mudou (seção 12). As specs ficam como registro histórico; este
documento, `docs/convencoes.md` e `docs/adr/` são a fonte de verdade.

## 1. Forças

- Uso pessoal, local, num Windows 11, com um usuário: SQLite e arquivos locais. A CLI e o site (estático,
  na Vercel) chamam os mesmos casos de uso; o site fala com o agente local em `127.0.0.1` (ADR-0024).
- Os sites dos ATS mudam sem aviso: o código que conhece cada site fica em conectores substituíveis,
  com fixtures e registro de falhas.
- O LLM não é determinístico nem confiável como fonte: toda saída é validada por schema, e o lastro do
  currículo é verificado por código puro.
- Há dados sensíveis (documentos, salário, diversidade, senhas): eles nunca chegam ao LLM, ao log nem
  ao git.
- O LLM é o `claude -p` da assinatura (custo marginal zero), atrás de portas para poder ser trocado.

## 2. Visão geral

Hexagonal enxuto (portas e adaptadores), com núcleo funcional e casca imperativa:

```
 interfaces  (CLI · agente HTTP · MCP camaleao-segredos)   traduz o mundo externo; sem regra de negócio
     │ chama
 aplicacao   (casos de uso · etapas · portas)   orquestra; só conhece portas
     │ usa regras puras
 dominio     (schemas · regras · decisões)      puro, sem IO
 infra       (SQLite · YAML · claude -p · Playwright · conectores · PDF · toast)   implementa as portas
 composicao.ts: o único ponto que instancia a infra (de forma preguiçosa) e injeta nas portas
```

Regra de dependência (verificada por ESLint e por `tests/arquitetura/fronteiras.test.ts`):

| Camada              | Pode importar                                                     | Não pode importar                                               |
| ------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| `src/dominio/`      | `zod`, `#dominio/*`                                               | `node:*`, outros pacotes, demais camadas                        |
| `src/aplicacao/`    | `zod`, `#dominio/*`, `#aplicacao/*`                               | `node:*`, pacotes de IO, `#infra`, `#interfaces`, `#composicao` |
| `src/infra/`        | tudo, exceto o que está ao lado                                   | `#interfaces/*`, `#composicao`                                  |
| `src/interfaces/`   | `#aplicacao/*`, `#dominio/*`, `#composicao`, pacotes de interface | `#infra/*`                                                      |
| `src/composicao.ts` | tudo                                                              | —                                                               |

Em todo `src/`, imports relativos que sobem mais de um nível (`../../`) são proibidos: entre módulos usa-se
o subpath (`#camada/...`).

## 3. Estrutura

```
bin/camaleao.js                    filtra ExperimentalWarning (SQLite, type stripping) e chama a CLI
src/dominio/                       compartilhado · vagas · curriculo · analise · respostas · falhas
src/aplicacao/portas/              uma interface por arquivo (seção 5)
src/aplicacao/etapas/              resolver, extrair, analisar, gerar currículo, responder campos,
                                   montar pacote, rodada de gaps, preencher formulário, revisar e enviar
src/aplicacao/casos-de-uso/        importar, adicionar, preparar, aplicar, status, retorno, falhas,
                                   renderizar master, abrir navegador
src/aplicacao/compartilhado/       concorrência limitada, config da aplicação, schemas de artefatos
src/infra/                         config · log · sistema · banco · armazenamento · llm · navegador ·
                                   documentos · extracao · resolucao · conectores · credenciais ·
                                   agente · notificacao
src/interfaces/cli/                principal (commander), comandos/, apresentacao/, interação de
                                   terminal, sinais, códigos de saída, contexto
src/interfaces/mcp/                servidor stdio camaleao-segredos
src/interfaces/http/               agente local do site (Hono): contrato.ts, servidor, segurança,
                                   pareamento, execuções, ProgressoWeb, InteracaoWeb, arquivos, rotas/
src/interfaces/compartilhado/      leitura do currículo a importar e versão, comuns à CLI e ao agente
apps/web/                          site estático (Vite + React): tema da marca, cliente do agente, telas
src/composicao.ts                  criarContainer: getters preguiçosos e casos de uso prontos
prompts/                           prompts versionados (front-matter `versao`)
scripts/capturar-fixture.ts        captura de fixture sanitizada
tests/                             apoio (fakes, builders, harness), contratos, integracao, arquitetura,
                                   fixtures, fakes/claude.mjs, e2e (site + agente com Playwright)
```

Não versionados: `curriculo/`, `dados/` (banco, navegador, credenciais, artefatos por vaga, master,
logs, tmp, travas) e `config.yaml`.

## 4. Contextos do domínio

| Contexto    | Conceitos                                                                        | Arquivos principais                                                                                                                       |
| ----------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `vagas`     | Vaga, Status, Motivo, Etapa, Motor, UrlCanonica, ChaveDedup                      | `status.ts`, `state-machine/transicoes.ts`, `atualizacoes.ts`, `motores.ts`, `chave.ts`, `deduplicacao.ts`                                |
| `curriculo` | Master, CurriculoGerado, DocumentoCurriculo, lastro, score ATS                   | `master.ts`, `documento.ts`, `lastro.ts`, `score-ats.ts`, `nome-arquivo.ts`                                                               |
| `analise`   | AnaliseVaga, Requisito, Keyword, Aderência, GrupoAfirmativo                      | `analise-vaga.ts`, `aderencia.ts`, `grupos.ts`, `validar-analise.ts`                                                                      |
| `respostas` | Perfil, Campo, classificação, salário, diversidade, consentimento, banco, pacote | `perfil.ts`, `classificar-campo.ts`, `valor-codigo.ts`, `salario.ts`, `diversidade.ts`, `consentimento.ts`, `aprendizado.ts`, `pacote.ts` |
| `falhas`    | RegistroFalha, lista de PII, sanitização                                         | `registro-falha.ts`, `pii.ts`, `sanitizar.ts`                                                                                             |

O agregado persistido é a **Vaga** (linha em `vagas` mais `eventos`, `gaps` e `respostas_enviadas`), e
toda escrita passa pelo `RepositorioVagas`.

## 5. Portas

| Porta                                | Implementação                                               | Observação                                                                                           |
| ------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `RepositorioVagas`                   | `RepositorioVagasSqlite`                                    | Síncrona; `transacao(fn)` com `BEGIN IMMEDIATE`; inclui `termosConfirmados()`                        |
| `ArmazemCurriculo`                   | `ArmazemCurriculoYaml`                                      | Edita YAML preservando comentários                                                                   |
| `ArmazemArtefatos`                   | `ArmazemArtefatosFs`                                        | Escrita atômica; texto do master genérico (`gravarTextoMaster`/`lerTextoMaster`)                     |
| `RegistroFalhas`                     | `RegistroFalhasFs`                                          | `falhas/<conector>/` e `falhas/_sem-conector/<motor>/`, JSON mais HTML sanitizado                    |
| `GeradorEstruturado`                 | `GeradorEstruturadoClaude`                                  | `claude -p --output-format json`, cwd vazio, JSON Schema a partir do Zod                             |
| `ExecutorAgente`                     | `ExecutorAgenteClaude`                                      | Playwright MCP por CDP mais `camaleao-segredos`; devolve `FormularioPlaywright` com `rota: "agente"` |
| `CatalogoConectores` / `ConectorAts` | `CatalogoConectoresPlaywright` / `criarConector(definicao)` | 8 definições declarativas (seção 7)                                                                  |
| `FormularioAberto`                   | `FormularioPlaywright`                                      | Handle comum a conector e agente; `fechar()` idempotente                                             |
| `ResolvedorVagas`                    | `ResolvedorEncadeado`                                       | Elos: direto, agregadores, GitHub, portal Gupy, detecção de ATS                                      |
| `ExtratorVagas`                      | `ExtratorEstrutural`                                        | API do conector, JSON-LD e texto visível; o fallback por LLM fica na etapa                           |
| `RenderizadorDocumentos`             | `RenderizadorPdfPlaywright`                                 | Contexto sem JavaScript e rede bloqueada                                                             |
| `Interacao`                          | `InteracaoTerminal` e `InteracaoWeb` (interfaces)           | `@inquirer/prompts`; Ctrl+C num prompt aborta o comando                                              |
| `Notificador`                        | `NotificadorWindows`                                        | `node-notifier` importado sob demanda; falha vira aviso no log                                       |
| `ProgressoPreparo`                   | `ProgressoTerminal` e `ProgressoWeb` (interfaces)           | Eventos de início, etapa e conclusão por vaga; com TTY, região viva no stderr (ADR-0021)             |
| `NavegadorUsuario`                   | `NavegadorCamaleao`                                         | Chrome dedicado com perfil persistente e porta CDP                                                   |
| `Relogio`                            | `RelogioSistema`                                            | ISO com offset; `hoje()`                                                                             |
| `Registrador`                        | `RegistradorJsonl`                                          | Terminal mais JSONL diário, com redação de PII                                                       |

Portas de IO local (banco e arquivos pequenos) são síncronas; as de rede, processo, navegador e usuário
são assíncronas e recebem `AbortSignal`. Interfaces internas da infra: `CofreCredenciais` e `ClienteHttp`.

## 6. Fluxos

**`camaleao preparar`:** a CLI valida as flags e adquire a trava. `prepararVagas` garante o PDF do master
genérico e processa as vagas elegíveis com `executarComLimite`:

1. `resolverVaga`: resolução e deduplicação por URL, numa transação.
2. Rota `manual` (Easy Apply): gera currículo e carta quando possível e marca MANUAL.
3. `extrairVaga`: extração estrutural; vazia, cai no LLM (`extrair-vaga`). Vaga encerrada (404/410 da
   API do ATS, ou página de erro reconhecida pelo LLM) vira DESCARTADA `vaga_encerrada`, sem aderência.
4. `analisarVaga`: LLM (`analisar-vaga`), saneamento e gaps.
5. Issue do GitHub (`a_definir`): link resolve de novo; e-mail vira MANUAL `candidatura_por_email`.
6. Deduplicação por chave (`BEGIN IMMEDIATE`), aderência e corte (`--forcar` ignora o corte, nunca a
   afirmativa inelegível).
7. `gerarCurriculo`: tailoring, lastro com 1 nova tentativa e, se falhar, master genérico; PDF e ATS.
8. `responderCampos` (só com conector que lê campos no preparo): código para padrão, documentos,
   diversidade, consentimento, salário e salário atual (`salario.atual` do perfil, nunca a pretensão);
   LLM só para perguntas e carta. Regras de campo-padrão e documento só valem para rótulos de até 12
   palavras, e um valor por código que não está entre as opções do select/radio vira pergunta.

Falha por vaga vira ERRO_PREPARO (com tentativas); `ErroLimiteUso` e cancelamento encerram o lote de
forma ordenada; ao fim, toast com o resumo.

**`camaleao aplicar`:** rodada de gaps (sim grava a skill e refaz o currículo das vagas afetadas), depois,
por aderência decrescente: `montarPacote`, `preencherFormulario` (conector; campo que falha é pulado e
fica para a revisão; se o conector lançar `ErroFalhaConector` num passo estrutural, registro sanitizado e
agente com o contexto; sem conector, agente e registro `sem_conector`) e `revisarEEnviar` (tela que
confere a página e marca respostas vazias, resumo, menu; envio só com `[e]nviar`, confirmação, telas,
respostas enviadas, `anexo_manual` e aprendizado no banco). Erro inesperado numa vaga não interrompe as
demais.

## 7. Conectores

`criarConector(definicao, deps)` implementa o fluxo comum (abrir, ler campos, preencher, etapas, envio
pelo botão visível, confirmação, pausa em bloqueio) e cada ATS entra como uma `DefinicaoConector`
declarativa em `infra/conectores/strategy/<motor>/conector.ts`, registrada em `registry/definicoes.ts`
(pastas por pattern, ADR-0022). Regras comuns
(ADR-0017):

- Nunca pressionar Enter (combobox fecha com `blur`): Enter dispara o envio implícito do formulário.
- Clicar só no botão de envio visível (`filter({ visible: true })`).
- CAPTCHA, verificação de e-mail ou bloqueio anti-bot: pausa com `aguardarUsuario`, nunca contorna.
- Consentimento obrigatório é aceito; os opcionais são recusados (ADR-0019).
- Toda ação tem timeout de 10 s, para a falha aparecer e o agente poder assumir.

| Motor           | Fonte das fixtures | Particularidades                                                              |
| --------------- | ------------------ | ----------------------------------------------------------------------------- |
| Greenhouse      | real, sanitizada   | Campos pela API pública de boards (não há API EU)                             |
| Lever           | real, sanitizada   | Botão de envio por id (há um botão oculto do hCaptcha)                        |
| Ashby           | real, sanitizada   | Botões sim/não lidos por `lerExtras`                                          |
| Workable        | real, sanitizada   | —                                                                             |
| Teamtailor      | real, sanitizada   | Campos `candidate[...]` ocultos ignorados                                     |
| SmartRecruiters | sintética          | DataDome bloqueia navegador automatizado; campos só no `aplicar` (ADR-0020)   |
| Gupy            | sintética          | Conta global; etapas; PENDENTE_TESTE; spike bloqueado (`docs/spikes/gupy.md`) |
| InHire          | sintética          | Conta por tenant (cofre); spike bloqueado (`docs/spikes/inhire.md`)           |

## 8. Erros, validação, logging, config e concorrência

- **Erros:** hierarquia única `ErroCamaleao` (`ErroUsuario`, `ErroDominio`, `ErroInfra` e subclasses). A
  CLI mapeia `0` sucesso, `1` erro, `2` uso inválido (incluindo parse do commander e trava ocupada) e
  `130` interrompido. Erro inesperado mostra uma linha curta e grava o stack no log.
- **Validação:** Zod em toda fronteira (config, YAML, saída do LLM, APIs, linhas do SQLite, argumentos
  da CLI, entradas MCP).
- **Logging:** `CAMALEAO_LOG` controla o nível; JSONL em `dados/logs/camaleao-AAAA-MM-DD.jsonl`; PII
  redigida e chaves sensíveis omitidas.
- **Config:** padrões no schema (`esquema-config.ts`); `config.yaml` local e opcional;
  `config.exemplo.yaml` verificado por teste.
- **Concorrência:** trava de arquivo por comando (`dados/travas/<comando>.lock` com PID); paralelismo
  limitado; transações síncronas; Ctrl+C cooperativo (o segundo sai com 130); escrita atômica.

## 9. Segurança

- **Classificação:** sensível (documentos, salário, diversidade, endereço completo, senhas) nunca vai
  ao LLM, ao log nem ao git; pessoal vai ao LLM só quando a tarefa exige; dados da vaga são públicos e
  não confiáveis.
- **Fronteira de confiança:** conteúdo externo entra nos prompts em `<conteudo_nao_confiavel>`; a saída
  do LLM nunca é executada.
- **Agente:** `--strict-mcp-config`, `--tools ""` (sem ferramentas nativas do Claude Code) e
  `--allowedTools` com navegação, clique, digitação, seleção, snapshot, upload, abas, espera, hover,
  diálogos, screenshot e as 4 ferramentas do `camaleao-segredos`. Ficam de fora a execução de script
  (`browser_evaluate`, `browser_run_code_unsafe`), cookies, storage, rede, rotas e `browser_press_key`.
  O prompt proíbe `submit: true` e o clique no envio final (ADR-0017, ADR-0018).
- **`camaleao-segredos`:** preenche senha (cofre por tenant), CPF/RG/data de nascimento e respostas
  protegidas (`p<n>`) só em hosts da allowlist (`CAMALEAO_HOSTS_PERMITIDOS`) e nunca devolve o valor.
- **Render de PDF:** HTML escapado, sem JavaScript e com rede bloqueada.
- **Supply chain:** lockfile, `npm ci`, `ignore-scripts=true`, versões exatas, `npm audit` no `verificar`.
- **Risco residual aceito:** uma injeção poderia induzir o agente a enviar antes da revisão; a mitigação
  é a allowlist sem envio implícito, o prompt e a revisão obrigatória.

### 9.1 Modelo de ameaças do agente local (ADR-0025)

| Ameaça                                                    | Defesa                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Outro site aberto no navegador chama `127.0.0.1`          | CORS só para `agente.origensPermitidas` (403 sem cabeçalhos CORS) e token em toda rota protegida |
| DNS rebinding (domínio do atacante resolvendo para local) | Allowlist de `Host` (`127.0.0.1:<porta>` e `localhost:<porta>`), 403 fora dela                   |
| Acesso pela rede                                          | Socket só em `127.0.0.1`                                                                         |
| Adivinhar o código de pareamento                          | 8 caracteres de 31, uso único, 10 minutos, troca após 5 erros                                    |
| Token roubado do disco                                    | `dados/agente/tokens.json` guarda só o SHA-256; `POST /pareamento/revogar`                       |
| Ler arquivos locais pelo agente                           | `/arquivos/<id>` aleatório, 5 minutos, só `dados/vagas/` e `dados/master/` (caminho real)        |
| Responder outra pergunta ou enviar fora da revisão        | Só a pergunta pendente aceita resposta (409); envio só pela escolha "enviar", com confirmação    |
| Agente LLM (por injeção) usar a aba do site               | `paginaMaisRecente` ignora as origens do site; o token nunca entra no prompt                     |
| Vazamento em log                                          | Log de rotas só com método, caminho mascarado e status; corpo (perfil, pareamento) nunca         |
| Script de terceiros no site                               | Fontes empacotadas, sem CDN; CSP `default-src 'self'` na Vercel                                  |

## 10. Desempenho

- `status`, `retorno` e `falhas` não carregam Playwright, mammoth, node-notifier nem `@inquirer`: a
  composição é preguiçosa e cada comando da CLI é importado sob demanda (verificado por teste com hook
  de resolução de módulos).
- Um navegador headless por execução, com contexto isolado por leitura; o render reusa o navegador.
- SQLite com WAL, `busy_timeout`, statements preparados e índices; listagens sem N+1.
- HTTP com timeout e até 2 novas tentativas para 429 e 5xx.

## 11. Qualidade

`npm run verificar` = `tsc --noEmit`, ESLint (`strictTypeChecked` e fronteiras), Prettier, tipos, lint,
build e testes do site (`npm run -w apps/web ...`), Vitest com cobertura v8 (limiares: global 70% de
linhas, domínio 90% de linhas e ramos, aplicação 80%) e `npm audit --omit=dev --audit-level=high`. O CI (`.github/workflows/verificar.yml`) roda o mesmo em
`windows-latest`. Estratégia de testes:

- **Unitários** ao lado do código (domínio e aplicação com fakes de porta e SQLite `:memory:`).
- **Contrato** (`tests/contratos/`): os 8 conectores e o `FormularioAberto` sobre fixtures servidas por
  `page.route`, sem rede.
- **Integração** (`tests/integracao/`): infra real em pasta temporária (banco, YAML, PDF com extração
  de texto, navegador, resolução, segredos, agente e LLM com o `claude` falso, CLI, MCP stdio,
  inicialização preguiçosa).
- **Arquitetura** (`tests/arquitetura/`): imports proibidos falham no lint; o nome antigo do produto só
  aparece na compatibilidade (ADR-0026).
- **Site** (`apps/web`): Vitest + Testing Library sobre um agente simulado (conexão, fluxos, perfil),
  contraste AA dos tokens nos dois temas e varredura do `dist/` por URLs externas.
- **e2e** (`tests/e2e/fluxo-web.test.ts`): o agente real, o build servido por `vite preview` e um
  Chromium headless (parear, importar, perfil, adicionar, preparar, aplicar simulando e pular).
- O `fetch` não stubado lança erro em qualquer teste: nenhum teste faz rede.

## 12. Diferenças em relação à spec

| Tema                                      | Spec                                                                      | Implementação                               | Motivo                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------- |
| Handle do agente                          | `FormularioAgente` em arquivo próprio                                     | `FormularioPlaywright` com `rota: "agente"` | Mesmo comportamento; evita duplicar o handle                                     |
| Restrição de origens do agente            | Aplicar se suportada                                                      | Não usada                                   | Não é fronteira de segurança no Playwright MCP e quebraria CDNs e SSO (ADR-0018) |
| Upload pelo agente                        | Permitir `dados/vagas/` e `dados/master/`                                 | PDFs copiados para `dados/tmp/agente-<id>/` | O Playwright MCP só envia arquivos do workspace (ADR-0018)                       |
| `browser_press_key`                       | Não citado                                                                | Fora da allowlist                           | Enter envia o formulário (ADR-0017)                                              |
| Categoria `consentimento`                 | Não existia                                                               | Nova categoria de campo                     | Termos e LGPD têm resposta determinística (ADR-0019)                             |
| Agente e navegador                        | —                                                                         | `garantirNavegador` antes do `claude`       | Sem conector, o navegador podia não estar aberto para o CDP                      |
| Indeed fora do Brasil                     | Sempre `br.indeed.com`                                                    | Mantém o host                               | Vagas de outros países quebrariam                                                |
| Greenhouse EU                             | API de campos                                                             | Sem leitura no preparo                      | A API pública EU não existe                                                      |
| SmartRecruiters                           | Conector completo                                                         | Campos só no `aplicar`, com pausa           | DataDome bloqueia navegador automatizado (ADR-0020)                              |
| `#scripts/*`                              | Não listado                                                               | Subpath para importar `scripts/` nos testes | Mantém a regra "sem `../../`"                                                    |
| Apresentação                              | `tabela`, `resumo-preparo`, `resumo-revisao`, `status`, `falhas`, `cores` | Mais `adicao.ts`                            | Formatação do `adicionar` fora do comando                                        |
| Mensagem de retorno inválido para ENVIADA | Lista vazia                                                               | Lista as transições aceitas                 | AC21 exige listar as aceitas                                                     |

## 13. Dependências do agente e do site

| Pacote                                            | Onde       | Por quê                                                                                        |
| ------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| `hono` 4.13.13                                    | agente     | Roteamento, middleware e streaming SSE tipados, sem build (ADR-0004); `app.request` nos testes |
| `@hono/node-server` 2.1.3                         | agente     | Adaptador oficial do Hono para `node:http`, com `hostname` fixo em `127.0.0.1`                 |
| `react`, `react-dom` 19.3.0                       | site       | UI declarativa com o ecossistema de testes (Testing Library)                                   |
| `react-router` 8.4.0                              | site       | Rotas da SPA (Início, Vagas, Currículo, Falhas, Preparar, Aplicar)                             |
| `vite` 8.3.2, `@vitejs/plugin-react` 6.1.2        | site (dev) | Build estático e o alias `@contrato` para o contrato do agente                                 |
| `@fontsource/poppins`, `@fontsource/nunito` 5.3.0 | site       | Fontes da marca empacotadas: nenhuma requisição a terceiros, compatível com a CSP              |
| `@testing-library/*`, `jsdom` 29.1.1              | site (dev) | Testes das telas; o `jsdom` 30 exige Node 24.15+                                               |

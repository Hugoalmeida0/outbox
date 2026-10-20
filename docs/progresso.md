# Progresso da implementação da V1

Referências: `specs/v1/spec-outbox/spec.md` (requisitos, tarefas e critérios de aceite) e
`specs/v1/spec-outbox/arquitetura.md` (arquitetura e convenções). Documentação viva em `docs/`.

Legenda: ✅ concluída e validada · ⚠️ concluída com ressalva (ver observação) · ⛔ bloqueada

## Tarefas

| Tarefa | Descrição                                           | Status | Observações                                                                                                                         |
| ------ | --------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| T1     | Fundação do repositório, qualidade e CI             | ✅     | `bin/camaleao.js`, lint de fronteiras, `verificar`, workflow `windows-latest` (não executado: o diretório não é um repositório git) |
| T2     | Schemas do domínio e exemplos                       | ✅     |                                                                                                                                     |
| T3     | Domínio de vagas                                    | ✅     |                                                                                                                                     |
| T4     | Domínio de currículo e análise                      | ✅     |                                                                                                                                     |
| T5     | Domínio de respostas e falhas                       | ✅     | Categoria `consentimento` acrescentada (ADR-0019)                                                                                   |
| T6     | Portas, erros, concorrência e apoio de testes       | ✅     |                                                                                                                                     |
| T7     | Infra base                                          | ✅     |                                                                                                                                     |
| T8     | Persistência SQLite                                 | ✅     |                                                                                                                                     |
| T9     | Armazenamento em arquivos                           | ✅     |                                                                                                                                     |
| T10    | LLM: processo claude, gerador e prompts             | ✅     | Chamada real mínima do `claude -p` validada                                                                                         |
| T11    | Navegador, leitor e documentos                      | ✅     |                                                                                                                                     |
| T12    | Resolução e extração                                | ✅     |                                                                                                                                     |
| T13    | Base de conectores, contratos e captura de fixtures | ✅     | `scripts/capturar-fixture.ts` testado sem navegador (argumentos, sanitização, uso)                                                  |
| T14    | Conectores Greenhouse, Lever e Ashby                | ✅     | Fixtures reais sanitizadas                                                                                                          |
| T15    | Conectores SmartRecruiters, Workable e Teamtailor   | ⚠️     | SmartRecruiters com fixture sintética: DataDome bloqueia a leitura (ADR-0020)                                                       |
| T16    | Conectores Gupy e InHire, com spikes                | ⛔     | Conectores e fixtures sintéticas prontos; spikes exigem candidaturas reais (`docs/spikes/`)                                         |
| T17    | Cofre de credenciais e MCP camaleao-segredos        | ✅     | Servidor MCP testado em memória e como processo stdio                                                                               |
| T18    | Agente                                              | ✅     | Validado com o `claude` real contra página local (seção "Validação real do agente")                                                 |
| T19    | Notificação                                         | ✅     |                                                                                                                                     |
| T20    | Casos de uso de entrada                             | ✅     |                                                                                                                                     |
| T21    | Etapas de preparo e `preparar`                      | ✅     |                                                                                                                                     |
| T22    | Etapas de aplicação e `aplicar`                     | ✅     |                                                                                                                                     |
| T23    | Casos de uso de consulta                            | ✅     |                                                                                                                                     |
| T24    | Composição e CLI                                    | ✅     | Testada pela CLI real (`bin/camaleao.js`) e por testes de integração                                                                |
| T25    | Documentação viva                                   | ✅     | README, arquitetura, convenções, ADR 0001 a 0020, guia de conector, spikes                                                          |

## Critérios de aceite

| AC   | Situação            | Evidência                                                                                                                                                                            |
| ---- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1  | ✅ (parcial no git) | 9 comandos no `--help` (`tests/integracao/cli.test.ts`); `.gitignore` com `curriculo/`, `dados/`, `config.yaml`. `git check-ignore` não executado: o diretório não é repositório git |
| AC2  | ✅                  | `importar` ponta a ponta com o `claude` falso (CLI), backup com timestamp, auxiliares, recusa sem `--sobrescrever`                                                                   |
| AC3  | ✅                  | `canonizar`, `decidirDeduplicacaoUrl`, `adicionarVagas` com SQLite                                                                                                                   |
| AC4  | ✅                  | Fixtures de resolução; Easy Apply e e-mail viram MANUAL com currículo e carta                                                                                                        |
| AC5  | ✅                  | Extrator com fixtures; fallback por LLM                                                                                                                                              |
| AC6  | ✅                  | Aderência, `--forcar`, afirmativa inelegível, `--reavaliar`                                                                                                                          |
| AC7  | ✅                  | 4 cenários da chave; duas conexões no mesmo arquivo                                                                                                                                  |
| AC8  | ✅                  | R1 a R6; retry com violações; master genérico com `camaleao_falhou`                                                                                                                  |
| AC9  | ✅                  | PDF A4 com texto extraível (`pdfjs-dist`), nome do arquivo, alerta acima de 2 páginas                                                                                                |
| AC10 | ✅                  | ATS antes/depois gravado e exibido no `status` e na revisão                                                                                                                          |
| AC11 | ✅                  | `tests/integracao/sensiveis.test.ts`: preparar e aplicar com o `claude` falso, varredura dos logs de LLM, log JSONL, `falhas/` e prompt do agente                                    |
| AC12 | ✅                  | `aplicarAprendizado`; banco atualizado depois do envio, inclusive com edição no navegador                                                                                            |
| AC13 | ✅                  | Espião de `enviar`; `--simular`; telas; respostas enviadas; `anexo_manual`                                                                                                           |
| AC14 | ✅                  | Rodada de gaps consolidada; YAML comentado preservado; novo tailoring                                                                                                                |
| AC15 | ✅ (com ressalva)   | 8 conectores na suíte de contrato; 3 deles sobre fixtures sintéticas                                                                                                                 |
| AC16 | ✅                  | Registro sanitizado sem valores, scripts nem PII; agente assume com o contexto                                                                                                       |
| AC17 | ✅                  | Teto de turnos e tempo com o executável falso; `sem_conector`; MANUAL `teto_agente`                                                                                                  |
| AC18 | ✅                  | Cofre por tenant; MCP com allowlist de hosts e retorno sem valor; varredura de logs                                                                                                  |
| AC19 | ✅                  | CAPTCHA pausa (fixture com reCAPTCHA); DataDome detectado; nenhuma dependência de resolução                                                                                          |
| AC20 | ✅                  | `--paralelo`; `ErroLimiteUso` mantém NOVA e notifica; resumo notificado                                                                                                              |
| AC21 | ✅                  | Apresentadores com saída exata; `retorno` lista as transições aceitas                                                                                                                |
| AC22 | ⛔                  | PENDENTE_TESTE implementado e testado em fixture sintética; `anexoPorCandidatura` com decisão provisória (`docs/spikes/gupy.md`)                                                     |
| AC23 | ✅                  | Idioma da vaga em currículo, respostas e carta                                                                                                                                       |
| AC24 | ✅                  | `tests/arquitetura/fronteiras.test.ts`                                                                                                                                               |
| AC25 | ✅                  | Migrador com banco novo, versão N e rollback                                                                                                                                         |
| AC26 | ✅                  | Abort no meio do lote; Ctrl+C num prompt; trava concorrente com código 2; segundo Ctrl+C com 130                                                                                     |
| AC27 | ✅                  | `RegistradorJsonl` com redação por valor e por chave                                                                                                                                 |
| AC28 | ✅                  | `<conteudo_nao_confiavel>`; allowlist do agente; render sem JavaScript e sem rede                                                                                                    |
| AC29 | ✅ (local)          | `npm run verificar` passa; `fetch` bloqueado nos testes. Workflow de CI escrito, não executado (sem repositório git remoto)                                                          |
| AC30 | ✅                  | Códigos de saída testados; falha de uma vaga não interrompe o lote                                                                                                                   |
| AC31 | ✅                  | `instanciados()` da composição e hook de resolução de módulos num processo filho                                                                                                     |

## Verificações de ambiente

- Node 24.8.0 executa `.ts` sem flag (type stripping nativo). `import.meta.main` e `module.registerHooks`
  disponíveis.
- `node:sqlite` disponível (SQLite 3.50.4); o `ExperimentalWarning` é filtrado em `bin/camaleao.js` e nos
  testes.
- Versões: TypeScript 6.0.3, ESLint 10.12, typescript-eslint 8.71, Vitest 5.0.3, Zod 4.6.5, Playwright
  1.64.0, `@playwright/mcp` 0.0.83, `@modelcontextprotocol/sdk` 1.32.1, commander 15.0.0, Claude Code 2.1.181.

## Verificação final

`npm run verificar` (tipos, lint, formatação, testes com cobertura e `npm audit --omit=dev
--audit-level=high`) passou em 2 execuções seguidas depois da última mudança de código (2026-10-10):
42 arquivos de teste, 533 testes, cerca de 80 s cada, sem navegador órfão ao final. O audit lista 5 vulnerabilidades moderadas transitivas (seção "Bloqueios e
pendências"), abaixo do limiar `high`.

| Camada              | Linhas | Ramos | Limiar                                          |
| ------------------- | ------ | ----- | ----------------------------------------------- |
| `src/dominio`       | 100,0% | 94,2% | 90% linhas e ramos                              |
| `src/aplicacao`     | 97,3%  | 86,5% | 80% linhas e ramos                              |
| `src/interfaces`    | 89,7%  | 80,6% | global                                          |
| `src/infra`         | 81,6%  | 60,2% | global (código em `page.evaluate` não é medido) |
| `src/composicao.ts` | 76,3%  | 82,6% | global                                          |
| Total               | 89,0%  | 76,0% | 70% de linhas                                   |

Antes da execução final, dois ajustes de estabilidade nos testes: o lançamento do Chromium passou para
`beforeAll` (não conta no timeout do primeiro teste) e o Vitest usa metade dos núcleos (`maxWorkers:
"50%"`), porque com 13 workers e 3 GB livres navegações locais passavam de 15 s.

## Validação real do agente (2026-10-10)

Script fora do repositório: servidor local em 127.0.0.1 com formulário sintético (nome, e-mail,
telefone, LinkedIn, pergunta e upload de PDF), navegador headless com perfil temporário e porta CDP
própria, `ExecutorAgenteClaude` real com `claude -p` (Sonnet), Playwright MCP e `camaleao-segredos`.

| Rodada | Prompt | Resultado                                                        | Tempo | POSTs (envios) |
| ------ | ------ | ---------------------------------------------------------------- | ----- | -------------- |
| 1      | v1     | `teto`: o `claude` não respondeu em 480 s; causa não reproduzida | 484 s | 0              |
| 2      | v1     | `pronto`, 6 campos preenchidos e PDF anexado                     | 92 s  | 0              |
| 3      | v1     | `pronto`, 6 campos preenchidos e PDF anexado                     | 74 s  | 0              |
| 4      | v2     | `pronto`, 6 campos preenchidos e PDF anexado                     | 38 s  | 0              |

A allowlist bloqueou `browser_evaluate`, `browser_run_code_unsafe` e `browser_find` quando o modelo
tentou usá-las. O schema do MCP revelou `submit` em `browser_type` e `browser_press_key` (envio
implícito) e o formato do `target`; daí a versão 2 do prompt e a remoção de `browser_press_key`
(ADR-0017).

## Decisões tomadas durante a implementação

- **Registro npm público no `.npmrc` do projeto.** A configuração global aponta para um registro
  corporativo que não resolve fora da rede da empresa; o projeto fixa `registry.npmjs.org` localmente.
- **Imutabilidade por tipo**, sem `.readonly()` nos schemas Zod.
- **`keywords` da análise aceita de 1 a 40 itens** (o prompt pede de 10 a 30).
- **Lastro de título e resumo (R5)** aceita qualquer texto factual do master.
- **Normalização preserva `#` e `+`** (C#, C++); termos casam por palavras inteiras.
- **"Nome" sozinho** é nome completo, salvo quando o formulário também pede sobrenome.
- **Indeed fora do Brasil** mantém o host na canonização.
- **Acréscimos às portas:** `RepositorioVagas.termosConfirmados()`, `Relogio.hoje()`,
  `ArmazemArtefatos.gravarTextoMaster/lerTextoMaster`, `EntradaAgente.urlCandidatura` e
  `RespostaSugerida.tipoCampo/chaveProtegida`.
- **Banco de respostas** preserva o cabeçalho de comentários ao regravar.
- **Conectores por fábrica declarativa** (`criarConector(definicao)`), com o handle `FormularioPlaywright`
  comum a conector e agente (sem `formulario-agente.ts` separado).
- **Envio implícito proibido:** combobox fecha com `blur`, clique só em botão visível, sem
  `browser_press_key` no agente (ADR-0017).
- **Agente:** sem `--allowed-origins`; PDFs copiados para `dados/tmp/agente-<id>/`; `--tools ""`;
  navegador garantido antes do `claude` (ADR-0018).
- **Consentimento** como categoria determinística (ADR-0019).
- **DataDome** tratado como CAPTCHA; SmartRecruiters lê campos só no `aplicar` (ADR-0020).
- **Greenhouse EU:** sem leitura de campos no preparo (a API pública EU não existe).
- **CLI:** cada comando é importado sob demanda; títulos da ajuda do commander em português; mensagens
  de validação em português; `adicionar` com todas as URLs inválidas sai com 2.
- **`registrarRetorno`** lista as transições aceitas também na recusa de ENVIADA.
- **`NavegadorCamaleao.garantir`** verifica se o endpoint CDP responde antes de lançar um navegador: se
  responde mas a conexão demora, reconecta com mais prazo em vez de abrir um segundo Chrome (encontrado
  porque um teste sob carga deixou um Chromium órfão, com perfil criado dentro da pasta do Playwright;
  o processo e o perfil foram removidos e o teste passou a usar perfil temporário absoluto).
- **`#scripts/*`** como subpath, para os testes importarem `scripts/` sem `../../`.
- **Cobertura:** a infra só tem o limiar global. Código dentro de `page.evaluate` roda no navegador e
  não é medido pelo V8 do Node, por isso os conectores aparecem com cobertura baixa apesar da suíte de
  contrato.

## Bloqueios e pendências

- **Spikes da Gupy e do InHire (T16, AC22):** exigem conta e candidaturas reais, ações externas e
  irreversíveis que não foram feitas de forma autônoma. Conectores e fixtures sintéticas prontos; roteiro
  para concluir em `docs/spikes/gupy.md` e `docs/spikes/inhire.md`.
- **SmartRecruiters:** formulário real não verificado (DataDome); fixture sintética.
- **CI não executado:** o diretório não é um repositório git; o workflow está escrito e o mesmo comando
  passa localmente.
- **Vulnerabilidades moderadas transitivas** (`npm audit`): `sprintf-js` (via `argparse`, via `mammoth`)
  e `uuid` (via `node-notifier`). A correção oferecida rebaixaria `mammoth` para 0.3.29 e
  `node-notifier` para 6.0.0; abaixo do limiar `high` do `verificar`. Acompanhar novas versões.
- **Primeira rodada real do agente estourou o tempo** sem saída (causa não reproduzida nas rodadas
  seguintes); o comportamento seguiu a spec (teto vira MANUAL).

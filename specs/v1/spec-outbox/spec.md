# Outbox v1: candidatura assistida com currículo camaleão

**Data:** 2026-10-09 | **Card:** sem card | **Status:** Rascunho (revisão 2: arquitetura)

---

## 1. Contexto e Objetivo

O Outbox é um CLI pessoal e local (Windows 11, Node 24, TypeScript). Ele recebe URLs de vagas e, para cada uma, gera um **currículo camaleão**: um currículo adaptado à vaga a partir de um currículo master, sem inventar nada. Depois preenche o formulário de candidatura no navegador e deixa o envio para a confirmação do usuário.

O objetivo é passar pelos filtros de ATS e reduzir o trabalho por candidatura a revisar e confirmar. O custo marginal de LLM é zero, porque o projeto usa o Claude Code headless dentro da assinatura do usuário.

A v1 entrega:

- Os comandos `importar`, `adicionar`, `preparar`, `aplicar`, `status`, `retorno`, `falhas`, `navegador` e `renderizar-master`.
- O toast do Windows.
- A fundação arquitetural, descrita em **`specs/v1/spec-outbox/arquitetura.md`** (camadas, pastas, padrões, testes, segurança, convenções e ADRs), que é parte normativa desta spec.

A v2 (`specs/v2/spec-outbox/spec.md`) acrescenta o painel e as métricas sobre a mesma arquitetura.

## 2. Premissas

- O usuário roda o Claude Code (2.1+) logado com assinatura Pro/Max, então `claude -p` não gera cobrança por token. Se o login for por API key, o projeto funciona do mesmo jeito, mas passa a cobrar por token.
- A máquina tem Node 24+ (com `node:sqlite` e execução nativa de TypeScript por type stripping) e Google Chrome instalado. Sem Chrome, o projeto usa o Chromium do Playwright.
- O uso é pessoal, com um usuário e uma máquina. Não há servidor nem nuvem.
- As páginas de vaga dos ATS suportados são públicas para leitura. A maioria expõe JSON-LD `schema.org/JobPosting`, e onde não houver há fallback por API do ATS ou por extração via LLM.
- O formato de saída do `claude -p --output-format json` é um objeto com os campos `type`, `subtype`, `is_error`, `result`, `session_id` e `num_turns`. A T10 confirma o texto do erro de limite de uso e as flags `--strict-mcp-config`, `--add-dir` e `--resume`.
- O Playwright MCP (`@playwright/mcp`) aceita `--cdp-endpoint` e tem ferramentas de abas e de upload de arquivo. A T18 confirma isso, os nomes das ferramentas e o suporte a restrição de origens na versão fixada.
- O usuário mantém por conta própria o perfil global da Gupy e faz a primeira sincronização com o master manualmente.
- O repositório é versionado em git. `curriculo/`, `dados/` e `config.yaml` contêm dados pessoais ou ajustes locais e nunca são versionados.

## 3. Decisões

As decisões técnicas e arquiteturais estão nos ADR-001 a ADR-016 de `arquitetura.md`. Esta tabela registra as decisões de produto e de comportamento.

| Decisão | Motivo | Alternativas descartadas |
| --- | --- | --- |
| Automação híbrida: conectores determinísticos para os ATS de maior volume e fallback agêntico para o restante | Roteiros determinísticos são rápidos e não gastam tokens, e o agente cobre a cauda longa (cerca de 49 canais) sem código por site | 100% agêntico; 100% conectores |
| LLM via `claude -p` (assinatura), atrás das portas `GeradorEstruturado` e `ExecutorAgente` | Custo marginal zero, com troca de provedor sem tocar nas regras | API com Sonnet 5.5 (cerca de US$ 0,07 por vaga); API com Haiku 4.5 |
| Navegador dedicado do Outbox: Chrome (ou Chromium) com perfil persistente em `dados/navegador/` e porta CDP, compartilhado por conectores, agente e MCP | Logins feitos uma vez valem para tudo, e o Chrome real reduz bloqueios de login com Google | Contexto efêmero; Chromium como padrão |
| Sempre revisar antes de enviar, com duas fases: `preparar` (sem o usuário) e `aplicar` (uma vaga por vez, revisão no terminal e no navegador) | Enviar é irreversível, e a espera pelo LLM sai da revisão | Automático com exceções; 100% automático; ponta a ponta por vaga |
| Camaleão com lastro obrigatório. Requisitos ausentes viram gaps perguntados no `aplicar`, e um "sim" grava a skill no master | Passa no ATS sem mentir, e o master melhora a cada lote | Lastro estrito; seção "em estudo"; texto oculto ou invenção (proibidos) |
| Empresa, cargo e datas vêm do master. O LLM só traduz o cargo quando o idioma difere. Todas as experiências aparecem, com pelo menos 1 bullet | Evita deturpar cargos e buracos na linha do tempo | LLM reescrever cargos; omitir experiências |
| Master em `curriculo/master.yaml` com ids, mais o comando `importar` | Permite validar o lastro e o master que aprende | Markdown livre; YAML à mão |
| PDF com texto selecionável, A4, coluna única, fontes do sistema e sem tabelas, ícones ou imagens | Formato que os ATS parseiam bem | DOCX; colunas |
| Currículo, respostas e carta no idioma da vaga (PT ou EN). Outros idiomas usam EN | Há vagas nacionais e internacionais misturadas | Master bilíngue; sempre PT |
| `perfil.yaml` (dados fixos) mais `respostas.yaml` (banco que aprende). Respostas geradas aparecem como NOVA, e as aprovadas ou editadas entram no banco | Perguntas se repetem entre vagas | Perfil sem memória; só campos mapeados |
| Salário calculado por código a partir da tabela por regime e moeda. O LLM só identifica regime, período e moeda | Valores de dinheiro precisam ser determinísticos | Valor único; omitir |
| Dados sensíveis (documentos, salário, diversidade, endereço completo, senhas) nunca entram em prompt, log ou `falhas/` (classificação em `arquitetura.md` §12.2) | Dado sensível não precisa passar pelo LLM | Enviar o perfil inteiro |
| Diversidade vem de `perfil.diversidade`. Sem dado, marca "prefiro não informar" | Padrão respeitoso e sem invenção | Perguntar sempre |
| Corte por aderência (0 a 100, determinístico sobre a análise do LLM) em `aderencia.scoreMinimo` (60), com `--forcar` e `--reavaliar` | Economiza LLM e revisão em vagas sem chance | Score informativo; sem score |
| Score ATS (cobertura de keywords) antes (master genérico) e depois (camaleão) | Mede o efeito do tailoring | Não medir |
| Entrada só por URLs de vaga individual | Escopo menor. Canais de listagem continuam suportados no nível da vaga | Expandir listagens; busca ativa |
| Duplicata = mesma empresa, título e localidade normalizados. Fica a de publicação mais recente, e o repost é aplicado mesmo que a anterior tenha sido ENVIADA. A mesma URL canônica já enviada vira DUPLICADA | Escolha do usuário: sempre aplicar na mais recente | Bloquear repost; cooldown |
| Sem regra para vagas diferentes na mesma empresa | Escolha do usuário | Aviso; limite por empresa |
| Cadastro assistido em ATS com conta por tenant, com senha gerada por tenant em `dados/credenciais.json`. Verificação de e-mail e CAPTCHA pausam para o usuário | Destrava Workday, Oracle e similares sem reusar senha | Manual; senha única |
| O agente preenche senha, documentos e respostas sensíveis via MCP `outbox-segredos`, só em hosts da allowlist da vaga | Os valores não entram no contexto do modelo, e a exfiltração por injeção fica bloqueada | Senha ou valores no prompt |
| Nenhum contorno de CAPTCHA | Termos de uso dos sites e risco de bloqueio | Serviços de resolução |
| LinkedIn, Indeed e Glassdoor só para resolver o ATS de destino. Easy Apply vira MANUAL com currículo e carta prontos | Os termos de uso proíbem automação | Automatizar Easy Apply; rejeitar domínios |
| Domínio sem conector vai para o agente. Sem formulário, vira MANUAL. Issue do GitHub com candidatura por e-mail vira MANUAL com carta | Regra única para a cauda longa | Rejeitar domínios |
| Conectores na v1: Greenhouse, Lever, Ashby, Gupy, InHire, SmartRecruiters, Workable e Teamtailor | Maior volume e formulários estáveis | Workday, SuccessFactors e Oracle (ficam no agente) |
| Carta de até 200 palavras quando o formulário tiver o campo, e sempre para vagas MANUAL | Campo frequente. Em MANUAL, serve de mensagem | Só se obrigatório; nunca |
| Gupy: perfil global fixo, com anexo e respostas variando por vaga. Testes nunca automatizados (PENDENTE_TESTE). `gupy.anexoPorCandidatura` definido pelo spike | O perfil é compartilhado, e os testes avaliam a pessoa | Reescrever o perfil; sem camaleão |
| Quando o conector falha, o agente assume na mesma aba, com teto de 40 turnos ou 10 minutos de execução do agente por tentativa de `aplicar` (pausas não contam). Passou disso, MANUAL | Robustez com custo controlado | Sem teto; falha direta |
| Falhas de conector versionadas em `falhas/<conector>/<AAAA-MM-DD>-<id>.json` e `.html` sanitizado. Vagas resolvidas pelo agente em domínios sem conector vão para `falhas/_sem-conector/<motor>/`. Sem conserto automático | Insumo para consertar e priorizar conectores | JSONL; Markdown; comando de conserto |
| Edição na revisão direto no navegador. O CLI lê os valores finais e marca `anexo_manual` | O registro reflete o que foi enviado | VS Code; instrução ao LLM |
| Screenshots `antes-envio.png` e `confirmacao.png` | Comprovante e diagnóstico | Só confirmação; nenhum |
| `preparar` com paralelo padrão 2. No limite da assinatura, para e mantém as restantes como NOVA | Velocidade e cota | Sequencial; 4 |
| PDF enviado como `Nome_Sobrenome_CV.pdf` (carta: `Nome_Sobrenome_Carta.pdf`) | O recrutador vê o nome do arquivo | Incluir cargo |
| Retorno marcado manualmente (`retorno`), sem expiração | Escolha do usuário. Captura o dado para as métricas da v2 | Leitura de e-mail; expiração |
| Toast do Windows quando o `preparar` termina ou para no limite | Aviso sem configuração | Telegram; e-mail |
| Todo identificador, comando, flag, tabela e valor de enum em português ASCII | Escolha do usuário (ADR-003) | Inglês; misto |

## 4. Glossário

- **Currículo master**: `curriculo/master.yaml`, fonte única e verdadeira de experiências, projetos, formação, skills e idiomas, com ids estáveis.
- **Currículo camaleão**: o currículo gerado para uma vaga, reordenado e reescrito na terminologia da vaga, com lastro no master.
- **Lastro**: o vínculo verificável entre cada afirmação do currículo gerado e um item do master (campo `origem` com ids).
- **Motor**: o sistema por trás da vaga (ATS ou agregador), detectado pela URL ou pela página (`greenhouse`, `workday`, `linkedin`, `dominio:vagas.b3.com.br`).
- **Canal**: o motor detectado na URL original de entrada (por exemplo, `linkedin`). O **motor** gravado é o resolvido (por exemplo, `greenhouse`).
- **Conector**: a implementação determinística que lê e preenche o formulário de um motor (porta `ConectorAts`). Na revisão 1 se chamava "adaptador".
- **Agente**: o fallback agêntico, isto é, `claude -p` com o Playwright MCP e o `outbox-segredos` operando o navegador do Outbox.
- **Formulário aberto**: o handle de um formulário preenchido e ainda não enviado (porta `FormularioAberto`), comum a conector e agente.
- **Agregador**: um site que lista vagas de terceiros. O Outbox só o usa para chegar ao ATS de destino.
- **Tenant**: a instância de um ATS por empresa, identificada pelo hostname.
- **Aderência**: um score de 0 a 100 que indica o quanto o usuário atende à vaga.
- **Score ATS**: o percentual das keywords da vaga presentes no texto do currículo.
- **Gap**: um requisito da vaga sem evidência no master.
- **Banco de respostas**: `curriculo/respostas.yaml`, com pares pergunta e resposta reaproveitáveis.
- **Pacote de candidatura**: tudo o que o `aplicar` usa para uma vaga (PDF, respostas sugeridas, carta e contato).
- **Master genérico**: o PDF e o texto do master sem tailoring (`dados/master/`).
- **Porta**: a interface da camada de aplicação que a infra implementa (`arquitetura.md` §6).
- **Allowlist de hosts**: os hosts em que o `outbox-segredos` aceita preencher dados protegidos para uma vaga.

## 5. Fora do Escopo

- Expandir URLs de listagem ou de busca e fazer busca ativa ou agendada.
- Automatizar LinkedIn Easy Apply, Indeed Apply ou a candidatura nativa do Glassdoor.
- Conectores determinísticos para Workday, SAP SuccessFactors, Oracle Recruiting, Cornerstone, Eightfold e portais próprios. Todos vão para o agente.
- Automatizar testes de qualquer plataforma (lógica, fit cultural, idiomas, vídeo).
- Contornar CAPTCHA ou usar técnicas de evasão de detecção.
- Texto oculto, keywords sem lastro, inventar experiências, skills, certificações ou métricas, e alterar cargos ou datas.
- Enviar candidaturas por e-mail. A vaga fica MANUAL com a carta pronta.
- Ler a caixa de e-mail e expirar candidaturas automaticamente.
- Conserto automático de conectores.
- Painel web, métricas e clique no toast (v2).
- Métricas operacionais e experimento A/B.
- Telegram e e-mail como canais de notificação.
- Nuvem, outra máquina ou disparo remoto.
- Reescrever o perfil global da Gupy.
- Itens de `arquitetura.md` §15.2 ("Não construir agora").

## 6. Contrato de Aceite

| ID | Critério | Como validar | Tarefas |
| --- | --- | --- | --- |
| AC1 | O projeto instala e expõe os comandos `importar`, `adicionar`, `preparar`, `aplicar`, `status`, `retorno`, `falhas`, `navegador` e `renderizar-master`. `curriculo/`, `dados/` e `config.yaml` ficam fora do git | `npm ci`, `npx playwright install chromium`, `npm run outbox -- --help`; `git check-ignore curriculo/master.yaml dados/outbox.db config.yaml` retorna os três | T1, T24 |
| AC2 | `importar <arquivo>` (.pdf, .docx, .md ou .txt) gera um `curriculo/master.yaml` válido. Não sobrescreve sem `--sobrescrever` e, com a flag, cria `master.yaml.bak-<AAAAMMDDHHmmss>`. Cria `perfil.yaml`, `respostas.yaml` e `gaps.yaml` a partir de `curriculo.exemplo/` quando faltarem | Teste do caso de uso com `GeradorEstruturadoRoteirizado`; teste de integração do `ArmazemCurriculoYaml` em pasta temporária | T9, T10, T20 |
| AC3 | `adicionar` canoniza URLs e aplica a deduplicação por URL: na fila, é ignorada; já ENVIADA ou posterior, vira DUPLICADA `url_ja_enviada`; PULADA ou DESCARTADA, volta a NOVA; MANUAL ou DUPLICADA, é ignorada com aviso | Tabela de casos de `canonizar` e de `decidirDeduplicacaoUrl` (unitários); teste do caso de uso com SQLite `:memory:` | T3, T20 |
| AC4 | Resolução: página de carreira com Greenhouse embutido vira canônica do Greenhouse; LinkedIn com link externo vira URL do ATS; Easy Apply vira MANUAL `easy_apply` com PDF e carta; issue do GitHub com e-mail vira MANUAL `candidatura_por_email` com carta; domínio sem ATS detectável fica com motor `dominio:<host>` e rota `agente` | Testes de integração com fixtures em `tests/fixtures/resolucao/`; teste da etapa `resolverVaga` com fakes | T12, T21 |
| AC5 | A extração preenche `vaga.json` (empresa, cargo, descrição, localidade e `publicadaEm` quando houver), na ordem: API do conector, JSON-LD e LLM | Integração do `ExtratorEstrutural` com fixtures; teste da etapa com o fallback de LLM roteirizado | T12, T21 |
| AC6 | A aderência segue exatamente a fórmula da T4. Abaixo de 60, vira DESCARTADA `aderencia_baixa` com detalhamento em `analise.json`. `--forcar` processa. Afirmativa exclusiva fora dos grupos do perfil vira DESCARTADA `afirmativa_inelegivel`, mesmo com `--forcar`. `--reavaliar` recalcula usando os gaps aprendidos, sem LLM | Unitários de `calcularAderencia` e `recalcularComGaps`; teste do caso de uso `prepararVagas` | T4, T21 |
| AC7 | A deduplicação por chave respeita os 4 cenários da T3, de forma atômica (`BEGIN IMMEDIATE`) | Unitários de `decidirDeduplicacaoChave`; teste de integração com duas conexões no mesmo arquivo | T3, T8, T21 |
| AC8 | O validador de lastro rejeita R1 a R6. O documento puxa empresa, cargo e datas do master. Há 1 retry com as violações e, na segunda falha, usa o master genérico com `camaleao_falhou = "lastro"` | Unitários de `validarLastro` e `montarDocumento`; teste da etapa `gerarCurriculo` | T4, T21 |
| AC9 | O PDF sai em A4, coluna única e com texto extraível (nome e todos os bullets), nomeado `Nome_Sobrenome_CV.pdf`, com títulos no idioma da vaga. Mais de 2 páginas gera alerta | Integração do renderizador com extração de texto (`pdfjs-dist`) e contagem de páginas | T4, T11 |
| AC10 | `ats_antes` e `ats_depois` são gravados e exibidos na revisão e no `status` | Unitário de `scoreAts`; testes dos casos de uso e do apresentador | T4, T21, T23, T24 |
| AC11 | Campos padrão, documentos, salário e diversidade são resolvidos por código: salário pela tabela da T5, selects de faixa pela faixa que contém o valor, diversidade com fallback "prefiro não informar". Valores de `perfil.documentos`, `perfil.salario` e `perfil.diversidade` e do endereço completo nunca aparecem em `dados/vagas/*/llm/*.json` nem no prompt do agente | Unitários do domínio de respostas; teste de integração que roda `preparar` e `aplicar` com o executável falso do claude e um perfil fictício e faz grep dos valores sensíveis nos logs de LLM e no prompt do agente | T5, T10, T18, T21 |
| AC12 | Depois do envio, respostas NOVA ou editadas, não sensíveis e sem `especificaDaVaga`, entram no banco (`aplicarAprendizado`). As outras não entram | Unitário de `aplicarAprendizado`; teste da etapa `revisarEEnviar` | T5, T22 |
| AC13 | `aplicar` nunca chama `FormularioAberto.enviar()` sem a escolha `[e]nviar`. Com `--simular`, nunca envia. Gera `antes-envio.png` e `confirmacao.png`, grava `respostas_enviadas` com os valores lidos e marca `anexo_manual` | Teste do caso de uso com `FormularioAberto` fake (espião de `enviar`) e `InteracaoRoteirizada` | T22 |
| AC14 | Rodada de gaps consolidada e ordenada por frequência. "Sim" grava a skill (`origem: aprendido`) preservando os comentários do YAML. "Não" grava em `gaps.yaml` e nunca se repete. As vagas afetadas passam por novo tailoring | Teste da etapa com fakes; integração do `ArmazemCurriculoYaml` com YAML comentado | T9, T22 |
| AC15 | Cada um dos 8 conectores passa na suíte de contrato sobre as suas fixtures: preenche todos os campos do pacote de exemplo, anexa o PDF, não envia e detecta a confirmação | `tests/contratos/contrato-conector.ts` executada por conector (Chromium headless, `page.route`, sem rede) | T13, T14, T15, T16 |
| AC16 | `ErroFalhaConector` gera `falhas/<conector>/<data>-<id>.json` (schema da T5) e um `.html` sanitizado, sem valores de input, sem `<script>` e sem PII. Em seguida o agente assume com o contexto da falha | Unitário de `sanitizarHtml`; teste da etapa `preencherFormulario` com conector fake que lança o erro | T5, T9, T22 |
| AC17 | Vaga sem conector é preenchida pelo agente e registrada em `falhas/_sem-conector/<motor>/`. Ao ultrapassar 40 turnos somados ou 10 minutos de execução do agente, vira MANUAL `teto_agente` | Integração do `ExecutorAgenteClaude` com o executável falso (consumo de turnos e tempo); teste da etapa | T18, T22 |
| AC18 | `dados/credenciais.json` guarda uma senha única por tenant. Senha, documentos e respostas protegidas nunca aparecem em retorno de ferramenta MCP, prompt ou log. As ferramentas recusam hosts fora de `OUTBOX_HOSTS_PERMITIDOS` | Integração do MCP com página fixture: campo preenchido, retorno sem valor, recusa em host não permitido; grep nos logs | T17 |
| AC19 | Diante de CAPTCHA visível ou de verificação de e-mail, o fluxo pausa e aguarda Enter. Não existe código nem dependência de resolução de CAPTCHA | Fixture com iframe de reCAPTCHA na suíte de contrato; revisão do `package.json` | T11, T13, T18, T22 |
| AC20 | `preparar` respeita `--paralelo` (padrão 2). Com `ErroLimiteUso`, não inicia novas vagas, mantém as não concluídas como NOVA e notifica. Ao terminar, notifica com o resumo | Teste do caso de uso com gerador roteirizado lançando `ErroLimiteUso` na 3ª chamada e `NotificadorEspiao` | T19, T21 |
| AC21 | `status`, `retorno` e `falhas` produzem a saída especificada, e `retorno` recusa transições inválidas listando as aceitas | Testes dos casos de uso e snapshot dos apresentadores | T23, T24 |
| AC22 | Na Gupy, a etapa de teste após o envio gera PENDENTE_TESTE, e o anexo segue `gupy.anexoPorCandidatura`, definido e documentado em `docs/spikes/gupy.md` | Contrato do conector com fixture da etapa de teste; existência do documento | T16 |
| AC23 | O currículo, as respostas e a carta saem no idioma da vaga (PT ou EN, com EN para os demais) | Testes das etapas conferindo o idioma pedido e a saída validada | T21 |
| AC24 | As fronteiras de camada de `arquitetura.md` §11.3 são verificadas: um import proibido faz `npm run lint` falhar | `tests/arquitetura/fronteiras.test.ts` com trechos sintéticos por camada (casos que devem falhar e passar) | T1 |
| AC25 | Migrações versionadas: banco novo aplica todas; banco na versão N aplica só as pendentes; `PRAGMA user_version` atualizado; migração com erro faz rollback e não avança a versão | Integração do migrador com arquivo temporário e migrações de teste | T8 |
| AC26 | O primeiro Ctrl+C durante `preparar` ou `aplicar` encerra de forma ordenada: vagas em andamento ficam no status anterior, `tentativas_preparo` não muda e não há arquivo parcial. O segundo Ctrl+C sai com 130. Um segundo `preparar` simultâneo falha com mensagem e código 2 | Teste do caso de uso com `AbortController` abortado no meio; integração da trava de processo; teste do tratamento de sinais | T7, T21, T22, T24 |
| AC27 | O log grava JSONL em `dados/logs/outbox-AAAA-MM-DD.jsonl`, com nível controlado por `OUTBOX_LOG`, e nenhuma string de PII nem valor de chave sensível aparece | Integração do `RegistradorJsonl` com master e perfil fictícios | T7 |
| AC28 | Fronteira de confiança: conteúdo externo vai delimitado em `<conteudo_nao_confiavel>` nos prompts; o agente roda só com as ferramentas da allowlist (sem execução de script); o render de PDF roda sem JavaScript e com rede bloqueada | Teste do `GeradorEstruturadoClaude` inspecionando o prompt; teste dos argumentos do agente; integração do renderizador com HTML contendo `<script>` e `<img src=http…>` | T10, T11, T18 |
| AC29 | `npm run verificar` passa num clone limpo: tipos, lint, formatação, testes com os limiares de cobertura por camada e `npm audit`. Nenhum teste faz rede. O workflow de CI roda em `windows-latest` | Execução local e do workflow; teste que garante que o `fetch` não stubado lança erro | T1 |
| AC30 | Códigos de saída: 0 sucesso, 1 erro, 2 uso inválido, 130 interrompido. A falha de uma vaga não interrompe o lote | Testes de `codigos-saida.ts`; teste do caso de uso com uma vaga lançando `ErroExtracao` entre duas válidas | T21, T24 |
| AC31 | `status`, `retorno` e `falhas` executam sem carregar `playwright`, `mammoth` ou `node-notifier` | Teste da composição com espiões nos getters preguiçosos; teste que verifica os módulos carregados ao executar `status` | T24 |

## 7. Tarefas

O código das tarefas T20 a T23 depende apenas do domínio e das portas. Os testes delas usam os fakes de `tests/apoio/` e o repositório SQLite em memória (T8). Por isso podem ser feitas em paralelo com o resto da infra (T9 a T19).

| Tarefa | Objetivo | Arquivos/Áreas | Depende de | Pode paralelizar com | Critérios |
| --- | --- | --- | --- | --- | --- |
| T1 | Fundação do repositório, qualidade e CI | raiz, `bin/outbox.js`, `tests/apoio/setup.ts`, `tests/arquitetura/`, `.github/workflows/verificar.yml` | Nenhuma | Nenhuma | AC1, AC24, AC29 |
| T2 | Schemas do domínio e exemplos | `src/dominio/**` (schemas), `src/dominio/compartilhado/`, `curriculo.exemplo/` | T1 | Nenhuma | AC2 |
| T3 | Domínio de vagas | `src/dominio/vagas/` | T2 | T4, T5 | AC3, AC7 |
| T4 | Domínio de currículo e análise | `src/dominio/curriculo/`, `src/dominio/analise/` | T2 | T3, T5 | AC6, AC8, AC9, AC10 |
| T5 | Domínio de respostas e falhas | `src/dominio/respostas/`, `src/dominio/falhas/` | T2 | T3, T4 | AC11, AC12, AC16 |
| T6 | Portas, erros de porta, concorrência e apoio de testes | `src/aplicacao/portas/`, `src/aplicacao/compartilhado/`, `tests/apoio/` | T3 | T4, T5 | Base de todos |
| T7 | Infra base: config, log, relógio, escrita atômica, trava, HTTP | `src/infra/config/`, `src/infra/log/`, `src/infra/sistema/`, `config.exemplo.yaml` | T5, T6 | Nenhuma (desbloqueia T8 a T19) | AC26, AC27 |
| T8 | Persistência SQLite | `src/infra/banco/` | T3, T6, T7 | T9 a T19 | AC7, AC25 |
| T9 | Armazenamento em arquivos | `src/infra/armazenamento/` | T5, T6, T7 | T8, T10 a T19 | AC2, AC14, AC16 |
| T10 | LLM: processo claude, gerador estruturado e prompts | `src/infra/llm/`, `prompts/`, `tests/fakes/claude.mjs` | T6, T7 | T8, T9, T11 a T19 | AC2, AC11, AC28 |
| T11 | Navegador, leitor headless e documentos | `src/infra/navegador/`, `src/infra/documentos/` | T4, T6, T7 | T8 a T10, T19 | AC9, AC19, AC28 |
| T12 | Resolução e extração | `src/infra/resolucao/`, `src/infra/extracao/` | T3, T11 | T13 a T19 | AC4, AC5 |
| T13 | Base de conectores, contratos e captura de fixtures | `src/infra/conectores/base/`, `tests/contratos/`, `tests/apoio/harness-conector.ts`, `scripts/capturar-fixture.ts` | T5, T11 | T12, T17 a T19 | AC15, AC19 |
| T14 | Conectores Greenhouse, Lever e Ashby | `src/infra/conectores/{greenhouse,lever,ashby}/`, `tests/fixtures/` | T13 | T15, T16, T18 | AC15 |
| T15 | Conectores SmartRecruiters, Workable e Teamtailor | `src/infra/conectores/{smartrecruiters,workable,teamtailor}/`, `tests/fixtures/` | T13 | T14, T16, T18 | AC15 |
| T16 | Conectores Gupy e InHire, com spikes | `src/infra/conectores/{gupy,inhire}/`, `docs/spikes/`, `tests/fixtures/` | T13, T17 | T14, T15, T18 | AC15, AC22 |
| T17 | Cofre de credenciais e MCP `outbox-segredos` | `src/infra/credenciais/`, `src/interfaces/mcp/` | T9, T11 | T12 a T15 | AC18 |
| T18 | Agente | `src/infra/agente/`, `prompts/agente-candidatura.md` | T10, T11, T17 | T14 a T16 | AC11, AC17, AC19, AC28 |
| T19 | Notificação | `src/infra/notificacao/` | T6, T7 | T8 a T18 | AC20 |
| T20 | Casos de uso de entrada | `src/aplicacao/casos-de-uso/{importar-curriculo,adicionar-vagas,renderizar-master,abrir-navegador}.ts` | T3 a T6, T8 | T9 a T19, T21, T23 | AC2, AC3 |
| T21 | Etapas de preparo e caso de uso `preparar` | `src/aplicacao/etapas/`, `src/aplicacao/casos-de-uso/preparar-vagas.ts` | T3 a T6, T8 | T9 a T20, T23 | AC4 a AC8, AC10, AC11, AC20, AC23, AC26, AC30 |
| T22 | Etapas de aplicação e caso de uso `aplicar` | `src/aplicacao/etapas/`, `src/aplicacao/casos-de-uso/aplicar-vagas.ts` | T21 | T9 a T19, T23 | AC12 a AC14, AC16, AC17, AC19, AC26 |
| T23 | Casos de uso de consulta | `src/aplicacao/casos-de-uso/{listar-status,registrar-retorno,listar-falhas}.ts` | T3, T6, T8 | T9 a T22 | AC10, AC21 |
| T24 | Composição e CLI | `src/composicao.ts`, `src/interfaces/cli/` | T7 a T23 | Nenhuma | AC1, AC10, AC21, AC26, AC30, AC31 |
| T25 | Documentação viva | `README.md`, `docs/` | T24 | Nenhuma | AC1 |

### T1: Fundação do repositório, qualidade e CI

**Arquivo:** `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `vitest.config.ts`, `.editorconfig`, `.gitattributes`, `.gitignore`, `.npmrc`, `bin/outbox.js`, `falhas/.gitkeep`, `tests/apoio/setup.ts`, `tests/arquitetura/fronteiras.test.ts`, `.github/workflows/verificar.yml` | **Ação:** Criar

**Detalhes:**

- **`package.json`.**
  - Campos: `"name": "outbox"`, `"type": "module"`, `"engines": { "node": ">=24" }` e `"bin": { "outbox": "bin/outbox.js" }`.
  - `"imports"`: `"#dominio/*": "./src/dominio/*"`, `"#aplicacao/*": "./src/aplicacao/*"`, `"#infra/*": "./src/infra/*"`, `"#interfaces/*": "./src/interfaces/*"`, `"#composicao": "./src/composicao.ts"` e `"#testes/*": "./tests/*"`.
  - Scripts:
    - `"outbox": "node bin/outbox.js"`
    - `"test": "vitest run"`
    - `"lint": "eslint ."`
    - `"formatar": "prettier --write ."`
    - `"tipos": "tsc --noEmit"`
    - `"verificar": "npm run tipos && npm run lint && prettier --check . && vitest run --coverage && npm audit --omit=dev --audit-level=high"`
    - `"capturar-fixture": "node scripts/capturar-fixture.ts"`
  - Dependências: exatamente as da tabela de `arquitetura.md` §14, com versões exatas.
- **`tsconfig.json`.** `target: "ES2024"`, `module`/`moduleResolution` `"NodeNext"`, `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `allowImportingTsExtensions`, `noEmit`, `skipLibCheck` e `types: ["node"]`. `include`: `src`, `tests`, `scripts` e `bin`.
- **`eslint.config.js`.** Flat config com `@eslint/js` recommended, `typescript-eslint` `strictTypeChecked` (`parserOptions.projectService: true`), as regras e fronteiras de `arquitetura.md` §11.3 e `eslint-config-prettier` por último. Ignora `coverage/`, `tests/fixtures/` e `dados/`.
- **Formatação e editor.**
  - `.prettierrc.json`: `{ "printWidth": 100 }`.
  - `.prettierignore`: `coverage/`, `tests/fixtures/`, `dados/`, `curriculo/` e `falhas/**/*.html`.
  - `.editorconfig` e `.gitattributes` conforme `arquitetura.md` §16.3.
- **`.gitignore`.** `node_modules/`, `coverage/`, `curriculo/`, `dados/`, `config.yaml` e `*.log`.
- **`.npmrc`.** `engine-strict=true`, `save-exact=true` e `ignore-scripts=true`.
- **`vitest.config.ts`.**
  - `include: ["src/**/*.test.ts", "tests/**/*.test.ts"]`, `setupFiles: ["tests/apoio/setup.ts"]`, `retry: 0` e `testTimeout: 15000`.
  - Cobertura v8 sobre `src/**`, com limiares `src/dominio/**` 90 (linhas e ramos), `src/aplicacao/**` 80 e global 70.
- **`tests/apoio/setup.ts`.** Substitui `globalThis.fetch` por uma função que lança `Error("rede bloqueada em testes")`. Os testes que precisam de HTTP injetam um `ClienteHttp` fake.
- **`tests/arquitetura/fronteiras.test.ts`.** Usa a classe `ESLint` (`lintText` com `filePath` sintético em cada camada) para afirmar que imports proibidos geram erro e imports permitidos não geram.
- **`bin/outbox.js`** (JavaScript puro).
  1. Filtra só os `ExperimentalWarning` cujo texto contém `SQLite` ou `Type Stripping`, sobrescrevendo `process.emitWarning` antes de qualquer import.
  2. Executa `await import("../src/interfaces/cli/principal.ts")` e chama `executar(process.argv)`.

  **Verificação nesta tarefa:** confirmar que o Node 24 instalado executa `.ts` sem flag. Se exigir `--experimental-strip-types`, o bin se reexecuta via `child_process.spawn(process.execPath, ["--experimental-strip-types", ...process.argv.slice(1)], { stdio: "inherit" })`. Se a execução nativa for inviável, aplicar o fallback do ADR-004 (`tsx`) e registrar uma ADR nova.
- **`.github/workflows/verificar.yml`.** Em `push` e `pull_request`, roda em `windows-latest` com Node 24: `npm ci`, `npx playwright install chromium` e `npm run verificar`.

### T2: Schemas do domínio e exemplos

**Arquivo:** `src/dominio/compartilhado/erros.ts`, `src/dominio/compartilhado/texto.ts`, `src/dominio/compartilhado/marca.ts`, `src/dominio/curriculo/master.ts`, `src/dominio/curriculo/curriculo-gerado.ts`, `src/dominio/analise/analise-vaga.ts`, `src/dominio/analise/gaps.ts`, `src/dominio/respostas/perfil.ts`, `src/dominio/respostas/campo.ts`, `src/dominio/respostas/banco.ts`, `src/dominio/respostas/pacote.ts`, `src/dominio/vagas/vaga-extraida.ts`, `curriculo.exemplo/master.yaml`, `curriculo.exemplo/perfil.yaml`, `curriculo.exemplo/respostas.yaml`, `curriculo.exemplo/gaps.yaml` | **Ação:** Criar

**Detalhes:** todos os schemas são escritos em Zod v4 e exportam o tipo com `z.infer`, com campos `readonly`.

- **`erros.ts`.** `ErroOutbox` (base, com `codigo: string`, `message` e `cause`), `ErroUsuario`, `ErroDominio`, `ErroTransicaoInvalida` (com `de`, `para` e `aceitas: Status[]`) e `ErroValidacao` (com `caminho` e `detalhe`, criado a partir de `ZodError`).
- **`texto.ts`.** `normalizarTexto(s)`: passa para minúsculas, remove acentos via NFD, troca pontuação por espaço e colapsa espaços.
- **`marca.ts`.** `type Marca<T, N extends string> = T & { readonly __marca: N }`.
- **`Master`:**
  - `idioma`: `"pt"` ou `"en"`.
  - `pessoal`: `{ nome, titulo, email, telefone, cidade, uf?, pais, linkedin?, github?, portfolio? }`.
  - `resumo`.
  - `experiencias[]`: `{ id, empresa, cargo, inicio: "AAAA-MM", fim: "AAAA-MM" ou null, local?, bullets[] }`, com cada bullet `{ id, texto, skills: idSkill[] }`.
  - `projetos[]`: `{ id, nome, descricao, url?, skills, bullets: [{ id, texto }] }`.
  - `formacao[]`: `{ id, instituicao, curso, grau, inicio, fim }`.
  - `certificacoes[]`: `{ id, nome, emissor, ano, url? }`.
  - `skills[]`: `{ id, nome, aliases, categoria, anos?, nivel?, origem, evidencia?, aprendidoEm?, vagaOrigem? }`.
    - `categoria`: `linguagem`, `framework`, `ferramenta`, `cloud`, `banco`, `pratica` ou `soft`.
    - `nivel`: `basico`, `intermediario` ou `avancado`.
    - `origem`: `master` ou `aprendido`.
  - `idiomas[]`: `{ idioma, nivel }`, com `nivel` igual a `basico`, `intermediario`, `avancado`, `fluente` ou `nativo`.

  Os ids são únicos no arquivo inteiro e os ids de `skills` referenciados existem, ambos validados com `superRefine`.
- **`Perfil`:**
  - `documentos`: `{ cpf?, rg?, dataNascimento? }`.
  - `endereco`: `{ logradouro?, numero?, complemento?, bairro?, cidade, uf?, cep?, pais }`.
  - `salario`: `{ clt_brl_mensal, pj_brl_mensal, usd_anual }`.
  - `disponibilidade`: `{ avisoPrevioDias, inicioImediato, viagens, mudanca }`.
  - `autorizacaoTrabalho`: `{ brasil, precisaSponsorship, paisesAutorizados }`.
  - `diversidade?`:
    - `genero`: `mulher_cis`, `mulher_trans`, `homem_cis`, `homem_trans`, `nao_binario` ou `outro`.
    - `raca`: `branca`, `preta`, `parda`, `amarela` ou `indigena`.
    - `pcd`: booleano.
    - `lgbtqia`: booleano.
  - `preferencias`:
    - `modelos`: `remoto`, `hibrido` ou `presencial`.
    - `cidades`.
    - `senioridades`: `estagio`, `junior`, `pleno`, `senior`, `especialista` ou `lideranca`.
    - `regimes`: `clt`, `pj` ou `contractor`.
  - `comoSoube`.
- **`BancoRespostas`.** Lista de `{ id: /^r-\d{4}$/, pergunta, variantes, idioma, tipo, resposta, atualizadaEm }`, com `tipo` igual a `texto`, `sim_nao`, `opcao` ou `numero`.
- **`GapsNegados`.** `{ negados: string[] }`, com termos normalizados.
- **`Campo`.** `{ id, rotulo, tipo, obrigatorio, opcoes?, categoria }`.
  - `tipo`: `texto`, `textarea`, `select`, `radio`, `checkbox`, `arquivo`, `numero`, `data`, `email` ou `telefone`.
  - `categoria`: `padrao`, `documento`, `curriculo`, `carta`, `salario`, `diversidade` ou `pergunta`.
- **`VagaExtraida`.** `{ empresa, cargo, descricao, localidade?, publicadaEm?, regimeTexto?, urlCandidatura? }`.
- **`AnaliseVaga`:**
  - `idioma`: `pt`, `en` ou `outro`.
  - `senioridade`: um valor de senioridade ou `nao_informada`.
  - `modelo`: um valor de modelo ou `nao_informado`.
  - `cidade?`.
  - `regime`: `clt`, `pj`, `contractor` ou `nao_informado`.
  - `afirmativa`: `{ exclusiva, grupos[] }`, com grupos `mulheres`, `pessoas_negras`, `pcd`, `lgbtqia`, `pessoas_50_mais`, `indigenas` ou `outro`.
  - `requisitos[]`: `{ texto, termo, obrigatorio, status, evidencias: id[] }`, com `status` igual a `coberto`, `parcial` ou `ausente`.
  - `keywords[]`: de 10 a 30 itens `{ termo, tipo }`, com `tipo` igual a `tecnologia`, `certificacao`, `pratica` ou `dominio`.
  - `comoCandidatar?`: `{ tipo: link, email ou outro; valor }`.
- **`CurriculoGerado`:**
  - `idioma`: `pt` ou `en`.
  - `titulo`.
  - `resumo`.
  - `experiencias[]`: `{ id, cargoTraducao?, bullets: [{ texto, origem: id[] }] }`.
  - `projetos[]`: `{ id, bullets: [{ texto, origem }] }`.
  - `skills`: ids.
  - `formacao`: ids.
  - `certificacoes`: ids.
- **`RespostaSugerida`.** `{ campoId?, rotulo, categoria, valor: string ou null, fonte, confianca, especificaDaVaga, sensivel }`.
  - `fonte`: `perfil`, `codigo`, `banco:<id>` ou `gerada`.
  - `confianca`: `alta` ou `baixa`.
  - `sensivel` é verdadeiro para as categorias `documento`, `salario` e `diversidade`.
- **`PacoteCandidatura`.** `{ vagaId, idioma, pdfCurriculo, pdfCarta?, carta?, respostas: RespostaSugerida[], contato: Master["pessoal"] e cidade/UF/país }`. **Não contém** o `Perfil`.
- **`curriculo.exemplo/`.** Exemplos completos e fictícios, comentados em PT-BR. Um teste valida cada exemplo contra o schema.

### T3: Domínio de vagas

**Arquivo:** `src/dominio/vagas/status.ts`, `src/dominio/vagas/vaga.ts`, `src/dominio/vagas/transicoes.ts`, `src/dominio/vagas/motores.ts`, `src/dominio/vagas/chave.ts`, `src/dominio/vagas/deduplicacao.ts` (mais os `*.test.ts`) | **Ação:** Criar

**Detalhes:**

- **`status.ts`.** Objetos `as const` e os tipos união derivados:
  - `STATUS`: `NOVA`, `PRONTA`, `ERRO_PREPARO`, `DESCARTADA`, `DUPLICADA`, `MANUAL`, `PULADA`, `ENVIADA`, `PENDENTE_TESTE`, `EM_PROCESSO`, `OFERTA` e `RECUSADA`.
  - `MOTIVOS`, por status:

    | Status | Motivos |
    | --- | --- |
    | DESCARTADA | `aderencia_baixa`, `duplicada_antiga`, `afirmativa_inelegivel`, `manual` (v2) |
    | DUPLICADA | `url_ja_enviada`, `mesma_vaga_na_fila` |
    | MANUAL | `easy_apply`, `candidatura_por_email`, `sem_formulario`, `teto_agente`, `agente_bloqueado`, `escolha_usuario` |
    | ERRO_PREPARO | `resolucao_falhou`, `agregador_exige_login`, `extracao_falhou`, `llm_falhou` |

  - `ETAPAS`: `triagem`, `entrevista_rh`, `tecnica` e `final`.
  - `ROTAS`: `conector`, `agente`, `manual` e `a_definir`.
  - Grupos reutilizados por outros contextos e pela v2:
    - `STATUS_NA_FILA`: NOVA, PRONTA, ERRO_PREPARO.
    - `STATUS_POS_ENVIO`: ENVIADA, PENDENTE_TESTE, EM_PROCESSO, OFERTA, RECUSADA.
    - `STATUS_COM_RESPOSTA`: EM_PROCESSO, OFERTA, RECUSADA.
    - `STATUS_IGNORADOS_DEDUP`: PULADA, DESCARTADA, MANUAL, DUPLICADA.
    - `ETAPAS_ENTREVISTA`: `entrevista_rh`, `tecnica`, `final`.
- **`vaga.ts`.**
  - O tipo `Vaga` (agregado de leitura, em camelCase, espelhando a tabela da T8), `NovaVaga` e `AtualizacaoVaga`.
  - Tipos de marca: `IdVaga` (número), `UrlCanonica` e `ChaveDedup`.
- **`transicoes.ts`.**
  - `TRANSICOES_VALIDAS: Record<Status, readonly Status[]>`:

    | De | Para |
    | --- | --- |
    | NOVA | PRONTA, ERRO_PREPARO, DESCARTADA, DUPLICADA, MANUAL |
    | ERRO_PREPARO | PRONTA, ERRO_PREPARO, DESCARTADA, DUPLICADA, MANUAL |
    | PRONTA | ENVIADA, PENDENTE_TESTE, PULADA, MANUAL, DESCARTADA, PRONTA (re-tailoring) |
    | PULADA ou DESCARTADA | NOVA |
    | MANUAL | ENVIADA |
    | PENDENTE_TESTE | ENVIADA, RECUSADA |
    | ENVIADA | EM_PROCESSO, OFERTA, RECUSADA |
    | EM_PROCESSO | EM_PROCESSO (troca de etapa), OFERTA, RECUSADA |

  - `validarTransicao(de, para, { motivo?, etapa? })` lança `ErroTransicaoInvalida` quando a transição não existe, quando o motivo não pertence a `MOTIVOS[para]`, quando um status que exige motivo (DESCARTADA, DUPLICADA, MANUAL, ERRO_PREPARO) não recebe motivo, ou quando EM_PROCESSO não recebe etapa.
- **`motores.ts`.**
  - `PADROES_MOTOR` é a tabela única, consumida por detecção, canonização, canal, resolução e pela v2.

    | Motor | Padrão de host e caminho |
    | --- | --- |
    | greenhouse | `job-boards.greenhouse.io`, `job-boards.eu.greenhouse.io` e `boards.greenhouse.io`, com `/<board>/jobs/<id>` |
    | lever | `jobs.lever.co` e `jobs.eu.lever.co`, com `/<empresa>/<uuid>` |
    | ashby | `jobs.ashbyhq.com`, com `/<org>/<uuid>` |
    | gupy | `*.gupy.io` |
    | inhire | `*.inhire.app` |
    | smartrecruiters | `jobs.smartrecruiters.com` |
    | workable | `apply.workable.com` |
    | teamtailor | `*.teamtailor.com` |
    | workday | `*.myworkdayjobs.com` |
    | oracle | `*.oraclecloud.com` com `CandidateExperience` no caminho |
    | successfactors | `*.successfactors.com`, `*.successfactors.eu`, `*.sapsf.com`, `*.sapsf.eu` |
    | cornerstone | `*.csod.com` |
    | eightfold | `*.eightfold.ai` |
    | linkedin | `linkedin.com` e subdomínios |
    | indeed | `indeed.com`, `indeed.com.br` e subdomínios |
    | glassdoor | `glassdoor.com`, `glassdoor.com.br` e subdomínios |
    | github | `github.com` com `/<owner>/<repo>/issues/<n>` |
    | (qualquer outro) | `dominio:<host sem www.>` |

  - `MOTORES_COM_CONECTOR_V1`: os 8 motores da v1.
  - `detectarMotor(url: URL): Motor`.
  - `canonizar(url: string): { canonica: UrlCanonica; motor: Motor }`. Recebe a URL como string e usa só a API global `URL`.
    - Regras gerais:
      - Remove o fragmento.
      - Host e esquema em minúsculas.
      - Remove os parâmetros `utm_*`, `gh_src`, `source`, `src`, `ref`, `referrer`, `lever-source`, `lever-origin`, `jobBoardSource`, `trk`, `trackingId`, `refId`, `fbclid`, `gclid`, `mc_cid`, `mc_eid` e `lang`.
      - Ordena os parâmetros restantes.
      - Remove a barra final.
    - Regras por motor:
      - **greenhouse:** `https://job-boards.greenhouse.io/<board>/jobs/<id>`. Mantém o host EU, e o host legado `boards.greenhouse.io` passa para `job-boards`.
      - **lever:** sem `/apply`.
      - **ashby:** sem `/application`.
      - **gupy:** `https://<empresa>.gupy.io/jobs/<id>`. `portal.gupy.io` só recebe as regras gerais.
      - **linkedin:** `https://www.linkedin.com/jobs/view/<id>`, com o id vindo do caminho ou de `currentJobId`.
      - **indeed:** `https://br.indeed.com/viewjob?jk=<id>`, com o id vindo de `jk` ou `vjk`.
      - **github:** `https://github.com/<owner>/<repo>/issues/<n>`.
  - Uma URL inválida lança `ErroValidacao`.
  - Testes: pelo menos 2 URLs por motor da v1, cobrindo rastreamento, `/apply`, host legado, `currentJobId` e `vjk`.
- **`chave.ts`.**
  - `normalizarCargo(c)` aplica `normalizarTexto` e remove os marcadores `(a)`, `/a`, `(o/a)`, `(m/f/d)`, `(f/m/x)`, `(all genders)` e `(todos os gêneros)`.
  - `chaveDedup(empresa, cargo, localidade?)` é `normalizarTexto(empresa) + "|" + normalizarCargo(cargo) + "|" + normalizarTexto(localidade ?? "")`.
- **`deduplicacao.ts`** (decisões puras, executadas pela aplicação).
  - `decidirDeduplicacaoUrl(existente: Vaga | null)` devolve:

    | Situação | Ação |
    | --- | --- |
    | Sem vaga existente | `criar` |
    | Existente em `STATUS_NA_FILA` | `ignorar_na_fila` (com id) |
    | Existente em `STATUS_POS_ENVIO` | `criar_duplicada` (DUPLICADA `url_ja_enviada`, `duplicadaDe`) |
    | Existente em PULADA ou DESCARTADA | `reabrir` (id) |
    | Existente em MANUAL ou DUPLICADA | `ignorar_status` (id, status) |

  - `decidirDeduplicacaoChave(x: Vaga, outras: readonly Vaga[]): AcaoDedupChave[]` devolve ações `{ tipo: "descartar", id, duplicadaDe }` ou nenhuma. Para cada Y:
    - **Y em `STATUS_NA_FILA`.** A mais antiga por `publicadaEm` (com `adicionadaEm` como fallback) é descartada em favor da mais recente. Se X for a mais antiga, a lista termina com o descarte de X.
    - **Y em `STATUS_POS_ENVIO`.** Se X e Y têm `publicadaEm` e o de X é anterior ou igual ao de Y, X é descartada. Nos demais casos, não há ação (repost).
    - **Y em `STATUS_IGNORADOS_DEDUP`.** É ignorada.

### T4: Domínio de currículo e análise

**Arquivo:** `src/dominio/curriculo/documento.ts`, `src/dominio/curriculo/lastro.ts`, `src/dominio/curriculo/score-ats.ts`, `src/dominio/curriculo/nome-arquivo.ts`, `src/dominio/analise/validar-analise.ts`, `src/dominio/analise/aderencia.ts`, `src/dominio/analise/grupos.ts` (mais os `*.test.ts`) | **Ação:** Criar

**Detalhes:**

- **`documento.ts`.** Fonte única do conteúdo renderizado. O HTML (infra) e o texto puro (score ATS) saem do mesmo modelo.
  - **`montarDocumento(master, gerado: CurriculoGerado | null, idioma): DocumentoCurriculo`.** Com `gerado = null`, monta o master genérico (todos os bullets, na ordem original, no idioma do master). Regras:
    - Empresa, cargo, datas e local vêm do master. `cargoTraducao` substitui o cargo só quando presente e quando `idioma` for diferente de `master.idioma`.
    - Experiências em ordem cronológica reversa por `inicio`.
    - Seções nesta ordem: cabeçalho (nome, título, linha de contato com cidade/UF · e-mail · telefone · LinkedIn · GitHub · portfólio), resumo, experiência, projetos (se houver), formação, certificações (se houver), skills agrupadas por categoria e idiomas.
    - Títulos:
      - PT: Resumo, Experiência, Projetos, Formação, Certificações, Competências, Idiomas.
      - EN: Summary, Experience, Projects, Education, Certifications, Skills, Languages.
    - Datas:
      - PT: `mar/2022 – atual`.
      - EN: `Mar 2022 – Present`.
  - **`paraTexto(doc)`:** texto puro na mesma ordem.
  - **`DocumentoCarta` e `montarCarta(contato, corpo, idioma)`.**
- **`lastro.ts`.** `validarLastro(gerado, master, analise): Violacao[]`, com `Violacao = { regra: "R1" a "R6"; detalhe }`.
  - **R1.** Os ids de `experiencias` são exatamente os do master, sem faltas nem extras, e cada experiência tem pelo menos 1 bullet.
  - **R2.** Todo bullet tem `origem` não vazia, com ids entre os bullets da mesma experiência ou do mesmo projeto.
  - **R3.** `skills` é subconjunto dos ids de skills do master.
  - **R4.** Todo token numérico de um bullet (`\d+(?:[.,]\d+)*%?`, comparado sem separadores) aparece no texto dos bullets de origem.
  - **R5.** Toda keyword `tecnologia` ou `certificacao`, normalizada, presente em `titulo`, `resumo` ou num bullet precisa casar com o nome ou um alias de uma skill do master, ou com o nome de uma certificação. Num bullet, também vale aparecer no texto de origem.
  - **R6.** Os ids de `projetos`, `formacao` e `certificacoes` existem.
- **`score-ats.ts`.** `scoreAts(texto, keywords, master): number | null`.
  - Os termos aceitos de cada keyword são o termo normalizado mais o nome e os aliases da skill do master que casar com ele.
  - Há acerto quando algum termo aparece em `normalizarTexto(texto)` com limite de palavra.
  - O resultado é `round(100 × acertos / total)`, ou `null` quando `total = 0`.
- **`nome-arquivo.ts`.** `nomeArquivo(nome, tipo: "CV" ou "Carta")` remove acentos, usa o primeiro e o último nome separados por `_` e retorna `<Nome>_<Sobrenome>_<tipo>.pdf`.
- **`validar-analise.ts`.** `sanearAnalise(analise, master)` marca como `ausente` os requisitos com ids de evidência inexistentes. `gapsDaAnalise(analise, negados)` devolve os termos ausentes, normalizados, que não estão em `negados`.
- **`aderencia.ts`.** `calcularAderencia(analise, preferencias, diversidade?, dataNascimento?, hoje): { score; detalhes; eliminacao?: "afirmativa_inelegivel"; alertas: string[] }`. O argumento `hoje` vem da aplicação, para manter a função pura.
  - **Cobertura (60 pontos).** Considera os requisitos obrigatórios; se não houver nenhum, todos; se a lista estiver vazia, vale 60. A fórmula é `round(60 × (cobertos + 0,5 × parciais) / total)`.
  - **Senioridade (15 pontos):**
    - `nao_informada` ou incluída nas preferências: 15.
    - Adjacente na ordem estagio < junior < pleno < senior < especialista < lideranca: 7.
    - Caso contrário: 0.
  - **Modelo e localidade (15 pontos):**
    - `nao_informado`: 15.
    - `remoto` com `remoto` nas preferências: 15.
    - `hibrido` ou `presencial` presente nas preferências, com cidade normalizada contida em `preferencias.cidades`: 15.
    - Caso contrário: 0.
  - **Regime (10 pontos).** `nao_informado` ou presente nas preferências: 10. Caso contrário: 0.
  - **Eliminatória.** Afirmativa exclusiva, sem interseção com os grupos do perfil e com todos os campos de diversidade necessários preenchidos: score 0 e `eliminacao`. Se faltar dado, gera o alerta "vaga afirmativa: confira elegibilidade".
  - **Reavaliação.** `recalcularComGaps(analise, termosSim: ReadonlySet<string>)` marca como `coberto` os requisitos cujo termo normalizado está no conjunto e devolve a nova análise.
- **`grupos.ts`.** `gruposDoPerfil(diversidade?, dataNascimento?, hoje)`:

  | Grupo | Condição |
  | --- | --- |
  | `mulheres` | gênero `mulher_cis` ou `mulher_trans` |
  | `pessoas_negras` | raça `preta` ou `parda` |
  | `indigenas` | raça `indigena` |
  | `pcd` | `pcd` verdadeiro |
  | `lgbtqia` | `lgbtqia` verdadeiro |
  | `pessoas_50_mais` | idade de 50 anos ou mais |

### T5: Domínio de respostas e falhas

**Arquivo:** `src/dominio/respostas/classificar-campo.ts`, `src/dominio/respostas/valor-codigo.ts`, `src/dominio/respostas/salario.ts`, `src/dominio/respostas/diversidade.ts`, `src/dominio/respostas/aprendizado.ts`, `src/dominio/falhas/registro-falha.ts`, `src/dominio/falhas/pii.ts`, `src/dominio/falhas/sanitizar.ts` (mais os `*.test.ts`) | **Ação:** Criar

**Detalhes:**

- **`classificar-campo.ts`.** `classificarCampo({ rotulo, nome?, autocomplete?, tipo }): Campo["categoria"]`, por regex PT/EN:

  | Grupo | Campos |
  | --- | --- |
  | `padrao` | nome, primeiro nome, sobrenome, e-mail, telefone/celular, LinkedIn, GitHub, portfólio/website, cidade, país |
  | `documento` | CPF, RG, data de nascimento, endereço completo (logradouro, número, complemento, bairro, CEP) |
  | `curriculo` | resume/CV/currículo |
  | `carta` | cover letter, carta de apresentação, mensagem ao recrutador |
  | `salario` | pretensão salarial, salary expectation, expected compensation |
  | `diversidade` | gênero, raça/cor/etnia, PcD/deficiência, orientação sexual/LGBTQIA+, gender, race, ethnicity, disability, veteran |
  | `pergunta` | o restante |

- **`valor-codigo.ts`.** `valorPadrao(campo, contato)` e `valorDocumento(campo, documentos, endereco)`. As datas saem no formato que o campo pedir (`dd/mm/aaaa` para `texto` e `aaaa-mm-dd` para `data`).
- **`salario.ts`.**
  - `calcularSalario({ regime, periodo, moeda }, salario)`:

    | Regime e período | Valor |
    | --- | --- |
    | CLT mensal | `clt_brl_mensal` |
    | CLT anual | `clt_brl_mensal × 13` |
    | PJ mensal | `pj_brl_mensal` |
    | PJ anual | `pj_brl_mensal × 12` |
    | USD anual | `usd_anual` |
    | USD mensal | `round(usd_anual / 12)` |

  - `escolherFaixa(opcoes, valor)` interpreta "até X", "acima de X", "X-Y" e "X a Y", com `k` e `mil`, e escolhe a faixa que contém o valor ou, se nenhuma contiver, a mais próxima acima.
  - Regime `nao_informado` usa o primeiro de `preferencias.regimes`, com `confianca: "baixa"`.
- **`diversidade.ts`.** `respostaDiversidade(campo, diversidade?)` usa uma tabela de sinônimos PT/EN (por exemplo, `preta` corresponde a "Preta", "Negra" e "Black"). Sem dado ou sem casamento, usa a opção que casar com `/prefiro não|não desejo|prefer not|decline|não informar/i`. Se não houver essa opção, devolve `null` com `confianca: "baixa"`.
- **`aprendizado.ts`.** `aplicarAprendizado(banco, finais: { resposta: RespostaSugerida; valorFinal; editada }[], hoje): BancoRespostas` devolve um banco novo. Considera só as respostas com categoria `pergunta`, `sensivel = false`, `especificaDaVaga = false` e com `fonte = "gerada"` ou `editada`:
  - Fonte `banco:<id>`: atualiza `resposta` e `atualizadaEm` e acrescenta o rótulo a `variantes`, se for diferente.
  - Caso contrário: acrescenta `{ id: "r-<próximo, 4 dígitos>", pergunta: rotulo, variantes: [], idioma, tipo, resposta, atualizadaEm }`.
- **`registro-falha.ts`.** Schema `RegistroFalha`:
  - `tipo`: `falha_conector` ou `sem_conector`.
  - `conector`, `versaoConector`, `motor`, `dominio`, `url`, `idVaga`, `data`, `passo`, `seletor`, `erro`, `stack`.
  - `resultadoAgente`, `passosAgente`.
  - `snapshot` (nome do `.html`).
  - `resolvida`: booleano.
- **`pii.ts`.** `listaPii(master?, perfil?)`. Lista única, usada pelo sanitizador e pelo registrador:
  - Nome completo, primeiro e último nome.
  - E-mail.
  - Telefone, com e sem máscara.
  - CPF, com e sem máscara.
  - RG e data de nascimento, em `aaaa-mm-dd` e `dd/mm/aaaa`.
  - Logradouro e CEP.
  - URLs do LinkedIn, do GitHub e do portfólio.

  Strings com menos de 4 caracteres ficam de fora.
- **`sanitizar.ts`.** `sanitizarHtml(html, pii)`:
  - Remove `<script>` e `<noscript>`.
  - Remove os atributos `value`, `selected` e `checked`, o conteúdo de `textarea`, o texto de `[contenteditable]` e os valores de `input[type=hidden]`.
  - Substitui, sem diferenciar maiúsculas e minúsculas, cada item de `pii` por `[REDACTED]`.
  - Implementação por string e regex.

### T6: Portas, erros de porta, concorrência e apoio de testes

**Arquivo:** `src/aplicacao/portas/*.ts` (um arquivo por porta de `arquitetura.md` §6, mais `erros.ts`), `src/aplicacao/compartilhado/concorrencia.ts`, `tests/apoio/builders.ts`, `tests/apoio/fakes/*.ts` | **Ação:** Criar

**Detalhes:**

- **`erros.ts`.** `ErroInfra` (estende `ErroOutbox`), `ErroLlm`, `ErroLimiteUso`, `ErroTimeoutLlm`, `ErroMaxTurnos`, `ErroHttp` (com `status?`), `ErroNavegador`, `ErroResolucao`, `ErroAgregadorExigeLogin`, `ErroExtracao` e `ErroFalhaConector` (com `passo`, `seletor` e `formulario?: FormularioAberto`).
- **Assinaturas normativas** (JSDoc em cada método):

  ```ts
  interface RepositorioVagas {
    transacao<T>(fn: () => T): T;                       // BEGIN IMMEDIATE; fn síncrona
    inserir(nova: NovaVaga): Vaga;
    buscar(id: IdVaga): Vaga | null;
    buscarPorUrlCanonica(url: UrlCanonica): Vaga | null;  // a mais recente
    buscarPorChave(chave: ChaveDedup, excetoId: IdVaga): Vaga[];
    listarPorStatus(status: readonly Status[], filtro?: { ids?: readonly IdVaga[] }): Vaga[];
    atualizar(id: IdVaga, campos: AtualizacaoVaga): void;
    transicionar(id: IdVaga, para: Status, opcoes?: { motivo?: Motivo; etapa?: Etapa; nota?: string; duplicadaDe?: IdVaga }): void;
    listarEventos(id: IdVaga): Evento[];
    inserirGaps(id: IdVaga, termos: readonly { termo: string; termoNormalizado: string }[]): void;
    listarGapsAbertos(ids: readonly IdVaga[]): GapAberto[];
    responderGaps(termoNormalizado: string, resposta: "sim" | "nao"): IdVaga[];  // devolve as vagas afetadas
    registrarRespostasEnviadas(id: IdVaga, respostas: readonly RespostaEnviada[]): void;
  }
  interface GeradorEstruturado {
    gerar<T>(pedido: {
      tarefa: "importar-curriculo" | "extrair-vaga" | "analisar-vaga" | "tailoring" | "responder-perguntas";
      variaveis: Readonly<Record<string, string>>;
      conteudoNaoConfiavel?: Readonly<Record<string, string>>;
      schema: ZodType<T>;
      arquivosLeitura?: readonly string[];
      pastaLog?: string;
    }, sinal: AbortSignal): Promise<T>;
  }
  interface ExecutorAgente {
    preencher(entrada: {
      vaga: Vaga; pacote: PacoteCandidatura; hostsPermitidos: readonly string[];
      contextoFalha?: { passo: string; erro: string; url: string };
      saldo: { turnos: number; ms: number };
    }, ctx: { aguardarUsuario(mensagem: string): Promise<void> }, sinal: AbortSignal): Promise<ResultadoAgente>;
  }
  type ResultadoAgente =
    | { tipo: "pronto"; formulario: FormularioAberto; passos: string[]; perguntasRespondidasNaHora: { rotulo: string; valor: string }[]; motorDetectado?: string }
    | { tipo: "sem_formulario" | "easy_apply" | "teto"; passos: string[] };
  interface ConectorAts {
    readonly motor: Motor; readonly versao: string;
    extrairVaga?(url: string, sinal: AbortSignal): Promise<VagaExtraida | null>;
    lerCampos?(url: string, sinal: AbortSignal): Promise<Campo[] | null>;   // null = só no aplicar
    abrirEPreencher(url: string, pacote: PacoteCandidatura, ctx: CtxPreenchimento, sinal: AbortSignal): Promise<FormularioAberto>;
  }
  type CtxPreenchimento = {
    responderAoVivo(campos: readonly Campo[]): Promise<RespostaSugerida[]>;
    aguardarUsuario(mensagem: string): Promise<void>;
  };
  interface FormularioAberto {
    readonly rota: "conector" | "agente";
    urlAtual(): string;
    capturarTela(destino: string): Promise<void>;
    capturarHtml(): Promise<string>;                    // bruto; a aplicação sanitiza antes de registrar
    lerValores(): Promise<{ rotulo: string; valor: string; ehArquivo: boolean }[]>;
    enviar(): Promise<void>;
    confirmarEnvio(timeoutMs: number): Promise<"enviada" | "pendente_teste" | "nao_confirmada" | "indeterminada">;
    fechar(): Promise<void>;
  }
  ```

  As demais portas seguem `arquitetura.md` §6 com as mesmas convenções:
  - `ResolvedorVagas.resolver(canonica, motor, sinal): Promise<Resolucao>`, com `Resolucao = { motor; urlResolvida; canonica; rota; manual?: { motivo; destino? } }`.
  - `ExtratorVagas.extrair(url, motor, sinal): Promise<{ estruturada: VagaExtraida | null; textoPagina: string }>`.
  - `RenderizadorDocumentos.renderizarCurriculo(doc, destino, sinal)` e `renderizarCarta(...)`, ambos com saída `Promise<{ paginas }>`.
  - `ArmazemCurriculo` (síncrona): `existeMaster`, `lerMaster`, `gravarMasterNovo(master, { sobrescrever }): { backup? }`, `adicionarSkill`, `lerPerfil`, `lerBanco`, `gravarBanco`, `lerGapsNegados`, `negarGap`, `garantirArquivosAuxiliares(): string[]` e `atualizadoEm(): string`.
  - `ArmazemArtefatos` (síncrona): `caminho(id, nome)`, `caminhoMaster("pdf" ou "texto")`, `gravarJson`, `lerJson(id, nome, schema)`, `gravarTexto`, `lerTexto`, `existe`, `pastaLlm(id)` e `masterGeradoEm(): string | null`.
  - `RegistroFalhas` (síncrona): `registrar(registro, htmlSanitizado): string`, `atualizar(idRegistro, campos)` e `listarAbertas()`.
  - `Interacao`: `perguntarSimNao`, `perguntarNumero`, `perguntarTexto`, `escolher`, `aguardarUsuario`, `exibirResumoRevisao(resumo: ResumoRevisao)`, `informar` e `abrirArquivo`.
  - `Notificador.notificar(titulo, mensagem): void`.
  - `NavegadorUsuario.abrirParaLogin(): Promise<void>`.
  - `CatalogoConectores.para(motor): ConectorAts | null`.
  - `Relogio`: `agora(): Date` e `agoraIso(): string`.
  - `Registrador`: `depurar`, `informar`, `avisar` e `erro`.
- **`concorrencia.ts`.** `executarComLimite<T>(itens, limite, fn: (item, sinal) => Promise<void>, sinal)`:
  - Mantém no máximo `limite` execuções simultâneas.
  - Para de iniciar novas quando o `sinal` aborta ou quando `fn` lança `ErroLimiteUso` (que é propagado ao fim, depois de aguardar as em andamento).
  - Os demais erros são responsabilidade de `fn`.
- **`tests/apoio/`.** Builders e fakes de `arquitetura.md` §11.1, incluindo um `FormularioAbertoFake` com espião de `enviar()` e `criarRepositorioMemoria()` (o `RepositorioVagasSqlite` sobre `:memory:` com migrações aplicadas, disponível após a T8; até lá, os testes da aplicação que precisam dele aguardam a T8).

### T7: Infra base

**Arquivo:** `src/infra/config/esquema-config.ts`, `src/infra/config/carregar-config.ts`, `config.exemplo.yaml`, `src/infra/log/registrador-jsonl.ts`, `src/infra/sistema/caminhos.ts`, `src/infra/sistema/relogio-sistema.ts`, `src/infra/sistema/escrita-atomica.ts`, `src/infra/sistema/trava-processo.ts`, `src/infra/sistema/cliente-http.ts` | **Ação:** Criar

**Detalhes:**

- **`esquema-config.ts`.** Schema com os padrões, que são a fonte única:

  ```yaml
  navegador: { executavel: auto, portaCdp: 9333 }         # auto, chrome ou chromium
  llm: { modeloTexto: sonnet, modeloAgente: sonnet, timeoutTextoSeg: 180 }
  agente: { maxTurnos: 40, timeoutMin: 10 }
  preparar: { paralelo: 2, maxTentativas: 3 }
  aderencia: { scoreMinimo: 60 }
  carta: { maxPalavras: 200 }
  gupy: { anexoPorCandidatura: true }                     # ajustado pelo spike da T16
  notificacao: { toast: true }
  ```

- **`carregar-config.ts`.** Lê `config.yaml` se existir, faz merge profundo sobre os padrões e valida. Um erro vira `ErroUsuario` com o caminho da chave.
- **`config.exemplo.yaml`.** Todas as chaves comentadas em PT-BR. Um teste verifica que o arquivo valida e que os valores são iguais aos padrões.
- **`caminhos.ts`.** Raiz do repositório (resolvida a partir de `import.meta.url`) e constantes absolutas: `CURRICULO_DIR`, `MASTER`, `PERFIL`, `RESPOSTAS`, `GAPS`, `EXEMPLOS_DIR`, `DADOS_DIR`, `DB`, `NAVEGADOR_DIR`, `CREDENCIAIS`, `VAGAS_DIR`, `MASTER_DIR`, `TMP_DIR`, `LOGS_DIR`, `TRAVAS_DIR`, `FALHAS_DIR` e `PROMPTS_DIR`. Os diretórios são criados sob demanda.
- **`registrador-jsonl.ts`.** Implementa `arquitetura.md` §10.3. A lista de PII é obtida de forma preguiçosa a partir do `ArmazemCurriculo` e, se o currículo ainda não existir, fica vazia, restando só a redação por chave. As cores no terminal usam `node:util.styleText`.
- **`escrita-atomica.ts`.** `escreverAtomico(caminho, conteudo)` grava em `<caminho>.tmp-<pid>` e depois renomeia.
- **`trava-processo.ts`.** `adquirirTrava(nome): { liberar(): void }` conforme `arquitetura.md` §10.5. A trava é liberada no `exit`.
- **`cliente-http.ts`.** Implementa `ClienteHttp` (`obterJson(url, schema, sinal)` e `obterTexto(url, sinal)`) com timeout de 15 s, 2 novas tentativas para 429 e 5xx com backoff de 500 ms e 1500 ms respeitando `Retry-After`, e validação Zod. Os erros viram `ErroHttp`.

### T8: Persistência SQLite

**Arquivo:** `src/infra/banco/conexao.ts`, `src/infra/banco/migrador.ts`, `src/infra/banco/migracoes/0001-inicial.sql`, `src/infra/banco/repositorio-vagas-sqlite.ts` | **Ação:** Criar

**Detalhes:**

- **`conexao.ts`.** `abrirConexao(caminho = DB)` aceita `":memory:"` e executa `PRAGMA journal_mode=WAL`, `PRAGMA busy_timeout=5000` e `PRAGMA foreign_keys=ON`.
- **`migrador.ts`.** `migrar(db, pasta)` lê os arquivos `NNNN-*.sql` em ordem e, para cada `N` maior que `PRAGMA user_version`, executa `BEGIN`, o SQL, `PRAGMA user_version = N` e `COMMIT`. Em caso de erro, faz `ROLLBACK` e relança como `ErroInfra`.
- **`0001-inicial.sql`:**

  ```sql
  CREATE TABLE vagas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url_original TEXT NOT NULL,
    canal TEXT NOT NULL,
    url_canonica TEXT NOT NULL,
    url_resolvida TEXT,
    motor TEXT NOT NULL,
    rota TEXT,
    status TEXT NOT NULL,
    motivo TEXT,
    duplicada_de INTEGER REFERENCES vagas(id),
    empresa TEXT, cargo TEXT, localidade TEXT,
    chave_dedup TEXT,
    idioma TEXT,
    publicada_em TEXT,
    adicionada_em TEXT NOT NULL,
    aderencia INTEGER,
    ats_antes INTEGER, ats_depois INTEGER,
    camaleao_falhou TEXT,
    anexo_manual INTEGER NOT NULL DEFAULT 0,
    tentativas_preparo INTEGER NOT NULL DEFAULT 0,
    etapa TEXT,
    enviada_em TEXT,
    atualizada_em TEXT NOT NULL
  ) STRICT;
  CREATE INDEX ix_vagas_url_canonica ON vagas(url_canonica);
  CREATE INDEX ix_vagas_chave_dedup ON vagas(chave_dedup);
  CREATE INDEX ix_vagas_status ON vagas(status);
  CREATE INDEX ix_vagas_enviada_em ON vagas(enviada_em);
  CREATE TABLE eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vaga_id INTEGER NOT NULL REFERENCES vagas(id),
    de_status TEXT, para_status TEXT NOT NULL,
    etapa TEXT, nota TEXT,
    criado_em TEXT NOT NULL
  ) STRICT;
  CREATE INDEX ix_eventos_vaga ON eventos(vaga_id);
  CREATE INDEX ix_eventos_para_status ON eventos(para_status, etapa);
  CREATE TABLE respostas_enviadas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vaga_id INTEGER NOT NULL REFERENCES vagas(id),
    rotulo TEXT NOT NULL, valor TEXT,
    fonte TEXT NOT NULL, editada INTEGER NOT NULL DEFAULT 0,
    sensivel INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL
  ) STRICT;
  CREATE INDEX ix_respostas_vaga ON respostas_enviadas(vaga_id);
  CREATE TABLE gaps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vaga_id INTEGER NOT NULL REFERENCES vagas(id),
    termo TEXT NOT NULL, termo_normalizado TEXT NOT NULL,
    resposta TEXT
  ) STRICT;
  CREATE INDEX ix_gaps_vaga ON gaps(vaga_id);
  CREATE INDEX ix_gaps_termo ON gaps(termo_normalizado);
  ```

- **`repositorio-vagas-sqlite.ts`.** `RepositorioVagasSqlite` implementa a porta.
  - **Construção.** Recebe `db` e `Relogio`. Os statements preparados são criados uma vez, no construtor.
  - **Mapeamento.** snake_case para camelCase acontece só aqui. Cada linha é validada com Zod (status e motivo pertencentes às constantes), e uma linha inválida vira `ErroInfra`.
  - **`transacao`.** Usa `BEGIN IMMEDIATE`. Um `fn` que retorna thenable lança erro.
  - **`transicionar`.** Lê o status atual, chama `validarTransicao` (domínio) e, na mesma transação, atualiza `status`, `motivo`, `etapa`, `duplicada_de`, `atualizada_em` (e `enviada_em` quando o destino é ENVIADA ou PENDENTE_TESTE e o campo está vazio) e insere em `eventos`.
  - **Valores sensíveis.** `registrarRespostasEnviadas` grava `valor = NULL` quando `sensivel = 1`, porque o valor sensível só fica em `respostas.json` dentro de `dados/vagas/<id>/`.
- **Testes de integração.** Migrador (AC25). Atomicidade da deduplicação com duas conexões ao mesmo arquivo (AC7).

### T9: Armazenamento em arquivos

**Arquivo:** `src/infra/armazenamento/yaml.ts`, `src/infra/armazenamento/armazem-curriculo-yaml.ts`, `src/infra/armazenamento/armazem-artefatos-fs.ts`, `src/infra/armazenamento/registro-falhas-fs.ts` | **Ação:** Criar

**Detalhes:**

- **`yaml.ts`.**
  - `lerYaml(caminho, schema)`: arquivo ausente ou inválido vira `ErroUsuario`, com o caminho e o campo.
  - `editarYaml(caminho, schema, mutar: (doc: Document) => void)`: API `Document` do pacote `yaml` para preservar comentários e ordem, validação do resultado e `escreverAtomico`.
- **`ArmazemCurriculoYaml`.**
  - `gravarMasterNovo`: sem `sobrescrever` e com `master.yaml` existente, lança `ErroUsuario("master.yaml já existe; use --sobrescrever")`. Com `sobrescrever`, copia para `master.yaml.bak-<AAAAMMDDHHmmss>` antes de gravar.
  - `adicionarSkill` acrescenta a skill em `skills` via `editarYaml`.
  - `negarGap` acrescenta o termo a `gaps.yaml`.
  - `gravarBanco` reescreve `respostas.yaml` preservando os comentários do topo.
  - `garantirArquivosAuxiliares` copia de `curriculo.exemplo/` os arquivos `perfil.yaml`, `respostas.yaml` e `gaps.yaml` que estiverem ausentes.
- **`ArmazemArtefatosFs`.**
  - Pasta da vaga: `dados/vagas/<id com 5 dígitos>/`.
  - Nomes válidos (tipo `NomeArtefato`): `vaga.json`, `descricao.md`, `analise.json`, `curriculo.json`, `curriculo.txt`, `campos.json`, `respostas.json`, `carta.md`, `agente.json`, `antes-envio.png`, `confirmacao.png`, `pdf-curriculo` (resolve para `nomeArquivo(nome, "CV")`) e `pdf-carta`.
  - Todas as gravações são atômicas.
  - `caminho()` garante que o caminho resolvido fica dentro da pasta da vaga.
- **`RegistroFalhasFs`.**
  - Destino: `falhas/<conector>/<AAAA-MM-DD>-<idVaga>.json` e `.html` para `falha_conector`, e `falhas/_sem-conector/<motor sem "dominio:">/<AAAA-MM-DD>-<idVaga>.json` e `.html` para `sem_conector`.
  - Recebe apenas HTML **já sanitizado**.
  - `listarAbertas` lê os JSON com `resolvida != true`.

### T10: LLM: processo claude, gerador estruturado e prompts

**Arquivo:** `src/infra/llm/processo-claude.ts`, `src/infra/llm/gerador-estruturado-claude.ts`, `src/infra/llm/prompts.ts`, `prompts/importar-curriculo.md`, `prompts/extrair-vaga.md`, `prompts/analisar-vaga.md`, `prompts/tailoring.md`, `prompts/responder-perguntas.md`, `tests/fakes/claude.mjs` | **Ação:** Criar

**Detalhes:**

- **`processo-claude.ts`.**
  - **Execução.** `executarClaude({ args, entrada, cwd, timeoutMs, sinal })` usa `cross-spawn` com `OUTBOX_CLAUDE_BIN` ou, na falta dela, `claude`. O prompt vai via stdin. O processo é encerrado com `kill` no timeout ou no abort.
  - **Saída.** O stdout é parseado como JSON.
    - Se `is_error` for verdadeiro ou `subtype` for diferente de `"success"`:
      - `result` casando com `/usage limit|limit reached|rate limit|limite de uso/i`: `ErroLimiteUso`.
      - `error_max_turns`: `ErroMaxTurnos`.
      - Demais casos: `ErroLlm`, com o stderr.
    - Timeout: `ErroTimeoutLlm`.
  - **Diretório.** `cwd` padrão é `dados/tmp/llm/` (vazio, para não carregar o `CLAUDE.md` nem as skills do repositório).
- **`prompts.ts`.** `carregarPrompt(nome, vars)` lê o front-matter (`versao`) e substitui `{{chave}}`. Uma chave ausente ou sobrando lança erro. O conteúdo não confiável é envolvido como `<conteudo_nao_confiavel origem="<chave>">…</conteudo_nao_confiavel>`, precedido da instrução fixa de tratá-lo como dado.
- **`GeradorEstruturadoClaude`.**
  - **Prompt.** É a combinação do prompt carregado com a instrução de saída "Responda somente com um JSON válido para o schema abaixo, dentro de um bloco cercado por três crases com `json`" e o resultado de `JSON.stringify(z.toJSONSchema(schema))`.
  - **Argumentos.** `-p --output-format json --model <config.llm.modeloTexto> --max-turns 1`. Com `arquivosLeitura`: `--allowedTools Read --max-turns 3`, mais um `--add-dir <dir>` por pasta.
  - **Extração.** Usa o primeiro bloco `json` cercado ou o texto inteiro, e então `JSON.parse` e o schema.
  - **Retry.** Uma falha de parse faz 1 retry via `--resume <session_id>` com a mensagem de correção. A segunda falha lança `ErroLlm`.
  - **Log.** `<pastaLog>/<n>-<tarefa>.json` com `{ tarefa, versaoPrompt, args, prompt, stdout, stderr, duracaoMs }`.
- **Prompts** (seções `# Tarefa`, `# Regras`, `# Entrada`):
  - **`importar-curriculo`.** Não inventar. Ids em kebab-case (`exp-<empresa>`, `exp-<empresa>-b<n>`, `proj-<nome>`, `form-<instituicao>` e skills pelo nome normalizado). Skills extraídas dos bullets, `origem: master` e `idioma` detectado.
  - **`extrair-vaga`.** Extrair os campos de `VagaExtraida` do texto da página.
  - **`analisar-vaga`.** Entrada: descrição (não confiável), master, preferências e gaps negados. Sem diversidade.
  - **`tailoring`.** Regras de lastro, todas as experiências, `cargoTraducao` só com idioma diferente, sem números novos e meta de páginas (1 página com menos de 5 anos somados de experiência, 2 nos demais casos).
  - **`responder-perguntas`.** Campos (rótulo, tipo e opções), banco de respostas, master, análise, preferências, disponibilidade, autorização de trabalho, `comoSoube`, idioma e `maxPalavras`. Saída por campo `{ campoId, valor, fonte, confianca, especificaDaVaga }` e, para salário, `{ campoId, regime, periodo, moeda }`. A carta usa só fatos do master e cita a empresa e o cargo.
- **`tests/fakes/claude.mjs`.** Lê o roteiro de `OUTBOX_CLAUDE_ROTEIRO` (um JSON com respostas por padrão de prompt), grava os prompts recebidos para inspeção e simula erro de limite, max turns e atraso.

### T11: Navegador, leitor headless e documentos

**Arquivo:** `src/infra/navegador/navegador-outbox.ts`, `src/infra/navegador/leitor-headless.ts`, `src/infra/navegador/bloqueios.ts`, `src/infra/documentos/template-html.ts`, `src/infra/documentos/renderizador-pdf-playwright.ts` | **Ação:** Criar

**Detalhes:**

- **`navegador-outbox.ts`** (implementa `NavegadorUsuario`).
  - **`garantir(): Promise<Browser>`:**
    1. Tenta `chromium.connectOverCDP("http://127.0.0.1:<portaCdp>")`.
    2. Se falhar, resolve o executável:
       - `auto`: usa o Chrome em `%ProgramFiles%`, `%ProgramFiles(x86)%` ou `%LocalAppData%\Google\Chrome\Application\chrome.exe`. Senão, usa `chromium.executablePath()`.
    3. Dispara o executável com `spawn(exe, ["--remote-debugging-port=<porta>", "--user-data-dir=<dados/navegador>", "--no-first-run", "--no-default-browser-check"], { detached: true, stdio: "ignore" }).unref()`.
    4. Tenta conectar por até 15 s. Falha vira `ErroNavegador`.

    `playwright` é importado dinamicamente.
  - **`paginaNova()`**, **`paginaMaisRecente()`** (última página `http(s)` do contexto padrão) e **`abrirParaLogin()`** (abre uma aba em branco).
- **`leitor-headless.ts`.**
  - `LeitorHeadless`: um Chromium headless por instância. A composição cria um por execução de comando e o fecha em `encerrar()`.
  - `ler(url, sinal)` usa um contexto novo por chamada, espera `networkidle` ou 15 s, retorna `{ urlFinal, html, texto }` e fecha o contexto.
  - `contextoRender()` cria um contexto com `javaScriptEnabled: false` e `route("**/*")` abortando toda requisição.
- **`bloqueios.ts`.** `detectarBloqueio(page)`:
  - `"captcha"`: iframe visível com `src` contendo `recaptcha`, `hcaptcha` ou `challenges.cloudflare.com`.
  - `"verificacao_email"`: texto casando com `/verifique seu e-mail|verify your email|código de verificação|verification code/i`.
  - `null` nos demais casos.

  Não existe nenhuma lógica de resolução.
- **`template-html.ts`.** `htmlCurriculo(doc)` e `htmlCarta(doc)` aplicam `escaparHtml` a todo texto e usam CSS inline com `font-family: Arial, Helvetica, sans-serif`, `font-size: 10.5pt`, margens de 15 mm e uma coluna, sem tabelas, imagens, ícones ou fundo.
- **`RenderizadorPdfPlaywright`.** Usa `contextoRender()`, `setContent(html)` e `pdf({ format: "A4" })`, grava de forma atômica e conta as páginas por `/Type /Page`.

### T12: Resolução e extração

**Arquivo:** `src/infra/resolucao/resolvedor-encadeado.ts`, `src/infra/resolucao/agregadores.ts`, `src/infra/resolucao/detectar-ats.ts`, `src/infra/resolucao/github.ts`, `src/infra/resolucao/portal-gupy.ts`, `src/infra/extracao/extrator-estrutural.ts`, `src/infra/extracao/json-ld.ts` | **Ação:** Criar

**Detalhes:**

- **`ResolvedorEncadeado`.** É uma lista ordenada de elos `{ aceita(motor, url): boolean; resolver(...) }`, e o primeiro elo que aceitar resolve.

  | Elo | Aceita | Resolução |
  | --- | --- | --- |
  | Direto | Motor em `MOTORES_COM_CONECTOR_V1`, exceto `portal.gupy.io` | Rota `conector` |
  | `agregadores` | `linkedin`, `indeed`, `glassdoor` | Ver abaixo |
  | `github` | `github` | Ver abaixo |
  | `portal-gupy` | `portal.gupy.io` | Abre no leitor e segue o redirecionamento ou o link até `*.gupy.io/jobs/<id>`. Rota `conector` |
  | `detectar-ats` | Qualquer outro | Ver abaixo |

  Detalhes por elo:
  - **`agregadores`.** Usa o navegador do Outbox (sessão logada), só para leitura:
    1. Abre uma aba.
    2. Procura o botão de candidatura pelo nome acessível:
       - Externo: `/candidatar-se no site|candidatar no site da empresa|apply on company( website)?|aplicar no site/i`.
       - Simplificado: `/candidatura simplificada|easy apply|indeed apply|candidatura fácil|candidatar-se facilmente|aplicar agora no indeed/i`.
    3. Botão externo: clica, captura a aba nova ou a navegação, segue até sair do agregador e resolve de novo (profundidade máxima 2).
    4. Botão simplificado: rota `manual`, motivo `easy_apply`.
    5. Página exige login: `ErroAgregadorExigeLogin`.
    6. Fecha a aba.

    As regexes são constantes exportadas e testadas.
  - **`github`.** Rota `a_definir`. A decisão final vem da análise (T21).
  - **`detectar-ats`.** Abre no leitor e procura URLs de vaga dos motores no HTML (`src` de iframes, `href`, scripts), incluindo o Greenhouse embutido (`boards.greenhouse.io/embed/job_app?for=<board>&token=<id>`, ou `gh_jid=<id>` na URL combinado com `for=<board>` no HTML).
    - Exatamente uma URL de vaga distinta: canônica desse motor, com rota `conector` (motor da v1) ou `agente` (os demais).
    - Zero ou mais de uma: motor detectado pelos scripts ou `dominio:<host>`, com rota `agente`.
- **`ExtratorEstrutural`.**
  1. Para motor com conector, usa `conector.extrairVaga`.
  2. Senão (ou se retornar `null`), usa o JSON-LD `JobPosting` (`title`, `hiringOrganization.name`, `description` com HTML convertido em texto, `jobLocation`, `datePosted`, `employmentType`).
  3. Retorna sempre `textoPagina`.

  Para o `github`, busca `https://api.github.com/repos/<owner>/<repo>/issues/<n>` via `ClienteHttp`, retorna `estruturada = null` e usa o título mais o corpo como `textoPagina`.

### T13: Base de conectores, contratos e captura de fixtures

**Arquivo:** `src/infra/conectores/base/catalogo.ts`, `src/infra/conectores/base/formulario-playwright.ts`, `src/infra/conectores/base/campos.ts`, `src/infra/conectores/base/passo.ts`, `tests/contratos/contrato-conector.ts`, `tests/contratos/contrato-formulario.ts`, `tests/apoio/harness-conector.ts`, `scripts/capturar-fixture.ts` | **Ação:** Criar

**Detalhes:**

- **`catalogo.ts`.** `CatalogoConectoresPlaywright` recebe as fábricas dos 8 conectores e as instancia sob demanda.
- **`passo.ts`.**
  - `passo(nome, seletor, fn)` executa `detectarBloqueio` antes de `fn`. Se houver bloqueio, chama `ctx.aguardarUsuario("Resolva no navegador e pressione Enter")` e continua.
  - Qualquer erro dentro de `fn` vira `ErroFalhaConector(nome, seletor, formulario)`.
- **`campos.ts`.**
  - `lerCamposGenerico(page)`: varre os campos visíveis, resolve o rótulo (`label[for]`, `aria-label`, `aria-labelledby`, `label` ancestral ou texto anterior mais próximo) e classifica com `classificarCampo` (domínio).
  - `preencherCampo(page, campo, valor)`: `fill`, `selectOption` por rótulo normalizado, `check` ou `setInputFiles`.
  - `lerValoresGenerico(page)`: inclui o nome do arquivo dos inputs `file`.
- **`FormularioPlaywright`.** Implementa `FormularioAberto` sobre `Page` com `rota: "conector"`. `enviar` e `confirmarEnvio` são delegados a funções fornecidas pelo conector.
- **Suítes de contrato** (executadas para cada implementação):
  - **`contrato-conector.ts`:** preenche a fixture com o pacote de exemplo, não chama envio, todos os campos obrigatórios ficam com valor, o PDF fica anexado, `enviar` na fixture de confirmação resulta em `confirmarEnvio` igual a `"enviada"`, e CAPTCHA na fixture provoca `aguardarUsuario`.
  - **`contrato-formulario.ts`:** `lerValores`, `capturarTela` e `fechar` idempotente.
- **`harness-conector.ts`.** Chromium headless com `page.route("**/*")` servindo fixtures por padrão de URL e abortando o resto.
- **`capturar-fixture.ts`.** Uso: `npm run capturar-fixture -- <url> <motor> <nome>`. Abre no navegador do Outbox, espera Enter, salva `sanitizarHtml(page.content(), listaPii(...))` em `tests/fixtures/<motor>/<nome>.html` e registra no topo, em comentário, a URL de origem e a data.

### T14: Conectores Greenhouse, Lever e Ashby

**Arquivo:** `src/infra/conectores/greenhouse/conector.ts`, `src/infra/conectores/greenhouse/api.ts`, `src/infra/conectores/lever/conector.ts`, `src/infra/conectores/lever/api.ts`, `src/infra/conectores/ashby/conector.ts`, `tests/fixtures/greenhouse/`, `tests/fixtures/lever/`, `tests/fixtures/ashby/` | **Ação:** Criar

**Detalhes:**

- **Greenhouse.**
  - `extrairVaga` e `lerCampos` usam `https://boards-api.greenhouse.io/v1/boards/<board>/jobs/<id>?questions=true` (campos `title`, `content`, `location.name`, `updated_at` e `questions[]` com `label`, `required` e `fields[]`).
  - Para o host EU, a tarefa verifica se a mesma API responde. Se não, `lerCampos` retorna `null` e a extração usa JSON-LD.
  - O formulário fica na página da vaga.
- **Lever.** API `https://api.lever.co/v0/postings/<empresa>/<uuid>` (`api.eu.lever.co` para o host EU). O formulário fica em `<canônica>/apply`.
- **Ashby.** Usa JSON-LD. O formulário fica em `<canônica>/application`, que é uma SPA: o conector espera o formulário renderizar.
- **Comum.** Seletores e detecção de confirmação vêm de fixtures reais (pelo menos 1 de formulário e 1 de confirmação por motor). Os conectores começam em `versao: "1.0.0"` e passam na suíte de contrato.

### T15: Conectores SmartRecruiters, Workable e Teamtailor

**Arquivo:** `src/infra/conectores/smartrecruiters/conector.ts`, `src/infra/conectores/smartrecruiters/api.ts`, `src/infra/conectores/workable/conector.ts`, `src/infra/conectores/teamtailor/conector.ts`, `tests/fixtures/smartrecruiters/`, `tests/fixtures/workable/`, `tests/fixtures/teamtailor/` | **Ação:** Criar

**Detalhes:**

- **SmartRecruiters.** API `https://api.smartrecruiters.com/v1/companies/<empresa>/postings/<id>`. O conector segue o botão de candidatura até o formulário.
- **Workable.** JSON-LD. O formulário fica em `<canônica>/apply/`.
- **Teamtailor.** JSON-LD. O conector abre o formulário da página da vaga.
- **Comum.** `lerCampos` retorna `null` quando o formulário exige interação antes de aparecer. As demais regras seguem a T14.

### T16: Conectores Gupy e InHire, com spikes

**Arquivo:** `src/infra/conectores/gupy/conector.ts`, `src/infra/conectores/inhire/conector.ts`, `docs/spikes/gupy.md`, `docs/spikes/inhire.md`, `tests/fixtures/gupy/`, `tests/fixtures/inhire/` | **Ação:** Criar

**Detalhes:**

- **Spike da Gupy.** Registrar em `docs/spikes/gupy.md`:
  1. As etapas após "Candidatar-se".
  2. Se o anexo fica congelado por candidatura. O teste: duas candidaturas com anexos diferentes, conferidas em "Minhas candidaturas".
  3. Onde aparece a etapa de testes.

  Se o anexo não ficar congelado, mudar o padrão de `gupy.anexoPorCandidatura` para `false` no schema de config e em `config.exemplo.yaml`, com uma ADR nova.
- **Conector Gupy.**
  - `extrairVaga` usa JSON-LD e, como fallback, `script#__NEXT_DATA__`.
  - `lerCampos` retorna `null`.
  - `abrirEPreencher`:
    - Se a página pedir login, chama `aguardarUsuario("Faça login na Gupy e pressione Enter")`.
    - Percorre as etapas até a revisão final, anexando `pacote.pdfCurriculo`. A escolha entre o PDF camaleão e o master genérico é feita pela aplicação, conforme a config.
    - Os campos lidos em cada etapa vão para `ctx.responderAoVivo` e são preenchidos com as respostas.
  - `confirmarEnvio` retorna `"pendente_teste"` quando a etapa seguinte é de teste.
- **Spike do InHire.** Registrar se a candidatura exige conta (global ou por tenant) e as etapas.
- **Conector InHire.**
  - Conta por tenant: usa o `CofreCredenciais` (T17) para cadastro e login.
  - Conta global: `aguardarUsuario` no primeiro login.
  - Verificação de e-mail sempre pausa.

### T17: Cofre de credenciais e MCP `outbox-segredos`

**Arquivo:** `src/infra/credenciais/cofre-credenciais-json.ts`, `src/interfaces/mcp/outbox-segredos.ts` | **Ação:** Criar

**Detalhes:**

- **`CofreCredenciaisJson`.** `obterOuCriar(tenant): { email; senha; recemCriada }`.
  - Formato do arquivo: `{ [tenant]: { email, senha, criadaEm } }`, com escrita atômica.
  - Senha de 20 caracteres com pelo menos 1 maiúscula, 1 minúscula, 1 dígito e 1 símbolo de `!@#$%&*?`. O gerador de aleatoriedade é injetável e usa `crypto.randomInt` por padrão.
  - O e-mail é `master.pessoal.email`.
  - Nunca registra a senha em log.
- **`outbox-segredos.ts`.** Servidor MCP stdio (`@modelcontextprotocol/sdk`) criado com `criarContainer`. Conecta-se por CDP e lê do ambiente `OUTBOX_VAGA_ID` e `OUTBOX_HOSTS_PERMITIDOS` (lista separada por vírgula, aceitando `*.` como prefixo).
  - **Página alvo:** `paginaMaisRecente`.
  - **Regra comum:** se o host da página não casar com a allowlist, a ferramenta retorna `{ ok: false, erro: "host não permitido" }` e registra um aviso.

  | Ferramenta | Comportamento | Retorno |
  | --- | --- | --- |
  | `email_cadastro()` | Lê o e-mail do master | `{ email }` |
  | `preencher_senha({ seletor })` | Tenant = host da página | `{ ok, senhaRecemCriada }` |
  | `preencher_dado_sensivel({ chave, seletor, formato? })` | `chave` é `cpf`, `rg` ou `dataNascimento`, lida de `perfil.documentos` | `{ ok }` |
  | `preencher_resposta_protegida({ chaveResposta, seletor })` | Lê de `dados/vagas/<OUTBOX_VAGA_ID>/respostas.json` a resposta sensível com essa chave (`p<n>`, atribuída pela T18) e preenche de acordo com o elemento: `fill`, `selectOption` por rótulo ou `check` | `{ ok }` |

  Nenhuma ferramenta retorna o valor preenchido.

### T18: Agente

**Arquivo:** `src/infra/agente/executor-agente-claude.ts`, `src/infra/agente/formulario-agente.ts`, `prompts/agente-candidatura.md` | **Ação:** Criar

**Detalhes:**

- **`ExecutorAgenteClaude.preencher`.**
  1. **Configuração MCP.** Gera `dados/tmp/mcp-agente-<id>.json` com dois servidores:
     - `playwright`: `npx --no-install @playwright/mcp --cdp-endpoint http://127.0.0.1:<porta>`, com a restrição de origens se suportada.
     - `outbox-segredos`: `node <repo>/src/interfaces/mcp/outbox-segredos.ts`, com `env` `OUTBOX_VAGA_ID` e `OUTBOX_HOSTS_PERMITIDOS`.
  2. **Execução.** Chama `executarClaude` com `-p --output-format json --model <modeloAgente> --max-turns <saldo.turnos> --mcp-config <arquivo> --strict-mcp-config --allowedTools <allowlist>` e `timeoutMs = saldo.ms`.
     - A allowlist contém as ferramentas do Playwright MCP de navegação, clique, digitação, seleção, snapshot, upload e abas, mais as quatro do `outbox-segredos`. Nunca inclui ferramentas de avaliação de script.
     - **Verificação na tarefa:** confirmar os nomes exatos e se o upload de arquivo exige raiz permitida. Se exigir, permitir `dados/vagas/` e `dados/master/`.
  3. **`BLOQUEADO`.** Chama `ctx.aguardarUsuario` e reinvoca com `--resume <sessaoId>` e "O usuário resolveu o bloqueio. Continue de onde parou." O tempo de pausa é descontado do saldo.
  4. **Teto.** `ErroMaxTurnos`, `ErroTimeoutLlm` ou saldo zerado devolvem `{ tipo: "teto" }`.
  5. **Gravação.** A saída é gravada em `agente.json`.
- **Prompt `agente-candidatura.md`.**
  - Variáveis: URL, motor, caminhos absolutos dos PDFs, contato não sensível, cidade/UF/país, idioma e contexto de falha opcional. As respostas sugeridas vêm assim:
    - Não sensíveis: rótulo e valor.
    - Sensíveis: só o rótulo e a chave `p<n>`, com a instrução de usar `preencher_resposta_protegida`.
  - Regras:
    - Com contexto de falha, usar a aba existente nessa URL sem refazer o que já foi preenchido. Senão, abrir a URL.
    - Senha via `preencher_senha`, cadastro via `email_cadastro`.
    - Documentos via `preencher_dado_sensivel`, como última ação.
    - Pergunta sem resposta: responder com os dados fornecidos e listar em `perguntasRespondidasNaHora`.
    - **Nunca clicar no envio final.**
    - CAPTCHA ou verificação de e-mail: reportar `BLOQUEADO`.
  - Saída: só um JSON `{ status: PRONTO_PARA_REVISAO, SEM_FORMULARIO, BLOQUEADO ou EASY_APPLY; seletorEnviar?; motorDetectado?; passos; perguntasRespondidasNaHora; observacoes? }`.
- **`FormularioAgente`.** Implementa `FormularioAberto` com `rota: "agente"` sobre `paginaMaisRecente`.
  - `enviar` clica em `seletorEnviar` e espera a navegação ou 10 s.
  - `confirmarEnvio` retorna `"indeterminada"` (quem confirma é o usuário).
  - Passa na suíte `contrato-formulario.ts`.

### T19: Notificação

**Arquivo:** `src/infra/notificacao/notificador-windows.ts` | **Ação:** Criar

**Detalhes:** `NotificadorWindows.notificar(titulo, mensagem)` importa `node-notifier` dinamicamente e emite `{ title, message, appID: "Outbox" }` quando `notificacao.toast` for verdadeiro. Erros viram `Registrador.avisar`, sem lançar.

### T20: Casos de uso de entrada

**Arquivo:** `src/aplicacao/casos-de-uso/importar-curriculo.ts`, `src/aplicacao/casos-de-uso/adicionar-vagas.ts`, `src/aplicacao/casos-de-uso/renderizar-master.ts`, `src/aplicacao/casos-de-uso/abrir-navegador.ts` | **Ação:** Criar

**Detalhes:**

- **`importarCurriculo(deps, { caminhoArquivo, extensao, textoDocx?, sobrescrever }, sinal)`.**
  - Se o master existir e não houver `sobrescrever`, lança `ErroUsuario` sem chamar o LLM.
  - Para `.pdf`, usa `arquivosLeitura: [caminho]`. Para `.docx`, `.md` e `.txt`, o texto vai como conteúdo não confiável. A extração do `.docx` com `mammoth` fica no comando da CLI, que entrega `textoDocx`.
  - Chama `GeradorEstruturado` (`importar-curriculo`, schema `Master`), depois `gravarMasterNovo` e `garantirArquivosAuxiliares`.
  - Retorna `{ backup?, criados }`.
- **`adicionarVagas(deps, { urls })`.** Para cada URL:
  1. `canonizar`.
  2. `decidirDeduplicacaoUrl(repo.buscarPorUrlCanonica(...))` e a execução da ação dentro de `transacao`. Uma vaga nova recebe `canal = detectarMotor(urlOriginal)`, `motor = canal` e status NOVA.

  URLs inválidas são reportadas. Retorna a contagem por resultado.
- **`renderizarMaster(deps, sinal)`.** Usa `montarDocumento(master, null, master.idioma)`, `RenderizadorDocumentos` e grava o texto. Também é chamado por `prepararVagas` quando `masterGeradoEm()` é nulo ou anterior a `atualizadoEm()` do master.
- **`abrirNavegador(deps)`.** Chama `NavegadorUsuario.abrirParaLogin()`.

### T21: Etapas de preparo e caso de uso `preparar`

**Arquivo:** `src/aplicacao/etapas/resolver-vaga.ts`, `src/aplicacao/etapas/extrair-vaga.ts`, `src/aplicacao/etapas/analisar-vaga.ts`, `src/aplicacao/etapas/gerar-curriculo.ts`, `src/aplicacao/etapas/responder-campos.ts`, `src/aplicacao/etapas/montar-pacote.ts`, `src/aplicacao/casos-de-uso/preparar-vagas.ts` | **Ação:** Criar

**Detalhes:**

- **`resolverVaga`.**
  - `ResolvedorVagas.resolver`.
  - Se a canônica mudou, aplica `decidirDeduplicacaoUrl` em `transacao`. Quando a vaga existente está na fila, a atual vira DUPLICADA `mesma_vaga_na_fila`.
  - Atualiza `motor`, `urlResolvida`, `urlCanonica` e `rota`.
- **`extrairVaga`.** `ExtratorVagas.extrair`. Se `estruturada` vier nula, usa `GeradorEstruturado` (`extrair-vaga`, com `textoPagina` como conteúdo não confiável). Grava `vaga.json` e `descricao.md`, e atualiza `empresa`, `cargo`, `localidade` e `publicadaEm`.
- **`analisarVaga`.**
  1. `GeradorEstruturado` (`analisar-vaga`).
  2. `sanearAnalise`.
  3. Grava `analise.json`.
  4. `inserirGaps(gapsDaAnalise(...))`.
  5. Atualiza `idioma` e `chaveDedup`.
  6. Para o motor `github`, aplica `comoCandidatar`:
     - `link`: canoniza e resolve de novo (profundidade máxima 2).
     - `email`: MANUAL `candidatura_por_email`, com o destino gravado em `analise.json`.
     - `outro`: MANUAL `sem_formulario`.
- **`gerarCurriculo(deps, vaga, analise, sinal)`.** Reutilizada pela rodada de gaps.
  1. O idioma alvo é o da análise (`outro` vira `en`).
  2. `GeradorEstruturado` (`tailoring`, com a descrição como conteúdo não confiável), seguido de `validarLastro`.
  3. Com violações, faz 1 nova chamada acrescentando a lista. Se ainda houver violações, usa o master genérico (`montarDocumento(master, null, ...)`) e grava `camaleao_falhou = "lastro"`.
  4. Monta o documento, renderiza `pdf-curriculo`, grava `curriculo.json` e `curriculo.txt` e calcula `atsAntes` (texto do master genérico) e `atsDepois`.
  5. Mais de 2 páginas gera o alerta `pdf_mais_de_2_paginas` em `analise.json`.
- **`responderCampos(deps, campos, contexto, sinal): RespostaSugerida[]`.** Usada no `preparar` e, ao vivo, no `aplicar`.
  - Campos `padrao`, `documento`, `curriculo`, `salario` e `diversidade` são resolvidos por funções de domínio, com `sensivel` marcado.
  - Campos `pergunta`, `carta` e a identificação de regime, período e moeda dos campos de salário vão numa única chamada `responder-perguntas`. As variáveis nunca incluem `documentos`, `salario`, `diversidade` nem o endereço completo.
  - A carta em campo de arquivo é renderizada em `pdf-carta`.
  - As respostas sensíveis recebem a chave `p<n>`.
  - Grava `respostas.json`.
- **`montarPacote(deps, vaga)`.**
  - `pdfCurriculo` é o camaleão ou, quando o motor for `gupy` e `gupy.anexoPorCandidatura` for falso, o PDF do master genérico.
  - Respostas lidas de `respostas.json`, contato do master e carta, se houver.
- **`prepararVagas(deps, { forcar, paralelo, reavaliar }, sinal)`.**
  1. Com `reavaliar`, aplica `recalcularComGaps` (com os termos respondidos "sim") às vagas DESCARTADA `aderencia_baixa` com `analise.json`. As que atingirem o mínimo voltam a NOVA e entram no lote.
  2. Garante o master genérico.
  3. Seleciona as vagas NOVA e as ERRO_PREPARO com `tentativas_preparo < preparar.maxTentativas`.
  4. `executarComLimite`, aplicando por vaga:
     1. `resolverVaga`. Um resultado `manual` gera a carta avulsa (e o currículo, quando houver descrição) e a vaga vira MANUAL com o motivo.
     2. `extrairVaga`.
     3. `analisarVaga`.
     4. Deduplicação por chave: `decidirDeduplicacaoChave` executada em `transacao`. Se a vaga atual for descartada, a vaga termina aqui.
     5. `calcularAderencia`. Com eliminação, DESCARTADA `afirmativa_inelegivel`, mesmo com `forcar`. Abaixo do mínimo e sem `forcar`, DESCARTADA `aderencia_baixa`.
     6. `gerarCurriculo`.
     7. Se houver conector com `lerCampos` que retorne campos, `responderCampos` e gravação de `campos.json`.
     8. Transição para PRONTA.

     Erros por vaga:

     | Erro | Status resultante |
     | --- | --- |
     | `ErroResolucao` | ERRO_PREPARO `resolucao_falhou` |
     | `ErroAgregadorExigeLogin` | ERRO_PREPARO `agregador_exige_login` |
     | `ErroExtracao` ou `ErroHttp` | ERRO_PREPARO `extracao_falhou` |
     | `ErroLlm` ou `ErroTimeoutLlm` | ERRO_PREPARO `llm_falhou` |

     Só nesses casos `tentativas_preparo` é incrementado.
  5. Com `ErroLimiteUso` ou abort, as vagas não concluídas permanecem como estavam. No limite, notifica: "Outbox: limite de uso do Claude atingido. N vagas aguardando novo `preparar`."
  6. No fim, notifica: "Outbox: preparar concluído. X prontas, Y descartadas, Z com erro, W manuais."
  7. Retorna `ResumoPreparo` (contagens por status e a lista de erros), que a CLI apresenta.

### T22: Etapas de aplicação e caso de uso `aplicar`

**Arquivo:** `src/aplicacao/etapas/rodada-gaps.ts`, `src/aplicacao/etapas/preencher-formulario.ts`, `src/aplicacao/etapas/revisar-e-enviar.ts`, `src/aplicacao/casos-de-uso/aplicar-vagas.ts` | **Ação:** Criar

**Detalhes:**

- **`rodadaGaps(deps, ids, sinal)`.**
  1. `listarGapsAbertos(ids)`, agregados por termo normalizado e ordenados pela quantidade de vagas.
  2. Para cada gap, `Interacao.perguntarSimNao("A vaga pede <termo> (N vagas). Você tem?")`.
  3. "Sim": `perguntarNumero` (anos) e `perguntarTexto` (evidência), depois `adicionarSkill({ id: kebab(termo), nome: termo, aliases: [], categoria: "ferramenta", anos, origem: "aprendido", evidencia, aprendidoEm, vagaOrigem })` e `responderGaps(termo, "sim")`.
  4. "Não": `negarGap` e `responderGaps(termo, "nao")`.
  5. As vagas afetadas por algum "sim" passam por `recalcularComGaps` e `gerarCurriculo` com `executarComLimite`.
- **`preencherFormulario(deps, vaga, pacote, ctx, sinal): Promise<ResultadoPreenchimento>`.**
  - **Com conector:** `abrirEPreencher`.
  - **Com `ErroFalhaConector`:**
    1. `capturarHtml` do formulário parcial, seguido de `sanitizarHtml` com `listaPii`.
    2. `RegistroFalhas.registrar({ tipo: "falha_conector", ... })`.
    3. `ExecutorAgente.preencher` com o contexto da falha.
    4. Atualização do registro com o resultado.
  - **Sem conector:** `ExecutorAgente.preencher`. No fim, registra `sem_conector` com o snapshot sanitizado.
  - **Allowlist:** `hostsPermitidos` é o host de `urlResolvida` mais os padrões do motor (`PADROES_MOTOR`).
  - **Saldo:** começa em `{ turnos: agente.maxTurnos, ms: agente.timeoutMin × 60000 }` a cada execução do `aplicar` para a vaga.
  - **Desfechos do agente:** `sem_formulario` e `easy_apply` viram MANUAL com o motivo. `teto` vira MANUAL `teto_agente`.
- **`revisarEEnviar(deps, vaga, formulario, pacote, { simular }, sinal)`.**
  1. `capturarTela(antes-envio.png)`.
  2. `exibirResumoRevisao` com: empresa, cargo, motor, rota, URL, aderência, ATS `antes → depois`, gaps restantes, alertas (afirmativa sem dado, `camaleao_falhou`, mais de 2 páginas), respostas NOVA (fonte `gerada` ou `confianca: "baixa"`), as 3 primeiras linhas da carta e o caminho do PDF.
  3. Menu com `escolher`: `enviar`, `pular`, `manual`, `ver_pdf` (chama `abrirArquivo` e volta ao menu) e `sair`.
  4. **`enviar`:**
     1. `lerValores`: um valor diferente do sugerido marca a resposta como editada. Se o nome do arquivo no campo de currículo for diferente do PDF gerado, `anexo_manual = 1`.
     2. `registrarRespostasEnviadas`.
     3. Com `simular`, informa "simulação: nada enviado" e mantém PRONTA.
     4. Sem `simular`: `enviar()` e `confirmarEnvio(120000)`.
        - `indeterminada`: `perguntarSimNao("A confirmação apareceu?")`.
        - `nao_confirmada`, ou "não" na pergunta anterior: `perguntarSimNao("Marcar como enviada mesmo assim?")`. "Não" mantém PRONTA.
     5. `capturarTela(confirmacao.png)` e transição para ENVIADA ou PENDENTE_TESTE.
     6. `gravarBanco(aplicarAprendizado(...))`.
  5. **Demais opções.** `pular` vira PULADA. `manual` vira MANUAL `escolha_usuario`. `sair` encerra o laço.
  6. Sempre fecha o formulário com `fechar()`, num bloco `finally`.
- **`aplicarVagas(deps, { simular, id? }, sinal)`.**
  1. Seleciona as PRONTA (ou só a `id`), em ordem de aderência decrescente.
  2. `rodadaGaps`.
  3. Para cada vaga:
     1. `montarPacote`.
     2. `preencherFormulario`. O `ctx.responderAoVivo` usa `responderCampos` e o `aguardarUsuario` usa `Interacao`.
     3. `revisarEEnviar`.

     Um erro inesperado numa vaga é registrado, informado e a vaga permanece PRONTA. O laço continua.
  4. Com abort, encerra depois de fechar o formulário atual, sem enviar.

### T23: Casos de uso de consulta

**Arquivo:** `src/aplicacao/casos-de-uso/listar-status.ts`, `src/aplicacao/casos-de-uso/registrar-retorno.ts`, `src/aplicacao/casos-de-uso/listar-falhas.ts` | **Ação:** Criar

**Detalhes:**

- **`listarStatus(deps, { status? }): DadosStatus`.** Retorna `{ contagens; linhas; aguardandoVoce: { manuais (com motivo e destino de e-mail); pendentesTeste } }`.
  - Colunas das linhas: `id`, `status`, `motivo` ou `etapa`, `empresa`, `cargo`, `canal`, `motor`, `aderencia`, `atsAntes`, `atsDepois` e `atualizadaEm`.
  - Uma consulta por grupo, sem N+1.
- **`registrarRetorno(deps, { id, status, etapa?, nota? })`.**
  - Aceita EM_PROCESSO (exige etapa), OFERTA, RECUSADA e ENVIADA (só a partir de MANUAL ou PENDENTE_TESTE).
  - Valida pela transição do repositório.
  - Um erro de transição relança `ErroTransicaoInvalida` com as transições aceitas.
- **`listarFalhas(deps): DadosFalhas`.** Retorna:
  - `grupos`: agrupados por `conector` e `passo`, com `quantidade`, `maisRecente` e `urlMaisRecente`.
  - `semConector`: o ranking por motor.

### T24: Composição e CLI

**Arquivo:** `src/composicao.ts`, `src/interfaces/cli/principal.ts`, `src/interfaces/cli/comandos/{importar,adicionar,preparar,aplicar,status,retorno,falhas,navegador,renderizar-master}.ts`, `src/interfaces/cli/apresentacao/{tabela,resumo-preparo,resumo-revisao,status,falhas,cores}.ts`, `src/interfaces/cli/interacao-terminal.ts`, `src/interfaces/cli/sinais.ts`, `src/interfaces/cli/codigos-saida.ts` | **Ação:** Criar

**Detalhes:**

- **`composicao.ts`.**
  - `criarContainer(config = carregarConfig())` expõe getters preguiçosos para cada implementação de porta e funções prontas por caso de uso (por exemplo, `container.casos.prepararVagas(entrada, sinal)`).
  - `encerrar()` fecha o banco e o leitor headless.
  - Os testes verificam que acessar `casos.listarStatus` não instancia navegador, renderizador, notificador nem leitor (AC31).
- **`principal.ts`.**
  - `executar(argv)` registra os comandos com o `commander`:
    - `importar <arquivo> [--sobrescrever]`
    - `adicionar [urls...] [-a, --arquivo <caminho>]`
    - `preparar [--forcar] [--paralelo <n>] [--reavaliar]`
    - `aplicar [--simular] [--id <id>]`
    - `status [--status <STATUS>]`
    - `retorno <id> <status> [--etapa <etapa>] [--nota <texto>]`
    - `falhas`
    - `navegador`
    - `renderizar-master`
  - Envolve tudo com o mapeamento de `codigos-saida.ts` e chama `encerrar()` no `finally`.
- **Comandos.** Cada comando faz quatro coisas, e nenhuma regra de negócio:
  1. Valida a entrada com Zod (a falha vira `ErroUsuario`).
  2. Adquire a trava, só em `preparar` e `aplicar`.
  3. Chama o caso de uso.
  4. Apresenta o resultado.

  `adicionar -a` lê o arquivo, ignorando linhas vazias e linhas que começam com `#`. `importar` extrai o texto do `.docx` com `mammoth`.
- **Apresentação.**
  - Tabelas alinhadas com `padEnd`.
  - Status exibidos como estão (PT).
  - Cores via `node:util.styleText`.
  - Snapshot de texto nos testes.
- **`InteracaoTerminal`.** Implementa `Interacao` com `@inquirer/prompts` (`select`, `confirm`, `input`, `number`) e `open` para `abrirArquivo`.
- **`sinais.ts`.**
  - O primeiro SIGINT aborta o `AbortController` e informa "encerrando… (Ctrl+C de novo para forçar)".
  - O segundo SIGINT executa `process.exit(130)`.
- **`codigos-saida.ts`.** Aplica `arquitetura.md` §10.1, com a mensagem em vermelho e o stack só no log.

### T25: Documentação viva

**Arquivo:** `README.md`, `docs/arquitetura.md`, `docs/convencoes.md`, `docs/como-adicionar-conector.md`, `docs/adr/0001-hexagonal-enxuto.md` a `docs/adr/0016-execucao-exclusiva-e-cancelamento.md` | **Ação:** Criar

**Detalhes:**

- **Documentos de arquitetura.** `docs/arquitetura.md` e `docs/convencoes.md` derivam de `specs/v1/spec-outbox/arquitetura.md`, atualizados com o que mudou na implementação (resultados das verificações das T1, T10, T16 e T18). Cada ADR vira um arquivo no formato de `arquitetura.md` §16.5.
- **`README.md`** (PT-BR):
  1. Requisitos.
  2. Instalação: `npm ci`, `npx playwright install chromium` e, opcionalmente, `npm link`.
  3. `outbox importar curriculo/original.pdf`.
  4. Preenchimento de `curriculo/perfil.yaml`.
  5. `outbox navegador` para logins.
  6. Fluxo diário: `adicionar`, `preparar`, `aplicar` e `status`.
  7. Retornos com `outbox retorno`.
  8. Manutenção com `outbox falhas` e `npm run capturar-fixture`.
  9. `config.yaml` opcional a partir de `config.exemplo.yaml`.
  10. Avisos sobre dados pessoais, BitLocker, o fato de nunca enviar sem confirmação e de nunca contornar CAPTCHA.
  11. Checklist de smoke manual com `aplicar --simular`.
- **`docs/como-adicionar-conector.md`.** A receita de `arquitetura.md` §15.1.

## 8. Registro da revisão de 2026-10-09 (revisão 2)

| Achado na revisão 1 | Tipo | Correção |
| --- | --- | --- |
| Comandos misturavam inglês e português (`import`, `add`, `prepare`, `apply` com `retorno`, `falhas`, `navegador`) | Inconsistência | Tudo em PT ASCII (ADR-003). Os comandos passam a ser `importar`, `adicionar`, `preparar`, `aplicar`, `renderizar-master`, e as flags `--forcar`, `--simular` e `-a` |
| Regra de negócio acoplada a IO (`analisar.ts` gravava gaps; `tailoring.ts` chamava LLM, renderizava e gravava; `dedupChave.ts` lia e escrevia no banco) | Lacuna arquitetural | Domínio puro devolvendo decisões, aplicação orquestrando portas e infra implementando (ADR-001) |
| Sem mecanismo de injeção: "LLM mockado" sem definição de como | Lacuna de testabilidade | Raiz de composição com injeção manual e fakes de porta (ADR-006, ADR-007) |
| Atomicidade da deduplicação dependia de "não usar `await`", sem efeito entre processos (painel da v2) | Defeito latente | `transacao` com `BEGIN IMMEDIATE` (ADR-008) |
| Schema por `CREATE IF NOT EXISTS`, sem evolução | Lacuna | Migrações por `user_version`, tabelas STRICT e coluna `canal` (ADR-008) |
| Sem estratégia de erros nem códigos de saída | Lacuna | Hierarquia `ErroOutbox`, captura por vaga e códigos 0, 1, 2 e 130 (ADR-009) |
| Prompt do agente recebia respostas sugeridas com salário e diversidade, contrariando "dados sensíveis nunca no LLM" | Inconsistência de segurança | `RespostaSugerida.sensivel` e `preencher_resposta_protegida` (ADR-012) |
| `PacoteCandidatura` carregava o `Perfil` inteiro | Risco de vazamento | O pacote leva só o contato. Os valores sensíveis ficam em `respostas.json` |
| Injeção de prompt não tratada: o agente com segredos podia ser induzido a preencher CPF em outro site | Lacuna de segurança | Conteúdo externo delimitado, allowlist de hosts no MCP e ferramentas do agente restritas (ADR-012) |
| Render de PDF com texto do LLM sem escape e com JavaScript habilitado | Lacuna de segurança | Escape, contexto sem JavaScript e rede bloqueada |
| `LlmClient` com duas responsabilidades | Violação de ISP | `GeradorEstruturado` e `ExecutorAgente` (ADR-011) |
| `aplicar` usava `@inquirer/prompts` diretamente e `revisao.ts` formatava o terminal | Mistura de camadas | Porta `Interacao` e apresentadores na CLI |
| "Adaptador" (ATS) colidia com o termo do hexagonal | Ambiguidade | Renomeado para **conector**, incluindo `falhas/<conector>/`, `_sem-conector` e a rota `conector` |
| Sem logging nem redação de PII | Lacuna | `Registrador` JSONL com redação (ADR-014) |
| `config.yaml` versionado misturava padrões e ajustes pessoais | Inconsistência | Padrões no schema, `config.yaml` local e `config.exemplo.yaml` (ADR-015) |
| Dois `preparar` simultâneos e Ctrl+C sem tratamento | Lacuna | Trava por comando, `AbortSignal` e escrita atômica (ADR-016). `tentativas_preparo` só incrementa em erro |
| Sem relógio injetável, com testes dependentes da data | Lacuna de testabilidade | Porta `Relogio`. `hoje` passado às funções de domínio |
| Testes sem pirâmide, sem contrato de conector, sem limiar de cobertura e com rede possível | Lacuna de qualidade | Estratégia em `arquitetura.md` §11, suítes de contrato, rede bloqueada e CI no Windows |
| Dependências sem política (`tsx`, `picocolors`) e justificadas por "padrão de outros projetos" | Lacuna | Política e tabela em `arquitetura.md` §14. `tsx` e `picocolors` removidos. Cada dependência justificada pelo mérito |
| Canal (origem) só derivável em tempo de consulta | Oportunidade | Coluna `canal` gravada na entrada |
| Valor sensível gravado em `respostas_enviadas` | Risco | `valor = NULL` quando `sensivel = 1` |

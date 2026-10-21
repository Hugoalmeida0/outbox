# Camaleão: MVP web (site hospedado + agente local), Fase 1

**Data:** 2026-10-20 | **Card:** sem card | **Status:** Rascunho

---

## 1. Contexto e Objetivo

Hoje o produto é uma CLI local (`outbox`) que adiciona, prepara e aplica candidaturas com currículo camaleão, sobre SQLite, arquivos em `curriculo/` e `dados/`, `claude -p` da assinatura do usuário e Playwright num Chrome dedicado. O MVP leva **exatamente o que a CLI faz** para uma interface web, sem mudar a arquitetura de execução: um **site estático hospedado na Vercel** conversa com um **agente local** (`camaleao agente`) que roda na máquina do usuário e chama os casos de uso existentes. Assim o LLM continua sendo o `claude -p` da assinatura do próprio usuário, o `aplicar` continua preenchendo formulários no Chrome dele e não há banco nem backend na nuvem.

A Fase 1 entrega: a renomeação do projeto para Camaleão, o agente HTTP local e o site com os 9 comandos da CLI em tela (mais o formulário de perfil), fiel à identidade visual do Canva. As fases seguintes só serão planejadas depois da aprovação da Fase 1.

## 2. Premissas

- O núcleo (`src/dominio/`, `src/aplicacao/`) e a composição (`src/composicao.ts`) já recebem `ProgressoPreparo` e `Interacao` por chamada (`CasosDeUso.prepararVagas(entrada, progresso, sinal)` e `aplicarVagas(entrada, interacao, sinal)`): uma interface nova só precisa implementar essas portas, sem tocar em regra de negócio.
- O usuário do agente tem Node 24+, o Claude Code instalado e logado (`claude` no PATH) e o Chromium do Playwright ou o Chrome instalado, como hoje.
- O design do Canva "Brand board Camaleão" (id `DAHYg8zV2LI`, 7 páginas) define marca, landing e brand board, mas **não tem telas do app**: as telas internas são derivadas da linguagem visual dele (creme, cards arredondados, blobs nas cores da paleta, tipografia, tom de voz).
- Usar o `claude -p` da assinatura do usuário é aceitável porque roda na máquina dele, invocado por ele; o site hospedado nunca chama LLM.
- Um projeto Vercel será criado pelo usuário para o site (deploy estático, root `apps/web`).
- A spec da v2 (`specs/v2/spec-outbox/spec.md`) é desconsiderada: este MVP parte do zero e não implementa painel de métricas.

## 3. Decisões

| Decisão | Motivo | Alternativas descartadas |
| --- | --- | --- |
| Arquitetura: site estático (Vercel) + agente local HTTP em `127.0.0.1` neste repositório | Reduz custo e infra a zero além do estático; mantém `claude -p`, Playwright, sessões do usuário e o `aplicar` automático | Tudo local (UI servida pelo agente); Next.js + Supabase + API Anthropic na Vercel (exigia BYOK, jobs, Chromium serverless e matava o `aplicar` automático); extensão do Chrome |
| Escopo: os 9 comandos da CLI (`importar`, `adicionar`, `preparar`, `aplicar`, `status`, `retorno`, `falhas`, `navegador`, `renderizar-master`) mais formulário de perfil | "O web é exatamente o que a CLI faz hoje"; o perfil em formulário viabiliza usuários não técnicos | Só o núcleo adicionar/preparar/aplicar; editor YAML no site; só "abrir no editor" |
| Frontend: Vite + React + TypeScript em `apps/web/`, SPA estática | Sem servidor no site, ecossistema amplo para a UI fiel ao Canva, importa o contrato da API do agente sem duplicar | Next.js com static export (peso sem ganho sem servidor); SvelteKit (ecossistema menor) |
| Servidor do agente: Hono + `@hono/node-server` em `src/interfaces/http/` | Roteamento, middleware e streaming leves, tipados e sem build (compatível com o ADR-0004) | `node:http` puro (reimplementar roteamento e middleware); Express (sem tipos nativos, mais pesado) |
| Eventos em tempo real por streaming de `fetch` (`text/event-stream` lido com `ReadableStream`), não `EventSource` | `EventSource` não envia o cabeçalho `Authorization`; token em query string vazaria em logs e histórico | `EventSource` com token na URL; WebSocket (mais protocolo sem necessidade) |
| Interação web = responder perguntas pendentes: `InteracaoWeb` emite `pergunta` e a promessa resolve com o POST da resposta àquela pergunta | Reusa `revisarEEnviar` e `rodadaGaps` sem alteração; o envio só acontece respondendo "enviar" ao menu pendente, com a confirmação já existente | Endpoints próprios de "enviar" (duplicaria a regra e abriria caminho para envio fora da revisão) |
| Nome público e interno: **Camaleão** (identificadores `camaleao`, ASCII, ADR-0003) | Escolha do usuário: consistência entre marca e produto | Camaleão só no público; Outbox em tudo |
| Renomeação é a primeira tarefa da Fase 1, com migração automática de dados e `OUTBOX_*` aceito como fallback com aviso | Evita renomear o código novo duas vezes e não quebra a instalação existente | Renomear no fim; renomear sem migração |
| Abertura padrão: `camaleao agente` abre o site numa **janela própria** do Chrome do Camaleão, pareada automaticamente | Formulário e revisão no mesmo navegador, sem copiar código | Site só no navegador do dia a dia |
| O site também funciona em qualquer outro navegador, com pareamento por código | Escolha do usuário | Restringir ao Chrome do Camaleão |
| Segurança do agente: allowlist de `Host`, CORS com allowlist de origens, token de pareamento obrigatório em toda rota exceto `GET /saude` e `POST /pareamento`, respostas só para a pergunta pendente | O agente preenche e envia candidaturas e lê dados sensíveis; qualquer site aberto poderia chamar `localhost` | Sem token (só CORS); autenticação por conta |
| A aba do site é invisível para o fluxo de vaga: `paginaMaisRecente` ignora páginas das origens do site, e o token nunca entra no prompt nem no contexto do agente LLM | O agente LLM controla o mesmo Chrome por CDP (com `browser_tabs`); uma injeção não pode usar a aba do site para enviar | Remover `browser_tabs` da allowlist do agente (quebraria pop-ups de ATS) |
| Formulário de perfil com todas as seções do `esquemaPerfil`; sensíveis (documentos, salário, diversidade, endereço completo) mascarados e opcionais | Onboarding completo sem YAML; os dados vão só do navegador ao agente em `127.0.0.1` e ao arquivo | Só seções não sensíveis; perfil obrigatório completo |
| `salario` passa a ser opcional no `esquemaPerfil`; sem valor, o campo de pretensão fica vazio e aparece como resposta vazia na revisão | "Sensíveis não obrigatórios"; mantém a regra de que salário nunca vai ao LLM | Perguntar a pretensão na rodada de gaps; manter obrigatório |
| Marca: Canva é a fonte de verdade (Poppins Bold para títulos, Nunito Regular para texto, paleta de 5 cores, tom de voz); o tema escuro usa `BRAND.md` (`#1F4E5F` de fundo) | Escolha do usuário; o Canva não define tema escuro | `BRAND.md` (system-ui, sem a Menta, cores de texto trocadas) |
| Fontes empacotadas com `@fontsource/poppins` e `@fontsource/nunito`, sem Google Fonts | Nenhuma requisição a terceiros a partir do app; funciona com CSP restritiva | Google Fonts por CDN |
| Tema claro e escuro, seguindo `prefers-color-scheme` | Escolha do usuário | Só claro |
| Site só com o app (sem landing pública) | Escolha do usuário; landing fica para a distribuição | Landing da página 2 do Canva |
| Fase 1: site publicado na Vercel + agente rodando do repositório (`npm run camaleao -- agente`); publicação no npm fica para a fase de distribuição | Prova o cenário real site público → `localhost` (CORS, acesso à rede local do Chrome) sem antecipar empacotamento | Tudo local; npm já na Fase 1 |
| Qualidade: mesma barra do `npm run verificar`, testes de rota e segurança do agente, Vitest + Testing Library nos fluxos do site e um e2e Playwright do caminho feliz com o `claude` falso | Mantém a rede de segurança atual e cobre a UI nova | Site sem testes automatizados |

## 4. Glossário

- **Agente**: o processo local `camaleao agente`, servidor HTTP em `127.0.0.1:<agente.porta>` que expõe os casos de uso ao site.
- **Site**: a SPA estática em `apps/web/`, publicada na Vercel; não tem backend nem dados próprios.
- **Pareamento**: troca de um código de uso único, gerado pelo agente, por um token de acesso guardado no `localStorage` do site.
- **Execução**: uma rodada de `preparar`, `aplicar`, `importar` ou `renderizar-master` iniciada pelo site, com id, eventos e cancelamento.
- **Pergunta pendente**: chamada em curso a um método de pergunta da `Interacao` (`perguntarSimNao`, `perguntarNumero`, `perguntarTexto`, `escolher`, `aguardarUsuario`) que espera a resposta do site.
- **Chrome do Camaleão**: o Chrome dedicado com perfil em `dados/navegador/` (`NavegadorOutbox`, renomeado para `NavegadorCamaleao`).

## 5. Fora do Escopo

- Backend ou banco na nuvem (Supabase, API da Anthropic, BYOK, jobs na Vercel).
- Contas, login e multiusuário no site; cada agente atende só o usuário da própria máquina.
- Landing page pública.
- Painel de métricas e tudo o que a spec da v2 previa.
- Editor do `master.yaml` no site (continua editado no editor de texto; o site só mostra o estado e abre o arquivo).
- Edição de `config.yaml` e do banco de respostas (`respostas.yaml`) pelo site.
- Publicação no npm, `npx camaleao agente`, instalador e início com o Windows (fase de distribuição).
- Extensão do Chrome.
- Renomear o repositório no GitHub (ação do usuário) e alterar os registros históricos em `specs/`.
- Planejamento das fases seguintes.

## 6. Contrato de Aceite

| ID | Critério | Como validar | Tarefas |
| --- | --- | --- | --- |
| AC1 | Nenhuma ocorrência de `outbox`/`Outbox`/`OUTBOX_` resta em `src/`, `tests/`, `scripts/`, `prompts/`, `bin/`, `docs/` (exceto `docs/adr/` históricos citados como tal), `README.md`, `config.exemplo.yaml`, `package.json` e `.github/`. O comando é `camaleao`; `npm run verificar` passa | `git grep -i outbox -- <pastas>` vazio; CI verde | T1 |
| AC2 | Com `dados/outbox.db` existente e sem `dados/camaleao.db`, a primeira execução de qualquer comando move o banco (e os `-wal`/`-shm`) para `dados/camaleao.db` e registra um aviso. `OUTBOX_LOG` e `OUTBOX_CLAUDE_BIN` ainda funcionam quando o equivalente `CAMALEAO_*` está ausente, com aviso de depreciação | Teste de integração em pasta temporária; teste unitário da leitura de variáveis | T1 |
| AC3 | `camaleao agente` escuta só em `127.0.0.1:<agente.porta>` (padrão 4321), imprime o código de pareamento e a URL do site e abre o site numa janela própria do Chrome do Camaleão já pareada. Com a porta ocupada por outro agente (`GET /saude` igual a `{ app: "camaleao" }`), só reabre o site; ocupada por outro processo, sai com código 1 e mensagem | Testes com servidor real em porta efêmera; verificação do endereço do socket | T3 |
| AC4 | Requisição com `Host` fora de `127.0.0.1:<porta>`/`localhost:<porta>` recebe 403. Origem fora de `agente.origensPermitidas` não recebe cabeçalhos CORS e recebe 403. Preflight responde `Access-Control-Allow-Private-Network: true` para origens permitidas. Rota protegida sem `Authorization: Bearer <token>` válido recebe 401. Código de pareamento é de uso único e expira em 10 min. Os tokens ficam só como hash SHA-256 em `dados/agente/tokens.json` | Testes de middleware com `app.request()` | T2, T3 |
| AC5 | Cada comando da CLI tem equivalente no site com o mesmo resultado do caso de uso: importar (upload), adicionar (lista de URLs, com o resumo por resultado igual ao da CLI), preparar (opções `forcar`, `paralelo`, `reavaliar`), aplicar (opções `simular`, `id`), status (contagens, tabela, filtro por status, "aguardando você"), retorno (status, etapa, nota, com as transições aceitas listadas no erro), falhas, navegador (abre o Chrome do Camaleão para logins) e renderizar master (link para o PDF) | Testes de rota comparando com os casos de uso sobre a composição de teste; e2e do caminho feliz | T4, T5, T7, T8 |
| AC6 | Durante o `preparar`, o site mostra ao vivo, por vaga, a etapa em curso (`resolver`, `extrair`, `analisar`, `gerar_curriculo`, `gerar_carta`, `responder_campos`) e o status final, a partir dos eventos `inicio`/`etapa`/`concluida`. Recarregar a página durante a execução reapresenta todos os eventos desde o início. "Parar" equivale ao primeiro Ctrl+C (cancelamento ordenado) | Teste de `ProgressoWeb` e do buffer de eventos; teste de rota de cancelamento; e2e | T4, T7 |
| AC7 | Durante o `aplicar`, toda pergunta da `Interacao` aparece no site como componente (sim/não, número, texto, escolha, "continuar" para `aguardarUsuario`), e o resumo de revisão (`exibirResumoRevisao`) aparece com aderência, ATS antes → depois, gaps, alertas, respostas (as vazias na página destacadas), início da carta e link do PDF. Só a pergunta pendente aceita resposta (outra id recebe 409). Uma vaga só é enviada pela escolha "Enviar" no menu pendente seguida da confirmação. `simular` nunca envia | Testes de `InteracaoWeb` (ordem, resposta a id errada, cancelamento); teste do espião de `enviar` existente via rota; e2e com `--simular` | T4, T5, T8 |
| AC8 | Dois `preparar` (ou dois `aplicar`), seja pelo site, pela CLI ou ambos, nunca rodam ao mesmo tempo: o segundo recebe 409 no site (mensagem no tom da marca) ou sai com código 2 na CLI | Teste de rota com a trava já adquirida | T4 |
| AC9 | `abrirArquivo` e os links de PDF abrem o arquivo no site por uma URL de uso único (`/arquivos/<id-assinado>`, válida por 5 min) que só serve arquivos dentro de `dados/vagas/<id>/` e `dados/master/`. Path traversal recebe 404 | Testes de rota | T4 |
| AC10 | `NavegadorCamaleao.paginaMaisRecente` nunca devolve uma página cuja origem esteja em `agente.origensPermitidas`. O token de pareamento não aparece no prompt do agente, nos logs nem em `falhas/` | Teste unitário do filtro; varredura de logs em `tests/integracao/sensiveis.test.ts` estendida | T3, T6 |
| AC11 | O formulário de perfil lê e grava `curriculo/perfil.yaml` com todas as seções do `esquemaPerfil`, preservando os comentários do YAML, valida no agente (erro devolvido com o caminho do campo, HTTP 422) e mascara documentos, salário, diversidade e endereço completo ("mostrar" por campo). Nenhuma seção sensível é obrigatória. Valores do perfil nunca aparecem nos logs | Testes do caso de uso e da rota; teste de componente; varredura de logs | T6, T8 |
| AC12 | Com `salario` ausente no perfil, `responderCampos` deixa os campos de pretensão vazios (sem valor por código e sem LLM), e eles aparecem como `vaziaNaPagina` no resumo de revisão. Com `salario` presente, o comportamento é idêntico ao de hoje | Testes unitários de `responder-campos` e do domínio de salário | T6 |
| AC13 | O site segue o Canva: tokens de cor (Coral `#FF6B5B` primária, Azul-petróleo `#1F4E5F` texto, Amarelo-sol `#FFC94D` destaque, Menta `#9ED9C3` sucesso, Creme `#FFF6EC` fundo), Poppins Bold nos títulos, Nunito Regular no texto, logo de `docs/marca/`, favicon e microcopy no tom "Encorajador · Leve · Honesto". Tema escuro por `prefers-color-scheme`, com contraste AA nos dois temas. Nenhuma requisição a domínio externo além do agente | Teste que varre o build (`dist/`) por URLs externas; checagem de contraste dos pares de tokens em teste; revisão visual pelo usuário | T7, T8 |
| AC14 | Sem agente acessível, o site mostra a tela "Conectar o Camaleão" com o comando para iniciar o agente e o campo do código de pareamento, e tenta reconectar a cada 3 s. Com o agente de versão incompatível (`GET /saude` traz `versao` e `versaoContrato`), o site pede para atualizar | Testes de componente com o agente simulado | T7 |
| AC15 | O site é publicado na Vercel por push em `main` (root `apps/web`), e o e2e (parear → importar → adicionar → preparar → aplicar `simular`) passa contra o agente real com o `claude` falso. `npm run verificar` inclui tipos, lint, testes e build do site | Execução do e2e local e no CI | T9 |

## 7. Tarefas

| Tarefa | Objetivo | Arquivos/Áreas | Depende de | Pode paralelizar com | Critérios |
| --- | --- | --- | --- | --- | --- |
| T1 | Renomear Outbox → Camaleão, com migração | `package.json`, `bin/`, `src/**`, `tests/**`, `scripts/**`, `prompts/**`, `docs/**`, `README.md`, `config.exemplo.yaml`, `.github/**`, `.mcp.json` | Nenhuma | Nenhuma | AC1, AC2 |
| T2 | Contrato da API e núcleo do servidor do agente (segurança, pareamento) | `src/interfaces/http/contrato.ts`, `src/interfaces/http/servidor.ts`, `src/interfaces/http/seguranca.ts`, `src/interfaces/http/pareamento.ts`, `src/infra/config/esquema-config.ts` | T1 | T6, T7 | AC4 |
| T3 | Comando `agente`, abertura do site no Chrome do Camaleão e isolamento da aba | `src/interfaces/cli/comandos/agente.ts`, `src/interfaces/cli/principal.ts`, `src/infra/navegador/navegador-camaleao.ts` | T2 | T6, T7 | AC3, AC4, AC10 |
| T4 | Execuções, eventos, `ProgressoWeb` e `InteracaoWeb` | `src/interfaces/http/execucoes.ts`, `src/interfaces/http/progresso-web.ts`, `src/interfaces/http/interacao-web.ts`, `src/interfaces/http/arquivos.ts`, `src/interfaces/http/rotas/execucoes.ts` | T2 | T5, T6, T7 | AC5, AC6, AC7, AC8, AC9 |
| T5 | Rotas síncronas dos comandos | `src/interfaces/http/rotas/{vagas,status,retorno,falhas,navegador,curriculo}.ts` | T2 | T4, T6, T7 | AC5 |
| T6 | Perfil: casos de uso, porta, salário opcional | `src/dominio/respostas/perfil.ts`, `src/dominio/respostas/salario.ts`, `src/aplicacao/etapas/responder-campos.ts`, `src/aplicacao/portas/armazem-curriculo.ts`, `src/infra/armazenamento/armazem-curriculo-yaml.ts`, `src/aplicacao/casos-de-uso/{obter-perfil,salvar-perfil}.ts`, `src/composicao.ts`, `src/interfaces/http/rotas/perfil.ts` | T1 | T2 a T5, T7 | AC10, AC11, AC12 |
| T7 | Fundação do site: projeto, tema, cliente do agente, conexão e layout | `apps/web/**` (`package.json`, `vite.config.ts`, `src/tema/`, `src/agente/`, `src/telas/Conectar.tsx`, `src/layout/`) , `package.json` (workspaces) | T2 (contrato) | T4, T5, T6 | AC13, AC14 |
| T8 | Telas dos comandos e do perfil | `apps/web/src/telas/**`, `apps/web/src/componentes/**` | T4, T5, T6, T7 | Nenhuma | AC5, AC7, AC11, AC13 |
| T9 | Testes e2e, CI, deploy e documentação | `tests/e2e/`, `vitest.config.ts`, `.github/workflows/verificar.yml`, `apps/web/vercel.json`, `docs/arquitetura.md`, `docs/adr/0024-agente-local-e-site-hospedado.md`, `docs/adr/0025-pareamento-e-protecoes-do-agente.md`, `docs/adr/0026-renomeacao-camaleao.md`, `README.md` | T1 a T8 | Nenhuma | AC15 |

### T1 — Renomear Outbox → Camaleão, com migração

**Arquivo:** ver tabela | **Ação:** Modificar
**Detalhes:**

- `package.json`: `name: "camaleao"`, `description` atualizada, `bin: { "camaleao": "bin/camaleao.js" }` (renomear `bin/outbox.js`), script `"camaleao": "node bin/camaleao.js"` no lugar de `"outbox"`.
- Tipos, classes, arquivos e strings: `NavegadorOutbox` → `NavegadorCamaleao` (`navegador-camaleao.ts`), `ErroOutbox` → `ErroCamaleao`, servidor MCP `outbox-segredos` → `camaleao-segredos` (arquivo, nome registrado no `--mcp-config` do agente e no `.mcp.json`), `{ app: "outbox" }` → `{ app: "camaleao" }` onde houver, nome do log `dados/logs/camaleao-AAAA-MM-DD.jsonl`, travas `dados/travas/<comando>.lock` (sem mudança de nome), `appID` do toast `"Camaleão"`.
- Variáveis de ambiente: `CAMALEAO_LOG`, `CAMALEAO_CLAUDE_BIN`, `CAMALEAO_HOSTS_PERMITIDOS`. Uma função `lerVariavel(nome)` em `src/infra/config/` lê `CAMALEAO_<X>` e, ausente, `OUTBOX_<X>`, registrando `avisar("OUTBOX_<X> está obsoleta; use CAMALEAO_<X>")` uma vez por processo.
- Migração em `src/infra/banco/` (no ponto em que a composição abre o banco): se `dados/outbox.db` existe e `dados/camaleao.db` não, renomeia `outbox.db`, `outbox.db-wal` e `outbox.db-shm` (os que existirem) para `camaleao.db*` antes de abrir a conexão, e registra um aviso. Se os dois existem, usa `camaleao.db` e avisa que `outbox.db` foi ignorado.
- Textos ao usuário na CLI: "Outbox" → "Camaleão". Prompts em `prompts/` que citam o nome do produto: atualizar e incrementar `versao` no front-matter.
- Docs vivos (`README.md`, `docs/arquitetura.md`, `docs/convencoes.md`, `docs/como-adicionar-conector.md`, `docs/progresso.md`) atualizados. ADRs existentes: só os nomes de comando e arquivo; o texto histórico permanece. `specs/` intocado.
- `npm run verificar` verde ao fim da tarefa, num commit isolado, antes de qualquer código web.

### T2 — Contrato da API e núcleo do servidor do agente

**Arquivo:** `src/interfaces/http/contrato.ts`, `servidor.ts`, `seguranca.ts`, `pareamento.ts`; `src/infra/config/esquema-config.ts`; `config.exemplo.yaml` | **Ação:** Criar e Modificar
**Detalhes:**

- **Dependências:** `hono` e `@hono/node-server` em versões exatas, com justificativa na tabela de dependências de `docs/arquitetura.md` (T9).
- **Config:** `agente: { porta: 4321, origensPermitidas: ["http://localhost:5173", "<URL do site na Vercel>"] }` no schema e no exemplo (a URL da Vercel é a da questão em aberto 1).
- **`contrato.ts`:** schemas Zod de toda entrada e saída das rotas e de todos os eventos de execução, importando só `zod` e `#dominio/*` (o site importa este arquivo). Exporta `VERSAO_CONTRATO` (inteiro, começa em 1). Eventos (`EventoExecucao`, união discriminada por `tipo`): `progresso` (o `EventoPreparo` serializado, com a vaga reduzida a `{ id, empresa, cargo, status, motivo }`), `pergunta` (`{ id, tipo: "sim_nao" | "numero" | "texto" | "escolha" | "aguardar", mensagem, opcoes?, min?, max? }`), `revisao` (`ResumoRevisao` com `caminhoPdf` trocado por `urlPdf`), `aviso` (`{ mensagem }`), `abrir_arquivo` (`{ url }`), `fim` (`{ resultado }` com `ResumoPreparo`, `ResumoAplicacao`, `SaidaImportarCurriculo` ou `{ pdf, paginas }`), `erro` (`{ mensagem, codigo: "uso" | "execucao" | "cancelada" | "limite_uso" }`).
- **`servidor.ts`:** `criarApp(container, opcoes): Hono` registra, nesta ordem, o middleware de `seguranca.ts`, `GET /saude` (`{ app: "camaleao", versao, versaoContrato }`, sem token), `POST /pareamento` (sem token) e as rotas das T4 a T6 sob o middleware de token. `iniciarServidor({ porta })` usa `serve({ fetch, port, hostname: "127.0.0.1" })`. Erros: `ErroUsuario` → 422 com `{ mensagem }`; `ErroTransicaoInvalida` → 422 com as transições aceitas; trava ocupada → 409; inesperado → 500 com mensagem curta e stack só no log (`container.registrarErro`).
- **`seguranca.ts`:**
  1. `Host` diferente de `127.0.0.1:<porta>` e `localhost:<porta>` → 403.
  2. `Origin` presente e fora de `origensPermitidas` → 403, sem cabeçalhos CORS. Origem permitida: `Access-Control-Allow-Origin` com a origem exata, `Vary: Origin`, `Access-Control-Allow-Headers: Authorization, Content-Type`, `Access-Control-Allow-Methods: GET, POST, PUT`.
  3. `OPTIONS` de origem permitida: 204 com os cabeçalhos acima e `Access-Control-Allow-Private-Network: true`.
  4. Toda resposta: `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.
  5. Token: `Authorization: Bearer <token>`; o SHA-256 do token precisa estar em `dados/agente/tokens.json`. Ausente ou inválido → 401.
- **`pareamento.ts`:** ao iniciar, o agente gera um código de 8 caracteres (alfabeto sem ambíguos: `ABCDEFGHJKMNPQRSTUVWXYZ23456789`), válido por 10 min e de uso único; um novo código é gerado a cada uso ou expiração e impresso no terminal. `POST /pareamento { codigo }` → `{ token }` (32 bytes aleatórios, base64url); o agente grava só o hash com a data de criação, em escrita atômica. Cinco códigos errados seguidos invalidam o código atual e geram outro. `POST /pareamento/revogar` (com token) remove todos os tokens.

### T3 — Comando `agente`, abertura do site e isolamento da aba

**Arquivo:** `src/interfaces/cli/comandos/agente.ts`, `src/interfaces/cli/principal.ts`, `src/infra/navegador/navegador-camaleao.ts` | **Ação:** Criar e Modificar
**Detalhes:**

- `camaleao agente [--sem-navegador]`:
  1. `GET http://127.0.0.1:<porta>/saude`. Resposta `{ app: "camaleao" }`: só abre o site (passo 4) e sai com 0. Outra resposta: `ErroUsuario("porta <porta> ocupada por outro processo; ajuste agente.porta no config.yaml")`, código 1. Conexão recusada: segue.
  2. Inicia o servidor e imprime: "Camaleão rodando em http://127.0.0.1:<porta>", "Código de pareamento: XXXX-XXXX", "Site: <origensPermitidas[última]>".
  3. Ctrl+C encerra como os demais comandos (ADR-0016): cancela execuções em curso, chama `container.encerrar()`.
  4. Sem `--sem-navegador`, abre o site numa **nova janela** do Chrome do Camaleão com a URL `<site>/#parear=<codigo>` (o fragmento não chega à Vercel). O site lê o fragmento, pareia, grava o token e limpa o fragmento com `history.replaceState`.
- `NavegadorCamaleao`: novo método `abrirJanela(url)` (nova janela via CDP `Target.createTarget` com `newWindow: true`). `paginaMaisRecente(hosts)` e qualquer seleção de página do fluxo de vaga passam a excluir páginas cuja origem esteja em `origensPermitidas` (injetadas no construtor).
- O agente LLM (`ExecutorAgenteClaude`) não recebe nem registra o token: o token só existe no `localStorage` do site e como hash em `dados/agente/`.

### T4 — Execuções, eventos, `ProgressoWeb` e `InteracaoWeb`

**Arquivo:** `src/interfaces/http/execucoes.ts`, `progresso-web.ts`, `interacao-web.ts`, `arquivos.ts`, `rotas/execucoes.ts` | **Ação:** Criar
**Detalhes:**

- **`Execucao`:** `{ id (uuid), comando: "preparar" | "aplicar" | "importar" | "renderizar_master", iniciadaEm, eventos: EventoExecucao[], encerrada: boolean, controlador: AbortController }`. `GerenciadorExecucoes` mantém as execuções em memória (as encerradas por 30 min) e um assinante por conexão de stream.
- **Rotas:**
  - `POST /execucoes/preparar { forcar?, paralelo?, reavaliar? }`, `POST /execucoes/aplicar { simular?, id? }`: validam como a CLI (mesmos limites, ex.: `paralelo` 1 a 8), adquirem `container.adquirirTrava(comando)` (ocupada → 409 "Já tem um <comando> rodando. Bora esperar ele terminar?"), criam a execução e respondem 202 `{ id }`. A trava é liberada no `finally`.
  - `POST /execucoes/importar` (`multipart/form-data`, campo `arquivo`, até 10 MB, extensões `.pdf`, `.docx`, `.md`, `.txt`; campo `sobrescrever`): grava em `dados/tmp/importar-<uuid>.<ext>`, chama `importarCurriculo` e apaga o temporário no `finally`.
  - `POST /execucoes/renderizar-master`.
  - `GET /execucoes/:id/eventos`: `text/event-stream`; reenvia todos os eventos já emitidos e depois os novos; encerra após `fim` ou `erro`.
  - `POST /execucoes/:id/respostas { perguntaId, valor }`: resolve a pergunta pendente; `perguntaId` diferente da pendente → 409; `valor` validado conforme o `tipo` (escolha fora das opções → 422).
  - `POST /execucoes/:id/cancelar`: `controlador.abort()`; segunda chamada força como o segundo Ctrl+C.
  - `GET /execucoes/ativas`: execuções não encerradas (para o site retomar após recarregar).
- **`ProgressoWeb implements ProgressoPreparo`:** converte cada `EventoPreparo` em evento `progresso`. Nunca lança.
- **`InteracaoWeb implements Interacao`:** cada método de pergunta cria `{ id, tipo, ... }`, emite `pergunta` e devolve a promessa resolvida pela rota de respostas; só uma pergunta pendente por vez. O `AbortSignal` da execução rejeita a pendente com o mesmo erro de cancelamento que a `InteracaoTerminal` usa no Ctrl+C. `exibirResumoRevisao` emite `revisao`; `informar` emite `aviso`; `abrirArquivo(caminho)` emite `abrir_arquivo` com uma URL de `arquivos.ts`.
- **`arquivos.ts`:** `assinar(caminho)` aceita só caminhos resolvidos dentro de `dados/vagas/` e `dados/master/` e devolve `/arquivos/<id>`, com id aleatório válido por 5 min e mapeado em memória; `GET /arquivos/:id` (sem token, porque o id é a credencial) serve com `Content-Type` pela extensão. Id desconhecido ou expirado → 404.

### T5 — Rotas síncronas dos comandos

**Arquivo:** `src/interfaces/http/rotas/vagas.ts`, `status.ts`, `retorno.ts`, `falhas.ts`, `navegador.ts`, `curriculo.ts` | **Ação:** Criar
**Detalhes:** cada rota valida a entrada com o schema de `contrato.ts` e chama o caso de uso de `container.casos`, sem regra própria.

- `POST /vagas { urls: string[] }` → `adicionarVagas`; devolve os `ItemAdicao`.
- `GET /status?status=<STATUS>` → `listarStatus`. Para cada vaga, inclui `urlPdf` assinada quando existir PDF.
- `POST /vagas/:id/retorno { status, etapa?, nota? }` → `registrarRetorno`.
- `GET /falhas` → `listarFalhas`.
- `POST /navegador` → `abrirNavegador`.
- `GET /curriculo` → `{ masterExiste, masterAtualizadoEm, perfilValido, errosPerfil }` (para o onboarding) e `POST /curriculo/abrir-master` (abre `curriculo/master.yaml` no app padrão do Windows com `open`).

### T6 — Perfil: casos de uso, porta e salário opcional

**Arquivo:** ver tabela | **Ação:** Criar e Modificar
**Detalhes:**

- `esquemaPerfil.salario` passa a `esquemaSalario.optional()`. Onde o domínio de salário (`src/dominio/respostas/salario.ts`) e `responderCampos` leem `perfil.salario`, a ausência produz "sem valor por código" para os campos de pretensão: o campo não recebe valor e não vira pergunta ao LLM; o preenchimento o deixa vazio e a revisão o marca `vaziaNaPagina`.
- `ArmazemCurriculo` ganha `lerPerfilBruto(): { existe: boolean; dados: unknown }` (YAML sem validar, para o formulário mostrar perfil parcial) e `gravarPerfil(perfil: Perfil): void` (preserva comentários e a ordem das chaves existentes; escrita atômica).
- `obterPerfil(deps)` → `{ perfil: Perfil | null, dadosBrutos: unknown, erros: { caminho: string, mensagem: string }[] }`.
- `salvarPerfil(deps, entrada: unknown)` valida com `esquemaPerfil` (erro → `ErroUsuario` com a lista de `{ caminho, mensagem }`) e grava.
- Rotas: `GET /perfil`, `PUT /perfil`. O registrador nunca recebe o corpo dessas requisições (middleware de log de rota omite o corpo de `/perfil`).
- `tests/integracao/sensiveis.test.ts` estendido: grava um perfil por `PUT /perfil` e verifica que nenhum valor sensível nem o token aparecem em `dados/logs/`.

### T7 — Fundação do site

**Arquivo:** `apps/web/**`, `package.json` (raiz) | **Ação:** Criar e Modificar
**Detalhes:**

- `package.json` raiz: `"workspaces": ["apps/web"]`. `apps/web/package.json` com Vite, React, React DOM, TypeScript, `@fontsource/poppins` (700), `@fontsource/nunito` (400, 600), Vitest e Testing Library, em versões exatas. Roteamento: `react-router` (rotas na seção T8).
- `vite.config.ts`: alias `@contrato` → `../../src/interfaces/http/contrato.ts`; o build falha se o contrato puxar algo além de `zod` e `#dominio/*`.
- **Tema (`src/tema/`):** tokens CSS em `:root`: `--coral #FF6B5B`, `--petroleo #1F4E5F`, `--sol #FFC94D`, `--menta #9ED9C3`, `--creme #FFF6EC`, mais tokens semânticos (`--fundo`, `--texto`, `--primaria`, `--destaque`, `--sucesso`, `--superficie`, `--borda`). Tema escuro em `@media (prefers-color-scheme: dark)`: `--fundo: #1F4E5F`, `--texto: #FFF6EC`, superfícies derivadas do petróleo. Títulos em Poppins 700, texto em Nunito 400. Cantos de 16 px nos cards, botões em pílula coral com texto branco ou petróleo (o par que passar AA), blobs decorativos em SVG nas cores da paleta, como no Canva. Logo e favicon copiados de `docs/marca/` (`logo-full-light.svg`, `logo-full-dark.svg`, `icon-*.png`, `favicon.ico`).
- **Cliente do agente (`src/agente/`):** `clienteAgente` com `baseUrl` `http://127.0.0.1:4321` (configurável na tela de conexão), token do `localStorage` (`camaleao.token`), validação das respostas com os schemas do contrato e leitura do stream de eventos com `fetch` + `ReadableStream`, com reconexão.
- **Conexão (`src/telas/Conectar.tsx`):** sem `/saude`, mostra "Conectar o Camaleão", o comando `npm run camaleao -- agente` (texto copiável), o campo do código e um aviso de que o Chrome pode pedir permissão de "acesso à rede local". Tenta de novo a cada 3 s. `versaoContrato` diferente → "Seu Camaleão está desatualizado". 401 → volta ao pareamento.
- **Layout:** cabeçalho com o logo e a navegação (Início, Vagas, Currículo, Falhas), conteúdo até 1200 px, desktop primeiro.

### T8 — Telas dos comandos e do perfil

**Arquivo:** `apps/web/src/telas/**`, `apps/web/src/componentes/**` | **Ação:** Criar
**Detalhes:**

- **Início (`/`):** contagens por status e "aguardando você" de `listarStatus`, ação principal "Colar links de vagas" e os botões "Preparar" e "Aplicar", com o número de vagas elegíveis. Execução ativa: card de retomada.
- **Onboarding** (enquanto `masterExiste` for falso ou `perfilValido` for falso): passos "Importar currículo" → "Seu perfil" → "Fazer logins" (botão navegador).
- **Importar (`/curriculo/importar`):** upload com arrastar e soltar, `sobrescrever` com confirmação, progresso da execução e resultado (caminho do master, backup, auxiliares criados), mais "Abrir master no editor".
- **Perfil (`/curriculo/perfil`):** formulário por seção do `esquemaPerfil` (preferências, disponibilidade, autorização de trabalho, endereço, salário, documentos, diversidade, consentimentos, como soube). Campos sensíveis mascarados com "mostrar" e o selo "fica só na sua máquina"; seções sensíveis com "deixar em branco". Erros 422 apontados no campo pelo `caminho`.
- **Adicionar (`/vagas/adicionar`):** textarea com uma URL por linha (linhas com `#` ignoradas, como no `-a`), resumo por resultado igual ao `adicao.ts` da CLI.
- **Preparar (`/preparar`):** opções (forçar, paralelo, reavaliar), lista ao vivo das vagas com a etapa atual e o status final (Menta para PRONTA, Coral para erro), botão "Parar", resumo final no tom da marca ("Deixei 5 vagas prontinhas pra você revisar.").
- **Aplicar (`/aplicar`):** opções (simular, id). Perguntas da rodada de gaps como cards ("Essa vaga pede Kafka. Você tem?", com sim/não), componente genérico para cada `tipo` de pergunta, tela de revisão por vaga com o `ResumoRevisao` (respostas vazias destacadas, link do PDF) e as opções do menu como botões. "Enviar" pede a confirmação do próprio fluxo. Pausa (`aguardar`) mostra "Resolva na janela do Camaleão e clique em Continuar".
- **Vagas (`/vagas`):** tabela do `status` com filtro por status, ATS antes → depois e aderência; detalhe com o formulário de retorno (status, etapa quando EM_PROCESSO, nota).
- **Falhas (`/falhas`):** as duas tabelas de `listarFalhas`, com a explicação de como marcar como resolvida.
- **Master genérico:** botão em Currículo que roda `renderizar-master` e abre o PDF.
- Microcopy em todas as telas no tom "Encorajador · Leve · Honesto"; nunca prometer contratação.

### T9 — Testes e2e, CI, deploy e documentação

**Arquivo:** ver tabela | **Ação:** Criar e Modificar
**Detalhes:**

- **e2e (`tests/e2e/fluxo-web.test.ts`, Playwright):** sobe o agente com `CAMALEAO_CLAUDE_BIN` apontando para `tests/fakes/claude.mjs` e pasta de dados temporária, serve `apps/web` com `vite preview` e percorre: pareamento por fragmento, importar `.md`, perfil mínimo, adicionar uma URL de fixture, preparar, aplicar `simular` até a revisão e escolher "Pular". Rede externa bloqueada como nos demais testes.
- **`verificar`:** acrescenta `npm run -w apps/web tipos`, `lint`, `test` e `build`, e o e2e. Os limiares de cobertura atuais continuam valendo para `src/`.
- **CI:** o workflow `verificar.yml` instala os workspaces e roda o novo `verificar` em `windows-latest`.
- **Vercel:** `apps/web/vercel.json` com rewrite SPA para `index.html` e cabeçalhos `Content-Security-Policy` (`default-src 'self'; connect-src 'self' http://127.0.0.1:* http://localhost:*; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; frame-ancestors 'none'`), `Referrer-Policy: no-referrer`.
- **Docs:** ADR-0024 (agente local + site hospedado), ADR-0025 (pareamento e proteções do agente), ADR-0026 (renomeação); `docs/arquitetura.md` com `interfaces/http`, `apps/web` e o modelo de ameaças do agente; README com a seção "Usar pelo site".

## 8. Questões em aberto

- [PENDENTE DE CLARIFICAÇÃO] URL final do site na Vercel (projeto a ser criado pelo usuário), que entra em `agente.origensPermitidas`. Decide: usuário.
- [PENDENTE DE CLARIFICAÇÃO] Comportamento real do prompt de "acesso à rede local" do Chrome (site HTTPS público → `http://127.0.0.1`) e se o preflight com `Access-Control-Allow-Private-Network` basta na versão do Chrome em uso. Validar na T3; se bloquear, decidir entre servir o site também pelo agente ou outra saída. Decide: usuário, com a evidência da T3.
- [PENDENTE DE CLARIFICAÇÃO] Disponibilidade do nome `camaleao` no npm, para a fase de distribuição. Decide: usuário.

# ADR-0024: Site estático hospedado e agente HTTP local

- **Status:** Aceita
- **Data:** 2026-10-20
- **Origem:** `specs/spec-mvp-web/spec.md` (T2 a T9).

- **Contexto.** O MVP web precisa fazer exatamente o que a CLI faz, para usuários que não usam terminal,
  sem perder o que torna o produto viável: o `claude -p` da assinatura do usuário (custo marginal zero),
  o Playwright no Chrome dele (com as sessões dos sites) e o `aplicar` que preenche o formulário de
  verdade. Um backend na nuvem exigiria chave de API própria (BYOK), jobs, Chromium serverless e mataria
  o `aplicar` automático.
- **Decisão.**
  - Site estático (Vite + React + TypeScript) em `apps/web/`, publicado na Vercel, sem backend nem dados
    próprios. Ele conversa com o **agente local** (`camaleao agente`), um servidor Hono em
    `127.0.0.1:<agente.porta>` que chama os mesmos casos de uso da CLI pela composição.
  - `src/interfaces/http/contrato.ts` é o contrato único: schemas Zod de entrada, saída e eventos, que
    importam só `zod` e `#dominio/*`. O site importa o arquivo direto (`@contrato`), e o build falha se
    o contrato puxar outra camada. `VERSAO_CONTRATO` permite ao site pedir atualização ao agente antigo.
  - Execuções longas (`preparar`, `aplicar`, `importar`, `renderizar-master`) viram uma execução com id e
    eventos guardados desde o início, lidos por `fetch` + `ReadableStream` em `text/event-stream`
    (`EventSource` não manda `Authorization`). Recarregar a página reapresenta tudo. Cancelar equivale ao
    Ctrl+C: o primeiro aborta, o segundo encerra o stream sem esperar.
  - `ProgressoWeb` e `InteracaoWeb` implementam as portas existentes. Cada pergunta da `Interacao` vira
    um evento e a promessa só resolve com a resposta àquela pergunta. O envio continua sendo a escolha
    "enviar" do menu de revisão (o site pede uma confirmação a mais), sem rota própria de envio.
  - `preparar` e `aplicar` continuam exclusivos (ADR-0016): uma execução em memória barra o segundo no
    mesmo agente, e a trava de arquivo barra o da CLI.
  - `camaleao agente` abre o site numa janela própria do navegador do Camaleão, já pareada pelo
    fragmento `#parear=<código>`. O site também funciona em qualquer navegador, pelo código digitado.
- **Alternativas.**
  - Tudo local (a UI servida pelo agente): resolve CORS e acesso à rede local, mas obriga a distribuir o
    site junto e não prova o cenário público.
  - Next.js na Vercel com Supabase e API da Anthropic: BYOK, jobs, Chromium serverless e sem `aplicar`
    automático.
  - Extensão do Chrome: outra superfície de distribuição e revisão de loja.
  - `EventSource` com o token na URL: o token iria para logs e histórico.
- **Consequências.** Nova camada de interface (`src/interfaces/http/`), com Hono e `@hono/node-server`
  (ver `docs/arquitetura.md`, seção 13) e o workspace `apps/web`. O `verificar` passa a rodar tipos,
  lint, build e testes do site, e um e2e Playwright do caminho feliz. O Chrome pode pedir permissão de
  "acesso à rede local" para o site público falar com `127.0.0.1` (o preflight responde
  `Access-Control-Allow-Private-Network`); se uma versão futura bloquear, a saída é servir o site também
  pelo agente.

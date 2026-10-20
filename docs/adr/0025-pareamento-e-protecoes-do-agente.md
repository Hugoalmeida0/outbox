# ADR-0025: Pareamento e proteções do agente local

- **Status:** Aceita
- **Data:** 2026-10-20
- **Complementa:** ADR-0012 (fronteira de confiança), ADR-0017 (sem envio implícito), ADR-0024.

- **Contexto.** O agente preenche e envia candidaturas e lê dados sensíveis (perfil, PDFs). Qualquer
  página aberta no navegador do usuário consegue mandar requisições para `127.0.0.1`, e um site malicioso
  pode usar DNS rebinding para parecer `localhost`. O agente LLM do `aplicar` controla o mesmo Chrome por
  CDP, com `browser_tabs`: uma injeção na página da vaga poderia tentar usar a aba do site.
- **Decisão.**
  - O servidor escuta só em `127.0.0.1`. Toda requisição com `Host` fora de `127.0.0.1:<porta>` e
    `localhost:<porta>` recebe 403 (DNS rebinding).
  - `Origin` presente e fora de `agente.origensPermitidas` recebe 403 sem cabeçalhos CORS. Origem
    permitida recebe a origem exata (`Vary: Origin`); o preflight responde
    `Access-Control-Allow-Private-Network: true`. Toda resposta sai com `Cache-Control: no-store`,
    `X-Content-Type-Options: nosniff` e `Referrer-Policy: no-referrer`.
  - Pareamento: o agente imprime um código de 8 caracteres (sem ambíguos), de uso único, válido por 10
    minutos e trocado após 5 erros seguidos. `POST /pareamento` troca o código por um token de 32 bytes
    aleatórios, guardado no `localStorage` do site; o agente guarda só o SHA-256 em
    `dados/agente/tokens.json`. Toda rota exige `Authorization: Bearer <token>`, salvo `GET /saude`,
    `POST /pareamento` e `GET /arquivos/:id`. `POST /pareamento/revogar` apaga todos os tokens.
  - Arquivos (PDFs) saem por `/arquivos/<id>`: id aleatório de 24 bytes, válido por 5 minutos (1 minuto
    depois do primeiro acesso), só para arquivos de `dados/vagas/` e `dados/master/` com o caminho real
    resolvido. O id é a credencial, porque a aba nova não leva o token.
  - Só a pergunta pendente aceita resposta (outra id recebe 409); o valor é validado pelo tipo da
    pergunta (422).
  - `NavegadorCamaleao.paginaMaisRecente` ignora as abas cujas origens estão em
    `agente.origensPermitidas`: nem o conector, nem o agente LLM, nem o `camaleao-segredos` tomam a aba do
    site como página da vaga. O token nunca entra em prompt, log ou `falhas/`; o log de rotas registra só
    método, caminho (com o id de arquivo mascarado) e status, nunca o corpo.
  - A origem padrão é só `http://localhost:5173` (desenvolvimento): a URL publicada na Vercel entra pelo
    `config.yaml`, para o agente nunca confiar num domínio que o usuário não controla.
- **Alternativas.**
  - Só CORS, sem token: qualquer processo local ou extensão com `fetch` sem `Origin` passaria.
  - Autenticação por conta: exigiria backend, fora do escopo.
  - Tirar `browser_tabs` do agente LLM: quebraria os pop-ups de login dos ATS.
- **Consequências.** Risco residual aceito: uma injeção na página da vaga poderia levar o agente LLM a
  trocar para a aba do site e clicar em "Enviar" numa revisão pendente. A mitigação é a confirmação a
  mais do site antes de responder "enviar", a aba isolada da seleção de página e o fato de o agente LLM só
  rodar antes da revisão. Um token vazado do `localStorage` (XSS no site) daria acesso ao agente: a CSP
  do site (`script-src 'self'`, sem terceiros) reduz essa superfície.

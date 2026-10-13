# ADR-0020: Bloqueio anti-bot tratado como CAPTCHA

- **Status:** Aceita
- **Data:** 2026-10-10

- **Contexto.** Na exploração real (somente leitura) do SmartRecruiters, a vaga redireciona para o
  formulário `oneclick-ui`, protegido pela DataDome (`captcha-delivery.com`), que bloqueia navegadores
  automatizados. Não foi possível ler a estrutura do formulário.
- **Decisão.**
  - A detecção de bloqueio (`infra/navegador/bloqueios.ts`) reconhece a DataDome como CAPTCHA: o fluxo
    pausa com `aguardarUsuario` para o usuário resolver no navegador do Outbox.
  - O conector SmartRecruiters declara `camposSoNoAplicar`: o `preparar` (headless) não tenta ler os
    campos; o preenchimento acontece no `aplicar`, no navegador do usuário.
  - Nenhuma técnica de evasão de detecção é usada.
- **Alternativas.** Evasão de detecção (user agent, plugins stealth): viola a política do projeto e os
  termos dos sites.
- **Consequências.** As fixtures do SmartRecruiters são sintéticas e o fluxo real do formulário não foi
  verificado; falhas reais aparecem em `falhas/smartrecruiters/` e o agente assume.

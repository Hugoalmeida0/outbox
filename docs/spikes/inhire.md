# Spike: InHire

- **Status:** bloqueado (não executável de forma autônoma)
- **Data:** 2026-10-10
- **Tarefa:** T16 da v1.

## Objetivo

Confirmar, com uma candidatura real, o fluxo da InHire (`<empresa>.inhire.app`): se exige conta, se a
conta é por empresa (tenant), as etapas do formulário, o upload e a confirmação.

## Por que está bloqueado

O spike exige criar uma conta e **enviar uma candidatura real**, ações externas e irreversíveis em nome
do usuário, que a política do projeto não permite fazer sem confirmação humana.

## O que foi implementado sem o spike

- Conector `src/infra/conectores/strategy/inhire/conector.ts` (versão 1.0.0): SPA por empresa; abre o formulário
  direto ou pelo botão "Candidatar-se"; até 4 etapas; envio e confirmação por texto.
- Autenticação `tenant`: quando a página pede conta, o e-mail vem do master e a senha é gerada e guardada
  em `dados/credenciais.json` (uma por tenant), preenchida sem passar pelo LLM; a confirmação de e-mail
  pausa para o usuário.
- Fixtures **sintéticas** (`tests/fixtures/inhire/formulario.html` e `cadastro.html`).

## Como concluir o spike

1. Escolher uma vaga real da InHire, `camaleao adicionar` e `camaleao preparar`.
2. `camaleao aplicar --simular --id <id>`: observar se pede conta, quais etapas aparecem e o que fica sem
   preencher.
3. Enviar uma candidatura real (escolha do usuário) e confirmar o texto de confirmação.
4. Capturar fixtures reais com `npm run capturar-fixture`, substituir as sintéticas e ajustar o
   conector e a suíte de contrato.
5. Atualizar este documento.

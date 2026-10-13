# Spike: Gupy

- **Status:** bloqueado (não executável de forma autônoma)
- **Data:** 2026-10-10
- **Tarefa:** T16 da v1; critério AC22.

## Objetivo

Confirmar, com candidaturas reais, o fluxo da Gupy (`<empresa>.gupy.io`): login com a conta global,
etapas do formulário, momento do upload do currículo, perguntas da empresa, etapa de testes após o envio
e se o anexo é congelado por candidatura ou compartilhado pelo perfil Gupy. Daí sai o valor de
`gupy.anexoPorCandidatura`.

## Por que está bloqueado

O spike exige criar ou usar uma conta Gupy e **enviar candidaturas reais**, que são ações externas e
irreversíveis em nome do usuário. Pela política do projeto (nada é enviado sem confirmação humana),
isso não foi feito de forma autônoma.

## O que foi implementado sem o spike

- Conector `src/infra/conectores/gupy/conector.ts` (versão 1.0.0): autenticação `global` (login manual
  uma vez em `outbox navegador`), botão "Candidatar-se", até 8 etapas com botão de avançar, envio por
  "Finalizar/Enviar/Concluir candidatura" e confirmação por texto. A etapa de testes depois do envio
  vira **PENDENTE_TESTE** (os testes nunca são automatizados).
- Extração da vaga por JSON-LD e, na falta, pelo `__NEXT_DATA__` da página (melhor esforço).
- `camposSoNoAplicar`: os campos só aparecem depois do login, então o `preparar` não os lê; as perguntas
  são respondidas ao vivo no `aplicar`.
- Fixtures **sintéticas** (`tests/fixtures/gupy/formulario.html` e `login.html`), escritas a partir da
  estrutura pública conhecida, não capturadas de uma candidatura real.

## Decisão provisória: `gupy.anexoPorCandidatura: true`

Padrão provisório: anexar o currículo camaleão da vaga. Se a Gupy guardar um único currículo no perfil
(e o anexo de uma vaga substituir o das candidaturas anteriores), o valor certo é `false`, e o Outbox
passa a anexar o PDF genérico do master. Até o spike, o usuário deve conferir na primeira candidatura
real se o anexo aparece por candidatura no painel da Gupy e ajustar `config.yaml` se necessário.

## Como concluir o spike

1. `outbox navegador` e login na Gupy.
2. Escolher 2 vagas reais de empresas diferentes e rodar `outbox aplicar --simular --id <id>` em cada
   uma; registrar as etapas vistas e os campos não preenchidos.
3. Enviar uma candidatura real (escolha do usuário) e verificar no painel da Gupy se o currículo ficou
   vinculado à candidatura; enviar a segunda e verificar se a primeira mudou.
4. Capturar fixtures reais com `npm run capturar-fixture` (formulário, etapa de testes, confirmação) e
   substituir as sintéticas; ajustar o conector e a suíte de contrato.
5. Atualizar este documento com o resultado e o valor final de `gupy.anexoPorCandidatura`.

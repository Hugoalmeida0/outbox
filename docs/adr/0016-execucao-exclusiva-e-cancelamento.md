# ADR-0016: Execução exclusiva por comando e cancelamento cooperativo

- **Status:** Aceita
- **Data:** 2026-10-09
- **Origem:** `specs/v1/spec-outbox/arquitetura.md` §17 (ADR-016), confirmada na implementação da v1 (2026-10-10).

- **Contexto.** Dois `preparar` simultâneos processariam as mesmas vagas, e um Ctrl+C no meio do lote deixava efeitos parciais.
- **Decisão.**
  - Trava de arquivo por comando (`preparar` e `aplicar`).
  - `AbortSignal` propagado até as portas de longa duração.
  - Efeitos persistidos só ao fim de cada etapa.
  - `tentativas_preparo` incrementado só em ERRO_PREPARO.
  - Escrita atômica.
- **Alternativas.**
  - Status intermediário `PREPARANDO` com reclamação de linhas: mais estados e recuperação de órfãos.
  - Nenhum controle: corrida e dados parciais.
- **Consequências.** Comportamento previsível sob interrupção, sem estado novo na máquina de status.

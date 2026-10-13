# ADR-0009: Erros como exceções tipadas

- **Status:** Aceita
- **Data:** 2026-10-09
- **Origem:** `specs/v1/spec-outbox/arquitetura.md` §17 (ADR-009), confirmada na implementação da v1 (2026-10-10).

- **Contexto.** A spec anterior não definia uma estratégia de erros: onde capturar, como mapear para status e quais códigos de saída usar.
- **Decisão.** Hierarquia única `ErroOutbox` (`docs/arquitetura.md`; origem: spec de arquitetura §10.1). O erro é capturado por vaga nos casos de uso em lote e mapeado para código de saída na CLI.
- **Alternativas.** `Result` ou `Either` (neverthrow): ruído de tipos em toda assinatura e uma dependência a mais.
- **Consequências.** Fluxo feliz legível. O `switch-exhaustiveness-check` cobre o mapeamento erro→motivo quando os códigos são uniões.

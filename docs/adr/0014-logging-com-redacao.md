# ADR-0014: Logging mínimo com redação

- **Status:** Aceita
- **Data:** 2026-10-09
- **Origem:** `specs/v1/spec-outbox/arquitetura.md` §17 (ADR-014), confirmada na implementação da v1 (2026-10-10).

- **Contexto.** É preciso diagnosticar conectores e o LLM sem vazar PII.
- **Decisão.** Porta `Registrador` com implementação própria (terminal mais JSONL diário em `dados/logs/`) e redação obrigatória (`docs/arquitetura.md`; origem: spec de arquitetura §10.3).
- **Alternativas.** `pino`: recursos (transports, performance) desnecessários para uma CLI local.
- **Consequências.** Cerca de 60 linhas de código próprio e redação centralizada.

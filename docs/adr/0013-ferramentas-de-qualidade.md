# ADR-0013: Ferramentas de qualidade

- **Status:** Aceita
- **Data:** 2026-10-09
- **Origem:** `specs/v1/spec-outbox/arquitetura.md` §17 (ADR-013), confirmada na implementação da v1 (2026-10-10).

- **Contexto.** Era preciso garantir tipos, lint, formatação e testes de forma consistente.
- **Decisão.**
  - TypeScript `strict` com `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` e `noImplicitOverride`.
  - ESLint com `typescript-eslint` `strictTypeChecked`.
  - Prettier.
  - Vitest com cobertura v8 e limiares por camada.
  - CI no Windows.
- **Alternativas.**
  - Biome: sem cobertura completa de regras com tipo.
  - `node:test`: menos ergonômico para fakes e cobertura por glob.
- **Consequências.** Quatro dependências de desenvolvimento a mais, compensadas pela prevenção de falhas assíncronas e pelas fronteiras verificadas.

# ADR-0005: Imports por subpath e fronteiras verificadas por lint

- **Status:** Aceita
- **Data:** 2026-10-09
- **Origem:** `specs/v1/spec-outbox/arquitetura.md` §17 (ADR-005), confirmada na implementação da v1 (2026-10-10).

- **Contexto.** As regras de camada só se sustentam se forem verificadas automaticamente.
- **Decisão.** O campo `imports` do `package.json` define `#dominio/*`, `#aplicacao/*`, `#infra/*`, `#interfaces/*`, `#composicao` e `#testes/*`, um recurso nativo do Node e do TypeScript `nodenext`. O ESLint usa `no-restricted-imports` por diretório (`docs/arquitetura.md`; origem: spec de arquitetura §11.3), e há um teste de arquitetura.
- **Alternativas.**
  - `paths` do tsconfig: o Node não os resolve sem loader.
  - `dependency-cruiser` ou `eslint-plugin-boundaries`: mais uma dependência para regras que cabem em `no-restricted-imports`.
- **Consequências.** Imports legíveis, fronteiras quebradas falham no `verificar`, e nenhuma dependência nova.

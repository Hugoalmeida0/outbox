# ADR-0015: Configuração com padrões no schema

- **Status:** Aceita
- **Data:** 2026-10-09
- **Origem:** `specs/v1/spec-outbox/arquitetura.md` §17 (ADR-015), confirmada na implementação da v1 (2026-10-10).

- **Contexto.** Na spec anterior, o `config.yaml` versionado misturava padrões com ajustes pessoais.
- **Decisão.** Padrões no schema Zod. `config.yaml` local, opcional e fora do git. `config.exemplo.yaml` documentado e verificado por teste.
- **Alternativas.**
  - Config versionado: ajustes pessoais sujam o git.
  - Só variáveis de ambiente: ruins para estruturas aninhadas.
- **Consequências.** Fonte única dos padrões e documentação que não diverge do código.

# ADR-0003: Idioma único em português ASCII

- **Status:** Aceita
- **Data:** 2026-10-09
- **Origem:** `specs/v1/spec-outbox/arquitetura.md` §17 (ADR-003), confirmada na implementação da v1 (2026-10-10).

- **Contexto.** A spec anterior misturava comandos em inglês (`import`, `add`, `prepare`, `apply`) e em português (`retorno`, `falhas`, `navegador`).
- **Decisão.** Tudo em português sem acento (`docs/arquitetura.md`; origem: spec de arquitetura §16.1), por escolha do usuário. A linguagem do domínio é idêntica no código.
- **Alternativas.**
  - Código em inglês com interface em PT: exige uma camada de tradução de termos.
  - Código em inglês com comandos em PT: mistura.
- **Consequências.** Não há tradução entre negócio e código. As APIs de bibliotecas continuam em inglês, o que é inevitável e aceito.

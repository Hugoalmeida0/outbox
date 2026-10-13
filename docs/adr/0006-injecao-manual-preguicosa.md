# ADR-0006: Injeção manual com raiz de composição preguiçosa

- **Status:** Aceita
- **Data:** 2026-10-09
- **Origem:** `specs/v1/spec-outbox/arquitetura.md` §17 (ADR-006), confirmada na implementação da v1 (2026-10-10).

- **Contexto.** Os casos de uso precisam de portas reais em produção e de fakes em teste.
- **Decisão.**
  - `criarContainer(config)` em `src/composicao.ts` expõe getters preguiçosos (a infra só é instanciada no primeiro acesso) e funções que já entregam os casos de uso com as dependências.
  - `encerrar()` fecha o banco e os navegadores headless.
  - Os testes montam as dependências diretamente com fakes.
- **Alternativas.**
  - tsyringe ou inversify: decorators incompatíveis com o ADR-0004.
  - Singletons importados diretamente pelos módulos: acoplamento e testes com mocks de módulo.
- **Consequências.** Inicialização rápida (`docs/arquitetura.md`; origem: spec de arquitetura §13) e dependências explícitas.

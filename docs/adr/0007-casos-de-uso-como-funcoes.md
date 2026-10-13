# ADR-0007: Casos de uso como funções com dependências estreitas

- **Status:** Aceita
- **Data:** 2026-10-09
- **Origem:** `specs/v1/spec-outbox/arquitetura.md` §17 (ADR-007), confirmada na implementação da v1 (2026-10-10).

- **Contexto.** Era preciso uma forma uniforme e testável para casos de uso e etapas.
- **Decisão.** Cada caso de uso tem a forma `async function nome(deps: DepsNome, entrada: EntradaNome, sinal: AbortSignal): Promise<SaidaNome>`. `DepsNome` usa `Pick<Porta, ...>`.
- **Alternativas.**
  - Classes com `executar()`: estado desnecessário, `this` e parameter properties proibidas pelo ADR-0004.
  - Funções que importam dependências globais: impossíveis de testar sem mock de módulo.
- **Consequências.** Testes simples (passar um objeto `deps`), ISP aplicado em cada assinatura e nada de estado escondido.

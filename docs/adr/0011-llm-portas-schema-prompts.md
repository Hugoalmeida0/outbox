# ADR-0011: LLM com portas separadas, schema único e prompts versionados

- **Status:** Aceita
- **Data:** 2026-10-09
- **Origem:** `specs/v1/spec-outbox/arquitetura.md` §17 (ADR-011), confirmada na implementação da v1 (2026-10-10).

- **Contexto.** Há usos de natureza diferente: geração estruturada (análise, tailoring, respostas, importação) e agente (navegação). Os schemas precisam aparecer no prompt e na validação.
- **Decisões.**
  - Portas `GeradorEstruturado` e `ExecutorAgente`.
  - JSON Schema gerado com `z.toJSONSchema` a partir do mesmo schema Zod que valida a saída.
  - Prompts em `prompts/*.md` com `versao`.
  - Toda chamada de LLM para texto parte da camada de aplicação, e o agente encapsula o LLM dentro da infra.
- **Alternativas.**
  - Uma interface `LlmClient` com os dois métodos (a spec anterior): viola ISP.
  - Schema escrito à mão no prompt: diverge do validador.
- **Consequências.** Trocar de provedor implica implementar duas portas, e mudanças de prompt ficam rastreáveis nos logs.

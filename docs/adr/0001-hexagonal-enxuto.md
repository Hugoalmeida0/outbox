# ADR-0001: Hexagonal enxuto em quatro camadas

- **Status:** Aceita
- **Data:** 2026-10-09
- **Origem:** `specs/v1/spec-outbox/arquitetura.md` §17 (ADR-001), confirmada na implementação da v1 (2026-10-10).

- **Contexto.** Integrações voláteis (ATS, LLM, navegador) convivem com regras que precisam de testes confiáveis. A spec anterior misturava regra e IO no mesmo módulo (por exemplo, `analisar.ts` gravava no banco e `tailoring.ts` chamava o LLM, renderizava e gravava arquivos).
- **Decisão.** Camadas `dominio`, `aplicacao` (portas, etapas, casos de uso), `infra` e `interfaces`, mais a raiz de composição, com dependências apontando para dentro.
- **Alternativas.**
  - Estrutura plana por módulo técnico (a spec anterior): acoplamento e testes dependentes de IO.
  - Clean Architecture completa, com entidades ricas, presenters e DTOs por camada: cerimônia excessiva para uma CLI pessoal.
  - Vertical slices por funcionalidade: a infra compartilhada (navegador, LLM, banco) ficaria duplicada ou espalhada entre fatias.
- **Consequências.**
  - Positivas: regras testáveis sem mock, troca de LLM e de conectores sem tocar nas regras, painel da v2 reusando casos de uso.
  - Negativas: mais arquivos e a indireção das portas, mitigadas pela regra de só criar uma porta quando há IO real.

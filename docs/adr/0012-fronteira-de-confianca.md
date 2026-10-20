# ADR-0012: Fronteira de confiança para conteúdo externo

- **Status:** Aceita
- **Data:** 2026-10-09
- **Origem:** `specs/v1/spec-outbox/arquitetura.md` §17 (ADR-012), confirmada na implementação da v1 (2026-10-10).

- **Contexto.** A descrição da vaga e as páginas são controladas por terceiros, e o agente opera um navegador com sessões logadas e ferramentas de segredo. A spec anterior também passava ao agente respostas sugeridas que incluíam salário e diversidade.
- **Decisão.**
  - Os controles da seção 12.3.
  - Respostas sensíveis preenchidas por ferramenta protegida.
  - Allowlist de hosts no `camaleao-segredos`.
- **Alternativas.** Confiar só na instrução do prompt: insuficiente contra injeção.
- **Consequências.** Dado sensível fora do LLM e exfiltração bloqueada por host. O risco residual (envio antecipado) está documentado.

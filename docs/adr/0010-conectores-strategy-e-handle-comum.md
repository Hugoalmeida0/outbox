# ADR-0010: Conectores ATS com Strategy, catálogo e handle comum

- **Status:** Aceita
- **Data:** 2026-10-09
- **Origem:** `specs/v1/spec-outbox/arquitetura.md` §17 (ADR-010), confirmada na implementação da v1 (2026-10-10).

- **Contexto.** Há 8 ATS determinísticos, o fallback agêntico e uma política de fallback que é regra de negócio.
- **Decisão.**
  - `ConectorAts` por motor, registrado em `CatalogoConectores`.
  - Conectores e agente devolvem um `FormularioAberto`.
  - A aplicação decide a rota e o fallback.
  - Reuso por utilitários compostos em `conectores/base/` (campos, passo, handle Playwright). Desde o ADR-0022, as definições ficam em
    `conectores/strategy/<motor>/` e o catálogo em `conectores/registry/`.
  - Cada conector tem `versao` em semver.
  - O antigo termo "adaptador" para ATS passa a se chamar **conector**, para não colidir com "adaptador" do hexagonal.
- **Alternativas.**
  - Classe base com Template Method: hierarquia frágil.
  - Conectores decidindo o fallback sozinhos: regra de negócio espalhada pela infra.
- **Consequências.** Um ATS novo entra sem mudar a aplicação. A suíte de contrato garante a substituibilidade (LSP).

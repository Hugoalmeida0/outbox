# ADR-0004: TypeScript executado nativamente pelo Node 24, sem build

- **Status:** Aceita
- **Data:** 2026-10-09
- **Origem:** `specs/v1/spec-outbox/arquitetura.md` §17 (ADR-004), confirmada na implementação da v1 (2026-10-10).

- **Contexto.** O projeto é uma CLI local e não precisa de bundle. A spec anterior usava `tsx`.
- **Decisão.**
  - O Node 24 executa `.ts` por _type stripping_.
  - `tsconfig` com `erasableSyntaxOnly`, `verbatimModuleSyntax`, `allowImportingTsExtensions` e `noEmit`.
  - `tsc` só checa tipos.
- **Alternativas.**
  - `tsx`: uma dependência a mais e um loader esbuild em tempo de execução.
  - Build com `tsc` para `dist/`: etapa extra e risco de executar código desatualizado.
- **Consequências.**
  - Proibidos `enum`, `namespace` e parameter properties, todos substituíveis.
  - Imports com a extensão `.ts`.
  - JSX não é suportado, então o painel da v2 usa o template literal `html` do Hono.
  - Se a versão instalada do Node exigir uma flag ou emitir um aviso, `bin/camaleao.js` trata isso (T1 verifica). Se houver bloqueio real, o fallback documentado é `tsx`.

# ADR-0002: Camada no topo, contexto de negócio dentro

- **Status:** Aceita
- **Data:** 2026-10-09
- **Origem:** `specs/v1/spec-outbox/arquitetura.md` §17 (ADR-002), confirmada na implementação da v1 (2026-10-10).

- **Contexto.** Era preciso escolher entre agrupar primeiro por camada ou primeiro por funcionalidade.
- **Decisão.** O primeiro nível é a camada (`dominio`, `aplicacao`, `infra`, `interfaces`). Dentro do domínio, a divisão é por contexto (`vagas`, `curriculo`, `analise`, `respostas`, `falhas`). Dentro da infra, por tecnologia ou integração.
- **Alternativas.** Feature-first (`modulos/<contexto>/{dominio,aplicacao,infra}`): a fronteira de camada fica implícita e a regra de lint é mais difícil de escrever.
- **Consequências.** As regras de fronteira viram padrões simples de import, e um conector novo afeta só `infra/conectores/`.

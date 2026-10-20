# ADR-0008: Persistência com `node:sqlite`, repositório síncrono do agregado, tabelas STRICT e migrações

- **Status:** Aceita
- **Data:** 2026-10-09
- **Origem:** `specs/v1/spec-outbox/arquitetura.md` §17 (ADR-008), confirmada na implementação da v1 (2026-10-10).

- **Contexto.** O CLI e o painel (v2) escrevem ao mesmo tempo, e o schema vai evoluir entre versões.
- **Decisões.**
  - **Banco.** `DatabaseSync` (`node:sqlite`) com WAL e `busy_timeout=5000`.
  - **Repositório.** Um `RepositorioVagas` **síncrono** para o agregado Vaga, com `transacao(fn)` usando `BEGIN IMMEDIATE`, que adquire o lock de escrita logo no início e torna atômica a sequência ler-decidir-escrever entre processos.
  - **Tabelas.** `STRICT` (tipos verificados pelo SQLite).
  - **Valores de enum.** Validados por Zod no repositório, sem `CHECK` (que exigiria recriar a tabela a cada status novo).
  - **Migrações.** Arquivos `src/infra/banco/migracoes/NNNN-descricao.sql`, aplicadas em ordem, cada uma numa transação, conforme `PRAGMA user_version`.
- **Alternativas.**
  - `better-sqlite3`: dependência nativa.
  - ORM (Drizzle, Prisma) ou Kysely: build ou camada extra para 4 tabelas.
  - `CREATE TABLE IF NOT EXISTS` sem versão (a spec anterior): não evolui o schema de bancos existentes.
  - Atomicidade por "não usar `await` entre ler e escrever" (a spec anterior): frágil e sem efeito entre processos.
- **Consequências.**
  - Uma futura troca para armazenamento assíncrono exigiria revisar a porta, o que é aceitável (YAGNI).
  - Se o Node emitir `ExperimentalWarning` para o SQLite, o `bin/camaleao.js` filtra só esse aviso.

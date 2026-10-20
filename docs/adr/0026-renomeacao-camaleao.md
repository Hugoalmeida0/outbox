# ADR-0026: Renomeação de Outbox para Camaleão, com migração automática

- **Status:** Aceita
- **Data:** 2026-10-20
- **Origem:** `specs/spec-mvp-web/spec.md` (T1).

- **Contexto.** O produto ganha uma interface web com a marca Camaleão. Manter "Outbox" no código e
  "Camaleão" na marca obrigaria a traduzir nomes em toda mensagem, log e documento, e renomear depois do
  código web obrigaria a renomear duas vezes. Já existem instalações com `dados/outbox.db` e variáveis
  `OUTBOX_*` configuradas.
- **Decisão.**
  - Nome público "Camaleão"; identificadores `camaleao` (ASCII, ADR-0003): comando `camaleao`,
    `bin/camaleao.js`, `ErroCamaleao`, `NavegadorCamaleao`, MCP `camaleao-segredos`, log
    `dados/logs/camaleao-AAAA-MM-DD.jsonl`, toast com `appID` "Camaleão".
  - Banco: na primeira abertura, `dados/outbox.db` (e `-wal`/`-shm`) é renomeado para
    `dados/camaleao.db`, com aviso no log (`#infra/banco/banco-legado.ts`). Com os dois presentes, vale o
    novo e o antigo é ignorado com aviso.
  - Variáveis: `CAMALEAO_LOG` e `CAMALEAO_CLAUDE_BIN`; ausentes, `OUTBOX_LOG` e `OUTBOX_CLAUDE_BIN` ainda
    valem, com um aviso de depreciação por variável e por processo (`#infra/config/variaveis.ts`). As
    variáveis internas entre o agente e o MCP (`CAMALEAO_VAGA_ID`, `CAMALEAO_HOSTS_PERMITIDOS`) mudam sem
    fallback, porque executor e servidor são trocados juntos.
  - ADRs aceitas mantêm o texto histórico (só nomes de comando e arquivo foram atualizados); `specs/` não
    muda. `tests/arquitetura/nome.test.ts` garante que o nome antigo só aparece na compatibilidade e nas
    referências às specs.
- **Alternativas.**
  - Camaleão só no público: duas nomenclaturas para a mesma coisa.
  - Renomear sem migração: o usuário perderia a fila e o histórico ao atualizar.
  - Renomear no fim da fase web: o código novo nasceria com o nome antigo.
- **Consequências.** O fallback das variáveis e a migração do banco podem sair numa versão futura, junto
  com a entrada correspondente em `COMPATIBILIDADE` do teste de nome. O repositório no GitHub continua
  com o nome antigo até o usuário renomeá-lo.

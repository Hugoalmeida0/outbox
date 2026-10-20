# ADR-0023: Invariantes da vaga no domínio, com valores marcados

- **Status:** Aceita
- **Data:** 2026-10-20
- **Complementa:** ADR-0008 (repositório síncrono do agregado).

- **Contexto.** O relatório de arquitetura de 2026-10-20 apontou duas brechas no agregado `Vaga`. A
  única chamada de `validarTransicao` em produção ficava dentro do `RepositorioVagasSqlite`, então outro
  repositório (ou um fake) podia gravar uma transição inválida. E `atualizar(id, AtualizacaoVaga)`
  aceitava 16 campos opcionais sem regra, de qualquer caso de uso.
- **Decisão.**
  - `transicionar(vaga, para, opcoes)` em `#dominio/vagas/state-machine/transicoes.ts` aplica a máquina
    de estados e devolve uma `TransicaoVaga`. A porta só tem `gravarTransicao(id, transicao)`.
  - `transicionarVaga(vagas, id, para, opcoes)` em `#aplicacao/compartilhado/transicionar-vaga.ts` lê a
    vaga, chama o domínio e grava, tudo numa transação.
  - `AtualizacaoVaga` só sai das funções de `#dominio/vagas/atualizacoes.ts`, cada uma com nome de
    intenção (`registrarResolucao`, `registrarAderencia`, `contarTentativaPreparo`...). Scores fora de
    0 a 100 lançam `ErroValidacao`.
  - `TransicaoVaga` e `AtualizacaoVaga` são tipos marcados (`Marca`). Fora do domínio, montar um desses
    valores à mão exige um cast explícito. Nos testes, o cast fica concentrado em `umaAtualizacao`.
  - O SQLite grava a transição com `WHERE status = <de>`. Se o status mudou entre a leitura e a gravação,
    lança `ErroInfra` em vez de sobrescrever.
- **Alternativas.**
  - Entidade `Vaga` como classe com métodos: mudaria todo o mapeamento do repositório e a serialização,
    e o ADR-0007 já prefere funções.
  - Validar nos dois lugares (domínio e repositório): duplica a regra que se quer única.
- **Consequências.** Os casos de uso chamam `transicionarVaga(deps.vagas, ...)` no lugar de
  `deps.vagas.transicionar(...)`, e o `Pick` do repositório inclui `transacao`, `buscar` e
  `gravarTransicao`. Um campo atualizável novo entra em `CamposAtualizaveisVaga`, ganha uma função em
  `atualizacoes.ts` e uma coluna em `COLUNAS`.

# ADR-0022: Pastas nomeadas pelo design pattern, em inglês

- **Status:** Aceita
- **Data:** 2026-10-20
- **Emenda:** ADR-0003 (idioma único em português ASCII).

- **Contexto.** O relatório de arquitetura de 2026-10-20 apontou que os patterns usados de fato
  (Strategy nos conectores, Registry no catálogo, Chain of Responsibility na resolução e State Machine
  nas transições de status) só apareciam nos ADRs e nos comentários. Quem abria a árvore de `src/` não
  via o pattern, só a feature.
- **Decisão.** A organização continua por feature. Dentro da feature, o código que implementa um pattern
  fica numa pasta com o nome do pattern em inglês e kebab-case:

  | Pattern                 | Pasta                                                   |
  | ----------------------- | ------------------------------------------------------- |
  | Strategy                | `src/infra/conectores/strategy/<motor>/conector.ts`     |
  | Registry                | `src/infra/conectores/registry/` (catálogo, definições) |
  | Chain of Responsibility | `src/infra/resolucao/chain-of-responsibility/`          |
  | State Machine           | `src/dominio/vagas/state-machine/transicoes.ts`         |

  Os contratos continuam em `src/aplicacao/portas/`, porque a aplicação não importa a infra (ADR-0005).
  Utilitários compartilhados que não são um pattern ficam onde estão (`src/infra/conectores/base/`).
  Os imports entre essas pastas usam subpath (`#infra/conectores/base/...`), já que `../../` é proibido
  pelo lint.

- **Exceção ao ADR-0003.** O nome do pattern é o termo técnico consagrado e fica em inglês, como as APIs
  de bibliotecas. Arquivos, tipos e funções dentro dessas pastas continuam em português.
- **Alternativas.**
  - Nomes em português (`estrategia/`, `registro/`, `cadeia/`): exigiriam tradução mental do pattern, e
    "registro" já tem outro sentido no projeto (`RegistroFalhas`).
  - Só comentários: era o estado anterior, e o pattern continuava invisível na árvore.
- **Consequências.** Um conector novo nasce em `strategy/<motor>/` e é registrado em
  `registry/definicoes.ts`. A pasta só existe quando o pattern é real: não há pasta de comparator, porque
  o código só usa `.sort` inline.

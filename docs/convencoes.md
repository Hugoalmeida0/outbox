# Convenções do Outbox

Versão viva de `specs/v1/spec-outbox/arquitetura.md` §16. Vale para todo código, teste, prompt e
documento do repositório.

## 1. Idioma (ADR-0003)

- Identificadores em **português sem acento e sem cedilha**: pastas, arquivos, tipos, funções,
  variáveis, constantes, tabelas, colunas, valores de enum, comandos e flags da CLI, chaves de config e
  nomes de prompts.
- Texto para humanos (mensagens, documentação, comentários, nomes de teste) em PT-BR com acentuação.
- Exceções impostas por ferramentas: scripts npm `test` e `lint`, campos do `package.json`,
  `README.md`, tipos do Conventional Commits, métodos HTTP, palavras-chave SQL e APIs de bibliotecas.

## 2. Nomenclatura

| Elemento                    | Convenção                                                         | Exemplo                                             |
| --------------------------- | ----------------------------------------------------------------- | --------------------------------------------------- |
| Pastas e arquivos           | kebab-case                                                        | `preparar-vagas.ts`                                 |
| Tipos, interfaces e classes | PascalCase, sem prefixo `I`                                       | `RepositorioVagas`                                  |
| Implementação de porta      | `<Porta><Tecnologia>`                                             | `RepositorioVagasSqlite`                            |
| Funções e variáveis         | camelCase; funções com verbo no infinitivo                        | `calcularAderencia`                                 |
| Booleanos                   | prefixos `eh`, `tem`, `deve`, `pode`                              | `ehRemota`                                          |
| Constantes de módulo        | UPPER_SNAKE                                                       | `TRANSICOES_VALIDAS`                                |
| Enum-like                   | objeto ou tupla `as const` com tipo derivado; **sem `enum`**      | `STATUS.NOVA`                                       |
| Erros                       | `Erro<Nome>`                                                      | `ErroLimiteUso`                                     |
| Casos de uso                | verbo mais substantivo, com `Deps<Nome>` e `Entrada<Nome>`        | `prepararVagas(deps, entrada, sinal)`               |
| Testes                      | `<arquivo>.test.ts`; casos de borda em `<arquivo>-bordas.test.ts` | `documento-bordas.test.ts`                          |
| Tabelas e colunas           | snake_case, tabelas no plural                                     | `respostas_enviadas`                                |
| Prompts                     | `prompts/<tarefa>.md`                                             | `prompts/analisar-vaga.md`                          |
| Commits                     | Conventional Commits em PT                                        | `feat(conectores): adiciona conector do greenhouse` |

## 3. Código

- ESM com **exports nomeados** (sem `export default`, verificado por lint).
- Imports entre módulos por subpath com extensão `.ts`: `#dominio/*`, `#aplicacao/*`, `#infra/*`,
  `#interfaces/*`, `#composicao`, `#testes/*` e `#scripts/*`. Proibido `../../`. Tipos com `import type`.
- Só sintaxe apagável (ADR-0004): sem `enum`, `namespace` nem _parameter properties_.
- Classes só na infra (estado ou ciclo de vida); domínio e aplicação usam funções e tipos.
- Casos de uso e etapas: `async function nome(deps, entrada, sinal)` com `Deps` estreitas
  (`Pick<Porta, ...>`).
- Funções de até 40 linhas como orientação; arquivo com mais de 300 linhas pede divisão.
- Comentários explicam o porquê. JSDoc obrigatório em portas, casos de uso e funções públicas do domínio.
- Datas ISO 8601 com offset, sempre via `Relogio`. Caminhos sempre com `node:path`.
- Nenhum `catch` vazio, salvo os documentados (falha do notificador vira aviso; limpeza best-effort).
- Formatação: Prettier (`printWidth: 100`), UTF-8, LF, 2 espaços.

## 4. Conectores e automação de navegador

- Nunca pressionar Enter em campo de formulário e nunca usar `submit` ao digitar (ADR-0017).
- Clicar só em botão visível; o envio final só acontece pela aplicação, depois da escolha do usuário.
- Toda ação Playwright tem timeout; nada espera indefinidamente.
- Nunca contornar CAPTCHA ou bloqueio anti-bot: pausar com `aguardarUsuario` (ADR-0020).
- Novas fixtures só sanitizadas (`npm run capturar-fixture`), revisadas antes de versionar.

## 5. Prompts

- Markdown com front-matter `versao: <inteiro>`; variáveis `{{chave}}` (ausente lança erro).
- O `GeradorEstruturado` acrescenta a instrução de saída e o JSON Schema gerado do Zod: o prompt não
  repete o schema.
- Mudou o comportamento, incrementa a `versao` (registrada em cada log de chamada).
- Conteúdo externo sempre em `<conteudo_nao_confiavel>`; dados sensíveis nunca entram em prompt.

## 6. Testes

- Unitários ao lado do código; em `tests/` só o que atravessa módulos ou usa infra real.
- Domínio testado sem mocks; aplicação com fakes de porta (`tests/apoio/fakes/`) e SQLite `:memory:`.
- Nenhum teste faz rede (o `fetch` não stubado lança erro); conectores rodam sobre fixtures servidas
  por `page.route`.
- O `claude` é substituído pelo executável falso `tests/fakes/claude.mjs` (`OUTBOX_CLAUDE_BIN`).
- Mocks e stubs ficam só nos testes; o código de produção não tem caminhos de teste.

## 7. Documentação

- `README.md`: instalação, uso e privacidade.
- `docs/arquitetura.md` e este arquivo: versões vivas.
- `docs/adr/NNNN-titulo.md`: Contexto, Decisão, Alternativas e Consequências, com status (Aceita,
  Substituída por NNNN ou Obsoleta). Mudança de camada, dependência, padrão, formato de dados ou política
  de segurança exige ADR nova. ADR aceita não é editada, só substituída.
- `docs/spikes/`: resultados de investigação. `docs/como-adicionar-conector.md`: receita de conector.

## 8. Definição de pronto

1. Critérios de aceite da tarefa validados.
2. `npm run verificar` passa.
3. Testes novos no nível certo.
4. Nenhum `TODO` sem explicação.
5. Documentação atualizada (ADR se a mudança for arquitetural).
6. Nenhum dado pessoal em arquivo versionado.

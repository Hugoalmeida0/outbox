# ADR-0021: Progresso do `preparar` por porta de eventos

- **Status:** Aceita
- **Data:** 2026-10-13

- **Contexto.** Cada vaga do `preparar` faz de 3 a 5 chamadas ao `claude -p` (até 180 s cada), e o
  comando só escrevia o resumo no fim. Na primeira rodada real, com 3 vagas, foram cerca de 8 minutos sem
  nenhuma saída, e o comando parecia travado, embora estivesse funcionando.
- **Decisão.** Porta `ProgressoPreparo` com os eventos `inicio`, `etapa` (resolver, extrair, analisar,
  gerar currículo, gerar carta, responder campos) e `concluida` (status final e erro). A interface a
  passa ao caso de uso, como faz com a `Interacao` no `aplicar`. Na CLI, o `ProgressoTerminal` escreve
  no stderr. Com TTY, mostra uma região viva redesenhada por ANSI: uma linha por vaga em andamento, com
  etapa e tempo, e um rodapé com o total. Sem TTY, escreve uma linha por etapa. A conclusão de cada vaga
  vira linha fixa nos dois modos. Toda escrita no terminal, o log inclusive, passa pela `Saida`, que
  apaga a região, escreve acima dela e a redesenha.
- **Alternativas.**
  - `Registrador.informar` em cada etapa: mistura acompanhamento com diagnóstico (ADR-0014), enche o
    JSONL e não mostra animação nem tempo decorrido.
  - `ora`: só tem uma linha animada e não cobre `--paralelo`. `listr2`: impõe o próprio modelo de tarefas
    à orquestração. `log-update`: resolve só o redesenho, que aqui ocupa cerca de 40 linhas.
  - Callback em `EntradaPrepararVagas`: a entrada é dado validado da CLI, e as dependências de
    interface já chegam como porta.
- **Consequências.** O stdout fica só com o resumo, então dá para redirecioná-lo. Escrever direto em
  `process.stderr`, fora da `Saida`, desalinha a região; por isso o log do terminal foi roteado pela
  `Saida`. Uma linha viva que quebra deixa restos a cada redesenho, então o corte é por colunas, com
  CJK e emoji contando 2 (por cima, para errar cortando antes). Se o terminal estreitar durante a
  execução, pode sobrar um resto uma vez.

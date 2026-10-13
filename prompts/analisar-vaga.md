---
versao: 1
---

# Tarefa

Analise a vaga e compare seus requisitos com o currículo master do candidato.

# Regras

- `idioma`: idioma em que a vaga está escrita (`pt`, `en` ou `outro`).
- `senioridade`, `modelo`, `regime`: use `nao_informada`/`nao_informado` quando a vaga não disser.
  Contratação internacional como prestador de serviço é `contractor`.
- `cidade`: só para vagas híbridas ou presenciais.
- `afirmativa`: `exclusiva: true` só se a vaga for exclusiva para grupos específicos; liste os grupos.
- `requisitos`: cada requisito relevante da vaga, com `termo` curto e canônico (ex.: "Kafka",
  "Inglês avançado", "AWS"). `obrigatorio` diferencia exigido de desejável.
  - `status: coberto` quando o master comprova; `parcial` quando comprova algo próximo; `ausente`
    quando não há evidência.
  - `evidencias`: ids do master (bullets, experiências, skills, projetos, formação, certificações) que
    comprovam o requisito. Nunca invente ids.
  - Não marque como ausente um termo que esteja na lista de termos negados: marque `ausente` só se
    realmente não houver evidência, mas não repita termos já negados como novos requisitos.
- `keywords`: de 10 a 30 termos que um ATS usaria para filtrar esta vaga (tecnologias, certificações,
  práticas e domínio), com o `tipo` correto.
- `comoCandidatar`: só quando o texto disser como se candidatar fora de um formulário (link externo
  ou e-mail).

Termos que o candidato declarou não possuir: {{negados}}

Preferências do candidato (para contexto): {{preferencias}}

Currículo master (JSON):

{{master}}

# Entrada

{{descricao}}

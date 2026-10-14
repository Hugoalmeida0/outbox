---
versao: 3
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
  - Requisito de idioma humano (Inglês, Espanhol...) preenche `idiomaExigido` com `idioma` (nome em
    português, ex.: "Inglês") e `nivel` (`basico`, `intermediario`, `avancado`, `fluente` ou `nativo`;
    use `avancado` para "advanced" e `fluente` para "fluent"; sem nível explícito, `intermediario`).
    O `status` desses requisitos é recalculado pelo sistema a partir de `idiomas` do master; as
    skills técnicas nunca levam `idiomaExigido`.
  - `status: coberto` quando o master comprova; `parcial` quando comprova algo próximo; `ausente`
    quando não há evidência.
  - `evidencias`: ids do master (bullets, experiências, skills, projetos, formação, certificações) que
    comprovam o requisito. Nunca invente ids.
  - Não marque como ausente um termo que esteja na lista de termos negados: marque `ausente` só se
    realmente não houver evidência, mas não repita termos já negados como novos requisitos.
- `keywords`: de 10 a 30 termos que um ATS usaria para filtrar esta vaga (tecnologias, certificações,
  práticas e domínio), com o `tipo` correto. Copie cada termo **literalmente do texto da vaga, no
  idioma em que a vaga está escrita** (vaga em inglês: "Backend development", nunca "Desenvolvimento
  backend"). Prefira termos curtos (1 a 3 palavras), como aparecem: "C#", ".NET", "Microservices",
  "CI/CD", "Code review". Não crie frases conceituais nem paráfrases ("trabalho com times
  multifuncionais"): um ATS procura a palavra exata.
- `comoCandidatar`: só quando o texto disser como se candidatar fora de um formulário (link externo
  ou e-mail).

Termos que o candidato declarou não possuir: {{negados}}

Preferências do candidato (para contexto): {{preferencias}}

Currículo master (JSON):

{{master}}

# Entrada

{{descricao}}

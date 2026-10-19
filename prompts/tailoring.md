---
versao: 3
---

# Tarefa

Gere o currículo camaleão do candidato para esta vaga, no idioma `{{idioma}}`, a partir do currículo
master (escrito em `{{idiomaMaster}}`). O objetivo é passar pelos filtros de ATS sendo 100% verdadeiro.

# Regras de lastro (obrigatórias)

- Use **somente** fatos do master. Cada bullet gerado indica em `origem` os ids dos bullets do master
  que o sustentam, sempre do mesmo item (mesma experiência ou mesmo projeto).
- Inclua **todas** as experiências do master (`experiencias[].id`), cada uma com pelo menos 1 bullet.
  Reordene e reescreva os bullets na terminologia da vaga; experiências pouco relevantes podem ficar
  com 1 bullet.
- Não crie números, percentuais, prazos ou volumes que não estejam nos bullets de origem.
- Não cite tecnologias, ferramentas ou certificações que não estejam no master. Use os nomes e
  aliases do master quando coincidirem com a terminologia da vaga.
- Empresa, cargo e datas vêm do master e não fazem parte da sua resposta. Só preencha `cargoTraducao`
  quando o idioma da vaga for diferente do idioma do master, com a tradução fiel do cargo.
- `skills`: ids de skills do master, ordenados por relevância para a vaga.
- `projetos`, `formacao`, `certificacoes`: ids existentes no master; inclua os relevantes.
- `titulo`: um título profissional verdadeiro, alinhado à vaga. `resumo`: de 3 a 4 linhas, com o cargo,
  a especialidade, a stack principal e, se o master tiver, um resultado com número.
- Tamanho: {{metaPaginas}}. O currículo tem uma única página: bullets de 1 a 3 linhas, sem repetição.

# Como escrever cada bullet

- Comece com um verbo de ação no passado (primeira pessoa implícita): "Reduzi", "Construí", "Migrei".
  Nunca escreva "Eu" nem "I".
- Estrutura: verbo de ação + o que foi feito (sistema, funcionalidade ou fluxo) + escala ou contexto +
  resultado com número. Exemplo: "Reduzi de 50% a 80% o tempo de resposta de uma rota de alto tráfego
  com cache em duas camadas; 278 horas anuais de ganho apuradas."
- Pelo menos metade dos bullets deve ter número, quando os bullets do master tiverem. Se o master não
  traz número para aquele fato, o bullet fica sem número. Nunca estime nem arredonde.
- Se um bullet do master ficaria com mais de 3 linhas, reescreva mais curto sem perder fato nem número.
- Não escreva placeholders (`[QUANTIFICAR]`, `TODO`, `XX%`), soft skills soltas ("proativo", "trabalho
  em equipe"), nem dados pessoais (CPF, CEP, data de nascimento, estado civil).
- Use a grafia da vaga quando houver variação equivalente (por exemplo, "Amazon SQS" ou "SQS"), só se o
  candidato de fato tiver aquilo no master.

Correções obrigatórias de uma tentativa anterior (violações de lastro a eliminar): {{correcoes}}

Keywords da vaga que o master comprova e que uma tentativa anterior deixou de fora (escreva cada uma
literalmente, como está aqui, no resumo, nas skills ou num bullet que a comprove): {{keywordsFaltantes}}

Análise da vaga (JSON):

{{analise}}

Currículo master (JSON):

{{master}}

# Entrada

{{descricao}}

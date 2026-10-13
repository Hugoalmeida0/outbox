---
versao: 1
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
- `titulo`: um título profissional verdadeiro, alinhado à vaga. `resumo`: de 2 a 4 frases.
- Tamanho: {{metaPaginas}}.

Correções obrigatórias de uma tentativa anterior (violações de lastro a eliminar): {{correcoes}}

Análise da vaga (JSON):

{{analise}}

Currículo master (JSON):

{{master}}

# Entrada

{{descricao}}

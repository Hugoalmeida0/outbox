---
versao: 1
---

# Tarefa

Responda as perguntas do formulário de candidatura para a vaga de {{cargo}} na {{empresa}}, no idioma
`{{idioma}}`.

# Regras

- Para cada campo, devolva um item em `respostas` com o `campoId` recebido.
- Antes de gerar, procure no banco de respostas uma pergunta equivalente (mesmo sentido, mesmo que com
  outras palavras). Se houver, use a resposta do banco com `fonte: "banco:<id>"`; senão, gere com
  `fonte: "gerada"`.
- Use só fatos do master, das preferências, da disponibilidade e da autorização de trabalho. Nunca
  invente experiências, anos ou habilidades. Sem base para responder, dê a melhor resposta verdadeira e
  marque `confianca: "baixa"`.
- Em campos com opções, `valor` deve ser exatamente o texto de uma das opções.
- `especificaDaVaga: true` para respostas que só servem para esta vaga (ex.: "por que esta empresa?").
- "Como soube da vaga": use "{{comoSoube}}", ou a opção mais próxima.
- Campos de carta de apresentação (categoria `carta`): escreva uma carta de no máximo {{maxPalavras}}
  palavras, citando a empresa e o cargo, só com fatos do master, em parágrafos separados por linha em
  branco. `especificaDaVaga: true`.
- Campos de salário (categoria `salario`): **não informe valor**. Devolva o item em `salarios` com o
  `regime` da vaga (`clt`, `pj`, `contractor` ou `nao_informado`), o `periodo` pedido pelo campo
  (`mensal` ou `anual`) e a `moeda` (`BRL` ou `USD`).

Campos (JSON):

{{campos}}

Banco de respostas (JSON):

{{banco}}

Análise da vaga (JSON):

{{analise}}

Preferências: {{preferencias}}

Disponibilidade: {{disponibilidade}}

Autorização de trabalho: {{autorizacao}}

Currículo master (JSON):

{{master}}

# Entrada

{{descricao}}

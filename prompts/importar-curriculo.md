---
versao: 1
---

# Tarefa

Converta o currículo do candidato no currículo master estruturado do Outbox.

{{fonte}}

# Regras

- Não invente nada: só registre o que está escrito no currículo. Se um dado obrigatório não existir (por
  exemplo, telefone), use a string "a preencher".
- Ids em kebab-case ASCII, únicos no arquivo inteiro:
  - experiências: `exp-<empresa>`; bullets: `exp-<empresa>-b1`, `exp-<empresa>-b2`…
  - projetos: `proj-<nome>`; bullets: `proj-<nome>-b1`…
  - formação: `form-<instituicao>`; certificações: `cert-<nome>`.
  - skills: o nome normalizado (ex.: "Node.js" → `nodejs`, "C#" → `csharp`).
- Extraia as skills mencionadas nos bullets e nas seções de competências. Cada skill citada num bullet
  deve aparecer em `skills` do bullet e na lista `skills` do master.
- `origem` de toda skill é `master`. Preencha `aliases` com variações comuns do nome (ex.: Node, NodeJS).
- Datas de experiência em `AAAA-MM`; emprego atual com `fim: null`.
- `idioma` é o idioma em que o currículo está escrito (`pt` ou `en`).
- Preserve o texto dos bullets o mais fiel possível ao original.

# Entrada

{{curriculo}}

# Modelo da spec

Referência da skill `refiner-expert`: estrutura de `specs/spec-<CHAVE>/spec.md`.

<rules>

- Autocontida: quem implementar lê só a spec.
- Caminhos completos, nomes exatos e comportamentos precisos.
- Sem decisão adiada: o que não foi resolvido vai para Questões em aberto, marcado `[PENDENTE DE CLARIFICAÇÃO]`.
- Glossário e Questões em aberto só entram com conteúdo; sem conteúdo, omita a seção.

</rules>

<template>

```markdown
**Data:** AAAA-MM-DD | **Card:** [CHAVE](link do card) | **Status:** Rascunho

---

## 1. Contexto e Objetivo

<2 a 4 frases: o que fazer e por quê.>

## 2. Premissas

- <premissa assumida durante o refinamento e o motivo>

## 3. Decisões

| Decisão | Motivo | Alternativas descartadas |
| --- | --- | --- |
| <decisão tomada na sessão> | <por quê> | <o que foi considerado e não escolhido> |

## 4. Glossário

- **<Termo>**: <definição em uma frase>.

## 5. Fora do Escopo

- <o que explicitamente não será feito>

## 6. Contrato de Aceite

| ID | Critério | Como validar | Tarefas |
| --- | --- | --- | --- |
| AC1 | <critério verificável> | <teste ou verificação objetiva> | T1 |

## 7. Tarefas

| Tarefa | Objetivo | Arquivos/Áreas | Depende de | Pode paralelizar com | Critérios |
| --- | --- | --- | --- | --- | --- |
| T1 | <objetivo> | `caminho/completo/arquivo.ext` | Nenhuma | Nenhuma | AC1 |

### T1 — <título>

**Arquivo:** `caminho/completo/arquivo.ext` | **Ação:** Criar, Modificar ou Deletar
**Detalhes:** <assinaturas, estrutura e lógica, sem decisões adiadas.>

## 8. Questões em aberto

- [PENDENTE DE CLARIFICAÇÃO] <o que falta decidir e quem decide>
```

</template>

---
versao: 2
---

# Tarefa

Extraia os dados da vaga a partir do texto da página. URL de origem: {{url}}

# Regras

- `empresa`: a empresa contratante (não o site agregador).
- `cargo`: o título da vaga como publicado.
- `descricao`: o texto completo da vaga (responsabilidades, requisitos, benefícios), sem menus,
  rodapés ou outras vagas.
- `localidade`: cidade/estado/país ou "Remoto", quando informado.
- `publicadaEm`: data de publicação em AAAA-MM-DD, só se estiver explícita.
- `regimeTexto`: CLT, PJ, contractor etc., só se estiver explícito.
- Se o texto for uma página de erro (404, "vaga não disponível", vaga encerrada ou removida) e não uma
  vaga, responda somente `{"indisponivel": true}`.
- Não invente campos ausentes: omita-os.

# Entrada

{{textoPagina}}

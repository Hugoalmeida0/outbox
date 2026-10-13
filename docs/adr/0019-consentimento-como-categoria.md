# ADR-0019: Consentimento como categoria de campo

- **Status:** Aceita
- **Data:** 2026-10-10

- **Contexto.** Os formulários reais (Greenhouse, Lever, Ashby, Workable, Teamtailor) têm caixas de
  termos de uso, política de privacidade, LGPD e GDPR, algumas obrigatórias e outras opcionais (por
  exemplo, "guardar meus dados para outras vagas"). Na spec elas caíam em `pergunta` e iriam ao LLM.
- **Decisão.** Nova categoria `consentimento`, reconhecida em checkbox e radio pelo rótulo. A resposta é
  determinística (`respostaConsentimento`): o consentimento obrigatório é aceito, o opcional é recusado.
  Não vai ao LLM e não entra no banco de respostas.
- **Alternativas.**
  - Deixar com o LLM: resposta não determinística para uma decisão de privacidade.
  - Aceitar tudo: concede usos de dados que o usuário não pediu.
- **Consequências.** A revisão mostra a escolha e o usuário pode mudar no navegador. Rótulos de
  consentimento fora do padrão continuam como `pergunta`.

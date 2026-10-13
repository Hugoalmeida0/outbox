# ADR-0017: Nenhum envio implícito de formulário

- **Status:** Aceita
- **Data:** 2026-10-10

- **Contexto.** A spec garante que nada é enviado sem a escolha `[e]nviar`, mas só tratava do clique
  no botão final. Na implementação apareceram dois caminhos de envio implícito:
  - Nos conectores, fechar um combobox com Enter disparou o envio nativo do formulário (6 cliques de
    envio na fixture do Greenhouse e timeouts no Workable).
  - No agente, o Playwright MCP 0.0.83 tem `browser_press_key` e o parâmetro `submit` (Enter depois de
    digitar) em `browser_type`. O alvo dessas ferramentas também confundia o modelo (`ref=f1e5` em vez
    de `f1e5`), gerando turnos desperdiçados.
- **Decisão.**
  - Conectores nunca pressionam Enter: o combobox fecha com `blur`.
  - O clique de envio usa só o botão visível (`filter({ visible: true })`); botões ocultos (por exemplo,
    o do hCaptcha no Lever) são ignorados.
  - `browser_press_key` fica fora da allowlist do agente.
  - O prompt `agente-candidatura` (versão 2) proíbe `submit: true` e o clique no envio final, e explica
    o formato do `target` (referência do snapshot sem `ref=`, ou seletor CSS único).
- **Alternativas.**
  - Confiar só no prompt: insuficiente, pois o modelo pode usar Enter para confirmar um campo.
  - Interceptar requisições POST na página do agente: quebraria formulários de várias etapas, que
    salvam rascunhos por POST.
- **Consequências.** Widgets que exigem tecla (autocomplete por seta e Enter) podem não ser preenchidos
  pelo agente; nesse caso o campo fica para a revisão humana. Validado com o agente real contra uma
  página local: formulário preenchido em 38 s, sem nenhum POST, com o prompt versão 2.

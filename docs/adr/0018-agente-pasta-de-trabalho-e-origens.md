# ADR-0018: Pasta de trabalho do agente e ausência de restrição de origens

- **Status:** Aceita
- **Data:** 2026-10-10

- **Contexto.** A spec pedia verificar, na versão fixada do `@playwright/mcp` (0.0.83), os nomes das
  ferramentas, a raiz permitida para upload e a restrição de origens de navegação.
  - O upload (`browser_file_upload`) só aceita arquivos dentro das raízes do workspace do cliente MCP.
  - A opção `--allowed-origins` não é uma fronteira de segurança (a própria ferramenta avisa que não
    impede redirecionamentos) e bloquearia CDNs, SSO e domínios de login legítimos dos ATS.
- **Decisão.**
  - O executor cria `dados/tmp/agente-<id>/`, usa a pasta como `cwd` do `claude` e copia para ela os
    PDFs do pacote (currículo e carta); o prompt recebe os caminhos copiados.
  - `--allowed-origins` não é usado. A fronteira de segurança é a allowlist de ferramentas
    (`--strict-mcp-config`, `--tools ""` e `--allowedTools` sem execução de script, cookies, storage,
    rede, rotas nem teclas) mais a allowlist de hosts do `outbox-segredos`, que é o único caminho para
    dado sensível.
  - O executor garante o navegador do Outbox aberto antes de iniciar o `claude`, porque o Playwright MCP
    se conecta a ele por CDP.
- **Alternativas.**
  - Passar `dados/vagas/` como raiz extra: expõe os artefatos de todas as vagas ao agente.
  - Usar `--allowed-origins` com os padrões do motor: falsa sensação de segurança e falhas de navegação.
- **Consequências.** Uma cópia dos PDFs por execução (alguns KB). Sem restrição de navegação, uma página
  maliciosa ainda pode levar o agente a outro site, mas lá ele não tem acesso a dado sensível nem pode
  executar script, e a revisão humana continua obrigatória.

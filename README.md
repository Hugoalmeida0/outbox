# Outbox

Candidatura assistida a vagas com **currículo camaleão**. Você entrega links de vagas; o Outbox resolve
cada link até o ATS de verdade, analisa a vaga, gera um currículo ajustado (sem inventar nada além do
seu currículo master), pré-responde o formulário e abre tudo preenchido para você revisar. **Nada é
enviado sem a sua confirmação**, e o Outbox nunca contorna CAPTCHA.

Roda localmente no Windows, numa CLI. O LLM é o Claude, via `claude -p` da sua assinatura do Claude
Code (sem custo por chamada).

## Requisitos

- Windows 11 (é a plataforma testada; o CI roda em `windows-latest`).
- Node.js 24 ou mais recente (executa TypeScript nativamente, sem build).
- [Claude Code](https://claude.com/claude-code) instalado e logado (`claude` no PATH).
- Google Chrome (opcional; sem ele, o Outbox usa o Chromium do Playwright).

## Instalação

```powershell
npm ci
npx playwright install chromium
npm link   # opcional: deixa o comando `outbox` disponível em qualquer pasta
```

Sem `npm link`, use `npm run outbox -- <comando>` no lugar de `outbox <comando>`.

## Primeiros passos

1. **Importe o seu currículo atual** (`.pdf`, `.docx`, `.md` ou `.txt`). Ele vira o
   `curriculo/master.yaml`, a fonte de verdade de tudo o que o currículo camaleão pode dizer:

   ```powershell
   outbox importar C:\Users\voce\Documentos\curriculo.pdf
   ```

   Revise o `curriculo/master.yaml` gerado. Cada bullet ajustado precisa ter lastro aqui.

2. **Preencha o `curriculo/perfil.yaml`**, criado a partir de `curriculo.exemplo/`: preferências
   (modelos, cidades, senioridades, regimes), tabela salarial, documentos, disponibilidade e,
   se quiser, dados de diversidade. Esses dados são preenchidos **por código** e nunca vão ao LLM.
3. **Faça os logins no navegador do Outbox** (LinkedIn, Gupy e outros que exigem conta):

   ```powershell
   outbox navegador
   ```

   O navegador usa um perfil próprio em `dados/navegador/`; as sessões ficam salvas.

## Fluxo diário

```powershell
outbox adicionar https://job-boards.greenhouse.io/empresa/jobs/123 https://www.linkedin.com/jobs/view/456
outbox adicionar -a vagas.txt      # uma URL por linha; linhas com # são comentários
outbox preparar                    # resolve, analisa, descarta as de baixa aderência e gera os currículos
outbox aplicar                     # preenche cada formulário e abre a revisão antes de enviar
outbox status                      # o que está pronto, enviado e o que aguarda você
```

- `preparar --forcar` processa mesmo abaixo da aderência mínima; `--paralelo <n>` (1 a 8) controla
  quantas vagas por vez; `--reavaliar` reabre descartadas usando os gaps que você confirmou depois.
- `aplicar --simular` preenche e revisa, mas nunca envia; `aplicar --id <id>` trabalha numa vaga só.
- Na revisão você escolhe: **[e]nviar**, **[p]ular**, **[m]anual** (você termina), **[v]er o PDF** ou
  **[s]air**. Edite o que quiser direto no navegador antes de escolher: o Outbox lê os valores finais
  e aprende com as suas correções.
- Antes das vagas, o `aplicar` pergunta, uma vez por termo, sobre requisitos que o master não cobre
  ("A vaga pede Kafka (3 vagas). Você tem?"). "Sim" grava a skill no master; "não" nunca é perguntado
  de novo.

## Retornos

Registre o andamento das candidaturas (sem expiração):

```powershell
outbox retorno 12 EM_PROCESSO --etapa entrevista_rh --nota "conversa dia 15"
outbox retorno 12 OFERTA
outbox retorno 9 ENVIADA          # para vagas MANUAL que você enviou, ou PENDENTE_TESTE concluídas
```

Status aceitos: `EM_PROCESSO` (com `--etapa triagem|entrevista_rh|tecnica|final`), `OFERTA`, `RECUSADA` e
`ENVIADA`. Uma transição inválida é recusada com a lista das aceitas.

## Manutenção

- `outbox falhas` lista as falhas de conector (por conector e passo) e os sites que o agente preencheu
  sem conector. Os registros ficam em `falhas/`, com o HTML **sanitizado** (sem valores, scripts nem
  dados pessoais).
- `npm run capturar-fixture -- <url> <motor> <nome>` abre a página no navegador do Outbox e salva uma
  fixture sanitizada em `tests/fixtures/<motor>/<nome>.html` para corrigir ou criar um conector
  (veja `docs/como-adicionar-conector.md`).
- `outbox renderizar-master` regenera o PDF genérico do master em `dados/master/`.

## Configuração

Tudo é opcional. Para ajustar, copie `config.exemplo.yaml` para `config.yaml` (fora do git) e mantenha
só as chaves que quiser mudar. Variáveis de ambiente: `OUTBOX_LOG` (`depurar`, `informar`, `avisar` ou
`erro`) e `OUTBOX_CLAUDE_BIN` (só para testes).

## Comandos e códigos de saída

| Comando                                              | O que faz                                                                         |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| `importar <arquivo> [--sobrescrever]`                | Gera`curriculo/master.yaml` (com backup ao sobrescrever) e os arquivos auxiliares |
| `adicionar [urls...] [-a <arquivo>]`                 | Canoniza e enfileira URLs, com deduplicação                                       |
| `preparar [--forcar] [--paralelo <n>] [--reavaliar]` | Prepara as vagas NOVA                                                             |
| `aplicar [--simular] [--id <id>]`                    | Preenche e revisa as vagas PRONTA                                                 |
| `status [--status <STATUS>]`                         | Contagens, tabela e o que aguarda você                                            |
| `retorno <id> <status> [--etapa] [--nota]`           | Registra o retorno de uma candidatura                                             |
| `falhas`                                             | Falhas de conector e motores sem conector                                         |
| `navegador`                                          | Abre o navegador do Outbox para logins                                            |
| `renderizar-master`                                  | Gera o PDF genérico do master                                                     |

Códigos de saída: `0` sucesso, `1` erro de execução, `2` uso inválido, `130` interrompido (Ctrl+C).
O primeiro Ctrl+C encerra de forma ordenada; o segundo força a saída. Dois `preparar` (ou `aplicar`)
simultâneos não rodam: o segundo sai com código 2.

## Currículo em 1 página

O PDF sai em A4, uma coluna e texto selecionável, no formato que os ATS parseiam. Quando o conteúdo
não cabe em 1 página, o Outbox reduz a fonte (de 9,5 pt até 9,0 pt), corta itens e só então reduz até
o piso de 8,8 pt. Margens abaixo de 12 mm e fonte abaixo de 8,8 pt nunca são usadas: se ainda assim
passar de 1 página, o PDF sai longo e a vaga recebe o alerta `pdf_mais_de_2_paginas`.

Você controla o que sai primeiro com `prioridadeCorte` (inteiro de 1 a 10) no `curriculo/master.yaml`,
em experiência, bullet, projeto ou certificação. **O menor valor corta primeiro**; valores de 9 a 10
são protegidos e só saem se nada abaixo resolver. Sem o campo, o valor implícito é:

| Valor | Item                                                                              |
| ----- | --------------------------------------------------------------------------------- |
| 1     | Experiência não atual sem nenhuma skill ligada às keywords da vaga                |
| 3     | Bullet de projeto além do 2º                                                      |
| 4     | Bullet de menor aderência (a experiência atual nunca fica com menos de 4 bullets) |
| 10    | Experiência não atual com aderência à vaga (protegida)                            |

Empates saem pela menor aderência e, depois, pelo item mais antigo. A experiência atual (`fim: null`)
nunca é removida. Uma experiência cortada perde primeiro os bullets (fica só a linha do cargo) e depois
é removida. `nuncaListar` impede que termos (nomes ou ids de skill) apareçam no currículo gerado.

## Privacidade e segurança

- `curriculo/`, `dados/` e `config.yaml` ficam **fora do git**. Não versione esses diretórios.
- Senhas criadas para os ATS ficam em `dados/credenciais.json`, em texto puro, na sua máquina. Use
  criptografia de disco (BitLocker).
- Documentos, salário, diversidade, endereço completo e senhas **nunca** vão ao LLM nem aos logs. O
  agente os preenche por uma ferramenta local (`outbox-segredos`) que só atua no site da vaga e nunca
  devolve o valor.
- O conteúdo das páginas de vaga é tratado como não confiável nos prompts.
- O Outbox **nunca envia** uma candidatura sem a escolha `[e]nviar` e **nunca contorna CAPTCHA**:
  quando aparece um, ele pausa e espera você resolver no navegador.

## Checklist de smoke manual

Antes de confiar no fluxo com vagas reais:

1. `outbox importar` com o seu currículo e revise o master.
2. `outbox adicionar` com 2 ou 3 vagas de ATS diferentes (por exemplo Greenhouse, Lever e uma página
   de carreira própria).
3. `outbox preparar` e confira, em `dados/vagas/<id>/`, o `curriculo.txt`, o PDF e o `analise.json`.
4. `outbox aplicar --simular`: confira os campos preenchidos no navegador e o resumo de revisão.
5. `outbox status` e `outbox falhas`.

## Documentação

- `docs/arquitetura.md`: arquitetura viva (camadas, portas, fluxos, segurança).
- `docs/convencoes.md`: convenções de código, nomes, testes e prompts.
- `docs/adr/`: decisões arquiteturais.
- `docs/como-adicionar-conector.md`: passo a passo para um ATS novo.
- `docs/spikes/`: investigações (Gupy, InHire).
- `docs/progresso.md`: rastreabilidade da implementação da v1.
- `specs/`: specs originais (registro histórico).

## Desenvolvimento

```powershell
npm run verificar   # tipos, lint, formatação, testes com cobertura e npm audit
npm test            # só os testes
npm run formatar    # Prettier
```

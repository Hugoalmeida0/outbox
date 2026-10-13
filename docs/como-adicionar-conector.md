# Como adicionar um conector de ATS

Um conector ensina o Outbox a preencher o formulário de um ATS de forma determinística. Sem conector, o
agente (LLM operando o navegador) preenche e a vaga aparece em `outbox falhas` como "sem conector": o
ranking dali indica qual ATS vale um conector. Nenhum caso de uso muda ao adicionar um conector.

## 1. Garanta o motor no domínio

Em `src/dominio/vagas/motores.ts`:

- Adicione o motor a `PADROES_MOTOR` (padrões de host) para `detectarMotor` reconhecê-lo.
- Se as URLs têm um formato canônico (id da vaga), acrescente o caso em `canonicaPorMotor`.
- Adicione o motor a `MOTORES_COM_CONECTOR_V1` (a rota passa a ser `conector`).
- Cubra a canonização em `motores.test.ts`.

## 2. Capture fixtures sanitizadas

```powershell
npm run capturar-fixture -- https://<ats>/<empresa>/<vaga> <motor> formulario
```

O navegador do Outbox abre na URL; navegue até o formulário aberto e pressione Enter no terminal. A
fixture é salva em `tests/fixtures/<motor>/formulario.html` sem scripts, valores de input nem PII, com a
origem e a data num comentário no topo. **Revise o arquivo antes de versionar.** Capture também a página
de confirmação, se possível, ou escreva uma fixture mínima com o texto de confirmação.

## 3. Escreva a definição

Crie `src/infra/conectores/<motor>/conector.ts` exportando uma `DefinicaoConector`
(`src/infra/conectores/base/conector-formulario.ts`). O fluxo comum (abrir, ler campos, preencher,
etapas, envio, confirmação, pausa em CAPTCHA) já está em `criarConector`; a definição declara só o que
muda:

| Campo                            | Para quê                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| `motor`, `versao`                | Identificação; `versao` em semver, incrementada a cada mudança de comportamento      |
| `urlFormulario(url)`             | URL da página com o formulário (por exemplo, `<vaga>/apply`)                         |
| `abrir(pagina)`                  | Leva até o formulário (clicar em "Candidatar-se")                                    |
| `seletorEnviar`                  | Botão final; o clique só acontece depois da escolha `[e]nviar`                       |
| `confirmacao`                    | `texto` (regex da confirmação) e, se houver, `pendenteTeste`                         |
| `ignorar`                        | Seletores a ignorar na leitura (por exemplo, upload de autopreenchimento)            |
| `lerExtras`, `preencherEspecial` | Widgets que a leitura genérica não enxerga                                           |
| `extrairVaga`, `lerCamposApi`    | Dados por API pública, sem navegador                                                 |
| `camposSoNoAplicar`              | Campos que só aparecem depois de login ou anti-bot                                   |
| `etapas`                         | Formulário em etapas: regex do botão de avançar e limite                             |
| `autenticacao`                   | `global` (conta única, login manual) ou `tenant` (conta por empresa, senha do cofre) |

Regras (ADR-0017, ADR-0019, ADR-0020): nunca pressionar Enter, clicar só em botão visível, aceitar só o
consentimento obrigatório e nunca contornar CAPTCHA. Toda ação já tem timeout de 10 s.

## 4. Registre no catálogo

Adicione a definição a `DEFINICOES_V1` em `src/infra/conectores/definicoes.ts`. O teste "há exatamente
uma definição para cada motor da v1" garante a correspondência com o domínio.

## 5. Passe na suíte de contrato

Em `tests/contratos/conectores.test.ts`, chame `descreverContratoConector` com a definição, a URL da
vaga, o mapa de URLs para fixtures e o texto de confirmação. A suíte verifica, com Chromium headless e
sem rede, a versão semver, a leitura dos campos no preparo, que todos os campos obrigatórios ficam
preenchidos com o pacote de exemplo, que o PDF é anexado, que nada é enviado antes de `enviar()` e que a
confirmação é detectada. Os comportamentos comuns a todos os conectores (pausa em CAPTCHA, login global
e por tenant, falha de navegação virando `ErroFalhaConector`) ficam no bloco "catálogo e comportamentos
comuns" do mesmo arquivo.

```powershell
npx vitest run tests/contratos
npm run verificar
```

## 6. Valide com uma vaga real

Rode `outbox aplicar --simular --id <id>` numa vaga real do ATS e confira os campos no navegador. Se o
conector falhar em produção, o registro sanitizado em `falhas/<motor>/` mostra o passo e o seletor; o
agente assume a vaga enquanto isso.

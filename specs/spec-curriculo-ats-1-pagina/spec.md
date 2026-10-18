**Data:** 2026-10-18 | **Card:** sem card (slug `curriculo-ats-1-pagina`) | **Status:** Rascunho

---

## 1. Contexto e Objetivo

O gerador de currículo do Outbox (Playwright/Chromium, `src/infra/documentos/`, `src/dominio/curriculo/`, `src/aplicacao/etapas/gerar-curriculo.ts`) produz um PDF de texto real, mas fora da especificação ATS: margem de 15 mm, corpo de 10,5 pt, Idiomas como seção própria, nome de arquivo `Nome_Sobrenome_CV.pdf` e nenhum encaixe em 1 página (o prompt só pede "1 página" para menos de 5 anos de experiência e "no máximo 2" nos demais). O objetivo é **ajustar o gerador existente** (sem trocar a biblioteca de PDF, sem criar módulo novo e sem alterar as portas públicas) para que o PDF fique em A4, uma coluna, **1 página**, com layout, ordem de seções, regras de conteúdo e validações da especificação ATS, acompanhado de testes que falhem o build.

## 2. Premissas

- A biblioteca de PDF continua sendo Playwright (`page.pdf()`); o Chromium embute subconjuntos das fontes no PDF. Um teste confirma a fonte embutida.
- `DocumentoCurriculo` (`src/dominio/curriculo/documento.ts`) continua a fonte única para HTML, PDF e texto ATS (`paraTexto`). Formato (datas, ordem, contato) fica em `documento.ts`; visual fica em `template-html.ts`.
- Os valores visuais da especificação (seção "Anexo A") são aplicados literalmente no CSS, derivados de B (tamanho base em pt).
- A pilha de fontes passa a ser `Helvetica, Arial, Calibri, sans-serif`.
- A regra do bullet (verbo no passado + o quê + escala + resultado; metade com número; 1 a 3 linhas) vai só no prompt `prompts/tailoring.md` (versão 3), sem checagem em runtime.
- O cargo-alvo continua a ser decidido pelo LLM sob a regra de lastro (R5); sem checagem de compatibilidade nova.
- O snapshot PNG é artefato para revisão humana, sem comparação de pixels (evita instabilidade Windows × CI).
- O teste 5 (número fora do master) deriva a lista de números do texto do master, como o R4 já faz, em vez de usar `numeros_permitidos`.
- O master real (`curriculo/master.yaml`) fica fora do git; os campos novos são todos opcionais.

## 3. Decisões

| Decisão | Motivo | Alternativas descartadas |
| --- | --- | --- |
| Laço de encaixe determinístico no código, depois do LLM: renderiza, conta páginas (`contarPaginas`), reduz B e corta | Testável sem LLM, reaproveita `{paginas}` da porta, respeita o lastro | Pedir ao LLM para encurtar; híbrido |
| Campos novos opcionais no master: `pessoal.modalidade`, `nunca_listar`, `prioridade_corte`, `contexto` (por experiência) | Menor extensão que habilita as regras; padrão ausente = comportamento atual | `externo`, `numeros_permitidos`, `unidade`, modalidade por experiência e grupos de bullets (ficam para iteração posterior) |
| Nome do arquivo segue a spec: `Nome-Sobrenome-Curriculo.pdf` (master) e `Nome-Sobrenome-Curriculo-Empresa.pdf` (vaga); carta vira `Nome-Sobrenome-Carta-Empresa.pdf` | Padrão único no mesmo diretório | Manter `_CV`; mudar só o currículo |
| Se esgotar fonte e cortes e ainda não couber: gera o PDF de 2 páginas com `ALERTA_PDF_LONGO`, registra no log o que sobrou, nunca viola margem de 12 mm nem fonte de 8,8 pt | Decisão do usuário: não bloquear a candidatura. **Diverge da spec original (seção 4, passo 5, "falhar com erro") e substitui a regra atual de "até 2 páginas"** | Erro explícito sem PDF; flag de config |
| Escala de corte 1–10, menor corta primeiro, ≥9 protegido (ver seção 7, T4) | Combina critério automático com controle manual | Prioridade explícita primeiro; automático primeiro |
| Aderência = nº de skills (ids e aliases) do item que coincidem com as keywords da análise (mesma base do `scoreAts`); sem vaga, aderência contra as skills do próprio master e desempate por idade | Determinístico, sem limite arbitrário de anos | Limite de anos; ranking vindo do LLM |
| Experiência não atual corta em degraus: bullets → só a linha do cargo → remoção | Spec permite "só a linha do cargo, ou removida" | Remoção direta |
| COMPETÊNCIAS usa as categorias técnicas atuais (sem `soft`) e Idiomas como última linha da seção, sem seção própria | Menor mudança; cumpre 4–7 linhas | Rótulos livres do LLM; campo `grupo` na skill |
| Snapshot: `pdfjs-dist` + `@napi-rs/canvas` (devDependency), página 1 a 80 dpi | Rasteriza o PDF real | Screenshot do HTML |
| Proibições da seção 2 bloqueiam em runtime (novas regras de lastro com retry e fallback ao master genérico) e nos testes; `nunca_listar` também filtra o master antes do prompt | Protege vagas reais, não só o exemplo | Só testes; só texto gerado pelo LLM |

## 4. Glossário

- **B**: tamanho base da fonte em pt; começa em 9,5 e vai até o piso de 8,8.
- **Aderência**: nº de skills de um bullet ou experiência que coincidem com as keywords da análise da vaga.
- **Master genérico**: currículo montado só com o master (`gerado = null`), sem adaptação a vaga.
- **Lastro**: validação R1–R6 (`src/dominio/curriculo/lastro.ts`) de que o texto gerado só usa fatos do master.
- **Protegido**: item com prioridade de corte ≥ 9, cortado só se nada abaixo resolver.

## 5. Fora do Escopo

- Troca da biblioteca de PDF e alteração das portas `RenderizadorDocumentos`, `GeradorEstruturado`, `ArmazemCurriculo`, `ArmazemArtefatos`.
- Saída `.docx`.
- Campos `externo`, `numeros_permitidos`, `unidade`, modalidade e grupos de bullets por experiência.
- Checagem em runtime da fórmula do bullet, da proporção de bullets com número e do limite de 3 linhas.
- Checagem de compatibilidade do cargo-alvo com o master além do lastro.
- Comparação de pixels do snapshot.
- Portfólio no cabeçalho e GitHub no cabeçalho.
- Metadado `Author` do PDF.

## 6. Contrato de Aceite

| ID | Critério | Como validar | Tarefas |
| --- | --- | --- | --- |
| AC1 | Layout conforme Anexo A: A4, margens 13/13 mm laterais, 10 mm topo, 9 mm base, uma coluna, cores só `#000` e `#333333`, sem itálico/sublinhado/imagem | `tests/integracao/curriculo-ats.test.ts` lê CSS/PDF (fontes, margens via posição do texto) | T1 |
| AC2 | Ordem do texto extraído: nome → cargo → contato → RESUMO → EXPERIÊNCIA → [PROJETOS] → FORMAÇÃO → [CERTIFICAÇÕES] → COMPETÊNCIAS; todos os títulos presentes; em inglês SUMMARY, EXPERIENCE, PROJECTS, EDUCATION, CERTIFICATIONS & AWARDS, SKILLS | Teste de integração com `lerPdf` | T2 |
| AC3 | Linha de contato: `Cidade, UF, País · modalidade · e-mail · telefone · linkedin`; datas `mmm/aaaa – mmm/aaaa` (pt) em todo o documento; certificações em um parágrafo `Nome — Emissor (mmm/aaaa)`, máx. 4 | Testes unitários de `documento.ts` | T2 |
| AC4 | Master antigo (sem campos novos) continua válido e gera o mesmo conteúdo; `curriculo.exemplo/master.yaml` documenta a escala | `tests/integracao/exemplos.test.ts`, teste do schema | T3 |
| AC5 | O laço de encaixe: B 9,5 → 9,0 → cortes por escala → 8,8; registra B final e itens cortados; nunca abaixo de 8,8 pt nem margem 12 mm; se não couber, gera PDF longo com `ALERTA_PDF_LONGO` e lista o que sobrou | Testes unitários do laço com renderizador falso; teste de integração com master de exemplo em 1 página | T4 |
| AC6 | Escala de corte: valores implícitos 1–5, `prioridade_corte` explícito substitui, ≥9 protegido, experiência atual nunca removida e com no mínimo 4 bullets, empate por menor aderência e depois mais antigo | Testes unitários da função de corte | T4 |
| AC7 | Texto proibido bloqueado em runtime: placeholders (`[QUANTIFICAR]`, `TODO`, `XX`, `lorem`), primeira pessoa explícita, CPF, CEP, data de nascimento, estado civil, número fora do master (inclusive no resumo e título), termo `nunca_listar`; violação gera retry e depois fallback ao master genérico | `lastro.test.ts` novos casos; `etapas.test.ts` | T5 |
| AC8 | Teste do PDF final falha com mais de 1 página (no master de exemplo), imagens, fonte < 8,8 pt, margem < 12 mm, fonte não embutida, padrões proibidos, número fora do master, `nunca_listar` | `tests/integracao/curriculo-ats.test.ts` | T6 |
| AC9 | Nome do arquivo e metadado: `Nome-Sobrenome-Curriculo[-Empresa].pdf`, `Title` = "Nome Sobrenome — Currículo" (via `<title>`) | `documento-bordas.test.ts`, teste de metadados do PDF | T7 |
| AC10 | Snapshot PNG da página 1 a 80 dpi gerado em `tests/__snapshots__/curriculo-p1.png` | Teste de integração | T6 |

## 7. Tarefas

| Tarefa | Objetivo | Arquivos/Áreas | Depende de | Pode paralelizar com | Critérios |
| --- | --- | --- | --- | --- | --- |
| T1 | CSS conforme Anexo A, parametrizado por B | `src/infra/documentos/template-html.ts` | T3 | T3 | AC1 |
| T2 | Ordem, títulos, contato, datas, linha de empresa/cargo, certificações em parágrafo, Idiomas dentro de COMPETÊNCIAS | `src/dominio/curriculo/documento.ts` | T3 | T1 | AC2, AC3 |
| T3 | Campos opcionais no master e documentação da escala | `src/dominio/curriculo/master.ts`, `curriculo.exemplo/master.yaml`, `README.md`, `tests/apoio/builders.ts` | Nenhuma | T1 | AC4 |
| T4 | Laço de encaixe e função de corte | `src/dominio/curriculo/encaixe.ts` (novo, dentro do módulo existente), `src/aplicacao/etapas/gerar-curriculo.ts`, `src/infra/documentos/renderizador-pdf-playwright.ts` | T1, T2, T3 | Nenhuma | AC5, AC6 |
| T5 | Regras de lastro para texto proibido, números no resumo/título e `nunca_listar`; prompt v3 | `src/dominio/curriculo/lastro.ts`, `prompts/tailoring.md`, `src/aplicacao/etapas/gerar-curriculo.ts` | T3 | T4 | AC7 |
| T6 | Testes de integração do PDF e snapshot | `tests/integracao/curriculo-ats.test.ts`, `tests/apoio/pdf.ts`, `package.json` | T4, T5 | T7 | AC8, AC10 |
| T7 | Nome do arquivo e metadados do PDF | `src/dominio/curriculo/nome-arquivo.ts`, `src/infra/armazenamento/armazem-artefatos-fs.ts`, `src/infra/documentos/renderizador-pdf-playwright.ts` | T3 | T6 | AC9 |

Commits pequenos por tema, nesta ordem: schema (T3), layout (T1, T2), encaixe (T4), validações (T5), testes (T6), nome e metadados (T7).

### T1 — CSS do Anexo A

**Arquivo:** `src/infra/documentos/template-html.ts` | **Ação:** Modificar
**Detalhes:** a função de HTML recebe `tamanhoBase` (B, padrão 9.5) e emite CSS com os valores do Anexo A. `@page { size: A4; margin: 10mm 13mm 9mm 13mm; }`. Cores: `#000`; contato `#333333`. Pilha `Helvetica, Arial, Calibri, sans-serif`. Sem itálico, sublinhado, link ou imagem. Bullets com marcador "•" e recuo de 9 pt, segunda linha alinhada ao texto (`list-style: none`, `padding-left: 9pt`, `text-indent: -9pt`). `h2` com `border-bottom: 0.6pt solid #000`, `padding-bottom: 2pt`.

### T2 — Documento

**Arquivo:** `src/dominio/curriculo/documento.ts` | **Ação:** Modificar
**Detalhes:**
- Ordem: Resumo, Experiência, Projetos, Formação, Certificações, Competências (Idiomas sai da lista de seções).
- Títulos em `TITULOS` com os textos exatos da spec: pt `RESUMO`, `EXPERIÊNCIA PROFISSIONAL`, `PROJETOS`, `FORMAÇÃO`, `CERTIFICAÇÕES E RECONHECIMENTOS`, `COMPETÊNCIAS TÉCNICAS`; en `SUMMARY`, `EXPERIENCE`, `PROJECTS`, `EDUCATION`, `CERTIFICATIONS & AWARDS`, `SKILLS`. O CSS `text-transform: uppercase` continua.
- Contato (`linhaContato`): `Cidade, UF, País · pessoal.modalidade · e-mail · telefone · linkedin`, omitindo vazios. GitHub e portfólio ficam fora do cabeçalho; o GitHub aparece apenas como `projeto.url` em texto puro na linha do projeto em PROJETOS; o portfólio fica fora desta iteração.
- Experiência: linha `Empresa · Local`, linha `Cargo · mmm/aaaa – mmm/aaaa` (ou `atual`), depois `contexto` (se houver) e bullets.
- Certificações: um parágrafo `Nome — Emissor (mmm/aaaa)` separado por " · ", máximo 4 itens; com `certificacao.mes` o formato é `Nome — Emissor (mmm/aaaa)`; sem `mes`, `Nome — Emissor (aaaa)`.
- Competências: categorias técnicas (sem `soft`), linhas `Rótulo: item, item`. Idiomas é anexado ao fim da última linha, separado por " · ", sem rótulo novo. Ex.: `Ferramentas: Git, Azure DevOps · Idiomas: Português (nativo), Inglês (intermediário)`. Mais de ~35 itens em COMPETÊNCIAS gera só um aviso no log/relatório, sem bloquear.
- Tipo `DocumentoCurriculo` ganha os campos necessários e mantém `paraTexto` coerente.

### T3 — Campos opcionais no master

**Arquivo:** `src/dominio/curriculo/master.ts` | **Ação:** Modificar
**Detalhes:** em `esquemaMasterBase`, `pessoal.modalidade?: string`; `nunca_listar?: string[]` (termos ou ids de skill, padrão `[]`, na raiz); `prioridade_corte?: number` (inteiro 1–10) em experiência, bullet, projeto e certificação; `contexto?: string` em experiência; `mes?: number` (inteiro 1–12) em certificação. O master real será preenchido com os meses. Atualizar `curriculo.exemplo/master.yaml` com os campos comentados, descrevendo a escala 1–10 no comentário do `prioridade_corte`. Documentar a escala no `README.md`. O armazém YAML mantém o comportamento atual (o zod passa a aceitar os campos). O prompt recebe o master **depois** de filtrar `nunca_listar` (`gerar-curriculo.ts`, antes do `JSON.stringify(master)`).

### T4 — Laço de encaixe e corte

**Arquivo:** `src/dominio/curriculo/encaixe.ts` (novo) e `src/aplicacao/etapas/gerar-curriculo.ts` | **Ação:** Criar e Modificar
**Detalhes:**
- Função pura de corte: recebe `DocumentoCurriculo`, as keywords da análise e as `prioridade_corte`; devolve o próximo item a cortar ou `null`.
- Valores implícitos (menor corta primeiro): 1 = experiência não atual com aderência 0; 2 = certificação além da 4ª; 3 = bullet de projeto além do 2º; 4 = bullet de menor aderência (posição atual respeita mínimo de 4; as demais experiências são limitadas a 2 bullets); 5 = fusão da linha de Idiomas: passa a ser anexada ao fim da última linha de COMPETÊNCIAS, separada por " · ", sem rótulo novo (ver T2). `prioridade_corte` explícito substitui o valor implícito; ≥9 é protegido (só cortado se nada abaixo resolver). Experiência atual (`fim = null`) nunca é removida. Empate: menor aderência, depois item mais antigo. Experiência com aderência > 0 sem prioridade explícita tem valor implícito 10.
- Degraus de uma experiência não atual: remove os bullets (fica a linha do cargo) e depois a experiência inteira.
- Sem vaga (master genérico): aderência calculada contra as skills do próprio master; desempate por idade.
- Laço: renderiza com B = 9,5; reduz B em 0,1 até 9,0; aplica cortes um a um (renderizando e contando páginas a cada passo); depois reduz B em 0,1 até 8,8. Se ainda exceder 1 página, mantém o resultado (B = 8,8 e cortes aplicados), retorna `paginas > 1`, emite `ALERTA_PDF_LONGO` e grava no log os itens remanescentes. O alerta existente `ALERTA_PDF_LONGO` passa a disparar com `paginas > 1`. Registra no log o B final e os itens cortados.
- O texto de `curriculo.txt` e o score ATS são calculados sobre o documento **final** (depois dos cortes).
- Remove do prompt e do código a regra `anosDeExperiencia < 5 ? "1 página" : "no máximo 2 páginas"`; a meta passa a ser "1 página".

### T5 — Lastro e prompt

**Arquivo:** `src/dominio/curriculo/lastro.ts`, `prompts/tailoring.md` | **Ação:** Modificar
**Detalhes:** acrescentar regras após o R6, válidas igualmente em pt e en: R7 placeholders em título, resumo e bullets, com as regex do Anexo B (palavra inteira e, para `TODO`/`XX`, diferenciando maiúsculas); R8 primeira pessoa explícita (`Eu` em pt, `I` em en, no início do bullet); R9 números no título e no resumo precisam constar do texto factual do master, usando a normalização do Anexo B (a mesma passa a valer no R4 e no teste 5 do T6); R10 padrões proibidos (CPF `\d{3}\.\d{3}\.\d{3}-\d{2}`, CEP, data de nascimento, "estado civil", "solteiro", "casado"); R11 termo de `nunca_listar` no texto gerado. Violação segue o fluxo atual (retry com correções, depois fallback ao master genérico). Prompt `tailoring.md` versão 3: fórmula do bullet, pelo menos metade com número quando o master tiver número, 1 a 3 linhas, sem soft skills soltas, meta "1 página".

### T6 — Testes de integração

**Arquivo:** `tests/integracao/curriculo-ats.test.ts` (novo), `tests/apoio/pdf.ts`, `package.json` | **Ação:** Criar e Modificar
**Detalhes:** Vitest com Chromium real. Verifica: 1 página (master de exemplo), ordem do texto extraído, presença dos títulos pt e en, padrões proibidos, números fora do master, `nunca_listar`, ausência de imagens (operadores de imagem do pdfjs), fonte mínima 8,8 pt e margem mínima 12 mm (posições do texto), fontes embutidas (lista de fontes do pdfjs). Snapshot: `@napi-rs/canvas` em `devDependencies`; rasteriza a página 1 com escala 80/72 para `tests/__snapshots__/curriculo-p1.png`.

### T7 — Nome do arquivo e metadados

**Arquivo:** `src/dominio/curriculo/nome-arquivo.ts`, `src/infra/armazenamento/armazem-artefatos-fs.ts`, `src/infra/documentos/renderizador-pdf-playwright.ts` | **Ação:** Modificar
**Detalhes:** `Nome-Sobrenome-Curriculo.pdf`, com `-Empresa` quando houver vaga; carta `Nome-Sobrenome-Carta-Empresa.pdf`; sem acentos nem espaços. `<title>` do HTML = `Nome Sobrenome — Currículo` (vira o `Title` do PDF). Sem `Author` e sem dependência nova. Atualizar `documento-bordas.test.ts` e os chamadores de `nomeArquivo`.

## Anexo A — Valores visuais (B = tamanho base em pt)

| Elemento | Tamanho | Peso | Entrelinha | Espaçamento |
| --- | --- | --- | --- | --- |
| Página | A4 retrato, margens E/D 13 mm, topo 10 mm, base 9 mm | — | — | — |
| Nome | B + 8 | Negrito | B + 11 | — |
| Cargo-alvo | B + 1 | Negrito | 1,2 × tamanho | logo abaixo do nome |
| Contato | B − 0,5 | Regular, `#333333` | 1,2 × B | — |
| Título de seção | B + 0,5 | Negrito, caixa alta | 1,2 × B + 1 | antes 0,55 × B; linha preta de 0,6 pt, 2 pt abaixo |
| Texto corrido | B | Regular | 1,2 × B | — |
| Subtítulo | B | Negrito no cargo/rótulo | 1,2 × B | antes 0,25 × B |
| Bullet | B | Regular | 1,2 × B | marcador "•", recuo 9 pt |

## Anexo B — Correções de revisão

1. **`TODO` no R7 bloquearia currículo legítimo.** Em português "todo" é palavra comum ("todo o fluxo", "em todo o documento"). Os padrões do R7 usam diferenciação de maiúsculas e limite de palavra: `\bTODO\b`, `\bXX\b`, `\[QUANTIFICAR\]`, `\blorem\b` (este pode ignorar maiúsculas). Aplica-se também aos testes do T6.
2. **Comparação de números sem normalização.** Antes de comparar (R4, R9 e teste 5 do T6): tirar o separador de milhar ("1.497" → "1497"); unificar a vírgula decimal ("98,34" → "98.34"); tirar `%`, `~` e `+` ("~70" → "70"); separar faixas em dois números ("50% a 80%" e "50–80%" → 50 e 80). Ficam fora da checagem os números que o sistema gera (datas formatadas e contato), pois não vêm do LLM.

## 8. Questões em aberto

Nenhuma. As seis pendências do rascunho anterior foram resolvidas (linha fundida de Idiomas, `certificacao.mes`, GitHub e portfólio, `Author`, valor implícito 10, limite de 35 itens e R7–R11 em inglês) e estão incorporadas em T2, T3, T4, T5, T7 e Fora do Escopo.

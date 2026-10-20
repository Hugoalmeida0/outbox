// Preenchimento de campos por tipo (texto, select, radio, checkbox, anexo, combobox).
import type { Locator, Page } from "playwright";
import type { TipoCampo } from "#dominio/respostas/campo.ts";
import { normalizarTexto } from "#dominio/compartilhado/texto.ts";
import { melhorOpcao } from "#dominio/respostas/opcoes.ts";
import { escolherNoCombobox } from "./combobox.ts";
import type { DescritorCampo } from "./descritores.ts";
import { ErroSemOpcao } from "./erro-sem-opcao.ts";

const VERDADEIRO = /^(sim|yes|true|1|x|on)$/i;

/**
 * Marca/desmarca uma opção. Primeiro o clique nativo no próprio input: não depende de layout (nada por
 * cima intercepta) e dispara o onChange de React e afins. Mudar `checked` direto não serve: o DOM diz
 * marcado, mas o estado do formulário não muda e o próximo re-render desmarca. Depois, o clique do
 * Playwright. Por fim, confirma: falha em vez de seguir com a opção errada.
 */
async function definirMarcado(opcao: Locator, marcado: boolean): Promise<void> {
  if ((await opcao.isChecked()) === marcado) return;
  await opcao.evaluate((el) => {
    (el as HTMLInputElement).click();
  });
  if ((await opcao.isChecked()) !== marcado) {
    await opcao.setChecked(marcado, { force: true, timeout: 3000 }).catch(() => undefined);
  }
  if ((await opcao.isChecked()) !== marcado) throw new Error("não foi possível alterar a opção");
}

async function rotuloDaOpcao(opcao: Locator): Promise<string> {
  return opcao.evaluate((el) => {
    const input = el as HTMLInputElement;
    const porFor = input.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`) : null;
    const label = porFor ?? input.closest("label");
    return ((label as HTMLElement | null)?.innerText ?? input.value).replace(/\s+/g, " ").trim();
  });
}

async function marcarRadio(pagina: Page, campo: DescritorCampo, valor: string): Promise<void> {
  const opcoes = await pagina.locator(`${campo.seletor}:not([type=hidden])`).all();
  const rotulos = await Promise.all(opcoes.map(rotuloDaOpcao));
  const escolhida = melhorOpcao(rotulos, valor);
  const indice = escolhida === null ? -1 : rotulos.indexOf(escolhida);
  const opcao = opcoes[indice];
  if (!opcao) throw new ErroSemOpcao(`opção "${valor}" não encontrada em ${campo.rotulo}`);
  await definirMarcado(opcao, true);
}

/** Checkbox único vira sim/não; em grupo, marca cada opção pedida (separadas por `;`, quebra ou vírgula). */
async function marcarCheckbox(pagina: Page, campo: DescritorCampo, valor: string): Promise<void> {
  const opcoes = await pagina.locator(`${campo.seletor}:not([type=hidden])`).all();
  if (opcoes.length === 1) {
    const unica = opcoes[0];
    if (unica) await definirMarcado(unica, VERDADEIRO.test(valor.trim()));
    return;
  }
  const desejados = valor
    .split(/[;\n]|,\s*(?=[A-ZÀ-Ú])/)
    .map((v) => v.trim())
    .filter(Boolean);
  const rotulos = await Promise.all(opcoes.map(rotuloDaOpcao));
  // O valor inteiro primeiro: rótulos como "Site de emprego (ex: Indeed, Infojobs)" têm vírgulas.
  const inteira = melhorOpcao(rotulos, valor);
  const escolhidas = new Set(
    inteira !== null && normalizarTexto(inteira) === normalizarTexto(valor)
      ? [inteira]
      : desejados.map((d) => melhorOpcao(rotulos, d)).filter((o) => o !== null),
  );
  if (escolhidas.size === 0)
    throw new ErroSemOpcao(`nenhuma opção corresponde a "${valor}" em ${campo.rotulo}`);
  for (const escolhida of escolhidas) {
    const opcao = opcoes[rotulos.indexOf(escolhida)];
    if (opcao) await definirMarcado(opcao, true);
  }
}

async function escolherNoSelect(pagina: Page, campo: DescritorCampo, valor: string): Promise<void> {
  if (campo.combobox) {
    await escolherNoCombobox(pagina, campo, valor);
    return;
  }
  // Sem opção que case, `selectOption` só falharia depois do timeout: desiste na hora.
  const escolhida = campo.opcoes.length > 0 ? melhorOpcao(campo.opcoes, valor) : valor;
  if (escolhida === null)
    throw new ErroSemOpcao(`opção "${valor}" não encontrada em ${campo.rotulo}`);
  await pagina.locator(campo.seletor).first().selectOption({ label: escolhida });
}

/** Preenche um campo conforme o tipo. `valor` é o texto (ou o caminho do arquivo para anexos). */
export async function preencherCampo(
  pagina: Page,
  campo: DescritorCampo,
  valor: string,
): Promise<void> {
  const alvo = pagina.locator(campo.seletor);
  switch (campo.tipo) {
    case "arquivo":
      await alvo.first().setInputFiles(valor);
      return;
    case "radio":
      await marcarRadio(pagina, campo, valor);
      return;
    case "checkbox":
      await marcarCheckbox(pagina, campo, valor);
      return;
    case "select":
      await escolherNoSelect(pagina, campo, valor);
      return;
    case "texto":
    case "textarea":
    case "email":
    case "telefone":
    case "numero":
    case "data":
      await alvo.first().fill(valor);
      return;
  }
}

/** Tipo de campo inferido da tag, do `type` e do `role` do elemento. */
function tipoDoElemento(info: {
  readonly tag: string;
  readonly tipo: string;
  readonly combobox: boolean;
}): TipoCampo {
  if (info.tag === "select" || info.combobox) return "select";
  if (info.tipo === "radio") return "radio";
  if (info.tipo === "checkbox") return "checkbox";
  if (info.tipo === "file") return "arquivo";
  return info.tag === "textarea" ? "textarea" : "texto";
}

/**
 * Preenche um elemento a partir só do seletor, inferindo o tipo (usado pelo camaleao-segredos, que recebe
 * seletores do agente): select nativo, grupo de radio/checkbox, combobox, anexo ou texto.
 */
export async function preencherElemento(
  pagina: Page,
  seletor: string,
  valor: string,
): Promise<void> {
  const elemento = pagina.locator(seletor).first();
  const info = await elemento.evaluate((el) => ({
    tag: el.tagName.toLowerCase(),
    tipo: (el.getAttribute("type") ?? "").toLowerCase(),
    combobox: el.getAttribute("role") === "combobox",
    nome: el.getAttribute("name"),
    opcoes:
      el instanceof HTMLSelectElement
        ? [...el.options].filter((o) => o.value !== "").map((o) => o.text.trim())
        : [],
  }));
  const tipo = tipoDoElemento(info);
  const agrupado = (tipo === "radio" || tipo === "checkbox") && info.nome !== null;
  await preencherCampo(
    pagina,
    {
      id: info.nome ?? seletor,
      nome: info.nome,
      rotulo: "",
      tipo,
      obrigatorio: false,
      opcoes: info.opcoes,
      seletor: agrupado ? `[name="${info.nome ?? ""}"]` : seletor,
      autocomplete: null,
      combobox: info.combobox,
    },
    valor,
  );
}

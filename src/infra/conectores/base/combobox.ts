// Combobox com busca (react-select e afins): opções do menu do campo, espera e escolha.
import type { Locator, Page } from "playwright";
import { melhorOpcao, nomesDoPais } from "#dominio/respostas/opcoes.ts";
import type { DescritorCampo } from "./descritores.ts";
import { ErroSemOpcao } from "./erro-sem-opcao.ts";

/** Autocompletes que consultam um serviço (cidade, por exemplo) levam mais de 1 s para listar opções. */
const ESPERA_OPCOES_MS = 5000;
/** Sem menu aberto depois disso, o campo não lista opções (texto livre): não adianta esperar mais. */
const ESPERA_MENU_MS = 1000;

/**
 * Opções do menu deste campo, e não de outro menu aberto na página: o listbox apontado por
 * `aria-controls` ou, sem ele, o contêiner mais próximo do campo que tem opções (react-select e afins
 * renderizam o menu ao lado do input).
 */
async function opcoesDoCampo(pagina: Page, caixa: Locator): Promise<Locator> {
  const controla = await caixa.getAttribute("aria-controls").catch(() => null);
  if (controla) return pagina.locator(`[id="${controla}"]`).getByRole("option");
  return caixa
    .locator("xpath=ancestor::*[position() <= 5][.//*[@role='option']][1]")
    .getByRole("option");
}

/**
 * Espera as opções do menu aberto aparecerem e devolve os textos. Lista vazia com `menuAberto` quer dizer
 * "nenhum resultado para o texto"; sem menu, o campo aceita texto livre.
 */
async function esperarOpcoes(
  pagina: Page,
  caixa: Locator,
): Promise<{ opcoes: string[]; menuAberto: boolean }> {
  const inicio = Date.now();
  let menuAberto = false;
  while (Date.now() - inicio < ESPERA_OPCOES_MS) {
    const textos = await (await opcoesDoCampo(pagina, caixa)).allInnerTexts().catch(() => []);
    const opcoes = textos.map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (opcoes.length > 0) return { opcoes, menuAberto: true };
    menuAberto = (await caixa.getAttribute("aria-expanded").catch(() => null)) === "true";
    if (!menuAberto && Date.now() - inicio >= ESPERA_MENU_MS) break;
    await pagina.waitForTimeout(200);
  }
  return { opcoes: [], menuAberto };
}

/**
 * Combobox com busca (react-select e afins): digita, espera as opções e clica na que casa. Tenta também o
 * trecho antes da vírgula ("Cariacica, ES" vira "Cariacica") e o nome do país em outro idioma. Se o campo
 * nunca lista opções, fica o texto digitado (texto livre), a menos que o componente o apague ao perder o
 * foco. Nunca pressiona Enter: num campo dentro de <form>, Enter dispara o envio implícito do formulário.
 */
export async function escolherNoCombobox(
  pagina: Page,
  campo: DescritorCampo,
  valor: string,
): Promise<void> {
  const caixa = pagina.locator(campo.seletor).first();
  const consultas = [
    ...new Set([valor, valor.split(",")[0]?.trim() ?? "", ...nomesDoPais(valor)]),
  ].filter(Boolean);
  let listouOpcoes = false;
  for (const [i, consulta] of consultas.entries()) {
    // Entre consultas, fecha o menu: no react-select, clicar com o menu aberto o fecha, e a próxima
    // consulta seria digitada sem menu.
    if (i > 0) {
      await caixa.fill("");
      await caixa.blur();
    }
    await caixa.click();
    await caixa.fill(consulta);
    const { opcoes, menuAberto } = await esperarOpcoes(pagina, caixa);
    const escolhida = melhorOpcao(opcoes, valor) ?? melhorOpcao(opcoes, consulta);
    if (escolhida !== null) {
      // Texto exato (com espaços flexíveis): "Cariacica, ..." não pode casar com "Porto de Cariacica, ...".
      const palavras = escolhida.split(" ").map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const exato = new RegExp(`^\\s*${palavras.join("\\s+")}\\s*$`);
      const opcao = (await opcoesDoCampo(pagina, caixa)).filter({ hasText: exato });
      await opcao.first().click();
      return;
    }
    listouOpcoes ||= menuAberto;
    if (!menuAberto) break;
  }
  const semOpcao = new ErroSemOpcao(`nenhuma opção corresponde a "${valor}" em ${campo.rotulo}`);
  if (listouOpcoes) {
    await caixa.fill("");
    await caixa.blur();
    throw semOpcao;
  }
  await caixa.fill(valor);
  await caixa.blur();
  if ((await caixa.inputValue().catch(() => "")).trim() === "") throw semOpcao;
}

/**
 * Opções reais de um campo, para escolher de novo quando a resposta não casou: as lidas do DOM (select,
 * radio, checkbox) ou, num combobox, as listadas ao abrir o menu sem filtro. Fecha o menu ao final.
 */
export async function listarOpcoes(pagina: Page, campo: DescritorCampo): Promise<string[]> {
  if (campo.opcoes.length > 0 || !campo.combobox) return campo.opcoes;
  const caixa = pagina.locator(campo.seletor).first();
  await caixa.click();
  await caixa.fill("");
  const { opcoes } = await esperarOpcoes(pagina, caixa);
  await caixa.blur();
  return opcoes;
}

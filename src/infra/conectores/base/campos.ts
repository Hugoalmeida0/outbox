import type { Locator, Page } from "playwright";
import type { ValorLido } from "#aplicacao/portas/formulario-aberto.ts";
import { classificarFormulario } from "#dominio/respostas/classificar-campo.ts";
import type { Campo, TipoCampo } from "#dominio/respostas/campo.ts";
import { normalizarTexto } from "#dominio/compartilhado/texto.ts";
import { melhorOpcao, nomesDoPais } from "#dominio/respostas/opcoes.ts";

/**
 * Nenhuma opção do campo corresponde ao valor. Não é falha do conector: o campo fica para o usuário
 * completar na revisão, em vez de o agente assumir o formulário inteiro.
 */
export class ErroSemOpcao extends Error {
  override readonly name = "ErroSemOpcao";
}

/** Campo lido do DOM, com o seletor usado para preenchê-lo. */
export interface DescritorCampo {
  readonly id: string;
  readonly nome: string | null;
  readonly rotulo: string;
  readonly tipo: TipoCampo;
  readonly obrigatorio: boolean;
  readonly opcoes: string[];
  readonly seletor: string;
  readonly autocomplete: string | null;
  readonly combobox: boolean;
}

/**
 * Lê os campos visíveis de um formulário (inputs, selects, textareas, comboboxes, grupos de radio e
 * checkbox), resolvendo o rótulo por `label[for]`, `aria-*`, label ancestral ou contêiner de pergunta.
 * Executa no navegador; não atravessa shadow DOM.
 */
export async function lerDescritores(
  pagina: Page,
  ignorar: readonly string[] = [],
): Promise<DescritorCampo[]> {
  return pagina.evaluate(
    (seletoresIgnorados) => {
      const ignorados = new Set<Element>(
        seletoresIgnorados.flatMap((s) => [...document.querySelectorAll(s)]),
      );
      const visivel = (el: Element): boolean => {
        const h = el as HTMLElement;
        return !!(h.offsetWidth || h.offsetHeight || h.getClientRects().length);
      };
      const limpar = (texto: string): string =>
        texto
          .replace(/\s+/g, " ")
          .replace(/[*✱]/g, "")
          .replace(/\bRequired\b\.?/gi, "")
          .trim();
      const marcaObrigatorio = (texto: string): boolean =>
        /[*✱]|\brequired\b|obrigat[óo]ri/i.test(texto);
      const textoDe = (el: Element | null | undefined): string =>
        (el as HTMLElement | null)?.innerText ?? el?.textContent ?? "";

      const CONTEINERES =
        "fieldset, [role=radiogroup], [role=group], .application-question, .ashby-application-form-field-entry, [data-field-path], li, .form-group, .field, [class*=question], [class*=Question], [class*=field], [class*=Field]";
      const ROTULOS_CONTEINER =
        "legend, .application-label, .ashby-application-form-question-title, [class*=label], [class*=Label], [class*=title], label";

      const rotuloDoConteiner = (el: Element, excluir: readonly Element[]): string => {
        let atual: Element | null = el.parentElement;
        for (let nivel = 0; atual && nivel < 6; nivel++, atual = atual.parentElement) {
          if (!atual.matches(CONTEINERES)) continue;
          const candidato = [...atual.querySelectorAll(ROTULOS_CONTEINER)].find(
            (r) => !excluir.some((x) => r.contains(x)) && limpar(textoDe(r)).length > 0,
          );
          if (candidato) return textoDe(candidato);
        }
        return "";
      };

      const rotuloBruto = (el: HTMLElement): string => {
        if (el.id) {
          const porFor = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (porFor && limpar(textoDe(porFor))) return textoDe(porFor);
        }
        const aria = el.getAttribute("aria-label");
        if (aria) return aria;
        const ids = el.getAttribute("aria-labelledby");
        if (ids) {
          const t = ids
            .split(/\s+/)
            .map((i) => textoDe(document.getElementById(i)))
            .join(" ");
          if (limpar(t)) return t;
        }
        const ancestral = el.closest("label");
        if (ancestral && limpar(textoDe(ancestral))) return textoDe(ancestral);
        return rotuloDoConteiner(el, [el]) || el.getAttribute("placeholder") || "";
      };

      const tipoDe = (el: HTMLElement): string => {
        const tag = el.tagName.toLowerCase();
        if (tag === "textarea") return "textarea";
        if (tag === "select") return "select";
        if (el.getAttribute("role") === "combobox") return "select";
        const t = (el.getAttribute("type") ?? "text").toLowerCase();
        if (t === "email") return "email";
        if (t === "tel") return "telefone";
        if (t === "number" || t === "range") return "numero";
        if (t === "date") return "data";
        if (t === "file") return "arquivo";
        if (t === "radio") return "radio";
        if (t === "checkbox") return "checkbox";
        return "texto";
      };

      const EXCLUIDOS = new Set(["hidden", "submit", "button", "image", "reset", "search"]);
      const elementos = [
        ...document.querySelectorAll<HTMLElement>("input, select, textarea, [role=combobox]"),
      ].filter((el) => {
        if (ignorados.has(el)) return false;
        const tipo = (el.getAttribute("type") ?? "").toLowerCase();
        if (EXCLUIDOS.has(tipo) && el.getAttribute("role") !== "combobox") return false;
        if (
          (el.getAttribute("name") ?? "").startsWith("g-recaptcha") ||
          el.closest("[aria-hidden=true]")
        )
          return false;
        if (el.tagName === "DIV" || el.tagName === "SPAN") return false;
        return tipo === "file" || visivel(el);
      });

      let geradores = 0;
      const idDe = (el: HTMLElement): { id: string; seletor: string } => {
        if (el.id) return { id: el.id, seletor: `[id="${el.id}"]` };
        const nome = el.getAttribute("name");
        if (nome) return { id: nome, seletor: `[name="${nome}"]` };
        const gerado = `outbox-campo-${String(++geradores)}`;
        el.setAttribute("data-outbox-campo", gerado);
        return { id: gerado, seletor: `[data-outbox-campo="${gerado}"]` };
      };

      const grupos = new Map<string, HTMLInputElement[]>();
      const resultado: {
        id: string;
        nome: string | null;
        rotulo: string;
        tipo: string;
        obrigatorio: boolean;
        opcoes: string[];
        seletor: string;
        autocomplete: string | null;
        combobox: boolean;
      }[] = [];

      for (const el of elementos) {
        const tipo = tipoDe(el);
        if ((tipo === "radio" || tipo === "checkbox") && el.getAttribute("name")) {
          const nome = el.getAttribute("name") ?? "";
          const lista = grupos.get(nome) ?? [];
          if (lista.length === 0) {
            grupos.set(nome, lista);
            resultado.push({
              id: nome,
              nome,
              rotulo: "",
              tipo,
              obrigatorio: false,
              opcoes: [],
              seletor: `[name="${nome}"]`,
              autocomplete: null,
              combobox: false,
            });
          }
          lista.push(el as HTMLInputElement);
          continue;
        }
        const { id, seletor } = idDe(el);
        const bruto = rotuloBruto(el);
        const opcoes =
          el.tagName === "SELECT"
            ? [...(el as HTMLSelectElement).options]
                .filter((o) => o.value !== "" && limpar(o.text) !== "")
                .map((o) => limpar(o.text))
            : [];
        resultado.push({
          id,
          nome: el.getAttribute("name"),
          rotulo: limpar(bruto),
          tipo,
          obrigatorio:
            (el as HTMLInputElement).required ||
            el.getAttribute("aria-required") === "true" ||
            marcaObrigatorio(bruto),
          opcoes,
          seletor,
          autocomplete: el.getAttribute("autocomplete"),
          combobox: el.getAttribute("role") === "combobox",
        });
      }

      for (const item of resultado) {
        const membros = grupos.get(item.id);
        if (!membros || item.seletor !== `[name="${item.id}"]`) continue;
        const opcoes = membros.map((m) => {
          const porFor = m.id ? document.querySelector(`label[for="${CSS.escape(m.id)}"]`) : null;
          return limpar(textoDe(porFor ?? m.closest("label")) || m.value);
        });
        const bruto = rotuloDoConteiner(membros[0] as HTMLElement, membros);
        const unico = membros.length === 1;
        item.opcoes = unico ? [] : opcoes;
        item.rotulo = limpar(unico ? (opcoes[0] ?? bruto) : bruto) || limpar(bruto);
        item.obrigatorio =
          membros.some((m) => m.required || m.getAttribute("aria-required") === "true") ||
          marcaObrigatorio(bruto);
      }
      return resultado;
    },
    [...ignorar],
  ) as Promise<DescritorCampo[]>;
}

/** Converte descritores em `Campo` do domínio, classificando o formulário inteiro. */
export function paraCampos(descritores: readonly DescritorCampo[]): Campo[] {
  const classificacoes = classificarFormulario(
    descritores.map((d) => ({
      rotulo: d.rotulo,
      nome: d.nome ?? d.id,
      autocomplete: d.autocomplete ?? undefined,
      tipo: d.tipo,
    })),
  );
  return descritores.map((d, i) => ({
    id: d.id,
    rotulo: d.rotulo,
    tipo: d.tipo,
    obrigatorio: d.obrigatorio,
    ...(d.opcoes.length > 0 ? { opcoes: d.opcoes } : {}),
    categoria: classificacoes[i]?.categoria ?? "pergunta",
  }));
}

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
async function escolherNoCombobox(
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
    case "radio": {
      const opcoes = await pagina.locator(`${campo.seletor}:not([type=hidden])`).all();
      const rotulos = await Promise.all(opcoes.map(rotuloDaOpcao));
      const escolhida = melhorOpcao(rotulos, valor);
      const indice = escolhida === null ? -1 : rotulos.indexOf(escolhida);
      const opcao = opcoes[indice];
      if (!opcao) throw new ErroSemOpcao(`opção "${valor}" não encontrada em ${campo.rotulo}`);
      await definirMarcado(opcao, true);
      return;
    }
    case "checkbox": {
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
      return;
    }
    case "select": {
      if (campo.combobox) {
        await escolherNoCombobox(pagina, campo, valor);
        return;
      }
      // Sem opção que case, `selectOption` só falharia depois do timeout: desiste na hora.
      const escolhida = campo.opcoes.length > 0 ? melhorOpcao(campo.opcoes, valor) : valor;
      if (escolhida === null)
        throw new ErroSemOpcao(`opção "${valor}" não encontrada em ${campo.rotulo}`);
      await alvo.first().selectOption({ label: escolhida });
      return;
    }
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

/** Lê os valores atuais do formulário (inclusive o nome do arquivo anexado), para a revisão e o histórico. */
export async function lerValoresGenerico(
  pagina: Page,
  ignorar: readonly string[] = [],
): Promise<ValorLido[]> {
  const descritores = await lerDescritores(pagina, ignorar);
  const valores: ValorLido[] = [];
  for (const d of descritores) {
    const valor = await pagina
      .locator(d.seletor)
      .evaluateAll((els, tipo) => {
        const inputs = els as HTMLInputElement[];
        if (tipo === "arquivo")
          return inputs.flatMap((e) => [...(e.files ?? [])].map((f) => f.name)).join(", ");
        if (tipo === "radio" || tipo === "checkbox") {
          return inputs
            .filter((e) => e.checked)
            .map((e) => {
              const label =
                (e.id ? document.querySelector(`label[for="${CSS.escape(e.id)}"]`) : null) ??
                e.closest("label");
              return ((label as HTMLElement | null)?.innerText ?? e.value)
                .replace(/\s+/g, " ")
                .trim();
            })
            .join("; ");
        }
        const el = els[0] as HTMLInputElement | HTMLSelectElement | undefined;
        if (!el) return "";
        if (el instanceof HTMLSelectElement) return el.selectedOptions[0]?.text.trim() ?? "";
        if (el.value) return el.value;
        const exibido = el
          .closest("[class*=select], [class*=Select]")
          ?.querySelector("[class*=single-value], [class*=singleValue]");
        return ((exibido as HTMLElement | null)?.innerText ?? "").trim();
      }, d.tipo)
      .catch(() => "");
    valores.push({ rotulo: d.rotulo || d.id, valor, ehArquivo: d.tipo === "arquivo" });
  }
  return valores;
}

/**
 * Preenche um elemento a partir só do seletor, inferindo o tipo (usado pelo outbox-segredos, que recebe
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
  const tipo: TipoCampo =
    info.tag === "select" || info.combobox
      ? "select"
      : info.tipo === "radio"
        ? "radio"
        : info.tipo === "checkbox"
          ? "checkbox"
          : info.tipo === "file"
            ? "arquivo"
            : info.tag === "textarea"
              ? "textarea"
              : "texto";
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

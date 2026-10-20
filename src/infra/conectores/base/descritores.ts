// Leitura dos campos de um formulário no DOM: descritores, conversão para o domínio e valores atuais.
import type { Page } from "playwright";
import type { ValorLido } from "#aplicacao/portas/formulario-aberto.ts";
import { classificarFormulario } from "#dominio/respostas/classificar-campo.ts";
import type { Campo, TipoCampo } from "#dominio/respostas/campo.ts";

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
 * Executa no navegador; não atravessa shadow DOM. O script fica inteiro dentro de `page.evaluate`
 * porque o Playwright serializa só a função passada: helpers de fora dela não chegam ao navegador.
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

      const ROTULO_ANEXO_GENERICO =
        /^(upload( a)? file|attach( file)?|choose file|select file|browse|anexar( arquivo)?|escolher arquivo|selecionar arquivo|enviar arquivo)?$/i;

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
        let bruto = rotuloBruto(el);
        // Anexo cujo rótulo é o texto do botão ("UPLOAD FILE"): a pergunta está no contêiner.
        if (tipo === "arquivo" && ROTULO_ANEXO_GENERICO.test(limpar(bruto))) {
          bruto = rotuloDoConteiner(el, [el]) || bruto;
        }
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

/**
 * Valor exibido pelos elementos de um campo. Roda no navegador (serializada pelo Playwright), então não
 * pode usar nada de fora da própria função.
 */
function valorExibido(els: Element[], tipo: TipoCampo): string {
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
        return ((label as HTMLElement | null)?.innerText ?? e.value).replace(/\s+/g, " ").trim();
      })
      .join("; ");
  }
  const el = els[0] as HTMLInputElement | HTMLSelectElement | undefined;
  if (!el) return "";
  if (el instanceof HTMLSelectElement) return el.selectedOptions[0]?.text.trim() ?? "";
  if (el.value) return el.value;
  // react-select: o valor exibido fica no `value-container`, irmão do `input-container` do input.
  // Sobe até o `control` (ou o contêiner externo), não até o primeiro ancestral com "select" na classe.
  const controle = el.closest(
    "[class*=__control], [class*=-control], [class*=__container], [class*=-container]:not([class*=input-container])",
  );
  const exibidos = [
    ...(controle?.querySelectorAll(
      "[class*=single-value], [class*=singleValue], [class*=multi-value__label], [class*=multiValue] > div:first-child",
    ) ?? []),
  ];
  return exibidos
    .map((e) => ((e as HTMLElement).innerText || e.textContent || "").trim())
    .filter(Boolean)
    .join("; ");
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
      .evaluateAll(valorExibido, d.tipo)
      .catch(() => "");
    valores.push({ rotulo: d.rotulo || d.id, valor, ehArquivo: d.tipo === "arquivo" });
  }
  return valores;
}

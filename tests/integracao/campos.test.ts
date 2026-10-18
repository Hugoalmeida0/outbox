// Preenchimento genérico de campos sobre páginas sintéticas que imitam os comportamentos reais do
// Greenhouse: autocomplete que demora a listar opções, países em outro idioma e checkbox controlado.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ErroSemOpcao,
  preencherCampo,
  type DescritorCampo,
} from "#infra/conectores/base/campos.ts";
import { melhorOpcao, nomesDoPais } from "#dominio/respostas/opcoes.ts";
import { LeitorHeadless } from "#infra/navegador/leitor-headless.ts";
import { aquecerNavegador } from "#testes/apoio/harness-conector.ts";

const leitor = new LeitorHeadless({ interceptar: (rota) => rota.abort() });
beforeAll(() => aquecerNavegador(leitor));
afterAll(() => leitor.fechar());

function descritor(extra: Partial<DescritorCampo>): DescritorCampo {
  return {
    id: "x",
    nome: null,
    rotulo: "Campo",
    tipo: "select",
    obrigatorio: true,
    opcoes: [],
    seletor: "#x",
    autocomplete: null,
    combobox: true,
    ...extra,
  };
}

/** Combobox que lista, após `atrasoMs`, as opções que contêm o texto digitado; o clique grava a escolha. */
function paginaCombobox(opcoes: readonly string[], atrasoMs: number): string {
  return `<input id="x" role="combobox"><div id="menu" role="listbox"></div><p id="escolha"></p>
<script>
  const opcoes = ${JSON.stringify(opcoes)};
  const x = document.getElementById("x");
  const menu = document.getElementById("menu");
  x.addEventListener("input", () => {
    menu.innerHTML = "";
    x.setAttribute("aria-expanded", "true");
    const termo = x.value.toLowerCase();
    setTimeout(() => {
      if (x.value.toLowerCase() !== termo || termo === "") return;
      for (const o of opcoes.filter((o) => o.toLowerCase().includes(termo))) {
        const d = document.createElement("div");
        d.setAttribute("role", "option");
        d.textContent = o;
        d.onclick = () => {
          document.getElementById("escolha").textContent = o;
          menu.innerHTML = "";
          x.setAttribute("aria-expanded", "false");
        };
        menu.append(d);
      }
    }, ${String(atrasoMs)});
  });
</script>`;
}

describe("melhorOpcao e nomesDoPais", () => {
  it("casa o país em outro idioma e mantém o casamento direto", () => {
    expect(nomesDoPais("Brasil")).toContain("Brazil");
    expect(nomesDoPais("Cariacica")).toEqual([]);
    expect(melhorOpcao(["Congo - Brazzaville +242", "Brazil +55"], "Brasil")).toBe("Brazil +55");
    expect(melhorOpcao(["Brasil +55", "Gibraltar +350"], "Brasil")).toBe("Brasil +55");
    expect(melhorOpcao(["Sim", "Não"], "Brasil")).toBeNull();
  });
});

describe("preencherCampo", () => {
  it("espera as opções do autocomplete que consulta um serviço (cidade)", async () => {
    await leitor.comPagina(async (pagina) => {
      await pagina.setContent(
        paginaCombobox(
          ["Porto de Cariacica, Espirito Santo, Brazil", "Cariacica, Espirito Santo, Brazil"],
          1400,
        ),
      );
      await preencherCampo(pagina, descritor({}), "Cariacica, ES");
      expect(await pagina.locator("#escolha").innerText()).toBe(
        "Cariacica, Espirito Santo, Brazil",
      );
    });
  });

  it("escolhe o país pelo nome em outro idioma", async () => {
    await leitor.comPagina(async (pagina) => {
      await pagina.setContent(paginaCombobox(["Brazil +55", "Congo - Brazzaville +242"], 0));
      await preencherCampo(pagina, descritor({}), "Brasil");
      expect(await pagina.locator("#escolha").innerText()).toBe("Brazil +55");
    });
  });

  it("campo sem menu de opções aceita o texto digitado (texto livre)", async () => {
    await leitor.comPagina(async (pagina) => {
      await pagina.setContent('<input id="x" role="combobox">');
      await preencherCampo(pagina, descritor({}), "Remoto");
      expect(await pagina.locator("#x").inputValue()).toBe("Remoto");
    });
  });

  it("menu aberto sem opção que case: limpa o campo e lança ErroSemOpcao", async () => {
    await leitor.comPagina(async (pagina) => {
      await pagina.setContent(paginaCombobox(["Sim", "Não"], 0));
      await expect(preencherCampo(pagina, descritor({}), "Talvez")).rejects.toBeInstanceOf(
        ErroSemOpcao,
      );
      expect(await pagina.locator("#x").inputValue()).toBe("");
    });
  });

  it("marca checkbox controlado pelo clique, que sobrevive ao re-render", async () => {
    await leitor.comPagina(async (pagina) => {
      // Como o React: o estado só muda com o clique; o re-render reaplica o estado a todos os inputs.
      await pagina.setContent(`
        <input type="checkbox" name="q[]" id="a"><label for="a">Redes sociais</label>
        <input type="checkbox" name="q[]" id="b"><label for="b">Site de emprego (ex: Indeed, Infojobs, Vagas.com)</label>
        <script>
          const estado = {};
          const inputs = [...document.querySelectorAll("input")];
          for (const i of inputs) i.addEventListener("click", () => { estado[i.id] = i.checked; });
          window.rerender = () => { for (const i of inputs) i.checked = !!estado[i.id]; };
        </script>`);
      await preencherCampo(
        pagina,
        descritor({ tipo: "checkbox", combobox: false, seletor: '[name="q[]"]' }),
        "Site de emprego (ex: Indeed, Infojobs, Vagas.com)",
      );
      await pagina.evaluate(() => {
        (window as unknown as { rerender: () => void }).rerender();
      });
      expect(await pagina.locator("#b").isChecked()).toBe(true);
      expect(await pagina.locator("#a").isChecked()).toBe(false);
    });
  });
});

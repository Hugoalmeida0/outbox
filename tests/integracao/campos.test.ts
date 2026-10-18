// Preenchimento genérico de campos sobre páginas sintéticas que imitam os comportamentos reais do
// Greenhouse: autocomplete que demora a listar opções, países em outro idioma e checkbox controlado.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ErroSemOpcao,
  lerDescritores,
  lerValoresGenerico,
  preencherCampo,
  type DescritorCampo,
} from "#infra/conectores/base/campos.ts";
import { melhorOpcao, nomesDoPais } from "#dominio/respostas/opcoes.ts";
import { preencherLocalizacaoLever } from "#infra/conectores/lever/conector.ts";
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

describe("lerValoresGenerico e lerDescritores", () => {
  it("lê o valor exibido do react-select do Greenhouse (irmão do input)", async () => {
    await leitor.comPagina(async (pagina) => {
      await pagina.setContent(`
        <label for="q1">Qual é a sua pretensão salarial?*</label>
        <div class="select__container"><div class="select__control"><div class="select__value-container">
          <div class="select__single-value">Entre R$8.000,00 - R$9.000,00</div>
          <div class="select__input-container"><input id="q1" role="combobox" class="select__input" value=""></div>
        </div></div></div>
        <label for="q2">Escolaridade</label>
        <div class="select__container"><div class="select__control"><div class="select__value-container">
          <div class="select__placeholder">Select...</div>
          <div class="select__input-container"><input id="q2" role="combobox" class="select__input" value=""></div>
        </div></div></div>`);
      const valores = await lerValoresGenerico(pagina);
      expect(valores.find((v) => v.rotulo.startsWith("Qual é a sua"))?.valor).toBe(
        "Entre R$8.000,00 - R$9.000,00",
      );
      expect(valores.find((v) => v.rotulo === "Escolaridade")?.valor).toBe("");
    });
  });

  it('anexo com rótulo de botão ("UPLOAD FILE") usa a pergunta do contêiner', async () => {
    await leitor.comPagina(async (pagina) => {
      await pagina.setContent(`
        <ul><li class="application-question">
          <div class="application-label"><div class="text">Envie o laudo médico (PcD)</div></div>
          <div class="application-field"><label>UPLOAD FILE<input type="file" name="cards[a][field11]"></label></div>
        </li></ul>`);
      const [anexo] = await lerDescritores(pagina);
      expect(anexo?.tipo).toBe("arquivo");
      expect(anexo?.rotulo).toBe("Envie o laudo médico (PcD)");
    });
  });
});

/**
 * Imita o "Current location" da Lever: busca assíncrona com carregamento, lista que fica na tela até a
 * próxima busca começar e `selectedLocation` gravado só no clique de uma sugestão.
 */
function paginaLocalizacaoLever(cidades: readonly string[]): string {
  return `<input id="location-input" name="location"><input id="selected-location" type="hidden" name="selectedLocation">
<div class="dropdown-container"><div class="dropdown-results"></div>
<div class="dropdown-no-results" style="display:none">No location found</div>
<div class="dropdown-loading-results" style="display:none">Loading</div></div>
<script>
  const cidades = ${JSON.stringify(cidades)};
  const x = document.getElementById("location-input");
  const res = document.querySelector(".dropdown-results");
  const sem = document.querySelector(".dropdown-no-results");
  const carregando = document.querySelector(".dropdown-loading-results");
  let timer;
  x.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      carregando.style.display = "flex";
      setTimeout(() => {
        carregando.style.display = "none";
        const termo = x.value.split(",")[0].trim().toLowerCase();
        const achadas = cidades.filter((c) => c.toLowerCase().startsWith(termo) && termo);
        res.innerHTML = "";
        for (const [i, c] of achadas.entries()) {
          const d = document.createElement("div");
          d.className = "dropdown-location"; d.id = "location-" + i; d.textContent = c;
          d.onclick = () => { x.value = c; document.getElementById("selected-location").value = JSON.stringify({ name: c }); };
          res.append(d);
        }
        sem.style.display = achadas.length ? "none" : "flex";
      }, 400);
    }, 250);
  });
</script>`;
}

describe("preencherLocalizacaoLever", () => {
  it("escolhe a sugestão da cidade no estado certo", async () => {
    await leitor.comPagina(async (pagina) => {
      await pagina.setContent(
        paginaLocalizacaoLever(["Cariacica, Espírito Santo, BRA", "Vitória, Espírito Santo, BRA"]),
      );
      await preencherLocalizacaoLever(pagina, "Cariacica, Espírito Santo, Brasil");
      expect(await pagina.locator("#location-input").inputValue()).toBe(
        "Cariacica, Espírito Santo, BRA",
      );
    });
  });

  it("sem a cidade, cai para a capital do estado, ignorando a lista da consulta anterior", async () => {
    await leitor.comPagina(async (pagina) => {
      await pagina.setContent(
        paginaLocalizacaoLever([
          "Vila Velha Errada, Bahia, BRA",
          "Vitória, Vitória de Santo Antão, Pernambuco, BRA",
          "Vitória, Espírito Santo, BRA",
        ]),
      );
      await preencherLocalizacaoLever(pagina, "Vila Velha Errada, Espírito Santo, Brasil");
      expect(await pagina.locator("#location-input").inputValue()).toBe(
        "Vitória, Espírito Santo, BRA",
      );
    });
  });

  it("sem nenhuma sugestão, limpa o campo e lança ErroSemOpcao", async () => {
    await leitor.comPagina(async (pagina) => {
      await pagina.setContent(paginaLocalizacaoLever([]));
      await expect(
        preencherLocalizacaoLever(pagina, "Xyz, Espírito Santo, Brasil"),
      ).rejects.toBeInstanceOf(ErroSemOpcao);
      expect(await pagina.locator("#location-input").inputValue()).toBe("");
    });
  });
});

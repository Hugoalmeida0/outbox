import { z } from "zod";
import type { DefinicaoConector } from "../base/conector-formulario.ts";
import { comSufixo, dataCurta, nomeDoSlug } from "../base/util.ts";

const esquemaQuadroAshby = z.object({
  jobs: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      location: z.string().optional(),
      publishedAt: z.string().optional(),
      employmentType: z.string().optional(),
      descriptionPlain: z.string().optional(),
    }),
  ),
});

const SIM = /^(sim|yes|true)$/i;

/**
 * Ashby (jobs.ashbyhq.com). Estrutura observada em 2026-10-10: SPA em /application, entradas
 * `.ashby-application-form-field-entry` com `label[for]`, perguntas sim/não como botões
 * `[data-option=yes|no]` e um upload de autopreenchimento sem id (ignorado).
 */
export const definicaoAshby: DefinicaoConector = {
  motor: "ashby",
  versao: "1.0.0",
  urlFormulario: (url) =>
    url.replace(/\/+$/, "").endsWith("/application") ? url : comSufixo(url, "application"),
  ignorar: ["input[type='file']:not([id])", ".ashby-application-form-input-yesno input"],
  seletorEnviar: ".ashby-application-form-submit-button, button:has-text('Submit Application')",
  confirmacao: {
    texto:
      /application (was |has been )?(submitted|received)|thanks for applying|thank you for (applying|your application)/i,
  },
  async lerExtras(pagina) {
    return pagina.evaluate(() =>
      [...document.querySelectorAll(".ashby-application-form-field-entry")]
        .filter((entrada) => entrada.querySelector(".ashby-application-form-input-yesno"))
        .map((entrada) => {
          const caminho = entrada.getAttribute("data-field-path") ?? "";
          const label = entrada.querySelector("label");
          const texto = ((label as HTMLElement | null)?.innerText ?? "")
            .replace(/\s+/g, " ")
            .trim();
          return {
            id: caminho,
            nome: caminho,
            rotulo: texto.replace(/[*✱]/g, "").trim(),
            tipo: "radio" as const,
            obrigatorio: /required/i.test(label?.className ?? "") || /[*✱]/.test(texto),
            opcoes: ["Yes", "No"],
            seletor: `[data-field-path="${caminho}"]`,
            autocomplete: null,
            combobox: false,
          };
        }),
    );
  },
  async preencherEspecial(pagina, campo, valor) {
    if (!campo.seletor.startsWith("[data-field-path=")) return false;
    const opcao = SIM.test(valor.trim()) ? "yes" : "no";
    await pagina.locator(`${campo.seletor} button[data-option='${opcao}']`).first().click();
    return true;
  },
  async extrairVaga(url, sinal, deps) {
    const m = /^\/([^/]+)\/([0-9a-f-]{36})/i.exec(new URL(url).pathname);
    if (!m) return null;
    const org = m[1] ?? "";
    const quadro = await deps.http.obterJson(
      `https://api.ashbyhq.com/posting-api/job-board/${org}`,
      esquemaQuadroAshby,
      sinal,
    );
    const vaga = quadro.jobs.find((j) => j.id === m[2]);
    if (!vaga) return null;
    const publicada = dataCurta(vaga.publishedAt);
    return {
      empresa: nomeDoSlug(org),
      cargo: vaga.title.trim(),
      descricao: vaga.descriptionPlain?.trim() || vaga.title,
      ...(vaga.location ? { localidade: vaga.location } : {}),
      ...(publicada ? { publicadaEm: publicada } : {}),
      ...(vaga.employmentType ? { regimeTexto: vaga.employmentType } : {}),
    };
  },
};

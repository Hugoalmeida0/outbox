import type { DefinicaoConector } from "../base/conector-formulario.ts";
import { obterVagaGreenhouse, paraCampos, paraVagaExtraida } from "./api.ts";

/**
 * Greenhouse (job-boards.greenhouse.io, inclusive EU e carreiras com Greenhouse embutido).
 * Estrutura observada em 2026-10-10: formulário na página da vaga, inputs com id igual ao nome do campo
 * da API, anexos em #resume/#cover_letter, seleções em comboboxes e reCAPTCHA invisível no envio.
 */
export const definicaoGreenhouse: DefinicaoConector = {
  motor: "greenhouse",
  versao: "1.0.0",
  urlFormulario: (url) => url,
  ignorar: ["[id^='iti-']"],
  seletorEnviar: "button[type='submit'], input[type='submit']",
  confirmacao: {
    texto:
      /thank you for applying|application (has been )?(submitted|received)|obrigad[oa] por se candidatar|candidatura (foi )?(enviada|recebida)/i,
    url: /\/confirmation/,
  },
  async extrairVaga(url, sinal, deps) {
    const vaga = await obterVagaGreenhouse(url, deps.http, sinal);
    const board = /^\/([^/]+)\//.exec(new URL(url).pathname)?.[1] ?? "";
    return vaga ? paraVagaExtraida(vaga, board) : null;
  },
  async lerCamposApi(url, sinal, deps) {
    const vaga = await obterVagaGreenhouse(url, deps.http, sinal);
    return vaga ? paraCampos(vaga) : null;
  },
};

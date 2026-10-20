import type { DefinicaoConector } from "#infra/conectores/base/conector-formulario.ts";

const CAMPO_VISIVEL = "input[name='candidate[email]'], input[name='candidate[first_name]']";
const BOTAO_CANDIDATAR =
  /apply for this job|candidate-se( para esta vaga)?|candidatar-se|quero me candidatar/i;

/**
 * Teamtailor (*.teamtailor.com). Estrutura observada em 2026-10-10: o botão "Apply for this job" abre um
 * modal com campos `candidate[...]`, consentimentos e envio `input[type=submit][name=commit]`.
 */
export const definicaoTeamtailor: DefinicaoConector = {
  motor: "teamtailor",
  versao: "1.0.0",
  urlFormulario: (url) => url,
  async abrir(pagina) {
    if (
      await pagina
        .locator(CAMPO_VISIVEL)
        .first()
        .isVisible()
        .catch(() => false)
    )
      return;
    await pagina
      .getByRole("button", { name: BOTAO_CANDIDATAR })
      .or(pagina.getByRole("link", { name: BOTAO_CANDIDATAR }))
      .first()
      .click();
    await pagina.locator(CAMPO_VISIVEL).first().waitFor({ state: "visible", timeout: 15_000 });
  },
  seletorEnviar: "form:has(input[name^='candidate[']) [type='submit']",
  confirmacao: {
    texto:
      /thank you for (your application|applying)|application (has been )?(sent|received)|obrigad[oa] pela (sua )?candidatura|recebemos sua candidatura/i,
  },
};

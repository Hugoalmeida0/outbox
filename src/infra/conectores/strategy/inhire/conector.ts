import type { DefinicaoConector } from "#infra/conectores/base/conector-formulario.ts";

const BOTAO_CANDIDATAR = /candidatar-se|candidatar|quero me candidatar|aplicar|apply/i;

/**
 * InHire (*.inhire.app). SPA por empresa; quando a página pede conta, o login é tratado como conta por
 * tenant (credencial gerada no cofre e confirmação pelo usuário). Fluxo real não verificado: o spike
 * exige uma candidatura real (ver docs/spikes/inhire.md).
 */
export const definicaoInhire: DefinicaoConector = {
  motor: "inhire",
  versao: "1.0.0",
  urlFormulario: (url) => url,
  autenticacao: "tenant",
  async abrir(pagina) {
    if (
      await pagina
        .locator("form input, form textarea")
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    )
      return;
    const botao = pagina
      .getByRole("button", { name: BOTAO_CANDIDATAR })
      .or(pagina.getByRole("link", { name: BOTAO_CANDIDATAR }))
      .first();
    if (await botao.isVisible({ timeout: 3000 }).catch(() => false)) {
      await botao.click();
      await pagina.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    }
  },
  etapas: { proximo: /continuar|pr[oó]xim[oa]|avan[cç]ar|next/i, maxEtapas: 4 },
  seletorEnviar:
    "button[type='submit']:has-text('Enviar'), button[type='submit']:has-text('Candidatar'), button:has-text('Enviar candidatura')",
  confirmacao: {
    texto:
      /candidatura (enviada|realizada|recebida)|obrigad[oa] por se candidatar|inscri[cç][aã]o (realizada|enviada)/i,
  },
};

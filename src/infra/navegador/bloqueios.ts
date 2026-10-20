import type { Page } from "playwright";

export type Bloqueio = "captcha" | "verificacao_email";

const VERIFICACAO_EMAIL =
  /verifique seu e-?mail|verify your email|c[oó]digo de verifica[cç][aã]o|verification code/i;

// Widgets invisíveis por definição não pedem nada ao usuário: o selo "protegido por reCAPTCHA"
// (`size=invisible`, visível no canto mas sem o que marcar) e o checkbox invisível do hCaptcha. Se o
// provedor decidir desafiar, o desafio vem em outro iframe (`bframe` ou `frame=challenge`), que só fica
// visível nessa hora.
const IFRAMES_CAPTCHA = [
  'iframe[src*="recaptcha"]:not([src*="size=invisible"])',
  'iframe[src*="hcaptcha"]:not([src*="checkbox-invisible"])',
  'iframe[src*="challenges.cloudflare.com"]',
  'iframe[src*="captcha-delivery.com"]',
].join(", ");

/**
 * Detecta CAPTCHA visível que pede ação ou pedido de verificação de e-mail. O Camaleão nunca tenta
 * resolvê-los: a detecção só serve para pausar e chamar o usuário.
 */
export async function detectarBloqueio(pagina: Page): Promise<Bloqueio | null> {
  const iframes = pagina.locator(IFRAMES_CAPTCHA);
  const total = await iframes.count();
  for (let i = 0; i < total; i++) {
    if (
      await iframes
        .nth(i)
        .isVisible()
        .catch(() => false)
    )
      return "captcha";
  }
  const texto = await pagina
    .locator("body")
    .innerText({ timeout: 2000 })
    .catch(() => "");
  return VERIFICACAO_EMAIL.test(texto) ? "verificacao_email" : null;
}

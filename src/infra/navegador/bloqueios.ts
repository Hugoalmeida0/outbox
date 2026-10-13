import type { Page } from "playwright";

export type Bloqueio = "captcha" | "verificacao_email";

const VERIFICACAO_EMAIL =
  /verifique seu e-?mail|verify your email|c[oó]digo de verifica[cç][aã]o|verification code/i;

/**
 * Detecta CAPTCHA visível ou pedido de verificação de e-mail. O Outbox nunca tenta resolvê-los: a
 * detecção só serve para pausar e chamar o usuário.
 */
export async function detectarBloqueio(pagina: Page): Promise<Bloqueio | null> {
  const iframes = pagina.locator(
    'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="challenges.cloudflare.com"], iframe[src*="captcha-delivery.com"]',
  );
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

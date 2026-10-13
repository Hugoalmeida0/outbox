import type { Page } from "playwright";
import type { CofreCredenciais } from "#infra/credenciais/cofre.ts";

const RECUSAR_COOKIES =
  /^(deny|decline all( non-necessary cookies)?|reject all( cookies)?|recusar( todos| cookies)?|rejeitar( todos)?|only necessary|apenas necess[aá]rios)$/i;
const ACEITAR_COOKIES =
  /^(accept all( cookies)?|aceitar( todos| cookies)?|accept|ok|entendi|concordo)$/i;

/** Fecha banners de cookies (prefere recusar os não necessários) para não bloquear cliques. */
export async function dispensarCookies(pagina: Page): Promise<void> {
  for (const nome of [RECUSAR_COOKIES, ACEITAR_COOKIES]) {
    const botao = pagina.getByRole("button", { name: nome }).first();
    if (await botao.isVisible({ timeout: 300 }).catch(() => false)) {
      await botao.click({ timeout: 2000 }).catch(() => undefined);
      return;
    }
  }
}

/** Abre a URL e espera a rede acalmar (sem falhar se ela nunca acalmar). */
export async function navegar(pagina: Page, url: string): Promise<void> {
  await pagina.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await pagina.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

export type ModoAutenticacao = "global" | "tenant";

/**
 * Login assistido. Conta global (Gupy): pausa para o usuário entrar. Conta por tenant (Workday, InHire...):
 * preenche e-mail e a senha gerada do cofre e pausa para o usuário concluir (e verificar o e-mail).
 */
export async function tratarAutenticacao(
  pagina: Page,
  modo: ModoAutenticacao,
  aguardarUsuario: (mensagem: string) => Promise<void>,
  cofre: CofreCredenciais | undefined,
): Promise<void> {
  const senha = pagina.locator("input[type=password]").first();
  if (!(await senha.isVisible({ timeout: 500 }).catch(() => false))) return;
  if (modo === "tenant" && cofre) {
    const credencial = cofre.obterOuCriar(new URL(pagina.url()).hostname);
    const email = pagina
      .locator('input[type=email], input[autocomplete=username], input[name*="email" i]')
      .first();
    if (await email.isVisible({ timeout: 500 }).catch(() => false))
      await email.fill(credencial.email);
    for (const campo of await pagina.locator("input[type=password]").all()) {
      if (await campo.isVisible().catch(() => false)) await campo.fill(credencial.senha);
    }
    await aguardarUsuario(
      credencial.recemCriada
        ? "Preenchi o e-mail e uma senha nova para este portal (guardada em dados/credenciais.json). Conclua o cadastro no navegador, inclusive a verificação de e-mail, e pressione Enter"
        : "Preenchi o e-mail e a senha deste portal. Conclua o login no navegador e pressione Enter",
    );
  } else {
    await aguardarUsuario("Faça login no navegador do Outbox e pressione Enter");
  }
  await pagina.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

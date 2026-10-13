import type { Page } from "playwright";
import { ErroAgregadorExigeLogin, ErroResolucao } from "#aplicacao/portas/erros.ts";
import { AGREGADORES, detectarMotor, ehMotorConhecido } from "#dominio/vagas/motores.ts";

/** Nome acessível do botão que leva ao site da empresa. */
export const BOTAO_EXTERNO =
  /candidatar-se no site|candidatar no site da empresa|apply on company( website| site)?|aplicar no site|candidatura no site da empresa/i;

/** Nome acessível do botão de candidatura simplificada dentro do agregador. */
export const BOTAO_SIMPLIFICADO =
  /candidatura simplificada|easy apply|indeed apply|candidatura f[aá]cil|candidatar-se facilmente|aplicar agora no indeed|apply now on indeed/i;

/** Sinais de que a página exige login para mostrar a vaga. */
export const EXIGE_LOGIN =
  /authwall|\/login|\/signin|entre para ver|sign in to (view|see)|fa[cç]a login para/i;

/** Parâmetros de redirecionamento usados pelos agregadores para links externos. */
const PARAMETROS_REDIRECIONAMENTO = ["url", "u", "dest", "destination", "target"];

export type DesfechoAgregador =
  { readonly tipo: "externo"; readonly url: string } | { readonly tipo: "easy_apply" };

function saiuDoAgregador(url: string): boolean {
  try {
    const motor = detectarMotor(new URL(url));
    return !(ehMotorConhecido(motor) && AGREGADORES.includes(motor));
  } catch {
    return false;
  }
}

/** Extrai o destino real de um link de redirecionamento do agregador, se houver. */
export function destinoDeRedirecionamento(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    if (saiuDoAgregador(url.href)) return url.href;
    for (const nome of PARAMETROS_REDIRECIONAMENTO) {
      const destino = url.searchParams.get(nome);
      if (destino && /^https?:\/\//.test(destino) && saiuDoAgregador(destino)) return destino;
    }
  } catch {
    // href inválido: ignora.
  }
  return null;
}

/**
 * Lê a vaga no agregador (sessão do navegador do Outbox, só leitura) e descobre para onde a candidatura
 * leva. Não preenche nada no agregador.
 */
export async function resolverNoAgregador(
  pagina: Page,
  url: string,
  timeoutMs = 20_000,
): Promise<DesfechoAgregador> {
  await pagina.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  await pagina.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);

  const externo = pagina
    .getByRole("link", { name: BOTAO_EXTERNO })
    .or(pagina.getByRole("button", { name: BOTAO_EXTERNO }))
    .first();
  const simplificado = pagina
    .getByRole("button", { name: BOTAO_SIMPLIFICADO })
    .or(pagina.getByRole("link", { name: BOTAO_SIMPLIFICADO }))
    .first();

  if (await externo.isVisible().catch(() => false)) {
    const href = await externo.getAttribute("href").catch(() => null);
    const direto = href ? destinoDeRedirecionamento(href, pagina.url()) : null;
    if (direto) return { tipo: "externo", url: direto };
    const contexto = pagina.context();
    const novaAba = contexto.waitForEvent("page", { timeout: timeoutMs }).catch(() => null);
    await externo.click({ timeout: timeoutMs });
    const navegouNaMesmaAba = pagina
      .waitForURL((u) => saiuDoAgregador(u.href), { timeout: timeoutMs })
      .then(() => null)
      .catch(() => null);
    const aba = (await Promise.race([novaAba, navegouNaMesmaAba])) ?? null;
    const alvo = aba ?? pagina;
    await alvo
      .waitForURL((u) => saiuDoAgregador(u.href), { timeout: timeoutMs })
      .catch(() => undefined);
    const final = alvo.url();
    if (aba) await aba.close().catch(() => undefined);
    if (saiuDoAgregador(final)) return { tipo: "externo", url: final };
    throw new ErroResolucao(`o link externo de ${url} não saiu do agregador`);
  }
  if (await simplificado.isVisible().catch(() => false)) return { tipo: "easy_apply" };

  const corpo = await pagina
    .locator("body")
    .innerText({ timeout: 3000 })
    .catch(() => "");
  if (EXIGE_LOGIN.test(pagina.url()) || EXIGE_LOGIN.test(corpo))
    throw new ErroAgregadorExigeLogin();
  throw new ErroResolucao(`botão de candidatura não encontrado em ${url}`);
}

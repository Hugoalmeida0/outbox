import type { Page } from "playwright";
import { ErroFalhaConector } from "#aplicacao/portas/erros.ts";
import type { FormularioAberto } from "#aplicacao/portas/formulario-aberto.ts";
import { detectarBloqueio } from "#infra/navegador/bloqueios.ts";

export interface ContextoPasso {
  readonly pagina: Page;
  readonly formulario: FormularioAberto;
  aguardarUsuario(mensagem: string): Promise<void>;
}

/** Pausa para o usuário enquanto houver CAPTCHA ou verificação de e-mail visível (nunca tenta resolver). */
export async function esperarDesbloqueio(ctx: ContextoPasso): Promise<void> {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const bloqueio = await detectarBloqueio(ctx.pagina).catch(() => null);
    if (bloqueio === null) return;
    const motivo = bloqueio === "captcha" ? "um CAPTCHA" : "uma verificação de e-mail";
    await ctx.aguardarUsuario(`A página pede ${motivo}. Resolva no navegador e pressione Enter`);
  }
}

/**
 * Executa um passo do conector: antes, pausa em bloqueios; qualquer falha vira `ErroFalhaConector` com o
 * passo e o seletor, que alimentam o registro em `falhas/` e o contexto do agente.
 */
export async function passo<T>(
  nome: string,
  seletor: string | null,
  ctx: ContextoPasso,
  fn: () => Promise<T>,
): Promise<T> {
  await esperarDesbloqueio(ctx);
  try {
    return await fn();
  } catch (erro) {
    if (erro instanceof ErroFalhaConector) throw erro;
    throw new ErroFalhaConector(nome, seletor, ctx.formulario, { cause: erro });
  }
}

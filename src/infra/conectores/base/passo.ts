import type { Page } from "playwright";
import { ErroFalhaConector } from "#aplicacao/portas/erros.ts";
import type { FormularioAberto } from "#aplicacao/portas/formulario-aberto.ts";
import { detectarBloqueio, type Bloqueio } from "#infra/navegador/bloqueios.ts";

export interface ContextoPasso {
  readonly pagina: Page;
  readonly formulario: FormularioAberto;
  aguardarUsuario(mensagem: string): Promise<void>;
  /** Bloqueios que persistiram depois de duas confirmações do usuário: não pausam mais neste formulário. */
  readonly dispensados: Set<Bloqueio>;
  /** Campos que ficaram vazios (sem resposta ou com falha tolerada), para avisar antes da revisão. */
  readonly naoPreenchidos: string[];
}

const DESCRICOES: Readonly<Record<Bloqueio, string>> = {
  captcha: "um CAPTCHA",
  verificacao_email: "uma verificação de e-mail",
};

async function bloqueioPendente(ctx: ContextoPasso): Promise<Bloqueio | null> {
  const bloqueio = await detectarBloqueio(ctx.pagina).catch(() => null);
  return bloqueio !== null && !ctx.dispensados.has(bloqueio) ? bloqueio : null;
}

/**
 * Pausa para o usuário diante de CAPTCHA ou verificação de e-mail visível (nunca tenta resolver). Se o
 * bloqueio continua depois do Enter, pergunta só mais uma vez: persistindo, é falso positivo (o usuário
 * está vendo a página) e fica dispensado, para não travar cada passo do formulário. O envio continua
 * dependendo da revisão do usuário.
 */
export async function esperarDesbloqueio(ctx: ContextoPasso): Promise<void> {
  const bloqueio = await bloqueioPendente(ctx);
  if (bloqueio === null) return;
  const descricao = DESCRICOES[bloqueio];
  await ctx.aguardarUsuario(`A página pede ${descricao}. Resolva no navegador e pressione Enter`);
  if ((await bloqueioPendente(ctx)) !== bloqueio) return;
  await ctx.aguardarUsuario(
    `Ainda detecto ${descricao}. Se já resolveu ou não há nada para fazer, pressione Enter para seguir`,
  );
  if ((await bloqueioPendente(ctx)) === bloqueio) ctx.dispensados.add(bloqueio);
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

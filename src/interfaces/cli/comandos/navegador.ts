import { relative } from "node:path";
import type { ContextoComando } from "../contexto.ts";

/** `outbox navegador`: abre o navegador do Outbox (perfil persistente) para os logins. */
export async function comandoNavegador(ctx: ContextoComando): Promise<number> {
  const container = ctx.container();
  await container.casos.abrirNavegador();
  const perfil = relative(container.caminhos.raiz, container.caminhos.navegadorDir);
  ctx.saida.escrever(
    `Navegador do Outbox aberto (perfil em ${perfil}). Faça os logins (LinkedIn, Gupy, ...) e deixe-o aberto ` +
      "ou feche quando terminar: as sessões ficam salvas.",
  );
  return 0;
}

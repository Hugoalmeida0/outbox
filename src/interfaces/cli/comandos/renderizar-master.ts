import { relative } from "node:path";
import { cores } from "../apresentacao/cores.ts";
import type { ContextoComando } from "../contexto.ts";

/** `outbox renderizar-master`: gera o PDF genérico do master em `dados/master/`. */
export async function comandoRenderizarMaster(ctx: ContextoComando): Promise<number> {
  const container = ctx.container();
  const { pdf, paginas } = await container.casos.renderizarMaster(ctx.sinal);
  ctx.saida.escrever(
    cores.verde(
      `PDF do master: ${relative(container.caminhos.raiz, pdf)} (${String(paginas)} página(s))`,
    ),
  );
  if (paginas > 2)
    ctx.saida.escrever(cores.amarelo("O PDF passou de 2 páginas: considere enxugar o master."));
  return 0;
}

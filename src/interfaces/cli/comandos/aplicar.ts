import { z } from "zod";
import type { Interacao } from "#aplicacao/portas/interacao.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { formatarResumoAplicacao } from "../apresentacao/resumo-revisao.ts";
import { validarEntrada, type ContextoComando } from "../contexto.ts";
import { InteracaoTerminal } from "../interacao-terminal.ts";

const esquema = z.object({
  simular: z.boolean().default(false),
  id: z.coerce
    .number({ error: "deve ser um número" })
    .int("deve ser inteiro")
    .positive("deve ser positivo")
    .optional(),
});

/** `camaleao aplicar [--simular] [--id <id>]`. Nunca envia sem a escolha explícita do usuário. */
export async function comandoAplicar(
  ctx: ContextoComando,
  bruto: unknown,
  interacao: Interacao = new InteracaoTerminal({
    saida: ctx.saida,
    sinal: ctx.sinal,
    cancelar: ctx.cancelar,
  }),
): Promise<number> {
  const { simular, id } = validarEntrada(esquema, bruto);
  const container = ctx.container();
  const trava = container.adquirirTrava("aplicar");
  try {
    if (simular) ctx.saida.escrever("Modo simulação: preenche e revisa, mas nada é enviado.");
    const resumo = await container.casos.aplicarVagas(
      { simular, ...(id !== undefined ? { id: id as IdVaga } : {}) },
      interacao,
      ctx.sinal,
    );
    ctx.saida.escrever(formatarResumoAplicacao(resumo));
    return resumo.interrompido === "cancelado" ? 130 : 0;
  } finally {
    trava.liberar();
  }
}

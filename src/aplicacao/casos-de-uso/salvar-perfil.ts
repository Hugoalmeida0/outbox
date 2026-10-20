import { ErroEntradaInvalida } from "#dominio/compartilhado/erros.ts";
import { problemasDoZod } from "#dominio/compartilhado/validar.ts";
import { esquemaPerfil, type Perfil } from "#dominio/respostas/perfil.ts";
import type { ArmazemCurriculo } from "../portas/armazem-curriculo.ts";

export interface DepsSalvarPerfil {
  readonly curriculo: Pick<ArmazemCurriculo, "gravarPerfil">;
}

/**
 * Valida o perfil vindo do formulário e grava `curriculo/perfil.yaml`. Inválido, lança
 * `ErroEntradaInvalida` com um problema por campo; nada é gravado.
 */
export function salvarPerfil(deps: DepsSalvarPerfil, entrada: unknown): Perfil {
  const resultado = esquemaPerfil.safeParse(entrada);
  if (!resultado.success) {
    const problemas = problemasDoZod(resultado.error);
    throw new ErroEntradaInvalida(
      `perfil inválido: ${String(problemas.length)} campo(s) para revisar`,
      problemas,
      { cause: resultado.error },
    );
  }
  deps.curriculo.gravarPerfil(resultado.data);
  return resultado.data;
}

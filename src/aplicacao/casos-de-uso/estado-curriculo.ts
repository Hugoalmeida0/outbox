import type { ProblemaCampo } from "#dominio/compartilhado/validar.ts";
import type { ArmazemCurriculo } from "../portas/armazem-curriculo.ts";
import { obterPerfil } from "./obter-perfil.ts";

export interface EstadoCurriculo {
  readonly masterExiste: boolean;
  /** Última modificação de `curriculo/master.yaml` (ISO), ou `null` sem master. */
  readonly masterAtualizadoEm: string | null;
  readonly perfilValido: boolean;
  readonly errosPerfil: readonly ProblemaCampo[];
}

/** O que falta para começar (master e perfil), usado pelo onboarding do site. */
export function obterEstadoCurriculo(deps: {
  readonly curriculo: Pick<ArmazemCurriculo, "existeMaster" | "atualizadoEm" | "lerPerfilBruto">;
}): EstadoCurriculo {
  const masterExiste = deps.curriculo.existeMaster();
  const { perfil, erros } = obterPerfil(deps);
  return {
    masterExiste,
    masterAtualizadoEm: masterExiste ? deps.curriculo.atualizadoEm() : null,
    perfilValido: perfil !== null,
    errosPerfil: erros,
  };
}

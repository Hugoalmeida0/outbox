import type { RegistroFalha } from "#dominio/falhas/registro-falha.ts";

/** Registros versionados em `falhas/`. Síncrona. Recebe só HTML já sanitizado. */
export interface RegistroFalhas {
  /** Grava o registro e o snapshot; devolve o identificador do registro. */
  registrar(registro: Omit<RegistroFalha, "snapshot">, htmlSanitizado: string): string;
  atualizar(
    idRegistro: string,
    campos: Partial<Pick<RegistroFalha, "resultadoAgente" | "passosAgente">>,
  ): void;
  listarAbertas(): RegistroFalha[];
}

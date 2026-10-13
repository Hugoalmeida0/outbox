import { mkdirSync, openSync, readFileSync, rmSync, writeSync, closeSync } from "node:fs";
import { join } from "node:path";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";

export interface Trava {
  liberar(): void;
}

function processoVivo(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (erro) {
    return (erro as NodeJS.ErrnoException).code === "EPERM";
  }
}

function tentarCriar(caminho: string): boolean {
  try {
    const fd = openSync(caminho, "wx");
    writeSync(fd, String(process.pid));
    closeSync(fd);
    return true;
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw erro;
  }
}

/**
 * Garante uma única execução simultânea de um comando (ADR-016). Trava com PID morto é removida;
 * com PID vivo, lança `ErroUsuario`.
 */
export function adquirirTrava(pastaTravas: string, nome: string): Trava {
  mkdirSync(pastaTravas, { recursive: true });
  const caminho = join(pastaTravas, `${nome}.lock`);
  if (!tentarCriar(caminho)) {
    const pid = Number(readFileSync(caminho, "utf8").trim());
    if (Number.isInteger(pid) && pid > 0 && pid !== process.pid && processoVivo(pid)) {
      throw new ErroUsuario(`já existe um \`${nome}\` em execução (pid ${pid})`);
    }
    rmSync(caminho, { force: true });
    if (!tentarCriar(caminho)) {
      throw new ErroUsuario(`não foi possível adquirir a trava de \`${nome}\``);
    }
  }
  let liberada = false;
  const liberar = (): void => {
    if (liberada) return;
    liberada = true;
    try {
      if (readFileSync(caminho, "utf8").trim() === String(process.pid))
        rmSync(caminho, { force: true });
    } catch {
      // A trava já não existe: nada a liberar.
    }
    process.off("exit", liberar);
  };
  process.on("exit", liberar);
  return { liberar };
}

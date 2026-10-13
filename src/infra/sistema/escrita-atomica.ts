import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Grava num arquivo temporário e renomeia: uma interrupção nunca deixa arquivo pela metade (ADR-016).
 */
export function escreverAtomico(caminho: string, conteudo: string | Uint8Array): void {
  mkdirSync(dirname(caminho), { recursive: true });
  const temporario = `${caminho}.tmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(temporario, conteudo);
    renameSync(temporario, caminho);
  } catch (erro) {
    rmSync(temporario, { force: true });
    throw erro;
  }
}

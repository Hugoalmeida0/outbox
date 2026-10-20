import { existsSync, renameSync } from "node:fs";
import { join } from "node:path";

/** Nome do banco antes da renomeação para Camaleão (ADR-0026). */
const NOME_LEGADO = "outbox.db";
const NOME_ATUAL = "camaleao.db";

/**
 * Move `dados/outbox.db` (e o `-wal`/`-shm`) para `dados/camaleao.db` antes da primeira conexão. Os
 * arquivos auxiliares vão primeiro: interrompido no meio, a próxima execução termina a troca. Com os dois
 * bancos presentes, usa o atual e avisa que o legado foi ignorado.
 */
export function migrarBancoLegado(pastaDados: string, avisar: (mensagem: string) => void): void {
  const legado = join(pastaDados, NOME_LEGADO);
  const atual = join(pastaDados, NOME_ATUAL);
  if (!existsSync(legado)) return;
  if (existsSync(atual)) {
    avisar(`dados/${NOME_LEGADO} ignorado: dados/${NOME_ATUAL} já existe`);
    return;
  }
  for (const sufixo of ["-wal", "-shm", ""]) {
    if (existsSync(legado + sufixo)) renameSync(legado + sufixo, atual + sufixo);
  }
  avisar(`banco renomeado de dados/${NOME_LEGADO} para dados/${NOME_ATUAL}`);
}

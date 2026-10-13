import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { ErroInfra } from "#aplicacao/portas/erros.ts";

export function versaoAtual(db: DatabaseSync): number {
  const linha = db.prepare("PRAGMA user_version").get() as { user_version: number } | undefined;
  return linha?.user_version ?? 0;
}

/**
 * Aplica, em ordem e cada uma numa transação, as migrações `NNNN-*.sql` com número maior que
 * `PRAGMA user_version`. Uma migração com erro faz rollback e não avança a versão (ADR-008).
 */
export function migrar(db: DatabaseSync, pasta: string): number {
  const migracoes = readdirSync(pasta)
    .map((arquivo) => ({ arquivo, numero: Number(/^(\d{4})-.+\.sql$/.exec(arquivo)?.[1]) }))
    .filter((m) => Number.isInteger(m.numero) && m.numero > 0)
    .sort((a, b) => a.numero - b.numero);
  let versao = versaoAtual(db);
  for (const { arquivo, numero } of migracoes) {
    if (numero <= versao) continue;
    const sql = readFileSync(join(pasta, arquivo), "utf8");
    db.exec("BEGIN");
    try {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${String(numero)}`);
      db.exec("COMMIT");
      versao = numero;
    } catch (erro) {
      db.exec("ROLLBACK");
      throw new ErroInfra(`falha na migração ${arquivo}: ${(erro as Error).message}`, {
        cause: erro,
      });
    }
  }
  return versao;
}

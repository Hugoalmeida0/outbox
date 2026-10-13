import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

/** Abre o banco com WAL, espera em lock e chaves estrangeiras ativas. Aceita `":memory:"`. */
export function abrirConexao(
  caminho: string,
  opcoes: { readonly esperaLockMs?: number } = {},
): DatabaseSync {
  if (caminho !== ":memory:") mkdirSync(dirname(caminho), { recursive: true });
  const db = new DatabaseSync(caminho);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`PRAGMA busy_timeout = ${String(opcoes.esperaLockMs ?? 5000)}`);
  db.exec("PRAGMA foreign_keys = ON");
  return db;
}

// Repositório real (SQLite :memory:) com migrações aplicadas: mais fiel que um fake (arquitetura.md §11.1).
import { fileURLToPath } from "node:url";
import type { Relogio } from "#aplicacao/portas/relogio.ts";
import { abrirConexao } from "#infra/banco/conexao.ts";
import { migrar } from "#infra/banco/migrador.ts";
import { RepositorioVagasSqlite } from "#infra/banco/repositorio-vagas-sqlite.ts";
import { RelogioFixo } from "./fakes/basicos.ts";

export const PASTA_MIGRACOES = fileURLToPath(
  new URL("../../src/infra/banco/migracoes", import.meta.url),
);

export function criarRepositorioMemoria(
  relogio: Relogio = new RelogioFixo(),
): RepositorioVagasSqlite {
  const db = abrirConexao(":memory:");
  migrar(db, PASTA_MIGRACOES);
  return new RepositorioVagasSqlite(db, relogio);
}

import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import { esquemaConfig, type Config } from "./esquema-config.ts";

/** Lê `config.yaml` (opcional), aplica os padrões do schema e valida. */
export function carregarConfig(caminho: string): Config {
  let bruto: unknown = {};
  if (existsSync(caminho)) {
    try {
      bruto = parse(readFileSync(caminho, "utf8")) ?? {};
    } catch (erro) {
      throw new ErroUsuario(`config.yaml inválido: ${(erro as Error).message}`, { cause: erro });
    }
  }
  const resultado = esquemaConfig.safeParse(bruto);
  if (!resultado.success) {
    const problema = resultado.error.issues[0];
    const chave = (problema?.path ?? []).map(String).join(".");
    throw new ErroUsuario(
      `config.yaml: ${chave || "raiz"}: ${problema?.message ?? "valor inválido"}`,
      {
        cause: resultado.error,
      },
    );
  }
  return resultado.data;
}

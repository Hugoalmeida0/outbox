import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { RegistroFalhas } from "#aplicacao/portas/registro-falhas.ts";
import { esquemaRegistroFalha, type RegistroFalha } from "#dominio/falhas/registro-falha.ts";
import { escreverAtomico } from "../sistema/escrita-atomica.ts";

function nomeSeguro(texto: string): string {
  return texto.replace(/^dominio:/, "").replace(/[^a-zA-Z0-9._-]+/g, "_") || "desconhecido";
}

/**
 * Registros versionados de falha em `falhas/<conector>/` e `falhas/_sem-conector/<motor>/`:
 * um JSON e um snapshot HTML (já sanitizado) por ocorrência.
 */
export class RegistroFalhasFs implements RegistroFalhas {
  private readonly pastaFalhas: string;

  constructor(pastaFalhas: string) {
    this.pastaFalhas = pastaFalhas;
  }

  registrar(registro: Omit<RegistroFalha, "snapshot">, htmlSanitizado: string): string {
    const grupo =
      registro.tipo === "falha_conector"
        ? join(this.pastaFalhas, nomeSeguro(registro.conector ?? registro.motor))
        : join(this.pastaFalhas, "_sem-conector", nomeSeguro(registro.motor));
    const base = `${registro.data.slice(0, 10)}-${String(registro.idVaga)}`;
    let nome = base;
    for (let n = 2; existsSync(join(grupo, `${nome}.json`)); n++) nome = `${base}-${String(n)}`;
    const completo: RegistroFalha = esquemaRegistroFalha.parse({
      ...registro,
      snapshot: `${nome}.html`,
    });
    escreverAtomico(join(grupo, `${nome}.html`), htmlSanitizado);
    escreverAtomico(join(grupo, `${nome}.json`), `${JSON.stringify(completo, null, 2)}\n`);
    return relative(this.pastaFalhas, join(grupo, nome)).replace(/\\/g, "/");
  }

  atualizar(
    idRegistro: string,
    campos: Partial<Pick<RegistroFalha, "resultadoAgente" | "passosAgente">>,
  ): void {
    const arquivo = join(this.pastaFalhas, `${idRegistro}.json`);
    const atual = esquemaRegistroFalha.parse(JSON.parse(readFileSync(arquivo, "utf8")));
    escreverAtomico(arquivo, `${JSON.stringify({ ...atual, ...campos }, null, 2)}\n`);
  }

  listarAbertas(): RegistroFalha[] {
    if (!existsSync(this.pastaFalhas)) return [];
    const registros: RegistroFalha[] = [];
    const visitar = (pasta: string): void => {
      for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
        const caminho = join(pasta, entrada.name);
        if (entrada.isDirectory()) visitar(caminho);
        else if (entrada.name.endsWith(".json")) {
          const r = esquemaRegistroFalha.safeParse(JSON.parse(readFileSync(caminho, "utf8")));
          if (r.success && !r.data.resolvida) registros.push(r.data);
        }
      }
    };
    visitar(this.pastaFalhas);
    return registros.sort((a, b) => a.data.localeCompare(b.data));
  }
}

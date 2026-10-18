import { existsSync, readFileSync, statSync } from "node:fs";
import { z } from "zod";
import type { CacheRespostas } from "#aplicacao/portas/cache-respostas.ts";
import type { Relogio } from "#aplicacao/portas/relogio.ts";
import { escreverAtomico } from "../sistema/escrita-atomica.ts";

const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;

const esquemaCache = z.record(z.string(), z.object({ valor: z.string(), gravadoEm: z.string() }));
type Entradas = z.infer<typeof esquemaCache>;

export interface OpcoesCacheRespostas {
  readonly arquivo: string;
  /** Arquivos cuja modificação invalida o cache (master e perfil). */
  readonly dependencias: readonly string[];
  readonly relogio: Relogio;
}

/**
 * Cache de respostas em `dados/cache-respostas.json`. Uma entrada vale por 30 dias e só se foi gravada
 * depois da última modificação do master e do perfil. Lê e grava o arquivo a cada operação (síncrono), para
 * que `preparar` e `aplicar` vejam as gravações um do outro.
 */
export class CacheRespostasJson implements CacheRespostas {
  private readonly opcoes: OpcoesCacheRespostas;

  constructor(opcoes: OpcoesCacheRespostas) {
    this.opcoes = opcoes;
  }

  buscar(chave: string): string | null {
    const entrada = this.ler()[chave];
    if (!entrada) return null;
    const gravadoEm = Date.parse(entrada.gravadoEm);
    const agora = Date.parse(this.opcoes.relogio.agoraIso());
    if (Number.isNaN(gravadoEm) || agora - gravadoEm > VALIDADE_MS) return null;
    if (gravadoEm < this.ultimaModificacao()) return null;
    return entrada.valor;
  }

  gravar(chave: string, valor: string): void {
    const agora = Date.parse(this.opcoes.relogio.agoraIso());
    const entradas = Object.fromEntries(
      Object.entries(this.ler()).filter(([, e]) => agora - Date.parse(e.gravadoEm) <= VALIDADE_MS),
    );
    entradas[chave] = { valor, gravadoEm: this.opcoes.relogio.agoraIso() };
    escreverAtomico(this.opcoes.arquivo, `${JSON.stringify(entradas, null, 2)}\n`);
  }

  private ler(): Entradas {
    if (!existsSync(this.opcoes.arquivo)) return {};
    try {
      return esquemaCache.parse(JSON.parse(readFileSync(this.opcoes.arquivo, "utf8")));
    } catch {
      // Arquivo corrompido ou de outra versão: o cache é descartável.
      return {};
    }
  }

  private ultimaModificacao(): number {
    return Math.max(
      0,
      ...this.opcoes.dependencias.filter((a) => existsSync(a)).map((a) => statSync(a).mtimeMs),
    );
  }
}

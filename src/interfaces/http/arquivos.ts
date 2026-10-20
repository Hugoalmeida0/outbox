// PDFs e telas abertos pelo site: o agente entrega uma URL `/arquivos/<id>` aleatória e de vida curta no
// lugar do caminho local. O id é a credencial (a aba nova não leva o token), por isso a rota não exige
// `Authorization`, e só arquivos das pastas de artefatos podem ser assinados.
import { createReadStream, existsSync, realpathSync, statSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { basename, extname, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import type { Hono } from "hono";

export const VALIDADE_ARQUIVO_MS = 5 * 60_000;
/** Depois do primeiro acesso, o link vale só mais um pouco (o visualizador de PDF repete a requisição). */
const SOBREVIDA_APOS_USO_MS = 60_000;

const TIPOS: Readonly<Record<string, string>> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

interface Assinatura {
  readonly caminho: string;
  expiraEm: number;
}

export interface OpcoesAssinador {
  /** Pastas cujos arquivos podem ser servidos (`dados/vagas/` e `dados/master/`). */
  readonly pastas: readonly string[];
  readonly agora?: () => number;
}

function real(caminho: string): string {
  return existsSync(caminho) ? realpathSync(caminho) : resolve(caminho);
}

/** Emite e resolve URLs de arquivo de uso único, válidas por 5 minutos. */
export class AssinadorArquivos {
  private readonly pastas: readonly string[];
  private readonly agora: () => number;
  private readonly assinaturas = new Map<string, Assinatura>();

  constructor(opcoes: OpcoesAssinador) {
    this.pastas = opcoes.pastas.map(real);
    this.agora = opcoes.agora ?? Date.now;
  }

  /** `/arquivos/<id>` para um arquivo existente dentro das pastas permitidas; fora delas, `null`. */
  assinar(caminho: string): string | null {
    this.limpar();
    if (!existsSync(caminho) || !statSync(caminho).isFile()) return null;
    const absoluto = real(caminho);
    if (!this.pastas.some((p) => absoluto.startsWith(p + sep))) return null;
    const id = randomBytes(24).toString("base64url");
    this.assinaturas.set(id, { caminho: absoluto, expiraEm: this.agora() + VALIDADE_ARQUIVO_MS });
    return `/arquivos/${id}`;
  }

  /** Caminho do arquivo de um id válido (encurtando a validade a partir do primeiro uso). */
  resolver(id: string): string | null {
    this.limpar();
    const assinatura = this.assinaturas.get(id);
    if (!assinatura || !existsSync(assinatura.caminho)) return null;
    assinatura.expiraEm = Math.min(assinatura.expiraEm, this.agora() + SOBREVIDA_APOS_USO_MS);
    return assinatura.caminho;
  }

  private limpar(): void {
    const agora = this.agora();
    for (const [id, a] of this.assinaturas) if (a.expiraEm <= agora) this.assinaturas.delete(id);
  }
}

/** `GET /arquivos/:id`: serve o arquivo assinado; id desconhecido, expirado ou forjado recebe 404. */
export function registrarRotaArquivos(app: Hono, assinador: AssinadorArquivos): void {
  app.get("/arquivos/:id", (c) => {
    const caminho = assinador.resolver(c.req.param("id"));
    if (caminho === null) return c.json({ mensagem: "arquivo não encontrado" }, 404);
    const nome = basename(caminho).replace(/[^\w.-]/g, "_");
    c.header("Content-Type", TIPOS[extname(caminho).toLowerCase()] ?? "application/octet-stream");
    c.header("Content-Disposition", `inline; filename="${nome}"`);
    c.header("Content-Length", String(statSync(caminho).size));
    return c.body(Readable.toWeb(createReadStream(caminho)) as ReadableStream);
  });
}

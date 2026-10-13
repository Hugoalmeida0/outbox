import type { ZodType } from "zod";
import type { IdVaga } from "#dominio/vagas/vaga.ts";

export const NOMES_ARTEFATO = [
  "vaga.json",
  "descricao.md",
  "analise.json",
  "curriculo.json",
  "curriculo.txt",
  "campos.json",
  "respostas.json",
  "carta.md",
  "agente.json",
  "antes-envio.png",
  "confirmacao.png",
  "pdf-curriculo",
  "pdf-carta",
] as const;
export type NomeArtefato = (typeof NOMES_ARTEFATO)[number];

/** Arquivos por vaga (`dados/vagas/<id>/`) e do master genérico (`dados/master/`). Síncrona. */
export interface ArmazemArtefatos {
  /** Caminho absoluto do artefato, garantidamente dentro da pasta da vaga. */
  caminho(id: IdVaga, nome: NomeArtefato): string;
  caminhoMaster(tipo: "pdf" | "texto"): string;
  gravarJson(id: IdVaga, nome: NomeArtefato, dados: unknown): void;
  lerJson<T>(id: IdVaga, nome: NomeArtefato, schema: ZodType<T>): T | null;
  gravarTexto(id: IdVaga, nome: NomeArtefato, texto: string): void;
  lerTexto(id: IdVaga, nome: NomeArtefato): string | null;
  existe(id: IdVaga, nome: NomeArtefato): boolean;
  /** Pasta dos logs de chamadas ao LLM da vaga. */
  pastaLlm(id: IdVaga): string;
  gravarTextoMaster(texto: string): void;
  lerTextoMaster(): string | null;
  /** Data (ISO) da última geração do master genérico, ou `null` se nunca gerado. */
  masterGeradoEm(): string | null;
}

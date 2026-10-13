import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import type { ZodType } from "zod";
import type { ArmazemArtefatos, NomeArtefato } from "#aplicacao/portas/armazem-artefatos.ts";
import { ErroInfra } from "#aplicacao/portas/erros.ts";
import { nomeArquivo } from "#dominio/curriculo/nome-arquivo.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import type { Caminhos } from "../sistema/caminhos.ts";
import { escreverAtomico } from "../sistema/escrita-atomica.ts";
import { isoLocal } from "../sistema/relogio-sistema.ts";

/** Artefatos por vaga em `dados/vagas/<id 5 dígitos>/` e do master genérico em `dados/master/`. */
export class ArmazemArtefatosFs implements ArmazemArtefatos {
  private readonly caminhos: Caminhos;
  private readonly obterNome: () => string;

  /** `obterNome` devolve o nome do candidato (para `Nome_Sobrenome_CV.pdf`), lido sob demanda. */
  constructor(caminhos: Caminhos, obterNome: () => string) {
    this.caminhos = caminhos;
    this.obterNome = obterNome;
  }

  private pasta(id: IdVaga): string {
    return resolve(this.caminhos.vagasDir, String(id).padStart(5, "0"));
  }

  caminho(id: IdVaga, nome: NomeArtefato): string {
    const arquivo =
      nome === "pdf-curriculo"
        ? nomeArquivo(this.obterNome(), "CV")
        : nome === "pdf-carta"
          ? nomeArquivo(this.obterNome(), "Carta")
          : nome;
    const pasta = this.pasta(id);
    const destino = resolve(pasta, arquivo);
    if (!destino.startsWith(pasta + sep))
      throw new ErroInfra(`caminho fora da pasta da vaga: ${arquivo}`);
    return destino;
  }

  caminhoMaster(tipo: "pdf" | "texto"): string {
    return join(
      this.caminhos.masterDir,
      tipo === "pdf" ? nomeArquivo(this.obterNome(), "CV") : "master.txt",
    );
  }

  gravarJson(id: IdVaga, nome: NomeArtefato, dados: unknown): void {
    escreverAtomico(this.caminho(id, nome), `${JSON.stringify(dados, null, 2)}\n`);
  }

  lerJson<T>(id: IdVaga, nome: NomeArtefato, schema: ZodType<T>): T | null {
    const texto = this.lerTexto(id, nome);
    if (texto === null) return null;
    const resultado = schema.safeParse(JSON.parse(texto));
    if (!resultado.success) {
      throw new ErroInfra(
        `artefato ${nome} da vaga #${String(id)} inválido: ${resultado.error.issues[0]?.message ?? ""}`,
      );
    }
    return resultado.data;
  }

  gravarTexto(id: IdVaga, nome: NomeArtefato, texto: string): void {
    escreverAtomico(this.caminho(id, nome), texto);
  }

  lerTexto(id: IdVaga, nome: NomeArtefato): string | null {
    const caminho = this.caminho(id, nome);
    return existsSync(caminho) ? readFileSync(caminho, "utf8") : null;
  }

  existe(id: IdVaga, nome: NomeArtefato): boolean {
    return existsSync(this.caminho(id, nome));
  }

  pastaLlm(id: IdVaga): string {
    return join(this.pasta(id), "llm");
  }

  gravarTextoMaster(texto: string): void {
    escreverAtomico(this.caminhoMaster("texto"), texto);
  }

  lerTextoMaster(): string | null {
    const caminho = this.caminhoMaster("texto");
    return existsSync(caminho) ? readFileSync(caminho, "utf8") : null;
  }

  masterGeradoEm(): string | null {
    const caminho = this.caminhoMaster("texto");
    return existsSync(caminho) ? isoLocal(statSync(caminho).mtime) : null;
  }
}

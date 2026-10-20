import { copyFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { isMap, isSeq, parseDocument, stringify } from "yaml";
import type { ArmazemCurriculo } from "#aplicacao/portas/armazem-curriculo.ts";
import type { Relogio } from "#aplicacao/portas/relogio.ts";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import { normalizarTexto } from "#dominio/compartilhado/texto.ts";
import { esquemaGapsNegados } from "#dominio/analise/gaps.ts";
import {
  esquemaMaster,
  type Master,
  type NivelIdioma,
  type SkillMaster,
} from "#dominio/curriculo/master.ts";
import { esquemaBancoRespostas, type BancoRespostas } from "#dominio/respostas/banco.ts";
import { esquemaPerfil, type Perfil } from "#dominio/respostas/perfil.ts";
import type { Caminhos } from "../sistema/caminhos.ts";
import { escreverAtomico } from "../sistema/escrita-atomica.ts";
import { isoLocal } from "../sistema/relogio-sistema.ts";
import { editarYaml, lerYaml, lerYamlBruto, mesclarNoDocumento } from "./yaml.ts";

const CABECALHO_MASTER =
  "# Currículo master: fonte única e verdadeira. Gerado por `camaleao importar`; revise e ajuste à vontade.\n" +
  "# Tudo o que o Camaleão afirmar sobre você precisa estar aqui.\n";

const AUXILIARES = ["perfil.yaml", "respostas.yaml", "gaps.yaml"] as const;

/** Arquivos do candidato em `curriculo/`, em YAML com comentários preservados. */
export class ArmazemCurriculoYaml implements ArmazemCurriculo {
  private readonly caminhos: Caminhos;
  private readonly relogio: Relogio;

  constructor(caminhos: Caminhos, relogio: Relogio) {
    this.caminhos = caminhos;
    this.relogio = relogio;
  }

  existeMaster(): boolean {
    return existsSync(this.caminhos.master);
  }

  lerMaster(): Master {
    if (!this.existeMaster()) {
      throw new ErroUsuario(
        "curriculo/master.yaml não encontrado: rode `camaleao importar <arquivo>` primeiro",
      );
    }
    return lerYaml(this.caminhos.master, esquemaMaster);
  }

  gravarMasterNovo(
    master: Master,
    opcoes: { readonly sobrescrever: boolean },
  ): { backup?: string } {
    const existe = this.existeMaster();
    if (existe && !opcoes.sobrescrever)
      throw new ErroUsuario("master.yaml já existe; use --sobrescrever");
    let backup: string | undefined;
    if (existe) {
      const carimbo = this.relogio.agoraIso().slice(0, 19).replace(/[-:T]/g, "");
      backup = `${this.caminhos.master}.bak-${carimbo}`;
      copyFileSync(this.caminhos.master, backup);
    }
    escreverAtomico(
      this.caminhos.master,
      CABECALHO_MASTER + stringify(esquemaMaster.parse(master)),
    );
    return backup ? { backup } : {};
  }

  adicionarSkill(skill: SkillMaster): void {
    editarYaml(this.caminhos.master, esquemaMaster, (doc) => {
      const skills = doc.get("skills");
      if (isSeq(skills)) skills.add(doc.createNode(skill));
      else doc.set("skills", doc.createNode([skill]));
    });
  }

  definirIdioma(idioma: string, nivel: NivelIdioma): void {
    const alvo = normalizarTexto(idioma);
    editarYaml(this.caminhos.master, esquemaMaster, (doc) => {
      const idiomas = doc.get("idiomas");
      if (!isSeq(idiomas)) {
        doc.set("idiomas", doc.createNode([{ idioma, nivel }]));
        return;
      }
      const existente = idiomas.items.find(
        (i) => isMap(i) && normalizarTexto(String(i.get("idioma"))) === alvo,
      );
      if (isMap(existente)) existente.set("nivel", nivel);
      else idiomas.add(doc.createNode({ idioma, nivel }));
    });
  }

  lerPerfil(): Perfil {
    if (!existsSync(this.caminhos.perfil)) {
      throw new ErroUsuario(
        "curriculo/perfil.yaml não encontrado: copie de curriculo.exemplo/ e preencha",
      );
    }
    return lerYaml(this.caminhos.perfil, esquemaPerfil);
  }

  lerPerfilBruto(): { existe: boolean; dados: unknown } {
    if (!existsSync(this.caminhos.perfil)) return { existe: false, dados: null };
    return { existe: true, dados: lerYamlBruto(this.caminhos.perfil) };
  }

  gravarPerfil(perfil: Perfil): void {
    const validado = esquemaPerfil.parse(perfil);
    const origem = existsSync(this.caminhos.perfil)
      ? this.caminhos.perfil
      : join(this.caminhos.exemplosDir, "perfil.yaml");
    const documento = parseDocument(readFileSync(origem, "utf8"));
    if (documento.errors.length > 0) {
      throw new ErroUsuario(
        `perfil.yaml não é um YAML válido: ${documento.errors[0]?.message ?? ""}`,
      );
    }
    mesclarNoDocumento(documento, validado);
    escreverAtomico(this.caminhos.perfil, documento.toString());
  }

  lerBanco(): BancoRespostas {
    if (!existsSync(this.caminhos.respostas)) return [];
    return lerYaml(this.caminhos.respostas, esquemaBancoRespostas.nullable()) ?? [];
  }

  gravarBanco(banco: BancoRespostas): void {
    const validado = esquemaBancoRespostas.parse(banco);
    if (!existsSync(this.caminhos.respostas)) {
      escreverAtomico(this.caminhos.respostas, stringify(validado));
      return;
    }
    // O banco é gerido pelo Camaleão: preserva-se o bloco de comentários do topo e reescreve-se o resto.
    const cabecalho =
      /^(?:#[^\n]*\r?\n)+/.exec(readFileSync(this.caminhos.respostas, "utf8"))?.[0] ?? "";
    escreverAtomico(this.caminhos.respostas, cabecalho + stringify(validado));
  }

  lerGapsNegados(): readonly string[] {
    if (!existsSync(this.caminhos.gaps)) return [];
    return lerYaml(this.caminhos.gaps, esquemaGapsNegados.nullable())?.negados ?? [];
  }

  negarGap(termoNormalizado: string): void {
    if (!existsSync(this.caminhos.gaps)) {
      escreverAtomico(this.caminhos.gaps, stringify({ negados: [termoNormalizado] }));
      return;
    }
    if (this.lerGapsNegados().includes(termoNormalizado)) return;
    editarYaml(this.caminhos.gaps, esquemaGapsNegados, (doc) => {
      const negados = doc.get("negados");
      if (isSeq(negados)) negados.add(doc.createNode(termoNormalizado));
      else doc.set("negados", doc.createNode([termoNormalizado]));
    });
  }

  garantirArquivosAuxiliares(): string[] {
    const criados: string[] = [];
    for (const nome of AUXILIARES) {
      const destino = join(this.caminhos.curriculoDir, nome);
      if (existsSync(destino)) continue;
      escreverAtomico(destino, readFileSync(join(this.caminhos.exemplosDir, nome)));
      criados.push(destino);
    }
    return criados;
  }

  atualizadoEm(): string {
    return isoLocal(statSync(this.caminhos.master).mtime);
  }
}

import type { Master, NivelIdioma, SkillMaster } from "#dominio/curriculo/master.ts";
import type { BancoRespostas } from "#dominio/respostas/banco.ts";
import type { Perfil } from "#dominio/respostas/perfil.ts";

/** Arquivos do candidato em `curriculo/` (master, perfil, banco de respostas e gaps negados). Síncrona. */
export interface ArmazemCurriculo {
  existeMaster(): boolean;
  /** Lê e valida o master; lança `ErroUsuario` se ausente ou inválido. */
  lerMaster(): Master;
  /** Grava um master novo. Sem `sobrescrever` e com master existente, lança `ErroUsuario`. */
  gravarMasterNovo(master: Master, opcoes: { readonly sobrescrever: boolean }): { backup?: string };
  /** Acrescenta uma skill aprendida, preservando comentários do YAML. */
  adicionarSkill(skill: SkillMaster): void;
  /** Define o nível de um idioma em `idiomas` (acrescenta o idioma se ausente), preservando comentários. */
  definirIdioma(idioma: string, nivel: NivelIdioma): void;
  lerPerfil(): Perfil;
  /**
   * YAML do perfil sem validar, para o formulário mostrar um perfil parcial; `existe: false` sem o
   * arquivo. YAML com erro de sintaxe lança `ErroUsuario`.
   */
  lerPerfilBruto(): { readonly existe: boolean; readonly dados: unknown };
  /**
   * Grava o perfil (validado com `esquemaPerfil`) preservando os comentários e a ordem das chaves que
   * continuam; sem arquivo, parte dos comentários de `curriculo.exemplo/perfil.yaml`. Escrita atômica.
   */
  gravarPerfil(perfil: Perfil): void;
  lerBanco(): BancoRespostas;
  gravarBanco(banco: BancoRespostas): void;
  lerGapsNegados(): readonly string[];
  negarGap(termoNormalizado: string): void;
  /** Copia de `curriculo.exemplo/` os arquivos auxiliares ausentes; devolve os criados. */
  garantirArquivosAuxiliares(): string[];
  /** Data da última modificação do master (ISO). */
  atualizadoEm(): string;
}

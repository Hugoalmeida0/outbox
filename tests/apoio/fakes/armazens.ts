// Armazéns em memória (currículo, artefatos, falhas) e fakes de resolução, extração e renderização.
import type { ZodType } from "zod";
import type { ArmazemArtefatos, NomeArtefato } from "#aplicacao/portas/armazem-artefatos.ts";
import type { ArmazemCurriculo } from "#aplicacao/portas/armazem-curriculo.ts";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import type { ExtratorVagas, ResultadoExtracao } from "#aplicacao/portas/extrator-vagas.ts";
import type { RegistroFalhas } from "#aplicacao/portas/registro-falhas.ts";
import type { RenderizadorDocumentos } from "#aplicacao/portas/renderizador-documentos.ts";
import type { Resolucao, ResolvedorVagas } from "#aplicacao/portas/resolvedor-vagas.ts";
import type { DocumentoCarta, DocumentoCurriculo } from "#dominio/curriculo/documento.ts";
import type { Master, SkillMaster } from "#dominio/curriculo/master.ts";
import type { RegistroFalha } from "#dominio/falhas/registro-falha.ts";
import type { BancoRespostas } from "#dominio/respostas/banco.ts";
import type { Perfil } from "#dominio/respostas/perfil.ts";
import type { Motor } from "#dominio/vagas/motores.ts";
import type { UrlCanonica } from "#dominio/vagas/vaga.ts";
import { umMaster, umPerfil } from "../builders.ts";

export class ArmazemCurriculoMemoria implements ArmazemCurriculo {
  master: Master | null;
  perfil: Perfil;
  banco: BancoRespostas = [];
  negados: string[] = [];
  atualizado = "2026-10-01T10:00:00-03:00";
  auxiliaresCriados: string[] = [];

  constructor(master: Master | null = umMaster(), perfil: Perfil = umPerfil()) {
    this.master = master;
    this.perfil = perfil;
  }

  existeMaster(): boolean {
    return this.master !== null;
  }
  lerMaster(): Master {
    if (!this.master) throw new ErroUsuario("curriculo/master.yaml não encontrado");
    return this.master;
  }
  gravarMasterNovo(master: Master, opcoes: { sobrescrever: boolean }): { backup?: string } {
    if (this.master && !opcoes.sobrescrever) {
      throw new ErroUsuario("master.yaml já existe; use --sobrescrever");
    }
    const tinha = this.master !== null;
    this.master = master;
    return tinha ? { backup: "master.yaml.bak-20261010100000" } : {};
  }
  adicionarSkill(skill: SkillMaster): void {
    const master = this.lerMaster();
    this.master = { ...master, skills: [...master.skills, skill] };
    this.atualizado = "2026-10-10T12:00:00-03:00";
  }
  lerPerfil(): Perfil {
    return this.perfil;
  }
  lerBanco(): BancoRespostas {
    return this.banco;
  }
  gravarBanco(banco: BancoRespostas): void {
    this.banco = banco;
  }
  lerGapsNegados(): readonly string[] {
    return this.negados;
  }
  negarGap(termoNormalizado: string): void {
    this.negados.push(termoNormalizado);
  }
  garantirArquivosAuxiliares(): string[] {
    return this.auxiliaresCriados;
  }
  atualizadoEm(): string {
    return this.atualizado;
  }
}

export class ArmazemArtefatosMemoria implements ArmazemArtefatos {
  readonly arquivos = new Map<string, string>();
  textoMaster: string | null = null;
  geradoEm: string | null = null;

  private chave(id: number, nome: NomeArtefato): string {
    return `${String(id).padStart(5, "0")}/${nome}`;
  }

  caminho(id: number, nome: NomeArtefato): string {
    const arquivo =
      nome === "pdf-curriculo"
        ? "Ana_Silva_CV.pdf"
        : nome === "pdf-carta"
          ? "Ana_Silva_Carta.pdf"
          : nome;
    return `/dados/vagas/${String(id).padStart(5, "0")}/${arquivo}`;
  }
  caminhoMaster(tipo: "pdf" | "texto"): string {
    return tipo === "pdf" ? "/dados/master/Ana_Silva_CV.pdf" : "/dados/master/master.txt";
  }
  gravarJson(id: number, nome: NomeArtefato, dados: unknown): void {
    this.arquivos.set(this.chave(id, nome), JSON.stringify(dados));
  }
  lerJson<T>(id: number, nome: NomeArtefato, schema: ZodType<T>): T | null {
    const bruto = this.arquivos.get(this.chave(id, nome));
    return bruto === undefined ? null : schema.parse(JSON.parse(bruto));
  }
  gravarTexto(id: number, nome: NomeArtefato, texto: string): void {
    this.arquivos.set(this.chave(id, nome), texto);
  }
  lerTexto(id: number, nome: NomeArtefato): string | null {
    return this.arquivos.get(this.chave(id, nome)) ?? null;
  }
  existe(id: number, nome: NomeArtefato): boolean {
    return this.arquivos.has(this.chave(id, nome));
  }
  pastaLlm(id: number): string {
    return `/dados/vagas/${String(id).padStart(5, "0")}/llm`;
  }
  gravarTextoMaster(texto: string): void {
    this.textoMaster = texto;
    this.geradoEm = "2026-10-10T10:00:00-03:00";
  }
  lerTextoMaster(): string | null {
    return this.textoMaster;
  }
  masterGeradoEm(): string | null {
    return this.geradoEm;
  }
}

export class RegistroFalhasMemoria implements RegistroFalhas {
  readonly registros = new Map<string, RegistroFalha>();
  readonly snapshots = new Map<string, string>();

  registrar(registro: Omit<RegistroFalha, "snapshot">, htmlSanitizado: string): string {
    const id = `${registro.conector ?? registro.motor}/${registro.data.slice(0, 10)}-${registro.idVaga}`;
    this.registros.set(id, { ...registro, snapshot: `${id}.html` });
    this.snapshots.set(id, htmlSanitizado);
    return id;
  }
  atualizar(
    idRegistro: string,
    campos: Partial<Pick<RegistroFalha, "resultadoAgente" | "passosAgente">>,
  ): void {
    const atual = this.registros.get(idRegistro);
    if (atual) this.registros.set(idRegistro, { ...atual, ...campos });
  }
  listarAbertas(): RegistroFalha[] {
    return [...this.registros.values()].filter((r) => !r.resolvida);
  }
}

export class ResolvedorFake implements ResolvedorVagas {
  readonly resolucoes = new Map<string, Resolucao | Error>();
  readonly chamadas: string[] = [];

  definir(canonica: string, resolucao: Resolucao | Error): this {
    this.resolucoes.set(canonica, resolucao);
    return this;
  }

  resolver(canonica: UrlCanonica, motor: Motor): Promise<Resolucao> {
    this.chamadas.push(canonica);
    const definida = this.resolucoes.get(canonica);
    if (definida instanceof Error) return Promise.reject(definida);
    return Promise.resolve(
      definida ?? {
        motor,
        urlResolvida: canonica,
        canonica,
        rota: "conector",
      },
    );
  }
}

export class ExtratorFake implements ExtratorVagas {
  readonly resultados = new Map<string, ResultadoExtracao | Error>();

  definir(url: string, resultado: ResultadoExtracao | Error): this {
    this.resultados.set(url, resultado);
    return this;
  }

  extrair(url: string): Promise<ResultadoExtracao> {
    const r = this.resultados.get(url);
    if (r instanceof Error) return Promise.reject(r);
    return Promise.resolve(
      r ?? {
        estruturada: {
          empresa: "Empresa X",
          cargo: "Desenvolvedora Sênior",
          descricao: "Vaga para desenvolvedora com TypeScript e React.",
          localidade: "Remoto",
          publicadaEm: "2026-10-01",
        },
        textoPagina: "Vaga para desenvolvedora com TypeScript e React.",
      },
    );
  }
}

export class RenderizadorFake implements RenderizadorDocumentos {
  readonly curriculos: { doc: DocumentoCurriculo; destino: string }[] = [];
  readonly cartas: { doc: DocumentoCarta; destino: string }[] = [];
  paginas = 1;

  renderizarCurriculo(doc: DocumentoCurriculo, destino: string): Promise<{ paginas: number }> {
    this.curriculos.push({ doc, destino });
    return Promise.resolve({ paginas: this.paginas });
  }
  renderizarCarta(doc: DocumentoCarta, destino: string): Promise<{ paginas: number }> {
    this.cartas.push({ doc, destino });
    return Promise.resolve({ paginas: 1 });
  }
}

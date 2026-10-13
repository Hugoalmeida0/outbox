import type { Page } from "playwright";
import type { ArmazemArtefatos } from "#aplicacao/portas/armazem-artefatos.ts";
import type { ArmazemCurriculo } from "#aplicacao/portas/armazem-curriculo.ts";
import type { Registrador } from "#aplicacao/portas/registrador.ts";
import { formatarData } from "#dominio/respostas/valor-codigo.ts";
import { esquemaRespostasSalvas } from "#dominio/respostas/pacote.ts";
import { hostCasaPadrao } from "#dominio/vagas/motores.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { preencherElemento } from "#infra/conectores/base/campos.ts";
import type { CofreCredenciais } from "./cofre.ts";

export type ChaveSensivel = "cpf" | "rg" | "dataNascimento";
export type FormatoData = "dd/mm/aaaa" | "aaaa-mm-dd" | "ddmmaaaa";

export type ResultadoFerramenta =
  | { readonly ok: true; readonly senhaRecemCriada?: boolean }
  | { readonly ok: false; readonly erro: string };

export interface OpcoesServicoSegredos {
  readonly obterPagina: () => Promise<Page | null>;
  readonly cofre: CofreCredenciais;
  readonly curriculo: ArmazemCurriculo;
  readonly artefatos: ArmazemArtefatos;
  /** Hosts permitidos (`OUTBOX_HOSTS_PERMITIDOS`), aceitando `*.` como prefixo. */
  readonly hostsPermitidos: readonly string[];
  readonly vagaId: IdVaga | null;
  readonly registrador: Registrador;
}

/**
 * Lógica das ferramentas do MCP `outbox-segredos` (ADR-012): preenche senha, documentos e respostas
 * sensíveis direto na página, só em hosts da allowlist, e nunca devolve o valor preenchido.
 */
export class ServicoSegredos {
  private readonly opcoes: OpcoesServicoSegredos;

  constructor(opcoes: OpcoesServicoSegredos) {
    this.opcoes = opcoes;
  }

  emailCadastro(): { email: string } {
    return { email: this.opcoes.curriculo.lerMaster().pessoal.email };
  }

  async preencherSenha(seletor: string): Promise<ResultadoFerramenta> {
    return this.comPaginaPermitida("preencher_senha", async (pagina, host) => {
      const credencial = this.opcoes.cofre.obterOuCriar(host);
      await pagina.locator(seletor).first().fill(credencial.senha);
      return { ok: true, senhaRecemCriada: credencial.recemCriada };
    });
  }

  async preencherDadoSensivel(
    chave: ChaveSensivel,
    seletor: string,
    formato: FormatoData = "dd/mm/aaaa",
  ): Promise<ResultadoFerramenta> {
    return this.comPaginaPermitida("preencher_dado_sensivel", async (pagina) => {
      const documentos = this.opcoes.curriculo.lerPerfil().documentos;
      const bruto = documentos[chave];
      if (bruto === undefined) return { ok: false, erro: "dado ausente no perfil" };
      const valor =
        chave === "dataNascimento"
          ? formato === "aaaa-mm-dd"
            ? bruto
            : formato === "ddmmaaaa"
              ? formatarData(bruto, "texto").replace(/\//g, "")
              : formatarData(bruto, "texto")
          : bruto;
      await preencherElemento(pagina, seletor, valor);
      return { ok: true };
    });
  }

  async preencherRespostaProtegida(
    chaveResposta: string,
    seletor: string,
  ): Promise<ResultadoFerramenta> {
    return this.comPaginaPermitida("preencher_resposta_protegida", async (pagina) => {
      if (this.opcoes.vagaId === null) return { ok: false, erro: "vaga não informada" };
      const respostas =
        this.opcoes.artefatos.lerJson(
          this.opcoes.vagaId,
          "respostas.json",
          esquemaRespostasSalvas,
        ) ?? [];
      const resposta = respostas.find((r) => r.chaveProtegida === chaveResposta);
      if (!resposta?.valor) return { ok: false, erro: "resposta protegida não encontrada" };
      await preencherElemento(pagina, seletor, resposta.valor);
      return { ok: true };
    });
  }

  private async comPaginaPermitida(
    ferramenta: string,
    acao: (pagina: Page, host: string) => Promise<ResultadoFerramenta>,
  ): Promise<ResultadoFerramenta> {
    const pagina = await this.opcoes.obterPagina();
    if (!pagina) return { ok: false, erro: "nenhuma página aberta" };
    pagina.setDefaultTimeout(10_000);
    const host = new URL(pagina.url()).hostname;
    if (!this.opcoes.hostsPermitidos.some((p) => hostCasaPadrao(host, p))) {
      this.opcoes.registrador.avisar(`${ferramenta} recusado: host não permitido`, { host });
      return { ok: false, erro: "host não permitido" };
    }
    try {
      return await acao(pagina, host);
    } catch (erro) {
      this.opcoes.registrador.avisar(`${ferramenta} falhou`, {
        host,
        erro: (erro as Error).message,
      });
      return { ok: false, erro: "não foi possível preencher o campo" };
    }
  }
}

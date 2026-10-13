import { z } from "zod";
import type { CatalogoConectores } from "#aplicacao/portas/catalogo-conectores.ts";
import { ErroExtracao, ErroInfra } from "#aplicacao/portas/erros.ts";
import type { ExtratorVagas, ResultadoExtracao } from "#aplicacao/portas/extrator-vagas.ts";
import type { Registrador } from "#aplicacao/portas/registrador.ts";
import type { Motor } from "#dominio/vagas/motores.ts";
import type { LeitorHeadless } from "../navegador/leitor-headless.ts";
import type { ClienteHttp } from "../sistema/cliente-http.ts";
import { extrairJsonLd } from "./json-ld.ts";

const esquemaIssueGithub = z.object({ title: z.string(), body: z.string().nullable() });

/**
 * Extração estrutural: API do conector, depois JSON-LD da página. Sempre devolve o texto visível para o
 * fallback por LLM (feito pela aplicação). Issues do GitHub vêm pela API pública.
 */
export class ExtratorEstrutural implements ExtratorVagas {
  private readonly catalogo: CatalogoConectores;
  private readonly leitor: LeitorHeadless;
  private readonly http: ClienteHttp;
  private readonly registrador: Registrador;

  constructor(dependencias: {
    catalogo: CatalogoConectores;
    leitor: LeitorHeadless;
    http: ClienteHttp;
    registrador: Registrador;
  }) {
    this.catalogo = dependencias.catalogo;
    this.leitor = dependencias.leitor;
    this.http = dependencias.http;
    this.registrador = dependencias.registrador;
  }

  async extrair(url: string, motor: Motor, sinal: AbortSignal): Promise<ResultadoExtracao> {
    if (motor === "github") return this.extrairGithub(url, sinal);

    const conector = this.catalogo.para(motor);
    if (conector?.extrairVaga) {
      try {
        const viaApi = await conector.extrairVaga(url, sinal);
        if (viaApi) return { estruturada: viaApi, textoPagina: viaApi.descricao };
      } catch (erro) {
        this.registrador.avisar(`extração pela API do ${motor} falhou; usando a página`, {
          url,
          erro,
        });
      }
    }
    try {
      const pagina = await this.leitor.ler(url, sinal);
      return { estruturada: extrairJsonLd(pagina.html), textoPagina: pagina.texto };
    } catch (erro) {
      throw new ErroExtracao(`não foi possível ler a vaga ${url}: ${(erro as Error).message}`, {
        cause: erro,
      });
    }
  }

  private async extrairGithub(url: string, sinal: AbortSignal): Promise<ResultadoExtracao> {
    const partes = /github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/.exec(url);
    if (!partes) throw new ErroExtracao(`URL de issue do GitHub inválida: ${url}`);
    try {
      const issue = await this.http.obterJson(
        `https://api.github.com/repos/${partes[1] ?? ""}/${partes[2] ?? ""}/issues/${partes[3] ?? ""}`,
        esquemaIssueGithub,
        sinal,
      );
      return { estruturada: null, textoPagina: `${issue.title}\n\n${issue.body ?? ""}`.trim() };
    } catch (erro) {
      if (erro instanceof ErroInfra) throw erro;
      throw new ErroExtracao(`falha ao ler a issue ${url}`, { cause: erro });
    }
  }
}

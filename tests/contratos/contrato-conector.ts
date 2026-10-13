// Suíte de contrato de ConectorAts (LSP, ADR-010): todo conector deve passá-la sobre suas fixtures.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Campo } from "#dominio/respostas/campo.ts";
import type { RespostaSugerida } from "#dominio/respostas/pacote.ts";
import {
  criarConector,
  type DefinicaoConector,
} from "#infra/conectores/base/conector-formulario.ts";
import { lerDescritores, paraCampos } from "#infra/conectores/base/campos.ts";
import type { ClienteHttp } from "#infra/sistema/cliente-http.ts";
import type { MapaFixtures } from "#testes/apoio/fixtures.ts";
import { umPacote } from "#testes/apoio/builders.ts";
import {
  aquecerNavegador,
  cliquesEnvio,
  criarAmbienteConector,
  pdfDeTeste,
  respostaPlausivel,
} from "#testes/apoio/harness-conector.ts";

export interface ConfiguracaoContrato {
  readonly definicao: DefinicaoConector;
  readonly mapa: MapaFixtures;
  /** URL canônica da vaga servida pelas fixtures. */
  readonly url: string;
  readonly http?: ClienteHttp;
  /** Leitura de campos no preparo: "campos" (espera lista) ou "nulo" (só no aplicar). */
  readonly leituraNoPreparo: "campos" | "nulo";
  /** Fixtures reais não têm JS: o envio é simulado substituindo a página por este texto. */
  readonly textoConfirmacao?: string;
  /** Desfecho esperado após o envio. */
  readonly desfechoEsperado?: "enviada" | "pendente_teste";
}

const sinal = new AbortController().signal;

export function descreverContratoConector(config: ConfiguracaoContrato): void {
  describe(`contrato de conector: ${config.definicao.motor}`, () => {
    const ambiente = criarAmbienteConector(config.mapa, config.http ? { http: config.http } : {});
    const conector = criarConector(config.definicao, ambiente.deps);
    const pausas: string[] = [];
    const respondidosAoVivo: Campo[] = [];
    const ctx = {
      responderAoVivo: (campos: readonly Campo[]): Promise<RespostaSugerida[]> => {
        respondidosAoVivo.push(...campos);
        return Promise.resolve(campos.map(respostaPlausivel));
      },
      aguardarUsuario: (mensagem: string): Promise<void> => {
        pausas.push(mensagem);
        return Promise.resolve();
      },
    };

    beforeAll(() => aquecerNavegador(ambiente.leitor));
    afterAll(() => ambiente.fechar());

    it("declara motor e versão semver", () => {
      expect(conector.motor).toBe(config.definicao.motor);
      expect(conector.versao).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it(`lê os campos no preparo (${config.leituraNoPreparo})`, async () => {
      const campos = await conector.lerCampos?.(config.url, sinal);
      if (config.leituraNoPreparo === "nulo") {
        expect(campos ?? null).toBeNull();
        return;
      }
      expect(campos?.length ?? 0).toBeGreaterThan(2);
      expect(campos?.some((c) => c.categoria === "curriculo" && c.tipo === "arquivo")).toBe(true);
      expect(campos?.some((c) => c.categoria === "padrao")).toBe(true);
    });

    it("preenche todos os campos obrigatórios, anexa o PDF e não envia", async () => {
      const camposPreparo = (await conector.lerCampos?.(config.url, sinal)) ?? [];
      const pdf = pdfDeTeste();
      const pacote = umPacote({
        pdfCurriculo: pdf,
        respostas: camposPreparo.map(respostaPlausivel),
      });
      const formulario = await conector.abrirEPreencher(config.url, pacote, ctx, sinal);
      const pagina = ambiente.paginas.at(-1);
      if (!pagina) throw new Error("conector não abriu página");

      expect(await cliquesEnvio(pagina)).toBe(0);
      const valores = await formulario.lerValores();
      expect(valores.some((v) => v.ehArquivo && v.valor.endsWith("Ana_Silva_CV.pdf"))).toBe(true);

      const campos = paraCampos(await lerDescritores(pagina, config.definicao.ignorar ?? []));
      const vazios = campos
        .filter((c) => c.obrigatorio && c.tipo !== "arquivo")
        .filter((c) => {
          const lido = valores.find((v) => v.rotulo === (c.rotulo || c.id));
          return lido !== undefined && lido.valor.trim() === "";
        })
        .map((c) => c.rotulo || c.id);
      expect(vazios).toEqual([]);
      expect(formulario.urlAtual()).toMatch(/^https:/);
      await formulario.fechar();
    });

    it("envia pelo seletor de envio e detecta a confirmação", async () => {
      const camposPreparo = (await conector.lerCampos?.(config.url, sinal)) ?? [];
      const pacote = umPacote({
        pdfCurriculo: pdfDeTeste(),
        respostas: camposPreparo.map(respostaPlausivel),
      });
      const formulario = await conector.abrirEPreencher(config.url, pacote, ctx, sinal);
      const pagina = ambiente.paginas.at(-1);
      if (!pagina) throw new Error("conector não abriu página");
      if (config.textoConfirmacao) {
        // Fixture real (sem JS): qualquer clique em botão de envio troca a página pela confirmação.
        await pagina.evaluate((texto: string) => {
          document.addEventListener(
            "click",
            (evento) => {
              if ((evento.target as Element | null)?.closest("button, input[type=submit]")) {
                evento.preventDefault();
                document.body.innerHTML = `<h1>${texto}</h1>`;
              }
            },
            true,
          );
        }, config.textoConfirmacao);
      }
      await formulario.enviar();
      expect(await formulario.confirmarEnvio(5000)).toBe(config.desfechoEsperado ?? "enviada");
      await formulario.fechar();
    });
  });
}

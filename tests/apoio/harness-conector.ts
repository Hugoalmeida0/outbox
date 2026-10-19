// Ambiente de teste de conectores: Chromium headless servindo fixtures, sem rede (arquitetura.md §11.1).
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "playwright";
import type { ZodType } from "zod";
import type { Campo } from "#dominio/respostas/campo.ts";
import type { RespostaSugerida } from "#dominio/respostas/pacote.ts";
import { LeitorHeadless } from "#infra/navegador/leitor-headless.ts";
import type { DepsConector } from "#infra/conectores/base/conector-formulario.ts";
import type { ClienteHttp } from "#infra/sistema/cliente-http.ts";
import type { CofreCredenciais } from "#infra/credenciais/cofre.ts";
import { servirFixtures, type MapaFixtures } from "./fixtures.ts";

const SUBMETER = /submit|enviar|finalizar candidatura|concluir candidatura|send application/i;

/**
 * Lança o Chromium do leitor antes dos testes. Chame em `beforeAll`: o lançamento é preparação de
 * ambiente e não deve contar no timeout do primeiro teste (sob carga, passa de 30 s).
 */
export async function aquecerNavegador(leitor: LeitorHeadless): Promise<void> {
  await (await leitor.novoContexto()).close();
}

export interface AmbienteConector {
  readonly deps: DepsConector;
  readonly paginas: Page[];
  readonly leitor: LeitorHeadless;
  fechar(): Promise<void>;
}

/** Monta as dependências de conector servindo `mapa`; cada página conta cliques em botões de envio. */
export function criarAmbienteConector(
  mapa: MapaFixtures,
  opcoes: { http?: ClienteHttp; cofre?: CofreCredenciais } = {},
): AmbienteConector {
  const leitor = new LeitorHeadless({ interceptar: servirFixtures(mapa) });
  const paginas: Page[] = [];
  const http: ClienteHttp = opcoes.http ?? {
    obterJson: () => Promise.reject(new Error("HTTP não configurado no teste")),
    obterTexto: () => Promise.reject(new Error("HTTP não configurado no teste")),
  };
  return {
    leitor,
    paginas,
    deps: {
      leitor,
      http,
      ...(opcoes.cofre ? { cofre: opcoes.cofre } : {}),
      abrirPagina: async () => {
        const pagina = await (await leitor.novoContexto()).newPage();
        await pagina.addInitScript((padrao: string) => {
          const regex = new RegExp(padrao, "i");
          (window as unknown as { __cliquesEnvio: number }).__cliquesEnvio = 0;
          document.addEventListener(
            "click",
            (evento) => {
              const alvo = (evento.target as Element | null)?.closest("button, input[type=submit]");
              const texto = alvo
                ? `${(alvo as HTMLElement).innerText} ${(alvo as HTMLInputElement).value}`
                : "";
              if (alvo && regex.test(texto))
                (window as unknown as { __cliquesEnvio: number }).__cliquesEnvio++;
            },
            true,
          );
        }, SUBMETER.source);
        paginas.push(pagina);
        return pagina;
      },
    },
    fechar: () => leitor.fechar(),
  };
}

/** HTTP falso que responde JSON fixo por prefixo de URL. */
export function httpComRespostas(respostas: Readonly<Record<string, unknown>>): ClienteHttp {
  const achar = (url: string): unknown => {
    const chave = Object.keys(respostas).find((k) => url.startsWith(k));
    if (chave === undefined) throw new Error(`sem resposta HTTP para ${url}`);
    return respostas[chave];
  };
  return {
    obterJson: <T>(url: string, schema: ZodType<T>) => Promise.resolve(schema.parse(achar(url))),
    obterTexto: (url: string) => Promise.resolve(JSON.stringify(achar(url))),
  };
}

/** Resposta plausível para qualquer campo (usada pelas suítes de contrato). */
export function respostaPlausivel(campo: Campo): RespostaSugerida {
  const opcoes = campo.opcoes ?? [];
  const valor = ((): string => {
    switch (campo.tipo) {
      case "select":
      case "radio":
        return opcoes[0] ?? "Yes";
      case "checkbox":
        return opcoes.length > 1 ? (opcoes[0] ?? "Sim") : "Sim";
      case "email":
        return "ana.exemplo@example.com";
      case "telefone":
        return "+55 11 90000-0000";
      case "numero":
        return "5";
      case "data":
        return "2026-01-01";
      default:
        return campo.categoria === "padrao" ? "Ana Exemplo" : "Resposta de teste";
    }
  })();
  return {
    campoId: campo.id,
    rotulo: campo.rotulo,
    categoria: campo.categoria,
    tipoCampo: campo.tipo,
    valor,
    fonte: "gerada",
    confianca: "alta",
    especificaDaVaga: false,
    sensivel: false,
  };
}

/** PDF mínimo válido num diretório temporário. */
export function pdfDeTeste(nome = "Ana-Silva-Curriculo.pdf"): string {
  const pasta = mkdtempSync(join(tmpdir(), "outbox-pdf-teste-"));
  const caminho = join(pasta, nome);
  writeFileSync(
    caminho,
    "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
  );
  return caminho;
}

/** Quantos cliques em botões de envio a página registrou. */
export function cliquesEnvio(pagina: Page): Promise<number> {
  return pagina.evaluate(
    () => (window as unknown as { __cliquesEnvio?: number }).__cliquesEnvio ?? 0,
  );
}

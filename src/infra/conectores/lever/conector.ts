import type { Page } from "playwright";
import { z } from "zod";
import { normalizarTexto } from "#dominio/compartilhado/texto.ts";
import { consultasLocalizacao, ufDe } from "#dominio/respostas/localidade.ts";
import { htmlParaTexto } from "#infra/extracao/html-texto.ts";
import { ErroSemOpcao } from "../base/campos.ts";
import type { DefinicaoConector } from "../base/conector-formulario.ts";
import { comSufixo, dataCurta, nomeDoSlug } from "../base/util.ts";

/** A busca de localização da Lever consulta um serviço: leva de 1 a 3 s para listar. */
const ESPERA_LOCALIZACAO_MS = 6000;

/**
 * Até a busca nova começar, a lista (ou o "No location found") ainda é a da consulta anterior. Sem ver o
 * carregamento nem uma lista diferente, só confia no que está na tela depois disto.
 */
const ESPERA_INICIO_BUSCA_MS = 2000;

const SUGESTOES = ".dropdown-results .dropdown-location";

async function textosSugestoes(pagina: Page): Promise<string[]> {
  return (await pagina.locator(SUGESTOES).allInnerTexts()).map((t) => t.trim()).filter(Boolean);
}

/**
 * Espera a busca terminar e devolve os textos das sugestões (vazio = "No location found"), ou `null`
 * quando o menu de sugestões nunca abriu: o campo não tem autocomplete e aceita texto livre.
 */
async function esperarSugestoes(
  pagina: Page,
  anteriores: readonly string[],
): Promise<string[] | null> {
  const inicio = Date.now();
  let buscou = false;
  let menuAbriu = false;
  while (Date.now() - inicio < ESPERA_LOCALIZACAO_MS) {
    await pagina.waitForTimeout(300);
    if (await pagina.locator(".dropdown-loading-results").isVisible()) {
      buscou = true;
      continue;
    }
    menuAbriu ||= await pagina.locator(".dropdown-container").isVisible();
    if (!menuAbriu && !buscou && Date.now() - inicio >= ESPERA_INICIO_BUSCA_MS) return null;
    const textos = await textosSugestoes(pagina);
    const nova = textos.join("\n") !== anteriores.join("\n");
    const confiavel = buscou || nova || Date.now() - inicio >= ESPERA_INICIO_BUSCA_MS;
    if (!confiavel) continue;
    if (textos.length > 0) return textos;
    if (await pagina.locator(".dropdown-no-results").isVisible()) return [];
  }
  return [];
}

/**
 * "Current location" da Lever: um autocomplete próprio (sem `role=option`) que só aceita uma sugestão
 * clicada, gravada em `selectedLocation`. Tenta em cascata só a cidade, cidade e estado e, por fim, a
 * capital do estado; escolhe a sugestão cuja cidade bate e que é do mesmo estado. Sem sugestão, limpa o
 * campo e lança `ErroSemOpcao` (o campo fica para o usuário).
 */
export async function preencherLocalizacaoLever(pagina: Page, valor: string): Promise<void> {
  const caixa = pagina.locator("#location-input");
  const [cidade = "", estado = ""] = valor.split(",").map((p) => p.trim());
  const uf = ufDe(estado);
  const nomeEstado = normalizarTexto(uf?.nome ?? estado);
  for (const consulta of consultasLocalizacao(valor)) {
    const alvo = normalizarTexto(consulta === uf?.capital ? uf.capital : cidade);
    const anteriores = await textosSugestoes(pagina);
    await caixa.click();
    await caixa.fill("");
    await caixa.pressSequentially(consulta, { delay: 30 });
    const sugestoes = await esperarSugestoes(pagina, anteriores);
    if (sugestoes === null) {
      // Sem autocomplete (o serviço de busca não respondeu ou o campo mudou): fica o texto completo.
      await caixa.fill(valor);
      return;
    }
    const indice = sugestoes.findIndex((s) => {
      const partes = s.split(",").map((p) => normalizarTexto(p));
      return partes[0] === alvo && (!nomeEstado || partes.includes(nomeEstado));
    });
    if (indice < 0) continue;
    await pagina.locator(SUGESTOES).nth(indice).click();
    const escolhida = await pagina
      .locator("input[name=selectedLocation]")
      .inputValue()
      .catch(() => "");
    if (escolhida.trim() !== "") return;
  }
  await caixa.fill("");
  throw new ErroSemOpcao(`nenhuma localização encontrada para "${valor}"`);
}

/** Resposta de `GET api.lever.co/v0/postings/<empresa>/<id>` (verificada em 2026-10-10). */
const esquemaPostagemLever = z.object({
  text: z.string(),
  categories: z
    .object({ location: z.string().optional(), commitment: z.string().optional() })
    .loose()
    .default({}),
  descriptionPlain: z.string().default(""),
  additionalPlain: z.string().default(""),
  lists: z.array(z.object({ text: z.string(), content: z.string() })).default([]),
  createdAt: z.number().optional(),
});

/**
 * Lever (jobs.lever.co e jobs.eu.lever.co). Estrutura observada em 2026-10-10: formulário em /apply,
 * renderizado no servidor, campos por `name`, perguntas em `li.application-question`, envio #btn-submit.
 */
export const definicaoLever: DefinicaoConector = {
  motor: "lever",
  versao: "1.1.0",
  urlFormulario: (url) =>
    url.replace(/\/+$/, "").endsWith("/apply") ? url : comSufixo(url, "apply"),
  seletorEnviar: "#btn-submit",
  async preencherEspecial(pagina, campo, valor) {
    if (campo.id !== "location-input") return false;
    await preencherLocalizacaoLever(pagina, valor);
    return true;
  },
  confirmacao: {
    texto: /application submitted|thanks for applying|thank you for applying|candidatura enviada/i,
    url: /\/thanks/,
  },
  async extrairVaga(url, sinal, deps) {
    const u = new URL(url);
    const m = /^\/([^/]+)\/([0-9a-f-]{36})/i.exec(u.pathname);
    if (!m) return null;
    const host = u.hostname.includes(".eu.") ? "api.eu.lever.co" : "api.lever.co";
    const p = await deps.http.obterJson(
      `https://${host}/v0/postings/${m[1] ?? ""}/${m[2] ?? ""}`,
      esquemaPostagemLever,
      sinal,
    );
    const listas = p.lists.map((l) => `${l.text}\n${htmlParaTexto(l.content)}`).join("\n\n");
    const publicada = dataCurta(p.createdAt);
    return {
      empresa: nomeDoSlug(m[1] ?? ""),
      cargo: p.text,
      descricao:
        [p.descriptionPlain, listas, p.additionalPlain].filter(Boolean).join("\n\n") || p.text,
      ...(p.categories.location ? { localidade: p.categories.location } : {}),
      ...(publicada ? { publicadaEm: publicada } : {}),
      ...(p.categories.commitment ? { regimeTexto: p.categories.commitment } : {}),
    };
  },
};

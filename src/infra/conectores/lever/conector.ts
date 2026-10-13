import { z } from "zod";
import { htmlParaTexto } from "#infra/extracao/html-texto.ts";
import type { DefinicaoConector } from "../base/conector-formulario.ts";
import { comSufixo, dataCurta, nomeDoSlug } from "../base/util.ts";

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
  versao: "1.0.0",
  urlFormulario: (url) =>
    url.replace(/\/+$/, "").endsWith("/apply") ? url : comSufixo(url, "apply"),
  seletorEnviar: "#btn-submit",
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

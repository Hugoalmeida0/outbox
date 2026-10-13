import { z } from "zod";
import { classificarFormulario } from "#dominio/respostas/classificar-campo.ts";
import type { Campo, TipoCampo } from "#dominio/respostas/campo.ts";
import type { VagaExtraida } from "#dominio/vagas/vaga-extraida.ts";
import { decodificarEntidades, htmlParaTexto } from "#infra/extracao/html-texto.ts";
import type { ClienteHttp } from "#infra/sistema/cliente-http.ts";
import { dataCurta } from "../base/util.ts";

const esquemaCampoApi = z.object({
  name: z.string(),
  type: z.string(),
  values: z.array(z.object({ label: z.string() }).loose()).default([]),
});
const esquemaPergunta = z.object({
  label: z.string(),
  required: z.boolean().nullable().default(false),
  fields: z.array(esquemaCampoApi),
});
/** Resposta de `GET boards-api.greenhouse.io/v1/boards/<board>/jobs/<id>?questions=true` (verificada em 2026-10-10). */
export const esquemaVagaGreenhouse = z.object({
  title: z.string(),
  company_name: z.string().nullable().optional(),
  content: z.string().default(""),
  location: z.object({ name: z.string().nullable() }).nullable().optional(),
  updated_at: z.string().nullable().optional(),
  first_published: z.string().nullable().optional(),
  questions: z.array(esquemaPergunta).default([]),
  compliance: z
    .array(z.object({ questions: z.array(esquemaPergunta).default([]) }).loose())
    .nullable()
    .default([]),
});
export type VagaGreenhouse = z.infer<typeof esquemaVagaGreenhouse>;

const TIPOS: Readonly<Record<string, TipoCampo>> = {
  input_text: "texto",
  textarea: "textarea",
  input_file: "arquivo",
  multi_value_single_select: "select",
  multi_value_multi_select: "checkbox",
};

/** Board e id a partir da URL canônica; `null` para boards EU (a API pública só existe no host global). */
export function enderecoApi(url: string): string | null {
  const u = new URL(url);
  const m = /^\/([^/]+)\/jobs\/(\d+)/.exec(u.pathname);
  if (!m || u.hostname.includes(".eu.")) return null;
  return `https://boards-api.greenhouse.io/v1/boards/${m[1] ?? ""}/jobs/${m[2] ?? ""}?questions=true`;
}

export async function obterVagaGreenhouse(
  url: string,
  http: ClienteHttp,
  sinal: AbortSignal,
): Promise<VagaGreenhouse | null> {
  const endereco = enderecoApi(url);
  return endereco ? http.obterJson(endereco, esquemaVagaGreenhouse, sinal) : null;
}

export function paraVagaExtraida(vaga: VagaGreenhouse, board: string): VagaExtraida {
  const publicada = dataCurta(vaga.first_published ?? vaga.updated_at);
  return {
    empresa: vaga.company_name ?? board,
    cargo: vaga.title,
    descricao: htmlParaTexto(decodificarEntidades(vaga.content)) || vaga.title,
    ...(vaga.location?.name ? { localidade: vaga.location.name } : {}),
    ...(publicada ? { publicadaEm: publicada } : {}),
  };
}

/** Campos do formulário a partir das perguntas da API (incluindo EEOC), com ids iguais aos do DOM. */
export function paraCampos(vaga: VagaGreenhouse): Campo[] {
  const perguntas = [...vaga.questions, ...(vaga.compliance ?? []).flatMap((c) => c.questions)];
  const brutos = perguntas.flatMap((p) =>
    p.fields
      .filter((f) => !f.name.endsWith("_text") && TIPOS[f.type] !== undefined)
      .map((f) => ({
        id: f.name,
        rotulo: p.label,
        tipo: TIPOS[f.type] ?? "texto",
        obrigatorio: p.required === true,
        opcoes: f.values.map((v) => v.label),
      })),
  );
  const classificacoes = classificarFormulario(
    brutos.map((b) => ({ rotulo: b.rotulo, nome: b.id, tipo: b.tipo })),
  );
  return brutos.map((b, i) => ({
    id: b.id,
    rotulo: b.rotulo,
    tipo: b.tipo,
    obrigatorio: b.obrigatorio,
    ...(b.opcoes.length > 0 ? { opcoes: b.opcoes } : {}),
    categoria: classificacoes[i]?.categoria ?? "pergunta",
  }));
}

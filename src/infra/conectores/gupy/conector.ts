import { esquemaVagaExtraida, type VagaExtraida } from "#dominio/vagas/vaga-extraida.ts";
import { extrairJsonLd } from "#infra/extracao/json-ld.ts";
import { htmlParaTexto } from "#infra/extracao/html-texto.ts";
import type { DefinicaoConector } from "../base/conector-formulario.ts";

const BOTAO_CANDIDATAR = /candidatar-se|quero me candidatar|candidate-se|apply/i;

/** Procura no JSON de `__NEXT_DATA__` um objeto com cara de vaga (melhor esforço; estrutura não documentada). */
function vagaDoNextData(html: string): VagaExtraida | null {
  const bruto = /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html)?.[1];
  if (!bruto) return null;
  let json: unknown;
  try {
    json = JSON.parse(bruto);
  } catch {
    return null;
  }
  const pilha: unknown[] = [json];
  while (pilha.length > 0) {
    const atual = pilha.pop();
    if (atual === null || typeof atual !== "object") continue;
    const o = atual as Record<string, unknown>;
    const cargo =
      typeof o.name === "string" ? o.name : typeof o.title === "string" ? o.title : null;
    const descricao = typeof o.description === "string" ? o.description : null;
    if (cargo && descricao && descricao.length > 50) {
      const empresa = [o.careerPageName, o.companyName, o.company].find(
        (v): v is string => typeof v === "string",
      );
      const r = esquemaVagaExtraida.safeParse({
        empresa: empresa ?? "Empresa (Gupy)",
        cargo,
        descricao: htmlParaTexto(descricao),
        ...(typeof o.publishedDate === "string"
          ? { publicadaEm: o.publishedDate.slice(0, 10) }
          : {}),
      });
      if (r.success) return r.data;
    }
    pilha.push(...Object.values(o));
  }
  return null;
}

/**
 * Gupy (*.gupy.io). A candidatura exige a conta Gupy global (login manual uma vez) e acontece em etapas.
 * Os testes da Gupy nunca são automatizados: a etapa de teste após o envio vira PENDENTE_TESTE.
 * Fluxo real não verificado: o spike exige candidaturas reais (ver docs/spikes/gupy.md).
 */
export const definicaoGupy: DefinicaoConector = {
  motor: "gupy",
  versao: "1.0.0",
  urlFormulario: (url) => url,
  camposSoNoAplicar: true,
  autenticacao: "global",
  async abrir(pagina) {
    const botao = pagina
      .getByRole("button", { name: BOTAO_CANDIDATAR })
      .or(pagina.getByRole("link", { name: BOTAO_CANDIDATAR }))
      .first();
    if (await botao.isVisible({ timeout: 3000 }).catch(() => false)) {
      await botao.click();
      await pagina.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    }
  },
  etapas: { proximo: /continuar|pr[oó]xim[oa]|avan[cç]ar|salvar e continuar|next/i, maxEtapas: 8 },
  seletorEnviar:
    "button:has-text('Finalizar candidatura'), button:has-text('Enviar candidatura'), button:has-text('Concluir candidatura')",
  confirmacao: {
    texto: /candidatura (realizada|enviada|conclu[ií]da)|voc[eê] se candidatou|parab[eé]ns/i,
    pendenteTeste:
      /realize (o|os) testes?|etapa de testes|fazer (o|os) testes?|responder (o|os) testes?|comece o teste/i,
  },
  async extrairVaga(url, sinal, deps) {
    const pagina = await deps.leitor.ler(url, sinal);
    return extrairJsonLd(pagina.html) ?? vagaDoNextData(pagina.html);
  },
};

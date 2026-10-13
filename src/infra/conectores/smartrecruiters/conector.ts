import { z } from "zod";
import { htmlParaTexto } from "#infra/extracao/html-texto.ts";
import type { DefinicaoConector } from "../base/conector-formulario.ts";
import { comParametro, dataCurta } from "../base/util.ts";

const secao = z.object({ text: z.string().optional() }).loose().optional();
/** Resposta de `GET api.smartrecruiters.com/v1/companies/<empresa>/postings/<id>` (verificada em 2026-10-10). */
const esquemaPostagemSr = z.object({
  name: z.string(),
  company: z.object({ name: z.string() }).loose(),
  location: z
    .object({ fullLocation: z.string().optional(), city: z.string().optional() })
    .loose()
    .optional(),
  releasedDate: z.string().optional(),
  typeOfEmployment: z.object({ label: z.string().optional() }).loose().optional(),
  jobAd: z
    .object({
      sections: z
        .object({ jobDescription: secao, qualifications: secao, additionalInformation: secao })
        .loose()
        .default({}),
    })
    .loose()
    .optional(),
});

/**
 * SmartRecruiters (jobs.smartrecruiters.com). A vaga redireciona (`?oga=true`) para o formulário
 * `oneclick-ui`, protegido pelo CAPTCHA da DataDome contra navegadores automatizados: o formulário não pode
 * ser lido no `preparar` (headless) e, no `aplicar`, o Outbox pausa para o usuário resolver o CAPTCHA.
 * Estrutura do formulário não verificada (ver docs/progresso.md).
 */
export const definicaoSmartRecruiters: DefinicaoConector = {
  motor: "smartrecruiters",
  versao: "1.0.0",
  urlFormulario: (url) => comParametro(url, "oga", "true"),
  camposSoNoAplicar: true,
  seletorEnviar: "button[type='submit'], button:has-text('Submit'), button:has-text('Enviar')",
  confirmacao: {
    texto:
      /thank you for applying|application (has been )?(sent|submitted)|candidatura (foi )?enviada|obrigad[oa] por se candidatar/i,
  },
  async extrairVaga(url, sinal, deps) {
    const m = /^\/([^/]+)\/(\d+)/.exec(new URL(url).pathname);
    if (!m) return null;
    const p = await deps.http.obterJson(
      `https://api.smartrecruiters.com/v1/companies/${m[1] ?? ""}/postings/${m[2] ?? ""}`,
      esquemaPostagemSr,
      sinal,
    );
    const secoes = p.jobAd?.sections ?? {};
    const descricao = [
      secoes.jobDescription?.text,
      secoes.qualifications?.text,
      secoes.additionalInformation?.text,
    ]
      .filter((t): t is string => typeof t === "string" && t.length > 0)
      .map((t) => htmlParaTexto(t))
      .join("\n\n");
    const publicada = dataCurta(p.releasedDate);
    const local = p.location?.fullLocation ?? p.location?.city;
    return {
      empresa: p.company.name,
      cargo: p.name,
      descricao: descricao || p.name,
      ...(local ? { localidade: local } : {}),
      ...(publicada ? { publicadaEm: publicada } : {}),
      ...(p.typeOfEmployment?.label ? { regimeTexto: p.typeOfEmployment.label } : {}),
    };
  },
};

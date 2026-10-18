import { z } from "zod";

/** Dados mínimos da vaga obtidos por API, JSON-LD ou LLM. */
export const esquemaVagaExtraida = z.object({
  empresa: z.string().min(1),
  cargo: z.string().min(1),
  descricao: z.string().min(1),
  localidade: z.string().min(1).optional(),
  publicadaEm: z.string().min(1).optional(),
  regimeTexto: z.string().min(1).optional(),
  urlCandidatura: z.string().min(1).optional(),
});
export type VagaExtraida = z.infer<typeof esquemaVagaExtraida>;

/** Canais que alguns ATS anexam ao nome da empresa ("Stone - Linkedin", "Acme (Indeed)"). */
const SUFIXO_CANAL =
  /\s*(?:[-–—|·]\s*|\()(?:linkedin|indeed|glassdoor|gupy|catho|infojobs|vagas(?:\.com)?|trampos|programathor|jobs?|careers?|carreiras?)\)?\s*$/i;

/** Nome da empresa sem espaços nas pontas nem o sufixo de canal de divulgação. */
export function normalizarEmpresa(nome: string): string {
  const limpo = nome.replace(/\s+/g, " ").trim();
  const semCanal = limpo.replace(SUFIXO_CANAL, "").trim();
  return semCanal || limpo;
}

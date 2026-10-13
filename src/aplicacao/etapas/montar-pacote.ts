import { esquemaRespostasSalvas, type PacoteCandidatura } from "#dominio/respostas/pacote.ts";
import type { Vaga } from "#dominio/vagas/vaga.ts";
import type { ArmazemArtefatos } from "../portas/armazem-artefatos.ts";
import type { ArmazemCurriculo } from "../portas/armazem-curriculo.ts";
import { contatoDo } from "./responder-campos.ts";

export interface DepsMontarPacote {
  readonly curriculo: Pick<ArmazemCurriculo, "lerMaster">;
  readonly artefatos: Pick<
    ArmazemArtefatos,
    "caminho" | "caminhoMaster" | "lerJson" | "lerTexto" | "existe"
  >;
  readonly gupyAnexoPorCandidatura: boolean;
}

/**
 * Pacote do `aplicar`: PDF (camaleão, ou o genérico na Gupy quando o anexo não é congelado por
 * candidatura), respostas de `respostas.json`, carta e contato do master. Não carrega o perfil.
 */
export function montarPacote(deps: DepsMontarPacote, vaga: Vaga): PacoteCandidatura {
  const anexoGenerico = vaga.motor === "gupy" && !deps.gupyAnexoPorCandidatura;
  const carta = deps.artefatos.lerTexto(vaga.id, "carta.md")?.trim();
  return {
    vagaId: vaga.id,
    idioma: vaga.idioma === "pt" ? "pt" : "en",
    pdfCurriculo: anexoGenerico
      ? deps.artefatos.caminhoMaster("pdf")
      : deps.artefatos.caminho(vaga.id, "pdf-curriculo"),
    ...(deps.artefatos.existe(vaga.id, "pdf-carta")
      ? { pdfCarta: deps.artefatos.caminho(vaga.id, "pdf-carta") }
      : {}),
    ...(carta ? { carta } : {}),
    respostas: deps.artefatos.lerJson(vaga.id, "respostas.json", esquemaRespostasSalvas) ?? [],
    contato: contatoDo(deps.curriculo.lerMaster()),
  };
}

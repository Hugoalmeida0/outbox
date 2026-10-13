import { montarDocumento, paraTexto } from "#dominio/curriculo/documento.ts";
import type { ArmazemArtefatos } from "../portas/armazem-artefatos.ts";
import type { ArmazemCurriculo } from "../portas/armazem-curriculo.ts";
import type { RenderizadorDocumentos } from "../portas/renderizador-documentos.ts";

export interface DepsRenderizarMaster {
  readonly curriculo: Pick<ArmazemCurriculo, "lerMaster" | "atualizadoEm">;
  readonly artefatos: Pick<
    ArmazemArtefatos,
    "caminhoMaster" | "gravarTextoMaster" | "masterGeradoEm"
  >;
  readonly renderizador: RenderizadorDocumentos;
}

/** Gera o PDF e o texto do master genérico (sem tailoring) em `dados/master/`. */
export async function renderizarMaster(
  deps: DepsRenderizarMaster,
  sinal: AbortSignal,
): Promise<{ pdf: string; paginas: number }> {
  const master = deps.curriculo.lerMaster();
  const documento = montarDocumento(master, null, master.idioma);
  const pdf = deps.artefatos.caminhoMaster("pdf");
  const { paginas } = await deps.renderizador.renderizarCurriculo(documento, pdf, sinal);
  deps.artefatos.gravarTextoMaster(paraTexto(documento));
  return { pdf, paginas };
}

/** Regera o master genérico quando nunca foi gerado ou quando o master mudou depois. */
export async function garantirMasterGenerico(
  deps: DepsRenderizarMaster,
  sinal: AbortSignal,
): Promise<void> {
  const gerado = deps.artefatos.masterGeradoEm();
  if (gerado === null || gerado < deps.curriculo.atualizadoEm())
    await renderizarMaster(deps, sinal);
}

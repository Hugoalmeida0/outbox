import { montarDocumento, paraTexto } from "#dominio/curriculo/documento.ts";
import { encaixarEmUmaPagina, todasAsSkills } from "#dominio/curriculo/encaixe.ts";
import { aplicarNuncaListar } from "#dominio/curriculo/nunca-listar.ts";
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
  const master = aplicarNuncaListar(deps.curriculo.lerMaster());
  const pdf = deps.artefatos.caminhoMaster("pdf");
  const encaixe = await encaixarEmUmaPagina(
    montarDocumento(master, null, master.idioma),
    todasAsSkills(master),
    (doc) => deps.renderizador.renderizarCurriculo(doc, pdf, sinal),
  );
  deps.artefatos.gravarTextoMaster(paraTexto(encaixe.documento));
  return { pdf, paginas: encaixe.paginas };
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

import { z } from "zod";
import { esquemaVagaExtraida, type VagaExtraida } from "#dominio/vagas/vaga-extraida.ts";
import type { Vaga } from "#dominio/vagas/vaga.ts";
import type { ArmazemArtefatos } from "../portas/armazem-artefatos.ts";
import { ErroExtracao, ErroVagaIndisponivel } from "../portas/erros.ts";
import type { ExtratorVagas } from "../portas/extrator-vagas.ts";
import type { GeradorEstruturado } from "../portas/gerador-estruturado.ts";
import type { RepositorioVagas } from "../portas/repositorio-vagas.ts";

const LIMITE_TEXTO_PAGINA = 60_000;

export interface DepsExtrairVaga {
  readonly extrator: ExtratorVagas;
  readonly gerador: GeradorEstruturado;
  readonly artefatos: Pick<ArmazemArtefatos, "gravarJson" | "gravarTexto" | "pastaLlm">;
  readonly vagas: Pick<RepositorioVagas, "atualizar">;
}

/** Resposta do LLM quando o texto da página é um erro (404, vaga encerrada), não uma vaga. */
const esquemaPaginaIndisponivel = z.object({ indisponivel: z.literal(true) });

/** Extrai a vaga (API/JSON-LD; sem estrutura, o LLM lê o texto da página) e grava `vaga.json`. */
export async function extrairVaga(
  deps: DepsExtrairVaga,
  vaga: Vaga,
  url: string,
  sinal: AbortSignal,
): Promise<VagaExtraida> {
  const { estruturada, textoPagina } = await deps.extrator.extrair(url, vaga.motor, sinal);
  if (!estruturada && textoPagina.trim() === "")
    throw new ErroExtracao(`a página da vaga ${url} está vazia`);
  const lida =
    estruturada ??
    (await deps.gerador.gerar(
      {
        tarefa: "extrair-vaga",
        variaveis: { url },
        conteudoNaoConfiavel: { textoPagina: textoPagina.slice(0, LIMITE_TEXTO_PAGINA) },
        schema: esquemaVagaExtraida.or(esquemaPaginaIndisponivel),
        pastaLog: deps.artefatos.pastaLlm(vaga.id),
      },
      sinal,
    ));
  if ("indisponivel" in lida) {
    throw new ErroVagaIndisponivel(
      `a vaga ${url} não está mais disponível (página de erro ou vaga encerrada)`,
    );
  }
  const extraida = lida;
  deps.artefatos.gravarJson(vaga.id, "vaga.json", extraida);
  deps.artefatos.gravarTexto(
    vaga.id,
    "descricao.md",
    `# ${extraida.cargo} — ${extraida.empresa}\n\n${extraida.descricao}\n`,
  );
  deps.vagas.atualizar(vaga.id, {
    empresa: extraida.empresa,
    cargo: extraida.cargo,
    localidade: extraida.localidade ?? null,
    publicadaEm: extraida.publicadaEm ?? null,
  });
  return extraida;
}

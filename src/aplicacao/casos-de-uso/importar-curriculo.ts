import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import { validar } from "#dominio/compartilhado/validar.ts";
import { esquemaMaster, esquemaMasterImportado, type Master } from "#dominio/curriculo/master.ts";
import type { ArmazemCurriculo } from "../portas/armazem-curriculo.ts";
import type { GeradorEstruturado } from "../portas/gerador-estruturado.ts";

export interface DepsImportarCurriculo {
  readonly curriculo: Pick<
    ArmazemCurriculo,
    "existeMaster" | "gravarMasterNovo" | "garantirArquivosAuxiliares"
  >;
  readonly gerador: GeradorEstruturado;
}

export interface EntradaImportarCurriculo {
  readonly caminhoArquivo: string;
  readonly ehPdf: boolean;
  /** Texto do currículo (.docx, .md, .txt); ausente para PDF, lido pelo próprio LLM. */
  readonly texto?: string;
  readonly sobrescrever: boolean;
  readonly pastaLog?: string;
}

export interface SaidaImportarCurriculo {
  readonly backup?: string;
  readonly criados: readonly string[];
  readonly master: Master;
}

/** Converte o currículo atual no master estruturado (`curriculo/master.yaml`) via LLM. */
export async function importarCurriculo(
  deps: DepsImportarCurriculo,
  entrada: EntradaImportarCurriculo,
  sinal: AbortSignal,
): Promise<SaidaImportarCurriculo> {
  if (deps.curriculo.existeMaster() && !entrada.sobrescrever) {
    throw new ErroUsuario("master.yaml já existe; use --sobrescrever");
  }
  if (!entrada.ehPdf && (entrada.texto ?? "").trim() === "") {
    throw new ErroUsuario(`o arquivo ${entrada.caminhoArquivo} está vazio`);
  }
  const importado = await deps.gerador.gerar(
    {
      tarefa: "importar-curriculo",
      variaveis: {
        fonte: entrada.ehPdf
          ? `O currículo está no arquivo PDF ${entrada.caminhoArquivo}: leia-o com a ferramenta Read.`
          : "O conteúdo do currículo está na entrada abaixo.",
      },
      conteudoNaoConfiavel: {
        curriculo: entrada.ehPdf
          ? "(conteúdo no arquivo PDF indicado acima)"
          : (entrada.texto ?? ""),
      },
      schema: esquemaMasterImportado,
      ...(entrada.ehPdf ? { arquivosLeitura: [entrada.caminhoArquivo] } : {}),
      ...(entrada.pastaLog ? { pastaLog: entrada.pastaLog } : {}),
    },
    sinal,
  );
  const master = validar(esquemaMaster, importado, "master importado");
  const { backup } = deps.curriculo.gravarMasterNovo(master, {
    sobrescrever: entrada.sobrescrever,
  });
  const criados = deps.curriculo.garantirArquivosAuxiliares();
  return { ...(backup ? { backup } : {}), criados, master };
}

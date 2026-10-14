import { readFileSync } from "node:fs";
import { Command } from "commander";
import { criarContainer, type Container, type NivelLog } from "#composicao";
import { cores } from "./apresentacao/cores.ts";
import { codigoDoErro, ehErroPrevisto, mensagemDoErro } from "./codigos-saida.ts";
import type { ContextoComando, Saida } from "./contexto.ts";
import { criarSaidaTerminal } from "./saida-terminal.ts";
import { instalarSinais, type AlvoSinais } from "./sinais.ts";

export interface DependenciasCli {
  readonly saida?: Saida;
  readonly fabricarContainer?: () => Container;
  readonly alvoSinais?: AlvoSinais;
  readonly sair?: (codigo: number) => void;
}

const COR_DO_NIVEL: Readonly<Record<NivelLog, (texto: string) => string>> = {
  depurar: cores.cinza,
  informar: (texto) => texto,
  avisar: cores.amarelo,
  erro: cores.vermelho,
};

const TITULOS_AJUDA: Readonly<Record<string, string>> = {
  "Usage:": "Uso:",
  "Options:": "Opções:",
  "Commands:": "Comandos:",
  "Arguments:": "Argumentos:",
};

function versao(): string {
  const pacote = JSON.parse(
    readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
  ) as {
    version?: string;
  };
  return pacote.version ?? "0.0.0";
}

/** Define os comandos. Cada ação importa o seu módulo sob demanda (inicialização rápida, AC31). */
function criarPrograma(ctx: ContextoComando, definirCodigo: (codigo: number) => void): Command {
  const programa = new Command()
    .name("outbox")
    .description("Candidatura assistida com currículo camaleão. Nunca envia sem a sua confirmação.")
    .version(versao(), "-v, --version", "mostra a versão")
    .helpOption("-h, --help", "mostra a ajuda")
    .helpCommand("ajuda [comando]", "mostra a ajuda de um comando")
    .showHelpAfterError("(use --help para ver as opções)")
    .configureHelp({ styleTitle: (titulo) => TITULOS_AJUDA[titulo] ?? titulo })
    .exitOverride()
    .configureOutput({
      writeOut: (texto) => {
        ctx.saida.escrever(texto.trimEnd());
      },
      writeErr: (texto) => {
        ctx.saida.erro(texto.trimEnd());
      },
    });

  programa
    .command("importar")
    .description("converte o seu currículo (.pdf, .docx, .md ou .txt) em curriculo/master.yaml")
    .argument("<arquivo>", "currículo atual")
    .option("--sobrescrever", "substitui o master existente (com backup)")
    .action(async (arquivo: string, opcoes: Record<string, unknown>) => {
      const { comandoImportar } = await import("./comandos/importar.ts");
      definirCodigo(await comandoImportar(ctx, { arquivo, ...opcoes }));
    });

  programa
    .command("adicionar")
    .description("adiciona URLs de vagas à fila")
    .argument("[urls...]", "URLs de vagas")
    .option("-a, --arquivo <caminho>", "arquivo com uma URL por linha (# comenta)")
    .action(async (urls: string[], opcoes: Record<string, unknown>) => {
      const { comandoAdicionar } = await import("./comandos/adicionar.ts");
      definirCodigo(comandoAdicionar(ctx, { urls, ...opcoes }));
    });

  programa
    .command("preparar")
    .description("resolve, analisa e gera o currículo camaleão das vagas NOVA")
    .option("--forcar", "processa mesmo abaixo da aderência mínima")
    .option("--paralelo <n>", "vagas em paralelo (1 a 8)")
    .option("--reavaliar", "reavalia as descartadas usando os gaps aprendidos")
    .action(async (opcoes: Record<string, unknown>) => {
      const { comandoPreparar } = await import("./comandos/preparar.ts");
      definirCodigo(await comandoPreparar(ctx, opcoes));
    });

  programa
    .command("aplicar")
    .description("preenche os formulários das vagas PRONTA e abre a revisão antes de cada envio")
    .option("--simular", "preenche e revisa, mas não envia")
    .option("--id <id>", "aplica só nesta vaga")
    .action(async (opcoes: Record<string, unknown>) => {
      const { comandoAplicar } = await import("./comandos/aplicar.ts");
      definirCodigo(await comandoAplicar(ctx, opcoes));
    });

  programa
    .command("status")
    .description("mostra as vagas por status e o que aguarda você")
    .option("--status <STATUS>", "filtra por status")
    .action(async (opcoes: Record<string, unknown>) => {
      const { comandoStatus } = await import("./comandos/status.ts");
      definirCodigo(comandoStatus(ctx, opcoes));
    });

  programa
    .command("retorno")
    .description("registra o retorno de uma candidatura (EM_PROCESSO, OFERTA, RECUSADA ou ENVIADA)")
    .argument("<id>", "id da vaga")
    .argument("<status>", "novo status")
    .option(
      "--etapa <etapa>",
      "triagem, entrevista_rh, tecnica ou final (obrigatória em EM_PROCESSO)",
    )
    .option("--nota <texto>", "anotação livre")
    .action(async (id: string, status: string, opcoes: Record<string, unknown>) => {
      const { comandoRetorno } = await import("./comandos/retorno.ts");
      definirCodigo(comandoRetorno(ctx, { id, status, ...opcoes }));
    });

  programa
    .command("falhas")
    .description("lista as falhas de conector e os motores sem conector")
    .action(async () => {
      const { comandoFalhas } = await import("./comandos/falhas.ts");
      definirCodigo(comandoFalhas(ctx));
    });

  programa
    .command("navegador")
    .description("abre o navegador do Outbox para fazer logins")
    .action(async () => {
      const { comandoNavegador } = await import("./comandos/navegador.ts");
      definirCodigo(await comandoNavegador(ctx));
    });

  programa
    .command("renderizar-master")
    .description("gera o PDF genérico do master em dados/master/")
    .action(async () => {
      const { comandoRenderizarMaster } = await import("./comandos/renderizar-master.ts");
      definirCodigo(await comandoRenderizarMaster(ctx));
    });

  return programa;
}

/** Ponto de entrada da CLI: devolve o código de saída (0, 1, 2 ou 130). */
export async function executar(
  argv: readonly string[],
  deps: DependenciasCli = {},
): Promise<number> {
  const saida = deps.saida ?? criarSaidaTerminal();
  const controle = new AbortController();
  const estado: { container: Container | null; codigo: number } = { container: null, codigo: 0 };
  // O log do terminal passa pela `Saida` para sair acima da região viva do progresso, sem embaralhá-la.
  const fabricar =
    deps.fabricarContainer ??
    (() =>
      criarContainer({
        escreverTerminal: (linha, nivel) => {
          saida.erro(COR_DO_NIVEL[nivel](linha));
        },
      }));
  const ctx: ContextoComando = {
    container: () => (estado.container ??= fabricar()),
    saida,
    sinal: controle.signal,
    cancelar: () => {
      controle.abort();
    },
  };
  const removerSinais = instalarSinais(
    controle,
    (mensagem) => {
      saida.erro(cores.amarelo(mensagem));
    },
    deps.sair ??
      ((codigo) => {
        process.exit(codigo);
      }),
    deps.alvoSinais,
  );

  try {
    await criarPrograma(ctx, (codigo) => {
      estado.codigo = codigo;
    }).parseAsync([...argv]);
    return controle.signal.aborted && estado.codigo === 0 ? 130 : estado.codigo;
  } catch (erro) {
    const mensagem = mensagemDoErro(erro);
    if (mensagem !== null) {
      // Erro inesperado: a mensagem vai ao terminal pelo registrador, com o stack só no arquivo de log.
      if (!ehErroPrevisto(erro) && estado.container)
        estado.container.registrarErro(`erro: ${mensagem}`, erro);
      else saida.erro(cores.vermelho(`erro: ${mensagem}`));
    }
    return controle.signal.aborted ? 130 : codigoDoErro(erro);
  } finally {
    removerSinais();
    await estado.container?.encerrar();
  }
}

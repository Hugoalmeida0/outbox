import type { Saida } from "./contexto.ts";

/** O que a saída usa de `process.stdout`/`process.stderr`; os testes passam fluxos em memória. */
export interface FluxoTerminal {
  write(texto: string): unknown;
  readonly isTTY?: boolean | undefined;
  readonly columns?: number | undefined;
}

const LIMPAR_ABAIXO = "\x1b[0J";

/**
 * Saída da CLI em stdout e stderr. Com stderr interativo, oferece a região viva (no stderr): cada escrita
 * apaga o bloco, sai acima dele e o redesenha, para avisos e resultados não se misturarem à animação.
 */
export function criarSaidaTerminal(
  stdout: FluxoTerminal = process.stdout,
  stderr: FluxoTerminal = process.stderr,
): Saida {
  let viva: readonly string[] = [];
  // O cursor fica no início da linha seguinte ao bloco: subir uma linha por linha do bloco volta ao topo.
  const apagar = (): string =>
    viva.length > 0 ? `\x1b[${String(viva.length)}A${LIMPAR_ABAIXO}` : "";
  const mostrar = (): string => viva.map((linha) => `${linha}\n`).join("");

  const escreverEm = (fluxo: FluxoTerminal, texto: string): void => {
    if (viva.length === 0) {
      fluxo.write(`${texto}\n`);
    } else if (fluxo === stderr) {
      stderr.write(`${apagar()}${texto}\n${mostrar()}`);
    } else {
      stderr.write(apagar());
      fluxo.write(`${texto}\n`);
      stderr.write(mostrar());
    }
  };

  const saida: Saida = {
    escrever: (texto) => {
      escreverEm(stdout, texto);
    },
    erro: (texto) => {
      escreverEm(stderr, texto);
    },
  };
  if (stderr.isTTY !== true) return saida;
  return {
    ...saida,
    regiaoViva: {
      desenhar: (linhas) => {
        const antes = apagar();
        viva = [...linhas];
        const quadro = `${antes}${mostrar()}`;
        if (quadro !== "") stderr.write(quadro);
      },
      colunas: () => stderr.columns ?? 80,
    },
  };
}

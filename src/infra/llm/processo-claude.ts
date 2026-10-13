import { spawn as spawnNativo } from "node:child_process";
import spawn from "cross-spawn";
import { z } from "zod";
import { ErroLimiteUso, ErroLlm, ErroMaxTurnos, ErroTimeoutLlm } from "#aplicacao/portas/erros.ts";

/**
 * Verificado em 2026-10-10 com Claude Code 2.1.181: `-p --output-format json` devolve um único objeto
 * com `type`, `subtype`, `is_error`, `result`, `session_id`, `num_turns` e `api_error_status`.
 * `--max-turns` funciona (oculto na ajuda), `--tools ""` desliga as ferramentas e `--bare` não serve
 * (ignora o login por assinatura). O texto exato do erro de limite de uso não pôde ser provocado; a
 * detecção combina `api_error_status = 429` com uma regex tolerante.
 */
const esquemaSaida = z.object({
  type: z.string(),
  subtype: z.string(),
  is_error: z.boolean(),
  result: z.string().optional(),
  session_id: z.string().optional(),
  num_turns: z.number().optional(),
  api_error_status: z.number().nullable().optional(),
});

export interface ResultadoClaude {
  readonly resultado: string;
  readonly sessaoId: string;
  readonly turnos: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface OpcoesExecucao {
  readonly args: readonly string[];
  readonly entrada: string;
  readonly cwd: string;
  readonly timeoutMs: number;
  readonly sinal: AbortSignal;
  readonly env?: Readonly<Record<string, string>>;
}

export type ExecutarClaude = (opcoes: OpcoesExecucao) => Promise<ResultadoClaude>;

const LIMITE_USO = /usage limit|limit reached|rate limit|limite de uso/i;

/** Encerra o processo e seus filhos (no Windows, um `.cmd` deixaria o node filho vivo). */
function encerrarArvore(pid: number | undefined, matar: () => void): void {
  if (pid === undefined) return;
  if (process.platform === "win32") {
    spawnNativo("taskkill", ["/pid", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
  } else {
    matar();
  }
}

function comando(): { exe: string; prefixo: string[] } {
  const bin = process.env.OUTBOX_CLAUDE_BIN;
  if (!bin) return { exe: "claude", prefixo: [] };
  return /\.(m?js|ts)$/.test(bin)
    ? { exe: process.execPath, prefixo: [bin] }
    : { exe: bin, prefixo: [] };
}

/** Interpreta a saída JSON do `claude -p`, convertendo erros em `ErroInfra` tipados. */
export function interpretarSaida(
  stdout: string,
  stderr: string,
  codigo: number | null,
): ResultadoClaude {
  const linha = stdout
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim().startsWith("{"))
    .at(-1);
  let bruto: unknown;
  try {
    bruto = JSON.parse(linha ?? "");
  } catch {
    const detalhe = stderr.trim() || stdout.trim() || `código de saída ${String(codigo)}`;
    if (LIMITE_USO.test(detalhe)) throw new ErroLimiteUso(detalhe);
    throw new ErroLlm(`saída inesperada do claude: ${detalhe.slice(0, 500)}`);
  }
  const saida = esquemaSaida.safeParse(bruto);
  if (!saida.success) throw new ErroLlm("saída do claude sem os campos esperados");
  const s = saida.data;
  const resultado = s.result ?? "";
  if (s.is_error || s.subtype !== "success") {
    if (s.api_error_status === 429 || LIMITE_USO.test(resultado))
      throw new ErroLimiteUso(resultado || undefined);
    if (s.subtype === "error_max_turns") throw new ErroMaxTurnos();
    throw new ErroLlm(
      `claude devolveu erro (${s.subtype}): ${resultado.slice(0, 500)} ${stderr.slice(0, 300)}`.trim(),
    );
  }
  return { resultado, sessaoId: s.session_id ?? "", turnos: s.num_turns ?? 0, stdout, stderr };
}

/** Executa `claude` com o prompt via stdin, com timeout e cancelamento (encerra a árvore de processos). */
export const executarClaude: ExecutarClaude = (opcoes) =>
  new Promise((resolver, rejeitar) => {
    if (opcoes.sinal.aborted) {
      rejeitar(new ErroLlm("cancelado"));
      return;
    }
    const { exe, prefixo } = comando();
    const filho = spawn(exe, [...prefixo, ...opcoes.args], {
      cwd: opcoes.cwd,
      env: { ...process.env, ...opcoes.env },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    const { stdout: saida, stderr: saidaErro, stdin: entradaPadrao } = filho;
    if (!saida || !saidaErro || !entradaPadrao) {
      rejeitar(new ErroLlm("processo do claude sem stdio"));
      return;
    }
    let stdout = "";
    let stderr = "";
    let encerrado: "timeout" | "abort" | null = null;
    saida.setEncoding("utf8").on("data", (d: string) => (stdout += d));
    saidaErro.setEncoding("utf8").on("data", (d: string) => (stderr += d));

    const finalizar = (motivo: "timeout" | "abort"): void => {
      encerrado = motivo;
      encerrarArvore(filho.pid, () => filho.kill("SIGTERM"));
    };
    const temporizador = setTimeout(() => {
      finalizar("timeout");
    }, opcoes.timeoutMs);
    const aoAbortar = (): void => {
      finalizar("abort");
    };
    opcoes.sinal.addEventListener("abort", aoAbortar, { once: true });

    filho.on("error", (erro) => {
      clearTimeout(temporizador);
      rejeitar(
        new ErroLlm(
          `não foi possível executar o claude (está instalado e no PATH?): ${erro.message}`,
          { cause: erro },
        ),
      );
    });
    filho.on("close", (codigo) => {
      clearTimeout(temporizador);
      opcoes.sinal.removeEventListener("abort", aoAbortar);
      if (encerrado === "timeout") {
        rejeitar(
          new ErroTimeoutLlm(
            `o claude não respondeu em ${String(Math.round(opcoes.timeoutMs / 1000))} s`,
          ),
        );
        return;
      }
      if (encerrado === "abort") {
        rejeitar(new ErroLlm("cancelado"));
        return;
      }
      try {
        resolver(interpretarSaida(stdout, stderr, codigo));
      } catch (erro) {
        rejeitar(erro instanceof Error ? erro : new ErroLlm(String(erro)));
      }
    });
    entradaPadrao.on("error", () => {
      // O processo pode encerrar antes de ler todo o stdin; o resultado chega pelo evento close.
    });
    entradaPadrao.end(opcoes.entrada, "utf8");
  });

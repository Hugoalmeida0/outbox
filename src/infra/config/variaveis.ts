// Variáveis de ambiente do Camaleão. Na transição da renomeação (ADR-0026), o nome antigo ainda é lido
// quando o novo falta, com um aviso de depreciação por variável e por processo.
const PREFIXO = "CAMALEAO_";
const PREFIXO_LEGADO = "OUTBOX_";

/** Sufixos lidos com fallback: o que o usuário pode ter configurado antes da renomeação. */
export type NomeVariavel = "LOG" | "CLAUDE_BIN";

export type LerVariavel = (nome: NomeVariavel) => string | undefined;

function avisarNoTerminal(mensagem: string): void {
  process.stderr.write(`aviso: ${mensagem}\n`);
}

/** Leitor com estado próprio de avisos (os testes criam o seu, com ambiente e aviso em memória). */
export function criarLeitorVariaveis(
  ambiente: Readonly<Record<string, string | undefined>> = process.env,
  avisar: (mensagem: string) => void = avisarNoTerminal,
): LerVariavel {
  const avisadas = new Set<NomeVariavel>();
  return (nome) => {
    const atual = ambiente[`${PREFIXO}${nome}`];
    if (atual !== undefined && atual !== "") return atual;
    const legado = ambiente[`${PREFIXO_LEGADO}${nome}`];
    if (legado === undefined || legado === "") return undefined;
    if (!avisadas.has(nome)) {
      avisadas.add(nome);
      avisar(`${PREFIXO_LEGADO}${nome} está obsoleta; use ${PREFIXO}${nome}`);
    }
    return legado;
  };
}

/** Lê `CAMALEAO_<nome>` e, ausente, `OUTBOX_<nome>` (com aviso único por processo). */
export const lerVariavel: LerVariavel = criarLeitorVariaveis();

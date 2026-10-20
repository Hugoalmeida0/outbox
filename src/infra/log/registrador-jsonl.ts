import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { styleText } from "node:util";
import type { ContextoLog, Registrador } from "#aplicacao/portas/registrador.ts";
import type { Relogio } from "#aplicacao/portas/relogio.ts";
import { redigirPii } from "#dominio/falhas/sanitizar.ts";

export const NIVEIS_LOG = ["depurar", "informar", "avisar", "erro"] as const;
export type NivelLog = (typeof NIVEIS_LOG)[number];

const CHAVES_SENSIVEIS =
  /^(senha|password|cpf|rg|datanascimento|salario|salario_atual|diversidade)$/i;

export interface OpcoesRegistrador {
  readonly pastaLogs: string;
  readonly relogio: Relogio;
  /** Lista de PII a redigir; obtida sob demanda (o currículo pode ainda não existir). */
  readonly obterPii: () => readonly string[];
  /** Nível mínimo, normalmente de `CAMALEAO_LOG`. */
  readonly nivel?: NivelLog | undefined;
  readonly escreverTerminal?: (linha: string, nivel: NivelLog) => void;
}

export function nivelDoAmbiente(valor: string | undefined): NivelLog | undefined {
  return (NIVEIS_LOG as readonly string[]).includes(valor ?? "") ? (valor as NivelLog) : undefined;
}

function serializar(valor: unknown, profundidade = 0): unknown {
  if (profundidade > 5) return "[profundo]";
  if (valor instanceof Error) {
    return { nome: valor.name, mensagem: valor.message, stack: valor.stack };
  }
  if (Array.isArray(valor)) return valor.map((v) => serializar(v, profundidade + 1));
  if (valor !== null && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([chave, v]) => [
        chave,
        CHAVES_SENSIVEIS.test(chave) ? "[OMITIDO]" : serializar(v, profundidade + 1),
      ]),
    );
  }
  return valor;
}

const terminalPadrao = (linha: string, nivel: NivelLog): void => {
  const cor =
    nivel === "erro"
      ? "red"
      : nivel === "avisar"
        ? "yellow"
        : nivel === "depurar"
          ? "gray"
          : "reset";
  process.stderr.write(`${styleText(cor, linha)}\n`);
};

/**
 * Registrador com redação obrigatória (ADR-014): terminal a partir de `informar` (ou do nível do
 * ambiente) e JSONL diário em `dados/logs/` a partir de `depurar`.
 */
export class RegistradorJsonl implements Registrador {
  private readonly opcoes: OpcoesRegistrador;
  private readonly minimoArquivo: number;
  private readonly minimoTerminal: number;

  constructor(opcoes: OpcoesRegistrador) {
    this.opcoes = opcoes;
    this.minimoArquivo = NIVEIS_LOG.indexOf(opcoes.nivel ?? "depurar");
    this.minimoTerminal = NIVEIS_LOG.indexOf(opcoes.nivel ?? "informar");
  }

  depurar(mensagem: string, contexto?: ContextoLog): void {
    this.registrar("depurar", mensagem, contexto);
  }
  informar(mensagem: string, contexto?: ContextoLog): void {
    this.registrar("informar", mensagem, contexto);
  }
  avisar(mensagem: string, contexto?: ContextoLog): void {
    this.registrar("avisar", mensagem, contexto);
  }
  erro(mensagem: string, contexto?: ContextoLog): void {
    this.registrar("erro", mensagem, contexto);
  }

  /** Lista de PII; sem currículo disponível, sobra só a redação por chave. */
  private piiSeguro(): readonly string[] {
    try {
      return this.opcoes.obterPii();
    } catch {
      return [];
    }
  }

  private registrar(nivel: NivelLog, mensagem: string, contexto?: ContextoLog): void {
    const indice = NIVEIS_LOG.indexOf(nivel);
    const pii = this.piiSeguro();
    const msg = redigirPii(mensagem, pii);
    if (indice >= this.minimoTerminal) {
      (this.opcoes.escreverTerminal ?? terminalPadrao)(msg, nivel);
    }
    if (indice >= this.minimoArquivo) {
      const ts = this.opcoes.relogio.agoraIso();
      const linha = JSON.stringify({
        ts,
        nivel,
        mensagem: msg,
        contexto: serializar(contexto ?? {}),
      });
      try {
        mkdirSync(this.opcoes.pastaLogs, { recursive: true });
        appendFileSync(
          join(this.opcoes.pastaLogs, `camaleao-${ts.slice(0, 10)}.jsonl`),
          `${redigirPii(linha, pii)}\n`,
        );
      } catch {
        // Falha ao gravar log não interrompe o comando.
      }
    }
  }
}

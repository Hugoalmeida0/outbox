// Configura o executável falso do claude para um teste: roteiro de respostas e registro das chamadas.
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const BINARIO_FALSO = fileURLToPath(new URL("../fakes/claude.mjs", import.meta.url));

export interface RegraClaude {
  readonly contem?: string;
  readonly resultado?: string;
  readonly erro?: "limite" | "max_turns" | "falha" | "texto_invalido" | "saida_longa";
  readonly atrasoMs?: number;
  readonly turnos?: number;
  readonly usos?: number;
}

export interface ChamadaRegistrada {
  readonly args: string[];
  readonly prompt: string;
  readonly env: Record<string, string | undefined>;
}

export interface ClaudeFalso {
  readonly pasta: string;
  chamadas(): ChamadaRegistrada[];
  restaurar(): void;
}

/** Ativa o claude falso via variáveis de ambiente; `restaurar()` desfaz. */
export function usarClaudeFalso(regras: readonly RegraClaude[]): ClaudeFalso {
  const pasta = mkdtempSync(join(tmpdir(), "camaleao-claude-"));
  const roteiro = join(pasta, "roteiro.json");
  const registro = join(pasta, "registro.jsonl");
  writeFileSync(roteiro, JSON.stringify({ regras }));
  const anteriores = {
    bin: process.env.CAMALEAO_CLAUDE_BIN,
    roteiro: process.env.CAMALEAO_CLAUDE_ROTEIRO,
    registro: process.env.CAMALEAO_CLAUDE_REGISTRO,
  };
  process.env.CAMALEAO_CLAUDE_BIN = BINARIO_FALSO;
  process.env.CAMALEAO_CLAUDE_ROTEIRO = roteiro;
  process.env.CAMALEAO_CLAUDE_REGISTRO = registro;
  return {
    pasta,
    chamadas: () =>
      existsSync(registro)
        ? readFileSync(registro, "utf8")
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((l) => JSON.parse(l) as ChamadaRegistrada)
        : [],
    restaurar: () => {
      for (const [chave, nome] of [
        ["bin", "CAMALEAO_CLAUDE_BIN"],
        ["roteiro", "CAMALEAO_CLAUDE_ROTEIRO"],
        ["registro", "CAMALEAO_CLAUDE_REGISTRO"],
      ] as const) {
        const valor = anteriores[chave];
        if (valor === undefined) Reflect.deleteProperty(process.env, nome);
        else process.env[nome] = valor;
      }
    },
  };
}

/** Formata um objeto como resposta do LLM num bloco ```json. */
export function respostaJson(objeto: unknown): string {
  return `Aqui está:\n\`\`\`json\n${JSON.stringify(objeto)}\n\`\`\``;
}

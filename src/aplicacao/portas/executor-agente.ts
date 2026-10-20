import type { PacoteCandidatura } from "#dominio/respostas/pacote.ts";
import type { Vaga } from "#dominio/vagas/vaga.ts";
import type { FormularioAberto } from "./formulario-aberto.ts";

export interface EntradaAgente {
  readonly vaga: Vaga;
  readonly urlCandidatura: string;
  readonly pacote: PacoteCandidatura;
  /** Hosts em que o camaleao-segredos aceita preencher dados protegidos (ADR-012). */
  readonly hostsPermitidos: readonly string[];
  readonly contextoFalha?: { readonly passo: string; readonly erro: string; readonly url: string };
  readonly saldo: { readonly turnos: number; readonly ms: number };
}

export type ResultadoAgente =
  | {
      readonly tipo: "pronto";
      readonly formulario: FormularioAberto;
      readonly passos: string[];
      readonly perguntasRespondidasNaHora: { readonly rotulo: string; readonly valor: string }[];
      readonly motorDetectado?: string;
    }
  | { readonly tipo: "sem_formulario" | "easy_apply" | "teto"; readonly passos: string[] };

/** Fallback agêntico: preenche um formulário qualquer com o LLM operando o navegador. */
export interface ExecutorAgente {
  preencher(
    entrada: EntradaAgente,
    ctx: { aguardarUsuario(mensagem: string): Promise<void> },
    sinal: AbortSignal,
  ): Promise<ResultadoAgente>;
}

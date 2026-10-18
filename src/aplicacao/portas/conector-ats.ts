import type { Campo } from "#dominio/respostas/campo.ts";
import type { PacoteCandidatura, RespostaSugerida } from "#dominio/respostas/pacote.ts";
import type { Motor } from "#dominio/vagas/motores.ts";
import type { VagaExtraida } from "#dominio/vagas/vaga-extraida.ts";
import type { FormularioAberto } from "./formulario-aberto.ts";

export interface CtxPreenchimento {
  /** Responde campos encontrados só durante o preenchimento (ex.: Gupy). */
  responderAoVivo(campos: readonly Campo[]): Promise<RespostaSugerida[]>;
  /**
   * A resposta não casou com nenhuma opção do campo: escolhe de novo entre as opções reais exibidas na
   * página. `null` quando não há escolha possível.
   */
  reescolher?(campo: Campo, opcoes: readonly string[]): Promise<string | null>;
  /** Pausa para o usuário resolver algo no navegador (login, CAPTCHA, verificação de e-mail). */
  aguardarUsuario(mensagem: string): Promise<void>;
  /** Andamento para o usuário: o preenchimento leva de segundos a minutos e não pode parecer travado. */
  informar(mensagem: string): void;
}

/** Conector determinístico de um ATS (Strategy, ADR-010). Nunca envia o formulário. */
export interface ConectorAts {
  readonly motor: Motor;
  readonly versao: string;
  extrairVaga?(url: string, sinal: AbortSignal): Promise<VagaExtraida | null>;
  /** Campos do formulário legíveis sem login; `null` quando só aparecem no `aplicar`. */
  lerCampos?(url: string, sinal: AbortSignal): Promise<Campo[] | null>;
  /** Abre e preenche o formulário; lança `ErroFalhaConector` em caso de falha. */
  abrirEPreencher(
    url: string,
    pacote: PacoteCandidatura,
    ctx: CtxPreenchimento,
    sinal: AbortSignal,
  ): Promise<FormularioAberto>;
}

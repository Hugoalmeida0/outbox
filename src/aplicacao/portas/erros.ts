import { ErroOutbox } from "#dominio/compartilhado/erros.ts";
import type { FormularioAberto } from "./formulario-aberto.ts";

/** Falha externa (LLM, rede, navegador, sites). As portas declaram quais destas lançam. */
export class ErroInfra extends ErroOutbox {
  constructor(mensagem: string, opcoes?: ErrorOptions, codigo = "infra") {
    super(codigo, mensagem, opcoes);
  }
}

export class ErroLlm extends ErroInfra {
  constructor(mensagem: string, opcoes?: ErrorOptions) {
    super(mensagem, opcoes, "llm");
  }
}

/** Limite de uso da assinatura do Claude atingido: encerra o lote de forma ordenada. */
export class ErroLimiteUso extends ErroInfra {
  constructor(mensagem = "limite de uso do Claude atingido", opcoes?: ErrorOptions) {
    super(mensagem, opcoes, "limite_uso");
  }
}

export class ErroTimeoutLlm extends ErroInfra {
  constructor(mensagem = "tempo limite do LLM esgotado", opcoes?: ErrorOptions) {
    super(mensagem, opcoes, "timeout_llm");
  }
}

export class ErroMaxTurnos extends ErroInfra {
  constructor(mensagem = "número máximo de turnos atingido", opcoes?: ErrorOptions) {
    super(mensagem, opcoes, "max_turnos");
  }
}

export class ErroHttp extends ErroInfra {
  readonly status: number | undefined;

  constructor(mensagem: string, status?: number, opcoes?: ErrorOptions) {
    super(mensagem, opcoes, "http");
    this.status = status;
  }
}

export class ErroNavegador extends ErroInfra {
  constructor(mensagem: string, opcoes?: ErrorOptions) {
    super(mensagem, opcoes, "navegador");
  }
}

export class ErroResolucao extends ErroInfra {
  constructor(mensagem: string, opcoes?: ErrorOptions) {
    super(mensagem, opcoes, "resolucao");
  }
}

export class ErroAgregadorExigeLogin extends ErroInfra {
  constructor(
    mensagem = "o agregador exige login: faça login com `outbox navegador` ou cole a URL do ATS",
    opcoes?: ErrorOptions,
  ) {
    super(mensagem, opcoes, "agregador_exige_login");
  }
}

export class ErroExtracao extends ErroInfra {
  constructor(mensagem: string, opcoes?: ErrorOptions) {
    super(mensagem, opcoes, "extracao");
  }
}

/** Falha de um conector determinístico num passo; carrega o formulário parcial para o agente assumir. */
export class ErroFalhaConector extends ErroInfra {
  readonly passo: string;
  readonly seletor: string | null;
  readonly formulario: FormularioAberto | undefined;

  constructor(
    passo: string,
    seletor: string | null,
    formulario?: FormularioAberto,
    opcoes?: ErrorOptions,
  ) {
    const causa = opcoes?.cause instanceof Error ? `: ${opcoes.cause.message}` : "";
    super(`conector falhou no passo "${passo}"${causa}`, opcoes, "falha_conector");
    this.passo = passo;
    this.seletor = seletor;
    this.formulario = formulario;
  }
}

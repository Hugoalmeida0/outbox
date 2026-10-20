import type { ZodError } from "zod";

/** Base de todos os erros do Camaleão. `codigo` identifica a família do erro de forma estável. */
export class ErroCamaleao extends Error {
  readonly codigo: string;

  constructor(codigo: string, mensagem: string, opcoes?: ErrorOptions) {
    super(mensagem, opcoes);
    this.codigo = codigo;
    this.name = new.target.name;
  }
}

/** Entrada inválida fornecida pelo usuário (arquivo inexistente, flag inválida, master já existe). */
export class ErroUsuario extends ErroCamaleao {
  constructor(mensagem: string, opcoes?: ErrorOptions) {
    super("usuario", mensagem, opcoes);
  }
}

/** Violação de regra de negócio. */
export class ErroDominio extends ErroCamaleao {}

/** Dado que não respeita um schema do domínio. */
export class ErroValidacao extends ErroDominio {
  readonly caminho: string;
  readonly detalhe: string;

  constructor(caminho: string, detalhe: string, opcoes?: ErrorOptions) {
    super("validacao", caminho ? `${caminho}: ${detalhe}` : detalhe, opcoes);
    this.caminho = caminho;
    this.detalhe = detalhe;
  }

  /** Converte o primeiro problema de um `ZodError` em `ErroValidacao`, prefixando o contexto. */
  static deZod(erro: ZodError, contexto: string): ErroValidacao {
    const primeiro = erro.issues[0];
    const caminho = [contexto, ...(primeiro?.path ?? []).map(String)].filter(Boolean).join(".");
    return new ErroValidacao(caminho, primeiro?.message ?? "valor inválido", { cause: erro });
  }
}

/** Transição de status não permitida pela máquina de estados. */
export class ErroTransicaoInvalida extends ErroDominio {
  readonly de: string;
  readonly para: string;
  readonly aceitas: readonly string[];

  constructor(de: string, para: string, aceitas: readonly string[], motivo?: string) {
    const detalhe = motivo ?? `transição ${de} → ${para} não permitida`;
    super(
      "transicao_invalida",
      `${detalhe}. Aceitas a partir de ${de}: ${aceitas.join(", ") || "nenhuma"}`,
    );
    this.de = de;
    this.para = para;
    this.aceitas = aceitas;
  }
}

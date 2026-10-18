export interface ResumoRevisao {
  readonly vagaId: number;
  readonly empresa: string;
  readonly cargo: string;
  readonly motor: string;
  readonly rota: string;
  readonly url: string;
  readonly aderencia: number | null;
  readonly atsAntes: number | null;
  readonly atsDepois: number | null;
  readonly gapsRestantes: readonly string[];
  readonly alertas: readonly string[];
  readonly respostas: readonly {
    readonly rotulo: string;
    readonly valor: string;
    readonly nova: boolean;
    /** Havia resposta, mas o campo está vazio na página (o preenchimento falhou ou foi pulado). */
    readonly vaziaNaPagina?: boolean;
  }[];
  readonly cartaInicio?: string;
  readonly caminhoPdf: string;
}

export interface OpcaoEscolha<T extends string> {
  readonly valor: T;
  readonly rotulo: string;
}

/** Perguntas e avisos ao usuário. Implementada pela interface (CLI). */
export interface Interacao {
  perguntarSimNao(mensagem: string): Promise<boolean>;
  perguntarNumero(mensagem: string, opcoes?: { min?: number; max?: number }): Promise<number>;
  perguntarTexto(mensagem: string): Promise<string>;
  escolher<T extends string>(mensagem: string, opcoes: readonly OpcaoEscolha<T>[]): Promise<T>;
  aguardarUsuario(mensagem: string): Promise<void>;
  exibirResumoRevisao(resumo: ResumoRevisao): void;
  informar(mensagem: string): void;
  abrirArquivo(caminho: string): Promise<void>;
}

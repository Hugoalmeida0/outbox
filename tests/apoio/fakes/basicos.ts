// Fakes simples de portas: relógio, registrador, notificador e interação roteirizada.
import type { Interacao, OpcaoEscolha, ResumoRevisao } from "#aplicacao/portas/interacao.ts";
import type { Notificador } from "#aplicacao/portas/notificador.ts";
import type { ContextoLog, Registrador } from "#aplicacao/portas/registrador.ts";
import type { Relogio } from "#aplicacao/portas/relogio.ts";

export class RelogioFixo implements Relogio {
  private atual: Date;

  constructor(iso = "2026-10-10T10:00:00-03:00") {
    this.atual = new Date(iso);
  }

  agora(): Date {
    return new Date(this.atual);
  }

  agoraIso(): string {
    return `${this.hoje()}T${this.atual.toISOString().slice(11, 19)}-00:00`;
  }

  hoje(): string {
    return this.atual.toISOString().slice(0, 10);
  }

  avancar(ms: number): void {
    this.atual = new Date(this.atual.getTime() + ms);
  }
}

export interface EntradaLog {
  readonly nivel: "depurar" | "informar" | "avisar" | "erro";
  readonly mensagem: string;
  readonly contexto: ContextoLog | undefined;
}

export class RegistradorMemoria implements Registrador {
  readonly entradas: EntradaLog[] = [];

  depurar(mensagem: string, contexto?: ContextoLog): void {
    this.entradas.push({ nivel: "depurar", mensagem, contexto });
  }
  informar(mensagem: string, contexto?: ContextoLog): void {
    this.entradas.push({ nivel: "informar", mensagem, contexto });
  }
  avisar(mensagem: string, contexto?: ContextoLog): void {
    this.entradas.push({ nivel: "avisar", mensagem, contexto });
  }
  erro(mensagem: string, contexto?: ContextoLog): void {
    this.entradas.push({ nivel: "erro", mensagem, contexto });
  }
}

export class NotificadorEspiao implements Notificador {
  readonly notificacoes: { titulo: string; mensagem: string }[] = [];

  notificar(titulo: string, mensagem: string): void {
    this.notificacoes.push({ titulo, mensagem });
  }
}

type RespostaRoteiro = boolean | number | string;

/**
 * Interação com respostas pré-programadas, consumidas em ordem. Falha se receber uma pergunta não
 * prevista, para que o teste declare exatamente o diálogo esperado.
 */
export class InteracaoRoteirizada implements Interacao {
  readonly perguntas: string[] = [];
  readonly resumos: ResumoRevisao[] = [];
  readonly informacoes: string[] = [];
  readonly arquivosAbertos: string[] = [];
  private readonly roteiro: RespostaRoteiro[];

  constructor(roteiro: readonly RespostaRoteiro[] = []) {
    this.roteiro = [...roteiro];
  }

  private proxima(mensagem: string): RespostaRoteiro {
    this.perguntas.push(mensagem);
    const resposta = this.roteiro.shift();
    if (resposta === undefined) throw new Error(`pergunta não prevista no roteiro: ${mensagem}`);
    return resposta;
  }

  perguntarSimNao(mensagem: string): Promise<boolean> {
    return Promise.resolve(this.proxima(mensagem) === true);
  }
  perguntarNumero(mensagem: string): Promise<number> {
    return Promise.resolve(Number(this.proxima(mensagem)));
  }
  perguntarTexto(mensagem: string): Promise<string> {
    return Promise.resolve(String(this.proxima(mensagem)));
  }
  escolher<T extends string>(mensagem: string, opcoes: readonly OpcaoEscolha<T>[]): Promise<T> {
    const valor = String(this.proxima(mensagem));
    const opcao = opcoes.find((o) => o.valor === valor);
    if (!opcao) throw new Error(`opção ${valor} inexistente em: ${mensagem}`);
    return Promise.resolve(opcao.valor);
  }
  aguardarUsuario(mensagem: string): Promise<void> {
    this.perguntas.push(mensagem);
    return Promise.resolve();
  }
  exibirResumoRevisao(resumo: ResumoRevisao): void {
    this.resumos.push(resumo);
  }
  informar(mensagem: string): void {
    this.informacoes.push(mensagem);
  }
  abrirArquivo(caminho: string): Promise<void> {
    this.arquivosAbertos.push(caminho);
    return Promise.resolve();
  }

  get restantes(): number {
    return this.roteiro.length;
  }
}

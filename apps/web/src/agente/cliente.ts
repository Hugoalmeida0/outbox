// Cliente do agente local: requisições validadas pelo contrato, token do pareamento e stream de eventos
// lido com fetch + ReadableStream (EventSource não manda o cabeçalho Authorization).
import type { ZodType } from "zod";
import {
  esquemaErroApi,
  esquemaEventoExecucao,
  esquemaSaidaPareamento,
  esquemaSaude,
  type ErroApi,
  type EventoExecucao,
  type Saude,
} from "@contrato";

export const AGENTE_PADRAO = "http://127.0.0.1:4321";
export const CHAVE_TOKEN = "camaleao.token";
export const CHAVE_AGENTE = "camaleao.agente";

/** Resposta de erro do agente, com o corpo do contrato quando ele veio. */
export class ErroAgente extends Error {
  readonly status: number;
  readonly corpo: ErroApi | null;

  constructor(status: number, corpo: ErroApi | null, mensagem?: string) {
    super(mensagem ?? corpo?.mensagem ?? `o agente respondeu ${String(status)}`);
    this.name = "ErroAgente";
    this.status = status;
    this.corpo = corpo;
  }
}

/** Agente fora do ar (conexão recusada, rede local bloqueada pelo navegador). */
export class ErroSemAgente extends Error {
  constructor(causa: unknown) {
    super("não consegui falar com o Camaleão nesta máquina", { cause: causa });
    this.name = "ErroSemAgente";
  }
}

/** `localStorage` pode não existir ou recusar (modo privado): o site segue sem lembrar. */
function ler(chave: string): string | null {
  try {
    return globalThis.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: string | null): void {
  try {
    if (valor === null) globalThis.localStorage.removeItem(chave);
    else globalThis.localStorage.setItem(chave, valor);
  } catch {
    // Sem armazenamento disponível: o pareamento vale só até recarregar a página.
  }
}

/** Endereço do agente escolhido na tela de conexão (outra porta em `agente.porta`). */
export function lembrarEnderecoAgente(url: string): void {
  gravar(CHAVE_AGENTE, url.trim() === "" || url.trim() === AGENTE_PADRAO ? null : url.trim());
}

/** Código de `#parear=<código>`, colocado pelo agente ao abrir o site (o fragmento não vai à rede). */
export function codigoDoFragmento(hash: string): string | null {
  const codigo = /^#parear=([A-Za-z0-9-]{4,20})$/.exec(hash)?.[1];
  return codigo ?? null;
}

export interface OpcoesCliente {
  readonly baseUrl?: string;
  readonly fetch?: typeof fetch;
  /** Chamado em todo 401 de rota protegida: o token deixou de valer. */
  readonly aoPerderPareamento?: () => void;
}

export class ClienteAgente {
  readonly baseUrl: string;
  private readonly buscar: typeof fetch;
  private readonly aoPerderPareamento: () => void;
  private tokenAtual: string | null;

  constructor(opcoes: OpcoesCliente = {}) {
    this.baseUrl = (opcoes.baseUrl ?? (ler(CHAVE_AGENTE) || AGENTE_PADRAO)).replace(/\/+$/, "");
    this.buscar = opcoes.fetch ?? globalThis.fetch.bind(globalThis);
    this.aoPerderPareamento = opcoes.aoPerderPareamento ?? (() => undefined);
    this.tokenAtual = ler(CHAVE_TOKEN);
  }

  get pareado(): boolean {
    return this.tokenAtual !== null;
  }

  esquecerToken(): void {
    this.tokenAtual = null;
    gravar(CHAVE_TOKEN, null);
  }

  /** URL absoluta de um caminho do agente (ex.: `/arquivos/<id>`). */
  url(caminho: string): string {
    return `${this.baseUrl}${caminho}`;
  }

  private async chamar(
    caminho: string,
    init: RequestInit = {},
    comToken = true,
  ): Promise<Response> {
    const cabecalhos = new Headers(init.headers);
    if (comToken && this.tokenAtual) cabecalhos.set("Authorization", `Bearer ${this.tokenAtual}`);
    let resposta: Response;
    try {
      resposta = await this.buscar(this.url(caminho), { ...init, headers: cabecalhos });
    } catch (erro) {
      if (erro instanceof DOMException && erro.name === "AbortError") throw erro;
      throw new ErroSemAgente(erro);
    }
    if (resposta.ok) return resposta;
    const corpo = esquemaErroApi.safeParse(await resposta.json().catch(() => null));
    if (resposta.status === 401 && comToken) {
      this.esquecerToken();
      this.aoPerderPareamento();
    }
    throw new ErroAgente(resposta.status, corpo.success ? corpo.data : null);
  }

  private async json<T>(resposta: Response, schema: ZodType<T>): Promise<T> {
    const dados: unknown = await resposta.json();
    const lido = schema.safeParse(dados);
    if (!lido.success) {
      throw new ErroAgente(resposta.status, null, "resposta do agente fora do contrato");
    }
    return lido.data;
  }

  async saude(sinal?: AbortSignal): Promise<Saude> {
    const resposta = await this.chamar("/saude", sinal ? { signal: sinal } : {}, false);
    return this.json(resposta, esquemaSaude);
  }

  /** Troca o código impresso no terminal pelo token, guardado no navegador. */
  async parear(codigo: string): Promise<void> {
    const resposta = await this.chamar(
      "/pareamento",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      },
      false,
    );
    const { token } = await this.json(resposta, esquemaSaidaPareamento);
    this.tokenAtual = token;
    gravar(CHAVE_TOKEN, token);
  }

  async obter<T>(caminho: string, schema: ZodType<T>, sinal?: AbortSignal): Promise<T> {
    return this.json(await this.chamar(caminho, sinal ? { signal: sinal } : {}), schema);
  }

  async enviar<T>(
    metodo: "POST" | "PUT",
    caminho: string,
    corpo: unknown,
    schema: ZodType<T>,
  ): Promise<T> {
    const resposta = await this.chamar(caminho, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo ?? {}),
    });
    return this.json(resposta, schema);
  }

  async enviarArquivo<T>(caminho: string, formulario: FormData, schema: ZodType<T>): Promise<T> {
    return this.json(await this.chamar(caminho, { method: "POST", body: formulario }), schema);
  }

  /**
   * Eventos de uma execução, do primeiro ao último. Se a conexão cair antes do fim, reconecta: o agente
   * reenvia tudo desde o início, e `aoReiniciar` avisa para descartar o que já foi mostrado.
   */
  async acompanhar(
    id: string,
    aoEvento: (evento: EventoExecucao) => void,
    aoReiniciar: () => void,
    sinal: AbortSignal,
  ): Promise<void> {
    for (let tentativa = 0; !sinal.aborted; tentativa++) {
      if (tentativa > 0) {
        aoReiniciar();
        await new Promise((r) => setTimeout(r, Math.min(3000, 500 * tentativa)));
      }
      try {
        const resposta = await this.chamar(`/execucoes/${id}/eventos`, { signal: sinal });
        for await (const evento of lerEventos(resposta)) {
          aoEvento(evento);
          if (evento.tipo === "fim" || evento.tipo === "erro") return;
        }
      } catch (erro) {
        if (erro instanceof DOMException && erro.name === "AbortError") return;
        if (erro instanceof ErroAgente && erro.status !== 500) throw erro;
      }
    }
  }
}

/** Blocos `data:` de um `text/event-stream`, validados pelo contrato. */
export async function* lerEventos(resposta: Response): AsyncGenerator<EventoExecucao> {
  if (!resposta.body) return;
  const leitor = resposta.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await leitor.read();
    if (done) return;
    buffer += value.replace(/\r\n/g, "\n");
    for (let fim = buffer.indexOf("\n\n"); fim >= 0; fim = buffer.indexOf("\n\n")) {
      const bloco = buffer.slice(0, fim);
      buffer = buffer.slice(fim + 2);
      const dados = bloco
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n");
      if (!dados) continue;
      const evento = esquemaEventoExecucao.safeParse(JSON.parse(dados));
      if (evento.success) yield evento.data;
    }
  }
}

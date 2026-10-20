// Pareamento do site com o agente local (ADR-0025): um código curto, de uso único, impresso no terminal,
// é trocado por um token guardado no navegador. O agente só guarda o hash SHA-256 do token.
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";

/** Sem caracteres ambíguos (0/O, 1/I/L): o código é digitado a partir do terminal. */
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const TAMANHO_CODIGO = 8;
export const VALIDADE_CODIGO_MS = 10 * 60_000;
/** Erros seguidos que invalidam o código atual (contra adivinhação por um site aberto ao lado). */
export const MAX_ERROS_CODIGO = 5;

const esquemaTokens = z.array(
  z.object({ hash: z.string().regex(/^[0-9a-f]{64}$/), criadoEm: z.string() }),
);

/** Código de pareamento novo, com 8 caracteres do alfabeto sem ambíguos. */
export function gerarCodigo(): string {
  let codigo = "";
  for (let i = 0; i < TAMANHO_CODIGO; i++) codigo += ALFABETO.charAt(randomInt(ALFABETO.length));
  return codigo;
}

/** `ABCD-EFGH`, como aparece no terminal. */
export function formatarCodigo(codigo: string): string {
  return `${codigo.slice(0, 4)}-${codigo.slice(4)}`;
}

function normalizarCodigo(codigo: string): string {
  return codigo.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Tokens emitidos, só como hash, em `dados/agente/tokens.json` (escrita atômica). */
export class ArmazemTokens {
  private readonly arquivo: string;
  private registros: z.infer<typeof esquemaTokens>;

  constructor(arquivo: string) {
    this.arquivo = arquivo;
    this.registros = this.carregar();
  }

  private carregar(): z.infer<typeof esquemaTokens> {
    if (!existsSync(this.arquivo)) return [];
    let bruto: unknown;
    try {
      bruto = JSON.parse(readFileSync(this.arquivo, "utf8"));
    } catch {
      // Arquivo corrompido: nenhum token vale, e o site pede um novo pareamento.
      return [];
    }
    const lido = esquemaTokens.safeParse(bruto);
    return lido.success ? lido.data : [];
  }

  private gravar(): void {
    mkdirSync(dirname(this.arquivo), { recursive: true });
    const temporario = `${this.arquivo}.${String(process.pid)}.tmp`;
    writeFileSync(temporario, `${JSON.stringify(this.registros, null, 2)}\n`);
    renameSync(temporario, this.arquivo);
  }

  valido(token: string): boolean {
    const hash = hashToken(token);
    return this.registros.some((r) => r.hash === hash);
  }

  adicionar(token: string, criadoEm: string): void {
    this.registros = [...this.registros, { hash: hashToken(token), criadoEm }];
    this.gravar();
  }

  revogarTodos(): void {
    this.registros = [];
    this.gravar();
  }
}

export interface OpcoesPareamento {
  readonly tokens: ArmazemTokens;
  readonly agora?: () => number;
  /** Chamado a cada código novo (início, uso, expiração ou erros seguidos), para imprimir no terminal. */
  readonly aoNovoCodigo?: (codigo: string) => void;
}

/** Código de pareamento atual: válido por 10 minutos, de uso único, trocado após 5 erros seguidos. */
export class Pareamento {
  private readonly opcoes: OpcoesPareamento;
  private codigo = "";
  private expiraEm = 0;
  private erros = 0;

  constructor(opcoes: OpcoesPareamento) {
    this.opcoes = opcoes;
    this.renovar();
  }

  private agora(): number {
    return (this.opcoes.agora ?? Date.now)();
  }

  private renovar(): void {
    this.codigo = gerarCodigo();
    this.expiraEm = this.agora() + VALIDADE_CODIGO_MS;
    this.erros = 0;
    this.opcoes.aoNovoCodigo?.(this.codigo);
  }

  /** O código vigente; expirado, gera (e anuncia) outro. */
  codigoAtual(): string {
    if (this.agora() >= this.expiraEm) this.renovar();
    return this.codigo;
  }

  /** Troca o código por um token novo; `null` quando o código não confere ou expirou. */
  parear(tentativa: string): string | null {
    const atual = this.codigoAtual();
    const recebido = Buffer.from(normalizarCodigo(tentativa));
    const esperado = Buffer.from(atual);
    const confere = recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
    if (!confere) {
      if (++this.erros >= MAX_ERROS_CODIGO) this.renovar();
      return null;
    }
    const token = randomBytes(32).toString("base64url");
    this.opcoes.tokens.adicionar(token, new Date(this.agora()).toISOString());
    this.renovar();
    return token;
  }

  /** Renova o código quando ele expira, mesmo sem tentativas; devolve a função que para a vigia. */
  vigiarExpiracao(intervaloMs = 15_000): () => void {
    const relogio = setInterval(() => this.codigoAtual(), intervaloMs);
    relogio.unref();
    return () => {
      clearInterval(relogio);
    };
  }
}

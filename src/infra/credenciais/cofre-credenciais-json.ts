import { randomInt } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import type { Relogio } from "#aplicacao/portas/relogio.ts";
import { escreverAtomico } from "../sistema/escrita-atomica.ts";
import type { CofreCredenciais, Credencial } from "./cofre.ts";

const esquemaCofre = z.record(
  z.string(),
  z.object({ email: z.string(), senha: z.string(), criadaEm: z.string() }),
);

const MAIUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MINUSCULAS = "abcdefghijkmnopqrstuvwxyz";
const DIGITOS = "23456789";
const SIMBOLOS = "!@#$%&*?";
const TODOS = MAIUSCULAS + MINUSCULAS + DIGITOS + SIMBOLOS;

export type Aleatorio = (maximoExclusivo: number) => number;

/** Senha forte com pelo menos uma maiúscula, uma minúscula, um dígito e um símbolo, embaralhada. */
export function gerarSenha(aleatorio: Aleatorio = randomInt, tamanho = 20): string {
  const escolher = (alfabeto: string): string => alfabeto.charAt(aleatorio(alfabeto.length));
  const caracteres = [
    escolher(MAIUSCULAS),
    escolher(MINUSCULAS),
    escolher(DIGITOS),
    escolher(SIMBOLOS),
  ];
  while (caracteres.length < tamanho) caracteres.push(escolher(TODOS));
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = aleatorio(i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j] ?? "", caracteres[i] ?? ""];
  }
  return caracteres.join("");
}

/**
 * Senhas geradas por tenant em `dados/credenciais.json` (texto puro, fora do git; ver arquitetura.md
 * §12.4). Nunca registra a senha em log.
 */
export class CofreCredenciaisJson implements CofreCredenciais {
  private readonly caminho: string;
  private readonly obterEmail: () => string;
  private readonly relogio: Relogio;
  private readonly aleatorio: Aleatorio;

  constructor(
    caminho: string,
    obterEmail: () => string,
    relogio: Relogio,
    aleatorio: Aleatorio = randomInt,
  ) {
    this.caminho = caminho;
    this.obterEmail = obterEmail;
    this.relogio = relogio;
    this.aleatorio = aleatorio;
  }

  private ler(): z.infer<typeof esquemaCofre> {
    if (!existsSync(this.caminho)) return {};
    return esquemaCofre.parse(JSON.parse(readFileSync(this.caminho, "utf8")));
  }

  obterOuCriar(tenant: string): Credencial {
    const chave = tenant.toLowerCase();
    const dados = this.ler();
    const existente = dados[chave];
    if (existente) return { email: existente.email, senha: existente.senha, recemCriada: false };
    const nova = {
      email: this.obterEmail(),
      senha: gerarSenha(this.aleatorio),
      criadaEm: this.relogio.agoraIso(),
    };
    escreverAtomico(this.caminho, `${JSON.stringify({ ...dados, [chave]: nova }, null, 2)}\n`);
    return { email: nova.email, senha: nova.senha, recemCriada: true };
  }
}

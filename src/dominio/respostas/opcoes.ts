import { normalizarTexto } from "#dominio/compartilhado/texto.ts";

const IDIOMAS = ["pt", "en", "es"] as const;
const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Nome normalizado (em qualquer dos idiomas) para o código ISO; montado na primeira consulta. */
let codigoPorNome: Map<string, string> | null = null;

function indice(): Map<string, string> {
  if (codigoPorNome) return codigoPorNome;
  codigoPorNome = new Map();
  const nomes = IDIOMAS.map((idioma) => new Intl.DisplayNames([idioma], { type: "region" }));
  for (const a of LETRAS) {
    for (const b of LETRAS) {
      const codigo = `${a}${b}`;
      for (const nome of nomes) {
        const texto = nome.of(codigo);
        // Código sem nome conhecido volta como o próprio código.
        if (texto && texto !== codigo) codigoPorNome.set(normalizarTexto(texto), codigo);
      }
    }
  }
  return codigoPorNome;
}

/**
 * Outros nomes do mesmo país em pt, en e es ("Brasil" → "Brazil"), para casar o valor do perfil com
 * formulários em outro idioma. Valor que não é nome de país devolve lista vazia.
 */
export function nomesDoPais(valor: string): string[] {
  const codigo = indice().get(normalizarTexto(valor));
  if (!codigo) return [];
  const nomes = IDIOMAS.map((idioma) =>
    new Intl.DisplayNames([idioma], { type: "region" }).of(codigo),
  ).filter((n): n is string => n !== undefined && normalizarTexto(n) !== normalizarTexto(valor));
  return [...new Set(nomes)];
}

function casarTexto(opcoes: readonly string[], valor: string): string | null {
  const alvo = normalizarTexto(valor);
  if (alvo === "") return null;
  return (
    opcoes.find((o) => normalizarTexto(o) === alvo) ??
    opcoes.find(
      (o) => normalizarTexto(o).startsWith(alvo) || alvo.startsWith(normalizarTexto(o)),
    ) ??
    opcoes.find((o) => normalizarTexto(o).includes(alvo) || alvo.includes(normalizarTexto(o))) ??
    null
  );
}

/**
 * Escolhe a opção que melhor casa com o valor (igualdade normalizada, depois prefixo, depois contém); por
 * fim tenta o nome do país em outro idioma ("Brasil" casa com "Brazil +55").
 */
export function melhorOpcao(opcoes: readonly string[], valor: string): string | null {
  const direta = casarTexto(opcoes, valor);
  if (direta !== null) return direta;
  for (const nome of nomesDoPais(valor)) {
    const traduzida = casarTexto(opcoes, nome);
    if (traduzida !== null) return traduzida;
  }
  return null;
}

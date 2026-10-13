import type { ChaveDiversidade } from "./classificar-campo.ts";
import type { Diversidade } from "./perfil.ts";

type Sinonimos = Readonly<Record<string, readonly string[]>>;

const SINONIMOS: Readonly<Record<Exclude<ChaveDiversidade, "veterano">, Sinonimos>> = {
  genero: {
    mulher_cis: [
      "mulher",
      "feminino",
      "woman",
      "female",
      "mulher cis",
      "mulher cisgenero",
      "cisgender woman",
    ],
    mulher_trans: ["mulher trans", "mulher transgenero", "transgender woman", "trans woman"],
    homem_cis: [
      "homem",
      "masculino",
      "man",
      "male",
      "homem cis",
      "homem cisgenero",
      "cisgender man",
    ],
    homem_trans: ["homem trans", "homem transgenero", "transgender man", "trans man"],
    nao_binario: ["nao binario", "nao binaria", "non binary", "nonbinary"],
    outro: ["outro", "outra", "other"],
  },
  raca: {
    branca: ["branca", "branco", "white"],
    preta: ["preta", "preto", "negra", "negro", "black"],
    parda: ["parda", "pardo", "mixed", "brown"],
    amarela: ["amarela", "amarelo", "asian", "asiatica", "asiatico"],
    indigena: ["indigena", "indigenous", "native"],
  },
  pcd: {
    sim: [
      "sim",
      "yes",
      "possuo",
      "tenho deficiencia",
      "pessoa com deficiencia",
      "i have a disability",
    ],
    nao: [
      "nao",
      "no",
      "nao possuo",
      "nao tenho",
      "i do not have a disability",
      "i don t have a disability",
    ],
  },
  lgbtqia: {
    sim: ["sim", "yes", "lgbt", "lgbtqia", "lgbtqia+", "faco parte"],
    nao: ["nao", "no", "nao faco parte", "heterossexual", "heterosexual"],
  },
};

const PREFIRO_NAO =
  /prefiro nao|nao desejo|prefer not|decline|nao informar|nao quero informar|don t wish|do not wish|dont wish|not wish to|choose not|not to (say|answer|disclose)/;

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .trim();
}

function contemPalavras(texto: string, termo: string): boolean {
  return ` ${texto} `.includes(` ${termo} `);
}

/** Valor que a opção representa: o do sinônimo mais longo contido nela. */
function valorDaOpcao(opcao: string, sinonimos: Sinonimos): string | null {
  const texto = normalizar(opcao);
  let melhor: { valor: string; tamanho: number } | null = null;
  for (const [valor, termos] of Object.entries(sinonimos)) {
    for (const termo of termos) {
      if (contemPalavras(texto, termo) && (melhor === null || termo.length > melhor.tamanho)) {
        melhor = { valor, tamanho: termo.length };
      }
    }
  }
  return melhor?.valor ?? null;
}

function valorDoPerfil(
  chave: Exclude<ChaveDiversidade, "veterano">,
  diversidade: Diversidade | undefined,
): string | undefined {
  switch (chave) {
    case "genero":
      return diversidade?.genero;
    case "raca":
      return diversidade?.raca;
    case "pcd":
      return diversidade?.pcd === undefined ? undefined : diversidade.pcd ? "sim" : "nao";
    case "lgbtqia":
      return diversidade?.lgbtqia === undefined ? undefined : diversidade.lgbtqia ? "sim" : "nao";
  }
}

/**
 * Resposta de diversidade a partir do perfil, sem LLM. Sem dado ou sem opção correspondente, escolhe
 * "prefiro não informar"; sem essa opção, devolve `null` com confiança baixa.
 */
export function respostaDiversidade(
  chave: ChaveDiversidade,
  opcoes: readonly string[] | undefined,
  diversidade: Diversidade | undefined,
): { valor: string | null; confianca: "alta" | "baixa" } {
  const lista = opcoes ?? [];
  const prefiroNao = lista.find((o) => PREFIRO_NAO.test(normalizar(o)));
  if (chave !== "veterano") {
    const alvo = valorDoPerfil(chave, diversidade);
    if (alvo !== undefined) {
      const opcao = lista.find((o) => valorDaOpcao(o, SINONIMOS[chave]) === alvo);
      if (opcao) return { valor: opcao, confianca: "alta" };
    }
  }
  if (prefiroNao) return { valor: prefiroNao, confianca: "alta" };
  return { valor: null, confianca: "baixa" };
}

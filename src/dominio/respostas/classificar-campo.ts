import type { CategoriaCampo, TipoCampo } from "./campo.ts";
import type { TipoConsentimento } from "./perfil.ts";

export type ChavePadrao =
  | "nome"
  | "primeiroNome"
  | "sobrenome"
  | "email"
  | "telefone"
  | "linkedin"
  | "github"
  | "portfolio"
  | "cidade"
  | "pais";
export type ChaveDocumento =
  "cpf" | "rg" | "dataNascimento" | "logradouro" | "numero" | "complemento" | "bairro" | "cep";
export type ChaveDiversidade = "genero" | "raca" | "pcd" | "lgbtqia" | "veterano";

export type Classificacao =
  | { readonly categoria: "padrao"; readonly chave: ChavePadrao }
  | { readonly categoria: "documento"; readonly chave: ChaveDocumento }
  | { readonly categoria: "diversidade"; readonly chave: ChaveDiversidade }
  | { readonly categoria: "consentimento"; readonly chave: TipoConsentimento }
  | {
      readonly categoria: Exclude<
        CategoriaCampo,
        "padrao" | "documento" | "diversidade" | "consentimento"
      >;
    };

export interface DescricaoCampo {
  readonly rotulo: string;
  readonly nome?: string | undefined;
  readonly autocomplete?: string | undefined;
  readonly tipo: TipoCampo;
}

const AUTOCOMPLETE: Readonly<Record<string, Classificacao>> = {
  name: { categoria: "padrao", chave: "nome" },
  "given-name": { categoria: "padrao", chave: "primeiroNome" },
  "family-name": { categoria: "padrao", chave: "sobrenome" },
  email: { categoria: "padrao", chave: "email" },
  tel: { categoria: "padrao", chave: "telefone" },
  "address-level2": { categoria: "padrao", chave: "cidade" },
  country: { categoria: "padrao", chave: "pais" },
  "country-name": { categoria: "padrao", chave: "pais" },
  "street-address": { categoria: "documento", chave: "logradouro" },
  "address-line1": { categoria: "documento", chave: "logradouro" },
  "postal-code": { categoria: "documento", chave: "cep" },
  bday: { categoria: "documento", chave: "dataNascimento" },
};

/** Regras em ordem de prioridade: as mais específicas primeiro. */
const REGRAS: readonly (readonly [RegExp, Classificacao])[] = [
  // Dados de outra pessoa (quem indicou, referência, contato de emergência) nunca recebem os do candidato.
  [/\bindic(ou|ad[oa]|acao)\b|\breferr|\breferenc|\bemergenc/, { categoria: "pergunta" }],
  [/\bcpf\b/, { categoria: "documento", chave: "cpf" }],
  [/\brg\b|registro geral|carteira de identidade/, { categoria: "documento", chave: "rg" }],
  [
    /nascimento|date of birth|birth ?date|birthday/,
    { categoria: "documento", chave: "dataNascimento" },
  ],
  [/\bcep\b|postal code|zip ?code/, { categoria: "documento", chave: "cep" }],
  [
    /logradouro|endereco|street|address(?! line 2)/,
    { categoria: "documento", chave: "logradouro" },
  ],
  [/bairro|neighborhood|district/, { categoria: "documento", chave: "bairro" }],
  [/complemento|address line 2|apartment/, { categoria: "documento", chave: "complemento" }],
  // Salário atual/último é outro dado: nunca recebe a pretensão.
  [
    /^(?!.*(pretens|expectat|desired|pretend))(?=.*(salari|salary|compensation|remuneracao)).*\b(atual|ultim[oa]|current|last|previous|anterior)\b/,
    { categoria: "salario_atual" },
  ],
  [/pretensao|salari|salary|compensation|remuneracao/, { categoria: "salario" }],
  [/genero|gender|\bsexo\b/, { categoria: "diversidade", chave: "genero" }],
  [
    /\braca\b|\bcor\b|etnia|race|ethnic|hispanic|latin[oa]/,
    { categoria: "diversidade", chave: "raca" },
  ],
  [/\bpcd\b|deficiencia|disabilit/, { categoria: "diversidade", chave: "pcd" }],
  [/orientacao sexual|sexual orientation|lgbt/, { categoria: "diversidade", chave: "lgbtqia" }],
  [/veteran|veterano/, { categoria: "diversidade", chave: "veterano" }],
  [
    /cover letter|\bcarta\b|mensagem ao recrutador|motivation letter|letter of motivation/,
    { categoria: "carta" },
  ],
  [/\bresume\b|\bcv\b|curriculo|curriculum/, { categoria: "curriculo" }],
  [/e ?mail/, { categoria: "padrao", chave: "email" }],
  [/telefone|celular|phone|mobile|whatsapp/, { categoria: "padrao", chave: "telefone" }],
  [/linkedin/, { categoria: "padrao", chave: "linkedin" }],
  [/github/, { categoria: "padrao", chave: "github" }],
  // "on-site" (presencial) não é site.
  [
    /portfolio|website|(?<!\bon )\bsite\b|personal url/,
    { categoria: "padrao", chave: "portfolio" },
  ],
  [/primeiro nome|first name|given name/, { categoria: "padrao", chave: "primeiroNome" }],
  [
    /sobrenome|ultimo nome|last name|surname|family name/,
    { categoria: "padrao", chave: "sobrenome" },
  ],
  [
    /nome completo|full name|^name$|^nome$|seu nome|your name/,
    { categoria: "padrao", chave: "nome" },
  ],
  [/^numero$|^number$/, { categoria: "documento", chave: "numero" }],
  [/cidade|city/, { categoria: "padrao", chave: "cidade" }],
  [/\bpais\b|country/, { categoria: "padrao", chave: "pais" }],
];

/**
 * Rótulos de campo-padrão e de documento são curtos ("Cidade", "Which city do you live in?"). Acima disto, o
 * rótulo é uma pergunta que só cita a palavra ("familiar como pais...", "trabalho na cidade de Campinas") e
 * vai para o LLM.
 */
const MAX_PALAVRAS_PADRAO = 12;

/**
 * Consentimento genérico (privacidade, termos, LGPD): o tratamento de dados. "terms" sozinho, como em
 * "in terms of", não conta.
 */
const CONSENTIMENTO =
  /consent|consinto|privacidade|privacy|termos de uso|\bterms\b(?! of (?!use|service))|lgpd|gdpr|li e concordo|i agree|i confirm that i have read|tratamento d[oe]s? (meus )?dados|dados pessoais sejam (armazenados|processados)/;

/**
 * Tipos específicos de opt-in, em ordem de prioridade. O que não casar com nenhum, mas for consentimento,
 * é tratamento de dados.
 */
const TIPOS_CONSENTIMENTO: readonly (readonly [RegExp, TipoConsentimento])[] = [
  [
    /(diversidade|diversity|\bd ?& ?i\b|\bdei\b|inclusao|inclusion).*(consent|concord|autoriz|agree|dados|data|opcion|optional)|(consent|concord|autoriz|agree|opcionais|optional).*(diversidade|diversity|inclusao|inclusion|acoes afirmativas|affirmative action)/,
    "diversidade",
  ],
  [
    /(interview|entrevista).*(transcri|record|grava)|(transcri|record|grava).*(interview|entrevista)|(transcri|grava).*(intelig|artificial|\bia\b|\bai\b)/,
    "transcricaoIa",
  ],
  [/(share|shared|sharing|compartilh).*(partner|parceir|third|terceir)/, "compartilharParceiros"],
  [
    /(retain|retention|keep|store|armazen|reter|manter|guardar).*(future|futur)|talent (pool|community|network)|banco de talentos|future (opportunit|roles|openings|positions|vacanc)|oportunidades futuras|vagas futuras|processos futuros/,
    "reterDados",
  ],
  [
    /(send|enviar|receive|receber|contact|contatar).*(informa|news|comunica|marketing|updates|novidades|promoc|mensage|messages)|marketing|newsletter|midias sociais|text messages|\bsms\b/,
    "comunicacoes",
  ],
];

/** Tipo do consentimento pelo rótulo normalizado, ou `null` se o campo não for de consentimento. */
function tipoConsentimento(texto: string): TipoConsentimento | null {
  for (const [regex, tipo] of TIPOS_CONSENTIMENTO) if (regex.test(texto)) return tipo;
  return CONSENTIMENTO.test(texto) ? "tratamentoDados" : null;
}

/** Anexo que recebe o currículo: o rótulo ou o nome falam em resume, CV ou currículo. */
const ANEXO_CURRICULO = /\bresume\b|\bcv\b|curriculo|curriculum/;

function normalizarRotulo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[*:?()[\]]+/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Classifica um campo de formulário em categoria (e chave, quando há valor determinístico). */
export function classificarCampoDetalhado(campo: DescricaoCampo): Classificacao {
  if (campo.tipo === "arquivo") {
    const rotulo = normalizarRotulo(`${campo.rotulo} ${campo.nome ?? ""}`);
    if (/cover letter|carta|motivation/.test(rotulo)) return { categoria: "carta" };
    // Só o anexo reconhecido recebe o CV: um laudo PcD ou um portfólio nunca recebe o currículo.
    return ANEXO_CURRICULO.test(rotulo) ? { categoria: "curriculo" } : { categoria: "anexo" };
  }
  if (campo.tipo === "checkbox" || campo.tipo === "radio" || campo.tipo === "select") {
    const tipo = tipoConsentimento(normalizarRotulo(`${campo.rotulo} ${campo.nome ?? ""}`));
    if (tipo) return { categoria: "consentimento", chave: tipo };
  }
  const autocomplete = campo.autocomplete?.toLowerCase().trim();
  const porAutocomplete = autocomplete ? AUTOCOMPLETE[autocomplete] : undefined;
  if (porAutocomplete) return porAutocomplete;

  const candidatos = [normalizarRotulo(campo.rotulo), normalizarRotulo(campo.nome ?? "")].filter(
    (c) => c.length > 0,
  );
  for (const texto of candidatos) {
    const longo = texto.split(" ").length > MAX_PALAVRAS_PADRAO;
    for (const [regex, classificacao] of REGRAS) {
      if (!regex.test(texto)) continue;
      if (
        longo &&
        (classificacao.categoria === "padrao" || classificacao.categoria === "documento")
      )
        continue;
      // Rótulo de currículo em campo de texto (ex.: "link para o currículo") é uma pergunta comum.
      return classificacao.categoria === "curriculo" ? { categoria: "pergunta" } : classificacao;
    }
  }
  if (campo.tipo === "email") return { categoria: "padrao", chave: "email" };
  if (campo.tipo === "telefone") return { categoria: "padrao", chave: "telefone" };
  return { categoria: "pergunta" };
}

export function classificarCampo(campo: DescricaoCampo): CategoriaCampo {
  return classificarCampoDetalhado(campo).categoria;
}

/**
 * Classifica os campos de um formulário inteiro. "Nome" sozinho é o nome completo, a menos que o
 * formulário também peça sobrenome; nesse caso, vira primeiro nome.
 */
export function classificarFormulario(campos: readonly DescricaoCampo[]): Classificacao[] {
  const classificacoes = campos.map(classificarCampoDetalhado);
  const temSobrenome = classificacoes.some(
    (c) => c.categoria === "padrao" && c.chave === "sobrenome",
  );
  if (!temSobrenome) return classificacoes;
  return classificacoes.map((c) =>
    c.categoria === "padrao" && c.chave === "nome"
      ? { categoria: "padrao", chave: "primeiroNome" }
      : c,
  );
}

import { normalizarTexto } from "../compartilhado/texto.ts";

interface Uf {
  readonly sigla: string;
  readonly nome: string;
  readonly capital: string;
}

const UFS: readonly Uf[] = [
  { sigla: "AC", nome: "Acre", capital: "Rio Branco" },
  { sigla: "AL", nome: "Alagoas", capital: "Maceió" },
  { sigla: "AP", nome: "Amapá", capital: "Macapá" },
  { sigla: "AM", nome: "Amazonas", capital: "Manaus" },
  { sigla: "BA", nome: "Bahia", capital: "Salvador" },
  { sigla: "CE", nome: "Ceará", capital: "Fortaleza" },
  { sigla: "DF", nome: "Distrito Federal", capital: "Brasília" },
  { sigla: "ES", nome: "Espírito Santo", capital: "Vitória" },
  { sigla: "GO", nome: "Goiás", capital: "Goiânia" },
  { sigla: "MA", nome: "Maranhão", capital: "São Luís" },
  { sigla: "MT", nome: "Mato Grosso", capital: "Cuiabá" },
  { sigla: "MS", nome: "Mato Grosso do Sul", capital: "Campo Grande" },
  { sigla: "MG", nome: "Minas Gerais", capital: "Belo Horizonte" },
  { sigla: "PA", nome: "Pará", capital: "Belém" },
  { sigla: "PB", nome: "Paraíba", capital: "João Pessoa" },
  { sigla: "PR", nome: "Paraná", capital: "Curitiba" },
  { sigla: "PE", nome: "Pernambuco", capital: "Recife" },
  { sigla: "PI", nome: "Piauí", capital: "Teresina" },
  { sigla: "RJ", nome: "Rio de Janeiro", capital: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte", capital: "Natal" },
  { sigla: "RS", nome: "Rio Grande do Sul", capital: "Porto Alegre" },
  { sigla: "RO", nome: "Rondônia", capital: "Porto Velho" },
  { sigla: "RR", nome: "Roraima", capital: "Boa Vista" },
  { sigla: "SC", nome: "Santa Catarina", capital: "Florianópolis" },
  { sigla: "SP", nome: "São Paulo", capital: "São Paulo" },
  { sigla: "SE", nome: "Sergipe", capital: "Aracaju" },
  { sigla: "TO", nome: "Tocantins", capital: "Palmas" },
];

/** UF brasileira pela sigla ("ES") ou pelo nome ("Espírito Santo", sem acento também). */
export function ufDe(texto: string | undefined): Uf | null {
  if (!texto) return null;
  const alvo = normalizarTexto(texto);
  return (
    UFS.find((u) => normalizarTexto(u.sigla) === alvo || normalizarTexto(u.nome) === alvo) ?? null
  );
}

/** "Cariacica, Espírito Santo, Brasil": a localização completa para autocompletes de cidade. */
export function localizacaoCompleta(cidade: string, uf: string | undefined, pais: string): string {
  return [cidade, ufDe(uf)?.nome ?? uf, pais].filter(Boolean).join(", ");
}

/**
 * Consultas em cascata para um autocomplete de localização a partir de "Cidade, Estado, País": só a
 * cidade, cidade e estado e, por fim, a capital do estado (região metropolitana), sem repetir.
 */
export function consultasLocalizacao(valor: string): string[] {
  const [cidade = "", estado = ""] = valor.split(",").map((p) => p.trim());
  const uf = ufDe(estado);
  const consultas = [cidade, estado ? `${cidade}, ${uf?.nome ?? estado}` : "", uf?.capital ?? ""];
  return [...new Set(consultas.filter(Boolean))];
}

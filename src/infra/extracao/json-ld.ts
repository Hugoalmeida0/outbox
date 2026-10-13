import { esquemaVagaExtraida, type VagaExtraida } from "#dominio/vagas/vaga-extraida.ts";
import { decodificarEntidades, htmlParaTexto } from "./html-texto.ts";

type Objeto = Record<string, unknown>;

function ehObjeto(valor: unknown): valor is Objeto {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function texto(valor: unknown): string | undefined {
  return typeof valor === "string" && valor.trim().length > 0 ? valor.trim() : undefined;
}

/** Procura recursivamente um objeto com `@type` JobPosting (inclusive em `@graph` e listas). */
function acharVaga(valor: unknown): Objeto | null {
  if (Array.isArray(valor)) {
    for (const item of valor) {
      const achado = acharVaga(item);
      if (achado) return achado;
    }
    return null;
  }
  if (!ehObjeto(valor)) return null;
  const tipo = valor["@type"];
  if (tipo === "JobPosting" || (Array.isArray(tipo) && tipo.includes("JobPosting"))) return valor;
  return acharVaga(valor["@graph"]);
}

function localidade(vaga: Objeto): string | undefined {
  if (vaga.jobLocationType === "TELECOMMUTE") return "Remoto";
  const locais = Array.isArray(vaga.jobLocation) ? vaga.jobLocation : [vaga.jobLocation];
  const partes = locais.flatMap((local) => {
    const endereco = ehObjeto(local) && ehObjeto(local.address) ? local.address : null;
    if (!endereco) return [];
    const pais = ehObjeto(endereco.addressCountry)
      ? endereco.addressCountry.name
      : endereco.addressCountry;
    const linha = [endereco.addressLocality, endereco.addressRegion, pais]
      .map(texto)
      .filter(Boolean)
      .join(", ");
    return linha ? [linha] : [];
  });
  return partes.length > 0 ? [...new Set(partes)].join(" / ") : undefined;
}

/** Extrai a vaga do primeiro JSON-LD `JobPosting` da página, ou `null`. */
export function extrairJsonLd(html: string): VagaExtraida | null {
  const blocos = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const bloco of blocos) {
    let json: unknown;
    try {
      json = JSON.parse(decodificarEntidades((bloco[1] ?? "").trim()));
    } catch {
      continue;
    }
    const vaga = acharVaga(json);
    if (!vaga) continue;
    const organizacao = ehObjeto(vaga.hiringOrganization)
      ? vaga.hiringOrganization.name
      : vaga.hiringOrganization;
    const tipoEmprego = Array.isArray(vaga.employmentType)
      ? vaga.employmentType.filter((t): t is string => typeof t === "string").join(", ")
      : vaga.employmentType;
    const candidato = {
      empresa: texto(organizacao),
      cargo: texto(vaga.title),
      descricao: texto(vaga.description)
        ? htmlParaTexto(decodificarEntidades(String(vaga.description)))
        : undefined,
      localidade: localidade(vaga),
      publicadaEm: texto(vaga.datePosted)?.slice(0, 10),
      regimeTexto: texto(tipoEmprego),
    };
    const resultado = esquemaVagaExtraida.safeParse(
      Object.fromEntries(Object.entries(candidato).filter(([, v]) => v !== undefined)),
    );
    if (resultado.success) return resultado.data;
  }
  return null;
}

import type { Campo } from "./campo.ts";
import type { ChaveDocumento, ChavePadrao } from "./classificar-campo.ts";
import type { Master } from "../curriculo/master.ts";
import { localizacaoCompleta } from "./localidade.ts";
import type { Contato } from "./pacote.ts";
import type { Documentos, Endereco } from "./perfil.ts";

function partesNome(nome: string): { primeiro: string; sobrenome: string } {
  const partes = nome.trim().split(/\s+/);
  return { primeiro: partes[0] ?? "", sobrenome: partes.slice(1).join(" ") };
}

/**
 * Empregador atual: a experiência sem data de fim mais recente. "Grupo Autoglass — Autoglass" (grupo —
 * unidade) vira "Grupo Autoglass", o empregador formal.
 */
export function empresaAtual(master: Pick<Master, "experiencias">): string | null {
  const atual = master.experiencias
    .filter((e) => e.fim === null)
    .sort((a, b) => b.inicio.localeCompare(a.inicio))[0];
  return atual?.empresa.split(/\s+[—–]\s+/)[0]?.trim() || null;
}

/** Valor de um campo padrão (nome, contato, links) a partir do contato do master. */
export function valorPadrao(chave: ChavePadrao, contato: Contato): string | null {
  switch (chave) {
    case "nome":
      return contato.nome;
    case "primeiroNome":
      return partesNome(contato.nome).primeiro;
    case "sobrenome":
      return partesNome(contato.nome).sobrenome || null;
    case "email":
      return contato.email;
    case "telefone":
      return contato.telefone;
    case "linkedin":
      return contato.linkedin ?? null;
    case "github":
      return contato.github ?? null;
    case "portfolio":
      return contato.portfolio ?? contato.github ?? null;
    case "cidade":
      return contato.cidade;
    case "localizacao":
      return localizacaoCompleta(contato.cidade, contato.uf, contato.pais);
    case "empresaAtual":
      return contato.empresaAtual ?? null;
    case "pais":
      return contato.pais;
  }
}

/** Formata AAAA-MM-DD conforme o campo: `aaaa-mm-dd` para campos de data, `dd/mm/aaaa` para texto. */
export function formatarData(iso: string, tipo: Campo["tipo"]): string {
  if (tipo === "data") return iso;
  const [ano, mes, dia] = iso.split("-");
  return `${dia ?? ""}/${mes ?? ""}/${ano ?? ""}`;
}

/** Valor de um campo de documento ou endereço completo (dado sensível, preenchido só por código). */
export function valorDocumento(
  chave: ChaveDocumento,
  tipo: Campo["tipo"],
  documentos: Documentos,
  endereco: Endereco,
): string | null {
  switch (chave) {
    case "cpf":
      return documentos.cpf ?? null;
    case "rg":
      return documentos.rg ?? null;
    case "dataNascimento":
      return documentos.dataNascimento ? formatarData(documentos.dataNascimento, tipo) : null;
    case "logradouro":
      return endereco.logradouro ?? null;
    case "numero":
      return endereco.numero ?? null;
    case "complemento":
      return endereco.complemento ?? null;
    case "bairro":
      return endereco.bairro ?? null;
    case "cep":
      return endereco.cep ?? null;
  }
}

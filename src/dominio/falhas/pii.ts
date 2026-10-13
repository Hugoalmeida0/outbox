import type { Pessoal } from "../curriculo/master.ts";
import type { Documentos, Endereco } from "../respostas/perfil.ts";

const TAMANHO_MINIMO = 4;

function somenteDigitos(texto: string): string {
  return texto.replace(/\D+/g, "");
}

function semProtocolo(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

/**
 * Lista única de strings pessoais a redigir (sanitização de falhas e logs). Ordenada da mais longa para a
 * mais curta, para que a substituição não deixe fragmentos.
 */
export function listaPii(
  pessoal?: Pessoal,
  perfil?: {
    readonly documentos?: Documentos | undefined;
    readonly endereco?: Endereco | undefined;
  },
): string[] {
  const itens: string[] = [];
  if (pessoal) {
    const partes = pessoal.nome.trim().split(/\s+/);
    itens.push(pessoal.nome, partes[0] ?? "", partes[partes.length - 1] ?? "");
    itens.push(pessoal.email, pessoal.telefone, somenteDigitos(pessoal.telefone));
    for (const url of [pessoal.linkedin, pessoal.github, pessoal.portfolio]) {
      if (url) itens.push(url, semProtocolo(url));
    }
  }
  const documentos = perfil?.documentos;
  if (documentos?.cpf) itens.push(documentos.cpf, somenteDigitos(documentos.cpf));
  if (documentos?.rg) itens.push(documentos.rg);
  if (documentos?.dataNascimento) {
    const [ano, mes, dia] = documentos.dataNascimento.split("-");
    itens.push(documentos.dataNascimento, `${dia ?? ""}/${mes ?? ""}/${ano ?? ""}`);
  }
  const endereco = perfil?.endereco;
  if (endereco?.logradouro) itens.push(endereco.logradouro);
  if (endereco?.cep) itens.push(endereco.cep, somenteDigitos(endereco.cep));
  const unicos = [...new Set(itens.map((i) => i.trim()).filter((i) => i.length >= TAMANHO_MINIMO))];
  return unicos.sort((a, b) => b.length - a.length);
}

import type { GrupoAfirmativo } from "./analise-vaga.ts";
import type { Diversidade } from "../respostas/perfil.ts";

/** Idade completa em anos na data `hoje` (ambas AAAA-MM-DD ou ISO). */
export function idadeEm(dataNascimento: string, hoje: string): number {
  const [an, mn, dn] = dataNascimento.slice(0, 10).split("-").map(Number);
  const [ah, mh, dh] = hoje.slice(0, 10).split("-").map(Number);
  if ([an, mn, dn, ah, mh, dh].some((v) => v === undefined || Number.isNaN(v))) return 0;
  const idade = (ah ?? 0) - (an ?? 0);
  const fezAniversario =
    (mh ?? 0) > (mn ?? 0) || ((mh ?? 0) === (mn ?? 0) && (dh ?? 0) >= (dn ?? 0));
  return fezAniversario ? idade : idade - 1;
}

/** Grupos de vaga afirmativa a que o perfil pertence. */
export function gruposDoPerfil(
  diversidade: Diversidade | undefined,
  dataNascimento: string | undefined,
  hoje: string,
): Set<GrupoAfirmativo> {
  const grupos = new Set<GrupoAfirmativo>();
  if (diversidade?.genero === "mulher_cis" || diversidade?.genero === "mulher_trans")
    grupos.add("mulheres");
  if (diversidade?.raca === "preta" || diversidade?.raca === "parda") grupos.add("pessoas_negras");
  if (diversidade?.raca === "indigena") grupos.add("indigenas");
  if (diversidade?.pcd === true) grupos.add("pcd");
  if (diversidade?.lgbtqia === true) grupos.add("lgbtqia");
  if (dataNascimento && idadeEm(dataNascimento, hoje) >= 50) grupos.add("pessoas_50_mais");
  return grupos;
}

/** Verdadeiro se o perfil tem o dado necessário para decidir a elegibilidade de um grupo. */
export function perfilInformaGrupo(
  grupo: GrupoAfirmativo,
  diversidade: Diversidade | undefined,
  dataNascimento: string | undefined,
): boolean {
  switch (grupo) {
    case "mulheres":
      return diversidade?.genero !== undefined;
    case "pessoas_negras":
    case "indigenas":
      return diversidade?.raca !== undefined;
    case "pcd":
      return diversidade?.pcd !== undefined;
    case "lgbtqia":
      return diversidade?.lgbtqia !== undefined;
    case "pessoas_50_mais":
      return dataNascimento !== undefined;
    case "outro":
      return false;
  }
}

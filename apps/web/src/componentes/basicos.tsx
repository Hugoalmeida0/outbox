import type { ReactNode } from "react";

export function Carregando({ texto = "Carregando…" }: { readonly texto?: string }) {
  return (
    <p className="linha suave" role="status">
      <span className="giro" aria-hidden="true" /> {texto}
    </p>
  );
}

export function Erro({ children }: { readonly children: ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <p className="erro-texto" role="alert">
      {children}
    </p>
  );
}

/** "62 → 87", com o depois em destaque quando melhora. */
export function Ats({
  antes,
  depois,
}: {
  readonly antes: number | null;
  readonly depois: number | null;
}) {
  if (antes === null && depois === null) return <span className="suave">-</span>;
  return (
    <span className="ats">
      {antes ?? "-"} → <span className={depois !== null ? "acento" : ""}>{depois ?? "-"}</span>
    </span>
  );
}

/** Link para um arquivo servido pelo agente (`/arquivos/<id>`), numa aba nova. */
export function LinkArquivo({
  url,
  base,
  children = "Abrir o PDF",
}: {
  readonly url: string | null;
  readonly base: string;
  readonly children?: ReactNode;
}) {
  if (!url) return null;
  return (
    <a href={`${base}${url}`} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function Plural({
  n,
  um,
  varios,
}: {
  readonly n: number;
  readonly um: string;
  readonly varios: string;
}) {
  return (
    <>
      {n} {n === 1 ? um : varios}
    </>
  );
}

import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router";
import logoClaro from "../tema/marca/logo-full-light.svg";
import logoEscuro from "../tema/marca/logo-full-dark.svg";
import { Blobs } from "../tema/Blobs.tsx";

const NAVEGACAO = [
  { para: "/", rotulo: "Início" },
  { para: "/vagas", rotulo: "Vagas" },
  { para: "/curriculo", rotulo: "Currículo" },
  { para: "/falhas", rotulo: "Falhas" },
] as const;

/** Cabeçalho com o logo e a navegação; conteúdo até 1200 px. */
export function Layout() {
  return (
    <>
      <Blobs />
      <header className="cabecalho">
        <NavLink to="/" aria-label="Camaleão, início">
          <img className="logo logo-claro" src={logoClaro} alt="camaleão" />
          <img className="logo logo-escuro" src={logoEscuro} alt="camaleão" />
        </NavLink>
        <nav className="navegacao" aria-label="Principal">
          {NAVEGACAO.map((item) => (
            <NavLink key={item.para} to={item.para} end={item.para === "/"}>
              {item.rotulo}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="conteudo">
        <Outlet />
      </main>
    </>
  );
}

/** Moldura de "janela", como nas telas do brand board, para telas fora do app (conexão). */
export function Janela({ children }: { readonly children: ReactNode }) {
  return (
    <div className="janela">
      <div className="janela-barra" aria-hidden="true">
        <span className="bolinha-coral" />
        <span className="bolinha-sol" />
        <span className="bolinha-menta" />
      </div>
      <div className="janela-corpo">{children}</div>
    </div>
  );
}

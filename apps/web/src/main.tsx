import "@fontsource/poppins/700.css";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/600.css";
import "./tema/tokens.css";
import "./tema/base.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ProvedorConexao } from "./agente/conexao.tsx";
import { App } from "./App.tsx";

const raiz = document.getElementById("raiz");
if (!raiz) throw new Error("elemento #raiz ausente no index.html");

createRoot(raiz).render(
  <StrictMode>
    <BrowserRouter>
      <ProvedorConexao>
        <App />
      </ProvedorConexao>
    </BrowserRouter>
  </StrictMode>,
);

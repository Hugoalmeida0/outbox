import { useState } from "react";
import type { SyntheticEvent } from "react";
import { useConexao } from "../agente/conexao.tsx";
import { Erro } from "../componentes/basicos.tsx";
import { Janela } from "../layout/Layout.tsx";
import logoClaro from "../tema/marca/logo-full-light.svg";
import logoEscuro from "../tema/marca/logo-full-dark.svg";
import { Blobs } from "../tema/Blobs.tsx";

export const COMANDO_AGENTE = "npm run camaleao -- agente";

function Copiar({ texto }: { readonly texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="linha">
      <code className="codigo">{texto}</code>
      <button
        type="button"
        className="botao secundario pequeno"
        onClick={() => {
          void navigator.clipboard.writeText(texto).then(() => setCopiado(true));
        }}
      >
        {copiado ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}

/**
 * "Conectar o Camaleão": sem agente, mostra o comando e tenta de novo a cada 3 s; com agente sem
 * pareamento, pede o código do terminal; com agente antigo, pede para atualizar.
 */
export function Conectar() {
  const { fase, saude, cliente, parear, erroPareamento, trocarEndereco } = useConexao();
  const [codigo, setCodigo] = useState("");
  const [endereco, setEndereco] = useState(cliente.baseUrl);
  const [enviando, setEnviando] = useState(false);
  const aoParear = async (e: SyntheticEvent) => {
    e.preventDefault();
    setEnviando(true);
    await parear(codigo);
    setEnviando(false);
  };

  return (
    <>
      <Blobs />
      <main className="conteudo">
        <header className="cabecalho">
          <img className="logo logo-claro" src={logoClaro} alt="camaleão" />
          <img className="logo logo-escuro" src={logoEscuro} alt="camaleão" />
        </header>
        <Janela>
          {fase === "desatualizado" ? (
            <section className="empilhado">
              <h1>Seu Camaleão está desatualizado</h1>
              <p>
                Este site é de outra versão que o Camaleão desta máquina (versão{" "}
                {saude?.versao ?? "?"}). Atualize o repositório (<code>git pull</code> e{" "}
                <code>npm ci</code>) e rode o agente de novo:
              </p>
              <Copiar texto={COMANDO_AGENTE} />
            </section>
          ) : fase === "parear" ? (
            <section className="empilhado">
              <h1>
                Quase lá. <span className="acento">Só falta o código.</span>
              </h1>
              <p>Digite o código de pareamento que apareceu no terminal do Camaleão.</p>
              <form className="linha" onSubmit={(e) => void aoParear(e)}>
                <label className="oculto" htmlFor="codigo">
                  Código de pareamento
                </label>
                <input
                  id="codigo"
                  type="text"
                  placeholder="ABCD-EFGH"
                  autoComplete="one-time-code"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
                <button className="botao" disabled={enviando || codigo.trim().length < 8}>
                  Conectar
                </button>
              </form>
              <Erro>{erroPareamento}</Erro>
            </section>
          ) : (
            <section className="empilhado">
              <h1>
                Conectar o <span className="acento">Camaleão</span>
              </h1>
              <p>
                O site conversa com o Camaleão rodando na sua máquina: é lá que ficam o seu
                currículo, o Claude da sua assinatura e o navegador que preenche os formulários.
                Abra um terminal na pasta do Camaleão e rode:
              </p>
              <Copiar texto={COMANDO_AGENTE} />
              <p className="linha suave" role="status">
                <span className="giro" aria-hidden="true" />
                {fase === "procurando"
                  ? "Procurando o Camaleão…"
                  : "Ainda não encontrei. Tento de novo a cada 3 segundos."}
              </p>
              <p className="pequeno suave">
                O Chrome pode pedir permissão de <strong>acesso à rede local</strong>: é o site
                falando com o Camaleão em 127.0.0.1. Pode permitir.
              </p>
              <details>
                <summary>Usar outra porta</summary>
                <form
                  className="linha secao"
                  onSubmit={(e) => {
                    e.preventDefault();
                    trocarEndereco(endereco);
                  }}
                >
                  <label className="oculto" htmlFor="endereco">
                    Endereço do Camaleão
                  </label>
                  <input
                    id="endereco"
                    type="url"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                  />
                  <button className="botao secundario pequeno">Usar este endereço</button>
                </form>
              </details>
            </section>
          )}
        </Janela>
      </main>
    </>
  );
}

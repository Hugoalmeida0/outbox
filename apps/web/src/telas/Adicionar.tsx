import { useState } from "react";
import type { SyntheticEvent } from "react";
import { Link } from "react-router";
import { esquemaSaidaAdicionar, RESULTADOS_ADICAO } from "@contrato";
import { ErroAgente } from "../agente/cliente.ts";
import { useAgente } from "../agente/conexao.tsx";
import { Erro } from "../componentes/basicos.tsx";
import type { z } from "zod";

type Item = z.infer<typeof esquemaSaidaAdicionar>["itens"][number];

/** Os mesmos rótulos do `camaleao adicionar`. */
export const ROTULOS_ADICAO: Readonly<Record<Item["resultado"], string>> = {
  adicionada: "adicionada",
  ja_na_fila: "já na fila",
  duplicada: "duplicada",
  reaberta: "reaberta",
  ignorada: "ignorada",
  invalida: "inválida",
};

/** Uma URL por linha; vazias e comentários (`#`) ficam de fora, como no `-a <arquivo>`. */
export function urlsDoTexto(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "" && !l.startsWith("#"));
}

/** "adicionada 2 · inválida 1", na ordem da CLI. */
export function totaisAdicao(itens: readonly Item[]): string {
  return RESULTADOS_ADICAO.map((r) => [r, itens.filter((i) => i.resultado === r).length] as const)
    .filter(([, n]) => n > 0)
    .map(([r, n]) => `${ROTULOS_ADICAO[r]} ${String(n)}`)
    .join(" · ");
}

export function Adicionar() {
  const cliente = useAgente();
  const [texto, setTexto] = useState("");
  const [itens, setItens] = useState<Item[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const urls = urlsDoTexto(texto);

  const aoEnviar = async (e: SyntheticEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const saida = await cliente.enviar("POST", "/vagas", { urls }, esquemaSaidaAdicionar);
      setItens(saida.itens);
      setTexto("");
    } catch (falha) {
      setErro(falha instanceof ErroAgente ? falha.message : "Não consegui falar com o Camaleão.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="empilhado">
      <h1>Colar links de vagas</h1>
      <p className="suave">
        Um link por linha: LinkedIn, Gupy, Greenhouse, página de carreira, o que tiver. Linhas com{" "}
        <code>#</code> são ignoradas.
      </p>
      <form className="empilhado" onSubmit={(e) => void aoEnviar(e)}>
        <label htmlFor="urls">Links das vagas</label>
        <textarea
          id="urls"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={"https://job-boards.greenhouse.io/empresa/jobs/123\n# vagas da semana"}
        />
        <div className="linha">
          <button className="botao" disabled={enviando || urls.length === 0}>
            Adicionar {urls.length > 0 ? `${String(urls.length)} ` : ""}à fila
          </button>
        </div>
      </form>
      <Erro>{erro}</Erro>
      {itens && (
        <section className="cartao" aria-label="Resultado">
          <h2>{totaisAdicao(itens)}</h2>
          <div className="rolagem">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Resultado</th>
                  <th>ID</th>
                  <th>URL</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((i, n) => (
                  <tr key={`${i.url}-${String(n)}`}>
                    <td>{ROTULOS_ADICAO[i.resultado]}</td>
                    <td>{i.id ?? "-"}</td>
                    <td>{i.url}</td>
                    <td>{i.detalhe ?? (i.status ? `status ${i.status}` : "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {itens.some((i) => i.resultado === "adicionada" || i.resultado === "reaberta") && (
            <p className="secao">
              Próximo passo:{" "}
              <Link className="botao pequeno" to="/preparar">
                Preparar
              </Link>
            </p>
          )}
        </section>
      )}
    </div>
  );
}

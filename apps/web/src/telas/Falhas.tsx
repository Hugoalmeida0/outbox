import { esquemaSaidaFalhas } from "@contrato";
import { useConsulta } from "../agente/consulta.ts";
import { Carregando, Erro } from "../componentes/basicos.tsx";

export function Falhas() {
  const { dados, erro, carregando } = useConsulta("/falhas", esquemaSaidaFalhas);
  if (carregando && !dados) return <Carregando />;
  if (!dados) return <Erro>{erro}</Erro>;
  const abertas = dados.grupos.reduce((n, g) => n + g.quantidade, 0);
  return (
    <div className="empilhado">
      <h1>Falhas</h1>
      <p className="suave">
        Quando um conector tropeça num site, o agente assume a vaga e eu guardo o registro (com o
        HTML sanitizado, sem dados seus) em <code>falhas/</code>. Para marcar uma como resolvida,
        abra o JSON dela em <code>falhas/&lt;conector&gt;/</code> e troque{" "}
        <code>&quot;resolvida&quot;: false</code> por <code>true</code>. Para corrigir um conector:{" "}
        <code>npm run capturar-fixture -- &lt;url&gt;</code>.
      </p>
      <section className="cartao" aria-label="Falhas de conector">
        <h2>Falhas de conector abertas: {abertas}</h2>
        {dados.grupos.length === 0 ? (
          <p className="suave">Nenhuma falha aberta. Tudo rodando liso.</p>
        ) : (
          <div className="rolagem">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Conector</th>
                  <th>Passo</th>
                  <th>Qtd</th>
                  <th>Mais recente</th>
                  <th>URL</th>
                </tr>
              </thead>
              <tbody>
                {dados.grupos.map((g) => (
                  <tr key={`${g.conector}-${g.passo}`}>
                    <td>{g.conector}</td>
                    <td>{g.passo}</td>
                    <td>{g.quantidade}</td>
                    <td>{g.maisRecente.slice(0, 16).replace("T", " ")}</td>
                    <td>
                      <a href={g.urlMaisRecente} target="_blank" rel="noopener noreferrer">
                        {g.urlMaisRecente}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="cartao" aria-label="Sem conector">
        <h2>Vagas preenchidas pelo agente, sem conector</h2>
        <p className="suave pequeno">O ranking mostra qual ATS mais vale ganhar um conector.</p>
        {dados.semConector.length === 0 ? (
          <p className="suave">Nenhuma até agora.</p>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Motor</th>
                <th>Qtd</th>
              </tr>
            </thead>
            <tbody>
              {dados.semConector.map((s) => (
                <tr key={s.motor}>
                  <td>{s.motor}</td>
                  <td>{s.quantidade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

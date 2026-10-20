import type { ResumoRevisaoWeb } from "@contrato";
import { Ats, LinkArquivo } from "./basicos.tsx";

/** O resumo de revisão da vaga, antes da decisão: o mesmo da CLI, com as respostas vazias em destaque. */
export function RevisaoCartao({
  resumo,
  base,
}: {
  readonly resumo: ResumoRevisaoWeb;
  readonly base: string;
}) {
  const vazias = resumo.respostas.filter((r) => r.vaziaNaPagina);
  return (
    <section className="cartao" aria-label={`Revisão da vaga #${String(resumo.vagaId)}`}>
      <div className="linha entre">
        <h2>
          #{resumo.vagaId} {resumo.empresa} · {resumo.cargo}
        </h2>
        <span className="selo">
          {resumo.motor} · {resumo.rota}
        </span>
      </div>
      <div className="grade secao">
        <div>
          <div className="suave pequeno">Aderência</div>
          <div className="numero-grande">{resumo.aderencia ?? "-"}</div>
        </div>
        <div>
          <div className="suave pequeno">Score ATS</div>
          <div className="numero-grande">
            <Ats antes={resumo.atsAntes} depois={resumo.atsDepois} />
          </div>
        </div>
        <div className="empilhado">
          <a href={resumo.url} target="_blank" rel="noopener noreferrer">
            Ver a vaga
          </a>
          <LinkArquivo url={resumo.urlPdf} base={base}>
            Abrir o currículo desta vaga (PDF)
          </LinkArquivo>
        </div>
      </div>
      {resumo.gapsRestantes.length > 0 && (
        <p className="secao">
          <strong>Ainda sem lastro no seu master:</strong> {resumo.gapsRestantes.join(", ")}
        </p>
      )}
      {resumo.alertas.length > 0 && (
        <p>
          <strong>Alertas:</strong> {resumo.alertas.join(", ")}
        </p>
      )}
      {vazias.length > 0 && (
        <p className="erro-texto">
          {vazias.length === 1
            ? "1 campo ficou vazio na página: confira antes de decidir."
            : `${String(vazias.length)} campos ficaram vazios na página: confira antes de decidir.`}
        </p>
      )}
      <h3 className="secao">Respostas</h3>
      <ul className="respostas">
        {resumo.respostas.map((r, i) => (
          <li key={`${r.rotulo}-${String(i)}`} className={r.vaziaNaPagina ? "vazia" : ""}>
            <strong>{r.rotulo}:</strong> {r.valor}
            {r.vaziaNaPagina && <span className="selo erro"> vazia na página</span>}
            {!r.vaziaNaPagina && r.nova && <span className="selo destaque"> nova</span>}
          </li>
        ))}
      </ul>
      {resumo.cartaInicio && (
        <>
          <h3 className="secao">Início da carta</h3>
          <p className="suave">{resumo.cartaInicio}</p>
        </>
      )}
    </section>
  );
}

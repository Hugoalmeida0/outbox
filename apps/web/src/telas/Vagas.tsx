import { useState } from "react";
import type { SyntheticEvent } from "react";
import { Link } from "react-router";
import {
  esquemaOk,
  esquemaSaidaStatus,
  ETAPAS,
  STATUS,
  STATUS_RETORNO,
  type LinhaStatusWeb,
} from "@contrato";
import { ErroAgente } from "../agente/cliente.ts";
import { useAgente } from "../agente/conexao.tsx";
import { useConsulta } from "../agente/consulta.ts";
import { Ats, Carregando, Erro, LinkArquivo } from "../componentes/basicos.tsx";

const ROTULOS_ETAPA: Readonly<Record<(typeof ETAPAS)[number], string>> = {
  triagem: "triagem",
  entrevista_rh: "entrevista com RH",
  tecnica: "técnica",
  final: "final",
};

function dataHora(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

/** Registrar retorno: status, etapa (obrigatória em EM_PROCESSO) e nota; erros listam as aceitas. */
function Retorno({
  vaga,
  aoSalvar,
}: {
  readonly vaga: LinhaStatusWeb;
  readonly aoSalvar: () => void;
}) {
  const cliente = useAgente();
  const [status, setStatus] = useState<(typeof STATUS_RETORNO)[number]>("EM_PROCESSO");
  const [etapa, setEtapa] = useState<(typeof ETAPAS)[number]>("triagem");
  const [nota, setNota] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const aoEnviar = async (e: SyntheticEvent) => {
    e.preventDefault();
    setErro(null);
    setOk(false);
    try {
      await cliente.enviar(
        "POST",
        `/vagas/${String(vaga.id)}/retorno`,
        {
          status,
          ...(status === "EM_PROCESSO" ? { etapa } : {}),
          ...(nota.trim() ? { nota: nota.trim() } : {}),
        },
        esquemaOk,
      );
      setOk(true);
      aoSalvar();
    } catch (falha) {
      setErro(falha instanceof ErroAgente ? falha.message : "Não consegui falar com o Camaleão.");
    }
  };

  return (
    <form
      className="cartao empilhado"
      onSubmit={(e) => void aoEnviar(e)}
      aria-label="Registrar retorno"
    >
      <h3>
        #{vaga.id} {vaga.empresa ?? "(empresa?)"} · {vaga.cargo ?? "(cargo?)"}
      </h3>
      <p className="suave pequeno">
        Status atual: {vaga.status}
        {vaga.etapa ? ` (${ROTULOS_ETAPA[vaga.etapa]})` : ""}
      </p>
      <div className="campos">
        <div className="campo">
          <label htmlFor="retorno-status">Novo status</label>
          <select
            id="retorno-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as (typeof STATUS_RETORNO)[number])}
          >
            {STATUS_RETORNO.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {status === "EM_PROCESSO" && (
          <div className="campo">
            <label htmlFor="retorno-etapa">Etapa</label>
            <select
              id="retorno-etapa"
              value={etapa}
              onChange={(e) => setEtapa(e.target.value as (typeof ETAPAS)[number])}
            >
              {ETAPAS.map((s) => (
                <option key={s} value={s}>
                  {ROTULOS_ETAPA[s]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="campo">
        <label htmlFor="retorno-nota">Nota (opcional)</label>
        <input
          id="retorno-nota"
          type="text"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
      </div>
      <div className="linha">
        <button className="botao pequeno">Registrar retorno</button>
        {ok && <span className="selo sucesso">Anotado!</span>}
      </div>
      <Erro>{erro}</Erro>
    </form>
  );
}

export function Vagas() {
  const [filtro, setFiltro] = useState("");
  const consulta = useConsulta(filtro ? `/status?status=${filtro}` : "/status", esquemaSaidaStatus);
  const cliente = useAgente();
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const linhas = consulta.dados?.linhas ?? [];
  const vaga = linhas.find((l) => l.id === selecionada) ?? null;

  return (
    <div className="empilhado">
      <div className="linha entre">
        <h1>Vagas</h1>
        <Link className="botao pequeno" to="/vagas/adicionar">
          Colar links
        </Link>
      </div>
      <div className="campo">
        <label htmlFor="filtro">Filtrar por status</label>
        <select id="filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todos</option>
          {Object.values(STATUS).map((s) => (
            <option key={s} value={s}>
              {s} ({consulta.dados?.contagens[s] ?? 0})
            </option>
          ))}
        </select>
      </div>
      {consulta.carregando && !consulta.dados && <Carregando />}
      <Erro>{consulta.erro}</Erro>
      {consulta.dados && linhas.length === 0 && (
        <p className="suave">
          {filtro
            ? `Nenhuma vaga com status ${filtro}.`
            : "Nenhuma vaga ainda. Cole uns links e bora."}
        </p>
      )}
      {linhas.length > 0 && (
        <div className="rolagem cartao">
          <table className="tabela">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Motivo/etapa</th>
                <th>Empresa</th>
                <th>Cargo</th>
                <th>Motor</th>
                <th>Aderência</th>
                <th>ATS</th>
                <th>Atualizada</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className={l.id === selecionada ? "selecionada" : ""}>
                  <td>
                    <button
                      className="botao secundario pequeno"
                      aria-label={`Detalhes da vaga ${String(l.id)}`}
                      onClick={() => setSelecionada(l.id === selecionada ? null : l.id)}
                    >
                      #{l.id}
                    </button>
                  </td>
                  <td>{l.status}</td>
                  <td>{l.motivo ?? l.etapa ?? "-"}</td>
                  <td>{l.empresa ?? "-"}</td>
                  <td>{l.cargo ?? "-"}</td>
                  <td>{l.motor}</td>
                  <td>{l.aderencia ?? "-"}</td>
                  <td>
                    <Ats antes={l.atsAntes} depois={l.atsDepois} />
                  </td>
                  <td>{dataHora(l.atualizadaEm)}</td>
                  <td>
                    <LinkArquivo url={l.urlPdf} base={cliente.baseUrl}>
                      PDF
                    </LinkArquivo>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {vaga && <Retorno key={vaga.id} vaga={vaga} aoSalvar={consulta.recarregar} />}
    </div>
  );
}

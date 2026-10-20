import { useState } from "react";
import type { SyntheticEvent } from "react";
import { Link } from "react-router";
import type { ResultadoExecucao } from "@contrato";
import { useExecucao, type VagaAndamento } from "../agente/execucao.ts";
import { Erro } from "../componentes/basicos.tsx";

const ROTULOS_ETAPA: Readonly<Record<string, string>> = {
  resolver: "achando o ATS de verdade",
  extrair: "lendo a vaga",
  analisar: "analisando a aderência",
  gerar_curriculo: "ajustando o currículo",
  gerar_carta: "escrevendo a carta",
  responder_campos: "pré-respondendo o formulário",
};

/** "Deixei 5 vagas prontinhas pra você revisar." e o resto do resumo, no tom da marca. */
export function fraseResumoPreparo(r: Extract<ResultadoExecucao, { comando: "preparar" }>): string {
  if (r.processadas === 0 && r.interrompido === null) {
    return "Nenhuma vaga na fila. Cole uns links e eu preparo.";
  }
  const prontas = r.contagens.PRONTA ?? 0;
  const partes = [
    prontas > 0
      ? `Deixei ${String(prontas)} ${prontas === 1 ? "vaga prontinha" : "vagas prontinhas"} pra você revisar.`
      : "Nenhuma vaga ficou pronta dessa vez.",
  ];
  const descartadas = r.contagens.DESCARTADA ?? 0;
  if (descartadas > 0)
    partes.push(`${String(descartadas)} não combinavam com você e saíram da fila.`);
  if (r.erros.length > 0)
    partes.push(`${String(r.erros.length)} deram erro e tento de novo no próximo preparo.`);
  if (r.interrompido === "limite")
    partes.push("O limite do Claude chegou: o resto fica para depois.");
  if (r.interrompido === "cancelado")
    partes.push("Parei como você pediu; o que estava em curso continua na fila.");
  return partes.join(" ");
}

function LinhaVaga({ vaga }: { readonly vaga: VagaAndamento }) {
  const nome = [vaga.empresa, vaga.cargo].filter(Boolean).join(" · ") || "vaga";
  const estado = vaga.concluida ? (
    <span className={vaga.erro ? "selo erro" : vaga.status === "PRONTA" ? "selo sucesso" : "selo"}>
      {vaga.erro ? `erro: ${vaga.erro}` : vaga.status}
    </span>
  ) : (
    <span className="linha suave pequeno">
      <span className="giro" aria-hidden="true" /> {ROTULOS_ETAPA[vaga.etapa ?? ""] ?? "na fila"}
    </span>
  );
  return (
    <li>
      <span>
        #{vaga.id} {nome}
      </span>
      {estado}
    </li>
  );
}

export function Preparar() {
  const { estado, iniciar, cancelar, erroAcao, novaRodada } = useExecucao("preparar");
  const [forcar, setForcar] = useState(false);
  const [reavaliar, setReavaliar] = useState(false);
  const [paralelo, setParalelo] = useState(2);
  const resultado = estado.resultado?.comando === "preparar" ? estado.resultado : null;

  const aoIniciar = (e: SyntheticEvent) => {
    e.preventDefault();
    void iniciar("/execucoes/preparar", { forcar, reavaliar, paralelo });
  };

  return (
    <div className="empilhado">
      <h1>Preparar</h1>
      <p className="suave">
        Para cada vaga da fila: acho o ATS, leio a vaga, comparo com o seu master e ajusto o
        currículo, sem inventar nada.
      </p>
      {estado.id === null && (
        <form className="cartao empilhado" onSubmit={aoIniciar}>
          <label className="marcar">
            <input type="checkbox" checked={forcar} onChange={(e) => setForcar(e.target.checked)} />
            Preparar mesmo abaixo da aderência mínima
          </label>
          <label className="marcar">
            <input
              type="checkbox"
              checked={reavaliar}
              onChange={(e) => setReavaliar(e.target.checked)}
            />
            Reavaliar as descartadas com os gaps que você já confirmou
          </label>
          <div className="campo">
            <label htmlFor="paralelo">Vagas ao mesmo tempo (1 a 8)</label>
            <input
              id="paralelo"
              type="number"
              min={1}
              max={8}
              value={paralelo}
              onChange={(e) => setParalelo(Number(e.target.value))}
            />
          </div>
          <div>
            <button className="botao">Bora preparar</button>
          </div>
        </form>
      )}
      <Erro>{erroAcao}</Erro>
      {estado.id !== null && (
        <section className="cartao" aria-label="Andamento">
          <div className="linha entre">
            <h2>
              {estado.rodando
                ? estado.total === null
                  ? "Começando…"
                  : `Preparando ${String(estado.total)} ${estado.total === 1 ? "vaga" : "vagas"}`
                : "Pronto"}
            </h2>
            {estado.rodando && (
              <button className="botao secundario pequeno" onClick={() => void cancelar()}>
                Parar
              </button>
            )}
          </div>
          <ul className="lista-vagas">
            {estado.vagas.map((v) => (
              <LinhaVaga key={v.id} vaga={v} />
            ))}
          </ul>
          {resultado && (
            <div className="secao empilhado">
              <p>
                <strong>{fraseResumoPreparo(resultado)}</strong>
              </p>
              <div className="linha">
                {(resultado.contagens.PRONTA ?? 0) > 0 && (
                  <Link className="botao" to="/aplicar">
                    Revisar e aplicar
                  </Link>
                )}
                <button className="botao secundario pequeno" onClick={novaRodada}>
                  Preparar de novo
                </button>
              </div>
            </div>
          )}
          <Erro>{estado.erro?.mensagem}</Erro>
        </section>
      )}
    </div>
  );
}

import { useState } from "react";
import type { SyntheticEvent } from "react";
import type { ResultadoExecucao } from "@contrato";
import { useAgente } from "../agente/conexao.tsx";
import { useExecucao } from "../agente/execucao.ts";
import { Erro } from "../componentes/basicos.tsx";
import { PerguntaCartao } from "../componentes/PerguntaCartao.tsx";
import { RevisaoCartao } from "../componentes/RevisaoCartao.tsx";

const ROTULOS_DESFECHO: Readonly<Record<string, string>> = {
  enviada: "enviada",
  pendente_teste: "esperando teste",
  pulada: "pulada",
  manual: "para você terminar",
  mantida: "mantida",
  sair: "pausada",
  manual_automatica: "virou manual",
  erro: "com erro",
};

export function fraseResumoAplicacao(
  r: Extract<ResultadoExecucao, { comando: "aplicar" }>,
): string {
  if (r.revisadas === 0 && r.interrompido === null) {
    return "Nenhuma vaga pronta para aplicar agora.";
  }
  const partes = Object.entries(r.desfechos)
    .filter(([, n]) => n > 0)
    .map(([d, n]) => `${String(n)} ${ROTULOS_DESFECHO[d] ?? d}`);
  const base = `Revisamos ${String(r.revisadas)} ${r.revisadas === 1 ? "vaga" : "vagas"}: ${partes.join(", ")}.`;
  if (r.interrompido === "limite") return `${base} O limite do Claude chegou; retome mais tarde.`;
  if (r.interrompido === "cancelado") return `${base} Parei como você pediu.`;
  return base;
}

export function Aplicar() {
  const cliente = useAgente();
  const { estado, iniciar, responder, cancelar, erroAcao, novaRodada } = useExecucao("aplicar");
  const [simular, setSimular] = useState(false);
  const [id, setId] = useState("");
  const resultado = estado.resultado?.comando === "aplicar" ? estado.resultado : null;

  const aoIniciar = (e: SyntheticEvent) => {
    e.preventDefault();
    void iniciar("/execucoes/aplicar", { simular, ...(id.trim() ? { id: Number(id) } : {}) });
  };

  return (
    <div className="empilhado">
      <h1>Aplicar</h1>
      <p className="suave">
        Abro cada formulário no navegador do Camaleão, preencho e paro na revisão. Nada é enviado
        sem a sua confirmação.
      </p>
      {estado.id === null && (
        <form className="cartao empilhado" onSubmit={aoIniciar}>
          <label className="marcar">
            <input
              type="checkbox"
              checked={simular}
              onChange={(e) => setSimular(e.target.checked)}
            />
            Só simular: preenche e revisa, mas nunca envia
          </label>
          <div className="campo">
            <label htmlFor="vaga-id">Só esta vaga (id, opcional)</label>
            <input
              id="vaga-id"
              type="number"
              min={1}
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
          </div>
          <div>
            <button className="botao">Bora aplicar</button>
          </div>
        </form>
      )}
      <Erro>{erroAcao}</Erro>

      {estado.id !== null && (
        <>
          {estado.pergunta && <PerguntaCartao pergunta={estado.pergunta} aoResponder={responder} />}
          {estado.revisao && <RevisaoCartao resumo={estado.revisao} base={cliente.baseUrl} />}
          {estado.arquivos.length > 0 && (
            <p>
              <a
                href={cliente.url(estado.arquivos.at(-1) ?? "")}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir o PDF pedido
              </a>
            </p>
          )}
          <section className="cartao" aria-label="Andamento">
            <div className="linha entre">
              <h2>{estado.rodando ? "Aplicando" : "Pronto"}</h2>
              {estado.rodando && (
                <button className="botao secundario pequeno" onClick={() => void cancelar()}>
                  Parar
                </button>
              )}
            </div>
            <ul className="avisos" aria-live="polite">
              {estado.avisos.map((a, i) => (
                <li key={`${String(i)}-${a}`}>{a}</li>
              ))}
            </ul>
            {resultado && (
              <div className="secao linha entre">
                <strong>{fraseResumoAplicacao(resultado)}</strong>
                <button className="botao secundario pequeno" onClick={novaRodada}>
                  Aplicar de novo
                </button>
              </div>
            )}
            <Erro>{estado.erro?.mensagem}</Erro>
          </section>
        </>
      )}
    </div>
  );
}

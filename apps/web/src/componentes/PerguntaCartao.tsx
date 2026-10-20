import { useState } from "react";
import type { SyntheticEvent } from "react";
import type { Pergunta } from "@contrato";

type Valor = boolean | number | string | null;

export interface PropsPergunta {
  readonly pergunta: Pergunta;
  readonly aoResponder: (valor: Valor) => void | Promise<void>;
}

/**
 * Uma pergunta do fluxo (rodada de gaps, revisão, pausas) como card. "Enviar" pede uma confirmação
 * antes de responder: o envio é a única ação que não tem volta.
 */
export function PerguntaCartao({ pergunta, aoResponder }: PropsPergunta) {
  return (
    <section className="cartao destaque" aria-live="polite" aria-label="Pergunta do Camaleão">
      <h3>{pergunta.mensagem}</h3>
      <Controles key={pergunta.id} pergunta={pergunta} aoResponder={aoResponder} />
    </section>
  );
}

function Controles({ pergunta, aoResponder }: PropsPergunta) {
  const [texto, setTexto] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const responder = async (valor: Valor) => {
    setEnviando(true);
    try {
      await aoResponder(valor);
    } finally {
      setEnviando(false);
    }
  };
  const aoEnviarTexto = (e: SyntheticEvent) => {
    e.preventDefault();
    if (pergunta.tipo === "numero") void responder(Number(texto));
    else void responder(texto);
  };

  switch (pergunta.tipo) {
    case "sim_nao":
      return (
        <div className="linha">
          <button className="botao" disabled={enviando} onClick={() => void responder(true)}>
            Sim
          </button>
          <button
            className="botao secundario"
            disabled={enviando}
            onClick={() => void responder(false)}
          >
            Não
          </button>
        </div>
      );
    case "aguardar":
      return (
        <div className="empilhado">
          <p>Resolva na janela do Camaleão e clique em Continuar.</p>
          <button className="botao" disabled={enviando} onClick={() => void responder(null)}>
            Continuar
          </button>
        </div>
      );
    case "escolha":
      if (confirmando) {
        return (
          <div className="empilhado">
            <p>
              <strong>Enviar esta candidatura agora?</strong> Depois de enviada, não dá para
              desfazer.
            </p>
            <div className="linha">
              <button
                className="botao"
                disabled={enviando}
                onClick={() => void responder("enviar")}
              >
                Sim, enviar
              </button>
              <button className="botao secundario" onClick={() => setConfirmando(false)}>
                Voltar
              </button>
            </div>
          </div>
        );
      }
      return (
        <div className="linha">
          {(pergunta.opcoes ?? []).map((opcao) => (
            <button
              key={opcao.valor}
              className={opcao.valor === "enviar" ? "botao" : "botao secundario pequeno"}
              disabled={enviando}
              onClick={() =>
                opcao.valor === "enviar" ? setConfirmando(true) : void responder(opcao.valor)
              }
            >
              {rotuloLimpo(opcao.rotulo)}
            </button>
          ))}
        </div>
      );
    case "numero":
    case "texto":
      return (
        <form className="linha" onSubmit={aoEnviarTexto}>
          <label className="oculto" htmlFor={`resposta-${pergunta.id}`}>
            Resposta
          </label>
          <input
            id={`resposta-${pergunta.id}`}
            type={pergunta.tipo === "numero" ? "number" : "text"}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            {...(pergunta.min !== undefined ? { min: pergunta.min } : {})}
            {...(pergunta.max !== undefined ? { max: pergunta.max } : {})}
            required
          />
          <button className="botao pequeno" disabled={enviando || texto.trim() === ""}>
            Responder
          </button>
        </form>
      );
  }
}

/** "[e]nviar a candidatura" vira "Enviar a candidatura": os atalhos de teclado são da CLI. */
export function rotuloLimpo(rotulo: string): string {
  const sem = rotulo.replace(/\[(\w)\]/, "$1");
  return sem.charAt(0).toUpperCase() + sem.slice(1);
}

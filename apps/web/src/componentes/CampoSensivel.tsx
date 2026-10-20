import { useId, useState } from "react";

export interface PropsCampoSensivel {
  readonly rotulo: string;
  readonly valor: string;
  readonly aoMudar: (valor: string) => void;
  readonly erro?: string | undefined;
  readonly ajuda?: string;
  readonly tipo?: "text" | "number";
}

/** Campo com dado sensível: mascarado até o usuário pedir "mostrar". O valor só vai ao agente local. */
export function CampoSensivel({
  rotulo,
  valor,
  aoMudar,
  erro,
  ajuda,
  tipo = "text",
}: PropsCampoSensivel) {
  const id = useId();
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <div className="sensivel">
        <input
          id={id}
          type={visivel ? tipo : "password"}
          autoComplete="off"
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          aria-invalid={erro ? true : undefined}
          {...(tipo === "number" && visivel ? { inputMode: "decimal" as const } : {})}
        />
        <button
          type="button"
          className="botao secundario pequeno"
          aria-pressed={visivel}
          aria-label={`${visivel ? "Ocultar" : "Mostrar"} ${rotulo}`}
          onClick={() => setVisivel((v) => !v)}
        >
          {visivel ? "ocultar" : "mostrar"}
        </button>
      </div>
      {ajuda && <span className="ajuda">{ajuda}</span>}
      {erro && <span className="erro">{erro}</span>}
    </div>
  );
}

export function Campo({ rotulo, valor, aoMudar, erro, ajuda, tipo = "text" }: PropsCampoSensivel) {
  const id = useId();
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <input
        id={id}
        type={tipo}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        aria-invalid={erro ? true : undefined}
      />
      {ajuda && <span className="ajuda">{ajuda}</span>}
      {erro && <span className="erro">{erro}</span>}
    </div>
  );
}

export function SeloLocal() {
  return <span className="selo sucesso">fica só na sua máquina</span>;
}

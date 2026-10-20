import { Link } from "react-router";
import {
  esquemaEstadoCurriculo,
  esquemaExecucoesAtivas,
  esquemaOk,
  esquemaSaidaStatus,
  type EstadoCurriculo,
} from "@contrato";
import { useAgente } from "../agente/conexao.tsx";
import { useConsulta } from "../agente/consulta.ts";
import { Carregando, Erro, Plural } from "../componentes/basicos.tsx";

const ROTA_DO_COMANDO = {
  preparar: "/preparar",
  aplicar: "/aplicar",
  importar: "/curriculo/importar",
  renderizar_master: "/curriculo",
} as const;

/** Primeiros passos, até haver master e perfil válidos: importar → perfil → logins. */
function Onboarding({ estado }: { readonly estado: EstadoCurriculo }) {
  const cliente = useAgente();
  const passos = [
    {
      feito: estado.masterExiste,
      titulo: "Importar currículo",
      texto: "Seu currículo atual vira o master: a fonte de tudo o que o Camaleão pode dizer.",
      acao: (
        <Link className="botao pequeno" to="/curriculo/importar">
          Importar
        </Link>
      ),
    },
    {
      feito: estado.perfilValido,
      titulo: "Seu perfil",
      texto: "Preferências, disponibilidade e o que os formulários costumam pedir.",
      acao: (
        <Link className="botao pequeno" to="/curriculo/perfil">
          Preencher
        </Link>
      ),
    },
    {
      feito: false,
      titulo: "Fazer logins",
      texto: "Entre no LinkedIn, na Gupy e onde mais tiver conta, no navegador do Camaleão.",
      acao: (
        <button
          className="botao secundario pequeno"
          onClick={() => void cliente.enviar("POST", "/navegador", {}, esquemaOk)}
        >
          Abrir o navegador
        </button>
      ),
    },
  ];
  return (
    <section className="cartao destaque" aria-label="Primeiros passos">
      <h2>Bora começar? São três passos.</h2>
      <ol className="empilhado">
        {passos.map((p) => (
          <li key={p.titulo}>
            <div className="linha entre">
              <div>
                <strong>
                  {p.feito ? "✓ " : ""}
                  {p.titulo}
                </strong>
                <div className="pequeno">{p.texto}</div>
              </div>
              {!p.feito && p.acao}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Inicio() {
  const status = useConsulta("/status", esquemaSaidaStatus);
  const curriculo = useConsulta("/curriculo", esquemaEstadoCurriculo);
  const ativas = useConsulta("/execucoes/ativas", esquemaExecucoesAtivas);

  if (status.carregando && !status.dados) return <Carregando />;
  if (!status.dados) return <Erro>{status.erro}</Erro>;
  const { contagens, aguardandoVoce } = status.dados;
  const paraPreparar = contagens.NOVA + contagens.ERRO_PREPARO;
  const prontas = contagens.PRONTA;
  const total = Object.values(contagens).reduce((a, b) => a + b, 0);

  return (
    <div className="empilhado">
      <h1>
        {prontas > 0 ? (
          <>
            Bora? <span className="acento">{prontas}</span>{" "}
            {prontas === 1 ? "vaga prontinha" : "vagas prontinhas"} pra você revisar.
          </>
        ) : (
          <>
            Menos formulário, <span className="acento">mais entrevista.</span>
          </>
        )}
      </h1>

      {curriculo.dados && (!curriculo.dados.masterExiste || !curriculo.dados.perfilValido) && (
        <Onboarding estado={curriculo.dados} />
      )}

      {ativas.dados?.execucoes.map((e) => (
        <section key={e.id} className="cartao sucesso linha entre">
          <span>
            Tem um <strong>{e.comando.replace("_", " ")}</strong> rodando agora.
          </span>
          <Link className="botao pequeno" to={ROTA_DO_COMANDO[e.comando]}>
            Acompanhar
          </Link>
        </section>
      ))}

      <section className="grade">
        <div className="cartao">
          <div className="suave pequeno">Na fila para preparar</div>
          <div className="numero-grande">{paraPreparar}</div>
          <Link className="botao pequeno secao" to="/preparar">
            Preparar
          </Link>
        </div>
        <div className="cartao sucesso">
          <div className="pequeno">Prontas para aplicar</div>
          <div className="numero-grande">{prontas}</div>
          <Link className="botao pequeno secao" to="/aplicar">
            Aplicar
          </Link>
        </div>
        <div className="cartao">
          <div className="suave pequeno">Enviadas e em processo</div>
          <div className="numero-grande">
            {contagens.ENVIADA + contagens.EM_PROCESSO + contagens.PENDENTE_TESTE}
          </div>
          <Link className="pequeno" to="/vagas">
            Ver todas as <Plural n={total} um="vaga" varios="vagas" />
          </Link>
        </div>
      </section>

      <div className="linha secao">
        <Link className="botao" to="/vagas/adicionar">
          Colar links de vagas
        </Link>
      </div>

      {(aguardandoVoce.manuais.length > 0 || aguardandoVoce.pendentesTeste.length > 0) && (
        <section className="cartao secao" aria-label="Aguardando você">
          <h2>Aguardando você</h2>
          <ul className="lista-vagas">
            {aguardandoVoce.manuais.map((m) => (
              <li key={m.id}>
                <span>
                  #{m.id} {m.empresa ?? "(empresa?)"} · {m.cargo ?? "(cargo?)"}
                </span>
                <span className="suave pequeno">
                  {m.destino ? `envie para ${m.destino}` : (m.motivo ?? "manual")}
                </span>
              </li>
            ))}
            {aguardandoVoce.pendentesTeste.map((p) => (
              <li key={p.id}>
                <span>
                  #{p.id} {p.empresa ?? "(empresa?)"} · {p.cargo ?? "(cargo?)"}
                </span>
                <span className="suave pequeno">
                  conclua o teste e marque como enviada em Vagas
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

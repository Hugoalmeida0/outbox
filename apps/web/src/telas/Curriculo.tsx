import { useState } from "react";
import { Link } from "react-router";
import { esquemaEstadoCurriculo, esquemaOk } from "@contrato";
import { ErroAgente } from "../agente/cliente.ts";
import { useAgente } from "../agente/conexao.tsx";
import { useConsulta } from "../agente/consulta.ts";
import { useExecucao } from "../agente/execucao.ts";
import { Carregando, Erro, LinkArquivo } from "../componentes/basicos.tsx";

export function Curriculo() {
  const cliente = useAgente();
  const estado = useConsulta("/curriculo", esquemaEstadoCurriculo);
  const master = useExecucao("renderizar_master");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const resultado =
    master.estado.resultado?.comando === "renderizar_master" ? master.estado.resultado : null;

  const acao = async (caminho: string, mensagem: string) => {
    setErro(null);
    setAviso(null);
    try {
      await cliente.enviar("POST", caminho, {}, esquemaOk);
      setAviso(mensagem);
    } catch (falha) {
      setErro(falha instanceof ErroAgente ? falha.message : "Não consegui falar com o Camaleão.");
    }
  };

  if (estado.carregando && !estado.dados) return <Carregando />;
  const dados = estado.dados;
  return (
    <div className="empilhado">
      <h1>Currículo</h1>
      <Erro>{estado.erro}</Erro>
      {dados && (
        <section className="grade">
          <div className={dados.masterExiste ? "cartao sucesso" : "cartao destaque"}>
            <h2>Master</h2>
            <p>
              {dados.masterExiste
                ? `Atualizado em ${(dados.masterAtualizadoEm ?? "").slice(0, 16).replace("T", " ")}.`
                : "Ainda não tem. Importe o seu currículo atual para começar."}
            </p>
            <div className="linha">
              <Link className="botao pequeno" to="/curriculo/importar">
                {dados.masterExiste ? "Importar de novo" : "Importar"}
              </Link>
              {dados.masterExiste && (
                <button
                  className="botao secundario pequeno"
                  onClick={() =>
                    void acao("/curriculo/abrir-master", "Abri o master no seu editor.")
                  }
                >
                  Abrir no editor
                </button>
              )}
            </div>
          </div>
          <div className={dados.perfilValido ? "cartao sucesso" : "cartao destaque"}>
            <h2>Perfil</h2>
            <p>
              {dados.perfilValido
                ? "Completo. Dá para ajustar quando quiser."
                : `Falta revisar ${String(dados.errosPerfil.length)} ${dados.errosPerfil.length === 1 ? "campo" : "campos"}.`}
            </p>
            <Link className="botao pequeno" to="/curriculo/perfil">
              {dados.perfilValido ? "Editar perfil" : "Preencher perfil"}
            </Link>
          </div>
          <div className="cartao">
            <h2>Logins</h2>
            <p>
              Entre nos sites que pedem conta no navegador do Camaleão. As sessões ficam salvas.
            </p>
            <button
              className="botao secundario pequeno"
              onClick={() =>
                void acao("/navegador", "Abri o navegador do Camaleão. Faça os logins por lá.")
              }
            >
              Abrir o navegador
            </button>
          </div>
          {dados.masterExiste && (
            <div className="cartao">
              <h2>Currículo genérico</h2>
              <p>O PDF do master sem ajuste para vaga, em uma página.</p>
              <button
                className="botao secundario pequeno"
                disabled={master.estado.rodando}
                onClick={() => {
                  master.novaRodada();
                  void master.iniciar("/execucoes/renderizar-master");
                }}
              >
                {master.estado.rodando ? "Gerando…" : "Gerar o PDF"}
              </button>
              {resultado && (
                <p className="secao">
                  <LinkArquivo url={resultado.urlPdf} base={cliente.baseUrl}>
                    Abrir o PDF ({resultado.paginas}{" "}
                    {resultado.paginas === 1 ? "página" : "páginas"})
                  </LinkArquivo>
                </p>
              )}
              {master.estado.avisos.map((a) => (
                <p key={a} className="pequeno">
                  {a}
                </p>
              ))}
              <Erro>{master.estado.erro?.mensagem ?? master.erroAcao}</Erro>
            </div>
          )}
        </section>
      )}
      {aviso && (
        <p className="selo sucesso" role="status">
          {aviso}
        </p>
      )}
      <Erro>{erro}</Erro>
    </div>
  );
}

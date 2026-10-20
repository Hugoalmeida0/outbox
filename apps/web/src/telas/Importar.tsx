import { useState } from "react";
import type { DragEvent, SyntheticEvent } from "react";
import { Link } from "react-router";
import { esquemaEstadoCurriculo, esquemaOk } from "@contrato";
import { useAgente } from "../agente/conexao.tsx";
import { useConsulta } from "../agente/consulta.ts";
import { useExecucao } from "../agente/execucao.ts";
import { Erro } from "../componentes/basicos.tsx";

export const EXTENSOES = [".pdf", ".docx", ".md", ".txt"];
const LIMITE_BYTES = 10 * 1024 * 1024;

export function Importar() {
  const cliente = useAgente();
  const curriculo = useConsulta("/curriculo", esquemaEstadoCurriculo);
  const { estado, iniciar, erroAcao, novaRodada } = useExecucao("importar");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [sobrescrever, setSobrescrever] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [problema, setProblema] = useState<string | null>(null);
  const masterExiste = curriculo.dados?.masterExiste ?? false;
  const resultado = estado.resultado?.comando === "importar" ? estado.resultado : null;

  const escolher = (escolhido: File | undefined) => {
    setProblema(null);
    if (!escolhido) return;
    const extensao = escolhido.name.slice(escolhido.name.lastIndexOf(".")).toLowerCase();
    if (!EXTENSOES.includes(extensao)) {
      setProblema(`Esse formato não rola. Use ${EXTENSOES.join(", ")}.`);
      return;
    }
    if (escolhido.size > LIMITE_BYTES) {
      setProblema("O arquivo passou de 10 MB.");
      return;
    }
    setArquivo(escolhido);
  };
  const aoSoltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    escolher(e.dataTransfer.files[0]);
  };
  const aoEnviar = (e: SyntheticEvent) => {
    e.preventDefault();
    if (!arquivo) return;
    const corpo = new FormData();
    corpo.set("arquivo", arquivo);
    corpo.set("sobrescrever", String(sobrescrever && confirmado));
    void iniciar("/execucoes/importar", corpo);
  };

  return (
    <div className="empilhado">
      <h1>Importar currículo</h1>
      <p className="suave">
        Mando o seu currículo atual (.pdf, .docx, .md ou .txt) para o Claude da sua assinatura, que
        o transforma no <code>curriculo/master.yaml</code>. Pode levar alguns minutos.
      </p>
      {estado.id === null && (
        <form className="empilhado" onSubmit={aoEnviar}>
          <div
            className={arrastando ? "soltar ativo" : "soltar"}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={aoSoltar}
          >
            <p>
              <strong>{arquivo ? arquivo.name : "Arraste o arquivo para cá"}</strong>
            </p>
            <label className="botao secundario pequeno" htmlFor="arquivo">
              ou escolha no computador
            </label>
            <input
              id="arquivo"
              className="oculto"
              type="file"
              accept={EXTENSOES.join(",")}
              onChange={(e) => escolher(e.target.files?.[0])}
            />
          </div>
          <Erro>{problema}</Erro>
          {masterExiste && (
            <div className="cartao destaque empilhado">
              <label className="marcar">
                <input
                  type="checkbox"
                  checked={sobrescrever}
                  onChange={(e) => {
                    setSobrescrever(e.target.checked);
                    setConfirmado(false);
                  }}
                />
                Substituir o master que já existe
              </label>
              {sobrescrever && (
                <label className="marcar">
                  <input
                    type="checkbox"
                    checked={confirmado}
                    onChange={(e) => setConfirmado(e.target.checked)}
                  />
                  Entendi: o master atual vira um backup e o novo entra no lugar.
                </label>
              )}
            </div>
          )}
          <div>
            <button
              className="botao"
              disabled={!arquivo || (masterExiste && sobrescrever && !confirmado)}
            >
              Importar
            </button>
          </div>
        </form>
      )}
      <Erro>{erroAcao}</Erro>
      {estado.id !== null && (
        <section className="cartao empilhado" aria-label="Importação">
          {estado.rodando && (
            <p className="linha" role="status">
              <span className="giro" aria-hidden="true" /> Convertendo o seu currículo no master…
            </p>
          )}
          {resultado && (
            <>
              <h2>
                Master criado: <span className="acento">{resultado.experiencias}</span>{" "}
                experiência(s) e <span className="acento">{resultado.skills}</span> skill(s).
              </h2>
              <p>
                Ficou em <code>{resultado.master}</code>. Revise: tudo o que estiver lá pode ir para
                os currículos, então precisa ser verdade.
              </p>
              {resultado.backup && (
                <p className="suave">
                  Backup do anterior: <code>{resultado.backup}</code>
                </p>
              )}
              {resultado.criados.length > 0 && (
                <p className="suave">Criei a partir do exemplo: {resultado.criados.join(", ")}</p>
              )}
              <div className="linha">
                <button
                  className="botao secundario pequeno"
                  onClick={() =>
                    void cliente.enviar("POST", "/curriculo/abrir-master", {}, esquemaOk)
                  }
                >
                  Abrir master no editor
                </button>
                <Link className="botao pequeno" to="/curriculo/perfil">
                  Próximo: seu perfil
                </Link>
              </div>
            </>
          )}
          {estado.erro && (
            <>
              <Erro>{estado.erro.mensagem}</Erro>
              <div>
                <button className="botao secundario pequeno" onClick={novaRodada}>
                  Tentar de novo
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

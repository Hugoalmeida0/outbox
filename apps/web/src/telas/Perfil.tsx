import { useEffect, useState } from "react";
import type { SyntheticEvent, ReactNode } from "react";
import {
  esquemaSaidaPerfil,
  GENEROS,
  MODELOS_TRABALHO,
  RACAS,
  REGIMES,
  SENIORIDADES,
} from "@contrato";
import { ErroAgente } from "../agente/cliente.ts";
import { useAgente } from "../agente/conexao.tsx";
import { useConsulta } from "../agente/consulta.ts";
import { Campo, CampoSensivel, SeloLocal } from "../componentes/CampoSensivel.tsx";
import { Carregando, Erro } from "../componentes/basicos.tsx";
import {
  CONSENTIMENTOS,
  perfilDe,
  rascunhoDe,
  type Rascunho,
  type TriEstado,
} from "./perfil-formulario.ts";

const ROTULOS: Readonly<Record<string, string>> = {
  remoto: "Remoto",
  hibrido: "Híbrido",
  presencial: "Presencial",
  estagio: "Estágio",
  junior: "Júnior",
  pleno: "Pleno",
  senior: "Sênior",
  especialista: "Especialista",
  lideranca: "Liderança",
  clt: "CLT",
  pj: "PJ",
  contractor: "Contractor (exterior)",
  mulher_cis: "Mulher cis",
  mulher_trans: "Mulher trans",
  homem_cis: "Homem cis",
  homem_trans: "Homem trans",
  nao_binario: "Não binário",
  outro: "Outro",
  branca: "Branca",
  preta: "Preta",
  parda: "Parda",
  amarela: "Amarela",
  indigena: "Indígena",
};

function Secao({
  titulo,
  sensivel = false,
  children,
}: {
  readonly titulo: string;
  readonly sensivel?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <fieldset>
      <legend>
        {titulo} {sensivel && <SeloLocal />}
      </legend>
      {children}
    </fieldset>
  );
}

function Marcas({
  rotulo,
  opcoes,
  valores,
  aoMudar,
  erro,
}: {
  readonly rotulo: string;
  readonly opcoes: readonly string[];
  readonly valores: readonly string[];
  readonly aoMudar: (v: string[]) => void;
  readonly erro?: string | undefined;
}) {
  return (
    <div className="campo" role="group" aria-label={rotulo}>
      <span>
        <strong>{rotulo}</strong>
      </span>
      <div className="linha">
        {opcoes.map((o) => (
          <label key={o} className="marcar">
            <input
              type="checkbox"
              checked={valores.includes(o)}
              onChange={(e) =>
                aoMudar(e.target.checked ? [...valores, o] : valores.filter((v) => v !== o))
              }
            />
            {ROTULOS[o] ?? o}
          </label>
        ))}
      </div>
      {erro && <span className="erro">{erro}</span>}
    </div>
  );
}

function Caixa({
  rotulo,
  valor,
  aoMudar,
}: {
  readonly rotulo: string;
  readonly valor: boolean;
  readonly aoMudar: (v: boolean) => void;
}) {
  return (
    <label className="marcar">
      <input type="checkbox" checked={valor} onChange={(e) => aoMudar(e.target.checked)} />
      {rotulo}
    </label>
  );
}

function Tri({
  rotulo,
  valor,
  aoMudar,
  padrao,
}: {
  readonly rotulo: string;
  readonly valor: TriEstado;
  readonly aoMudar: (v: TriEstado) => void;
  readonly padrao: string;
}) {
  const id = `tri-${rotulo.replace(/\W+/g, "-")}`;
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <select id={id} value={valor} onChange={(e) => aoMudar(e.target.value as TriEstado)}>
        <option value="">{padrao}</option>
        <option value="sim">Sim</option>
        <option value="nao">Não</option>
      </select>
    </div>
  );
}

/**
 * Formulário do `curriculo/perfil.yaml`, por seção do perfil. Documentos, salário, diversidade e
 * endereço completo são opcionais, mascarados ("mostrar" por campo) e nunca vão ao LLM.
 */
export function Perfil() {
  const cliente = useAgente();
  const consulta = useConsulta("/perfil", esquemaSaidaPerfil);
  const [r, setR] = useState<Rascunho | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [diversidadeVisivel, setDiversidadeVisivel] = useState(false);

  useEffect(() => {
    if (consulta.dados && r === null) setR(rascunhoDe(consulta.dados.dadosBrutos));
  }, [consulta.dados, r]);

  if (!r) return consulta.erro ? <Erro>{consulta.erro}</Erro> : <Carregando />;
  const mudar = (parcial: Partial<Rascunho>) => {
    setSalvo(false);
    setR({ ...r, ...parcial });
  };
  const e = (caminho: string): string | undefined => erros[caminho];

  const aoSalvar = async (ev: SyntheticEvent) => {
    ev.preventDefault();
    setSalvando(true);
    setErros({});
    setErroGeral(null);
    try {
      await cliente.enviar("PUT", "/perfil", perfilDe(r), esquemaSaidaPerfil);
      setSalvo(true);
    } catch (falha) {
      if (falha instanceof ErroAgente && falha.corpo?.erros) {
        setErros(Object.fromEntries(falha.corpo.erros.map((x) => [x.caminho, x.mensagem])));
        setErroGeral("Faltou ajustar alguns campos. Marquei cada um aqui embaixo.");
      } else {
        setErroGeral(
          falha instanceof ErroAgente ? falha.message : "Não consegui falar com o Camaleão.",
        );
      }
    } finally {
      setSalvando(false);
    }
  };

  const end = r.endereco;
  const mudarEndereco = (campo: keyof Rascunho["endereco"]) => (v: string) =>
    mudar({ endereco: { ...end, [campo]: v } });
  const errosSemCampo = Object.entries(erros).filter(
    ([caminho]) =>
      !/^(preferencias|disponibilidade|endereco|salario|documentos|comoSoube)/.test(caminho),
  );

  return (
    <form className="empilhado" onSubmit={(ev) => void aoSalvar(ev)} noValidate>
      <h1>Seu perfil</h1>
      <p className="suave">
        O que os formulários costumam pedir. Fica em <code>curriculo/perfil.yaml</code>, na sua
        máquina; os campos marcados com <SeloLocal /> nunca vão ao Claude nem aos logs.
      </p>
      <Erro>{erroGeral}</Erro>
      {errosSemCampo.map(([caminho, mensagem]) => (
        <Erro key={caminho}>{`${caminho || "perfil"}: ${mensagem}`}</Erro>
      ))}

      <Secao titulo="Preferências">
        <div className="empilhado">
          <Marcas
            rotulo="Modelos de trabalho"
            opcoes={MODELOS_TRABALHO}
            valores={r.modelos}
            aoMudar={(modelos) => mudar({ modelos })}
            erro={e("preferencias.modelos")}
          />
          <Marcas
            rotulo="Senioridades"
            opcoes={SENIORIDADES}
            valores={r.senioridades}
            aoMudar={(senioridades) => mudar({ senioridades })}
            erro={e("preferencias.senioridades")}
          />
          <Marcas
            rotulo="Regimes"
            opcoes={REGIMES}
            valores={r.regimes}
            aoMudar={(regimes) => mudar({ regimes })}
            erro={e("preferencias.regimes")}
          />
          <Campo
            rotulo="Cidades (separadas por vírgula)"
            valor={r.cidades}
            aoMudar={(cidades) => mudar({ cidades })}
          />
        </div>
      </Secao>

      <Secao titulo="Disponibilidade e autorização de trabalho">
        <div className="campos">
          <Campo
            rotulo="Aviso prévio (dias)"
            tipo="number"
            valor={r.avisoPrevioDias}
            aoMudar={(avisoPrevioDias) => mudar({ avisoPrevioDias })}
            erro={e("disponibilidade.avisoPrevioDias")}
          />
          <Campo
            rotulo="Países em que pode trabalhar (vírgula)"
            valor={r.paisesAutorizados}
            aoMudar={(paisesAutorizados) => mudar({ paisesAutorizados })}
          />
        </div>
        <div className="linha secao">
          <Caixa
            rotulo="Início imediato"
            valor={r.inicioImediato}
            aoMudar={(v) => mudar({ inicioImediato: v })}
          />
          <Caixa rotulo="Topa viagens" valor={r.viagens} aoMudar={(v) => mudar({ viagens: v })} />
          <Caixa rotulo="Topa mudança" valor={r.mudanca} aoMudar={(v) => mudar({ mudanca: v })} />
          <Caixa
            rotulo="Pode trabalhar no Brasil"
            valor={r.brasil}
            aoMudar={(v) => mudar({ brasil: v })}
          />
          <Caixa
            rotulo="Precisa de sponsorship fora do Brasil"
            valor={r.precisaSponsorship}
            aoMudar={(v) => mudar({ precisaSponsorship: v })}
          />
        </div>
      </Secao>

      <Secao titulo="Endereço">
        <div className="campos">
          <Campo
            rotulo="Cidade"
            valor={end.cidade}
            aoMudar={mudarEndereco("cidade")}
            erro={e("endereco.cidade")}
          />
          <Campo rotulo="UF" valor={end.uf} aoMudar={mudarEndereco("uf")} />
          <Campo
            rotulo="País"
            valor={end.pais}
            aoMudar={mudarEndereco("pais")}
            erro={e("endereco.pais")}
          />
        </div>
        <p className="pequeno suave secao">
          Endereço completo (opcional) <SeloLocal />
        </p>
        <div className="campos">
          <CampoSensivel
            rotulo="Logradouro"
            valor={end.logradouro}
            aoMudar={mudarEndereco("logradouro")}
          />
          <CampoSensivel rotulo="Número" valor={end.numero} aoMudar={mudarEndereco("numero")} />
          <CampoSensivel
            rotulo="Complemento"
            valor={end.complemento}
            aoMudar={mudarEndereco("complemento")}
          />
          <CampoSensivel rotulo="Bairro" valor={end.bairro} aoMudar={mudarEndereco("bairro")} />
          <CampoSensivel
            rotulo="CEP"
            valor={end.cep}
            aoMudar={mudarEndereco("cep")}
            erro={e("endereco.cep")}
          />
        </div>
      </Secao>

      <Secao titulo="Pretensão salarial" sensivel>
        <Caixa
          rotulo="Deixar em branco (os campos de pretensão ficam vazios para você preencher na revisão)"
          valor={!r.salarioAtivo}
          aoMudar={(v) => mudar({ salarioAtivo: !v })}
        />
        {r.salarioAtivo && (
          <div className="campos secao">
            <CampoSensivel
              rotulo="CLT, mensal (R$)"
              tipo="number"
              valor={r.salario.clt}
              aoMudar={(clt) => mudar({ salario: { ...r.salario, clt } })}
              erro={e("salario.clt_brl_mensal")}
            />
            <CampoSensivel
              rotulo="PJ, mensal (R$)"
              tipo="number"
              valor={r.salario.pj}
              aoMudar={(pj) => mudar({ salario: { ...r.salario, pj } })}
              erro={e("salario.pj_brl_mensal")}
            />
            <CampoSensivel
              rotulo="Exterior, anual (US$)"
              tipo="number"
              valor={r.salario.usd}
              aoMudar={(usd) => mudar({ salario: { ...r.salario, usd } })}
              erro={e("salario.usd_anual")}
            />
            <CampoSensivel
              rotulo="Salário atual ou último (opcional)"
              valor={r.salario.atual}
              aoMudar={(atual) => mudar({ salario: { ...r.salario, atual } })}
              ajuda="Só para campos que pedem o atual; nunca uso a pretensão no lugar."
            />
          </div>
        )}
      </Secao>

      <Secao titulo="Documentos" sensivel>
        <div className="campos">
          <CampoSensivel
            rotulo="CPF"
            valor={r.documentos.cpf}
            aoMudar={(cpf) => mudar({ documentos: { ...r.documentos, cpf } })}
            erro={e("documentos.cpf")}
          />
          <CampoSensivel
            rotulo="RG"
            valor={r.documentos.rg}
            aoMudar={(rg) => mudar({ documentos: { ...r.documentos, rg } })}
          />
          <CampoSensivel
            rotulo="Data de nascimento (AAAA-MM-DD)"
            valor={r.documentos.dataNascimento}
            aoMudar={(dataNascimento) => mudar({ documentos: { ...r.documentos, dataNascimento } })}
            erro={e("documentos.dataNascimento")}
          />
        </div>
        <button
          type="button"
          className="botao secundario pequeno secao"
          onClick={() => mudar({ documentos: { cpf: "", rg: "", dataNascimento: "" } })}
        >
          Deixar em branco
        </button>
      </Secao>

      <Secao titulo="Diversidade" sensivel>
        <Caixa
          rotulo="Deixar em branco (os formulários recebem “prefiro não informar”)"
          valor={!r.diversidadeAtiva}
          aoMudar={(v) => mudar({ diversidadeAtiva: !v })}
        />
        {r.diversidadeAtiva &&
          (diversidadeVisivel ? (
            <div className="campos secao">
              <div className="campo">
                <label htmlFor="genero">Gênero</label>
                <select
                  id="genero"
                  value={r.diversidade.genero}
                  onChange={(ev) =>
                    mudar({ diversidade: { ...r.diversidade, genero: ev.target.value } })
                  }
                >
                  <option value="">Prefiro não informar</option>
                  {GENEROS.map((g) => (
                    <option key={g} value={g}>
                      {ROTULOS[g]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="raca">Raça/cor</label>
                <select
                  id="raca"
                  value={r.diversidade.raca}
                  onChange={(ev) =>
                    mudar({ diversidade: { ...r.diversidade, raca: ev.target.value } })
                  }
                >
                  <option value="">Prefiro não informar</option>
                  {RACAS.map((g) => (
                    <option key={g} value={g}>
                      {ROTULOS[g]}
                    </option>
                  ))}
                </select>
              </div>
              <Tri
                rotulo="Pessoa com deficiência"
                padrao="Prefiro não informar"
                valor={r.diversidade.pcd}
                aoMudar={(pcd) => mudar({ diversidade: { ...r.diversidade, pcd } })}
              />
              <Tri
                rotulo="LGBTQIA+"
                padrao="Prefiro não informar"
                valor={r.diversidade.lgbtqia}
                aoMudar={(lgbtqia) => mudar({ diversidade: { ...r.diversidade, lgbtqia } })}
              />
            </div>
          ) : (
            <p className="secao">
              ••••••{" "}
              <button
                type="button"
                className="botao secundario pequeno"
                onClick={() => setDiversidadeVisivel(true)}
              >
                mostrar
              </button>
            </p>
          ))}
      </Secao>

      <Secao titulo="Consentimentos">
        <p className="pequeno suave">
          Sem escolha, eu aceito. O tratamento de dados obrigatório é sempre aceito: sem ele não há
          candidatura.
        </p>
        <div className="campos">
          {CONSENTIMENTOS.map(([chave, rotulo]) => (
            <Tri
              key={chave}
              rotulo={rotulo}
              padrao="Aceitar (padrão)"
              valor={r.consentimentos[chave]}
              aoMudar={(v) => mudar({ consentimentos: { ...r.consentimentos, [chave]: v } })}
            />
          ))}
        </div>
      </Secao>

      <Secao titulo="Como soube das vagas">
        <Campo
          rotulo="Resposta padrão para “como soube da vaga?”"
          valor={r.comoSoube}
          aoMudar={(comoSoube) => mudar({ comoSoube })}
          erro={e("comoSoube")}
        />
      </Secao>

      <div className="linha">
        <button className="botao" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar perfil"}
        </button>
        {salvo && (
          <span className="selo sucesso" role="status">
            Perfil salvo!
          </span>
        )}
      </div>
    </form>
  );
}

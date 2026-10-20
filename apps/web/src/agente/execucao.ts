import { useCallback, useEffect, useReducer, useState } from "react";
import { z } from "zod";
import {
  esquemaExecucaoCriada,
  esquemaExecucoesAtivas,
  esquemaOk,
  type ComandoExecucao,
  type EventoExecucao,
  type Pergunta,
  type ResultadoExecucao,
  type ResumoRevisaoWeb,
} from "@contrato";
import { ErroAgente } from "./cliente.ts";
import { useAgente } from "./conexao.tsx";

const esquemaCancelamento = z.object({ estado: z.enum(["cancelando", "forcado"]) });

export interface VagaAndamento {
  readonly id: number;
  readonly empresa: string | null;
  readonly cargo: string | null;
  readonly status: string;
  readonly etapa: string | null;
  readonly concluida: boolean;
  readonly erro: string | null;
}

export interface EstadoExecucao {
  readonly id: string | null;
  readonly total: number | null;
  readonly vagas: readonly VagaAndamento[];
  readonly pergunta: Pergunta | null;
  readonly revisao: ResumoRevisaoWeb | null;
  readonly avisos: readonly string[];
  /** Arquivos que o fluxo pediu para abrir (o site mostra o link; abrir sozinho seria bloqueado). */
  readonly arquivos: readonly string[];
  readonly resultado: ResultadoExecucao | null;
  readonly erro: { readonly mensagem: string; readonly codigo: string } | null;
  /** Rodando: iniciada e sem `fim` nem `erro`. */
  readonly rodando: boolean;
}

export const ESTADO_INICIAL: EstadoExecucao = {
  id: null,
  total: null,
  vagas: [],
  pergunta: null,
  revisao: null,
  avisos: [],
  arquivos: [],
  resultado: null,
  erro: null,
  rodando: false,
};

type Acao =
  | { readonly tipo: "reiniciar"; readonly id: string }
  | { readonly tipo: "evento"; readonly evento: EventoExecucao }
  | { readonly tipo: "falha"; readonly mensagem: string };

function atualizarVaga(vagas: readonly VagaAndamento[], nova: VagaAndamento): VagaAndamento[] {
  const indice = vagas.findIndex((v) => v.id === nova.id);
  if (indice < 0) return [...vagas, nova];
  return vagas.map((v, i) => (i === indice ? nova : v));
}

/** Aplica um evento do stream ao estado da tela (o mesmo reducer serve ao vivo e no replay). */
export function aplicarEvento(estado: EstadoExecucao, evento: EventoExecucao): EstadoExecucao {
  switch (evento.tipo) {
    case "progresso": {
      const e = evento.evento;
      if (e.tipo === "inicio") return { ...estado, total: e.total };
      const base = { id: e.vaga.id, empresa: e.vaga.empresa, cargo: e.vaga.cargo };
      return {
        ...estado,
        vagas: atualizarVaga(
          estado.vagas,
          e.tipo === "etapa"
            ? { ...base, status: e.vaga.status, etapa: e.etapa, concluida: false, erro: null }
            : { ...base, status: e.vaga.status, etapa: null, concluida: true, erro: e.erro },
        ),
      };
    }
    case "pergunta":
      return { ...estado, pergunta: evento.pergunta };
    case "respondida":
      return estado.pergunta?.id === evento.perguntaId ? { ...estado, pergunta: null } : estado;
    case "revisao":
      return { ...estado, revisao: evento.resumo };
    case "aviso":
      // "Vaga #N ..." abre a próxima vaga do aplicar: a revisão anterior sai da tela.
      return {
        ...estado,
        avisos: [...estado.avisos, evento.mensagem],
        revisao: /^Vaga #\d+/.test(evento.mensagem) ? null : estado.revisao,
      };
    case "abrir_arquivo":
      return { ...estado, arquivos: [...estado.arquivos, evento.url] };
    case "fim":
      return { ...estado, resultado: evento.resultado, pergunta: null, rodando: false };
    case "erro":
      return {
        ...estado,
        erro: { mensagem: evento.mensagem, codigo: evento.codigo },
        pergunta: null,
        rodando: false,
      };
  }
}

function reduzir(estado: EstadoExecucao, acao: Acao): EstadoExecucao {
  switch (acao.tipo) {
    case "reiniciar":
      return { ...ESTADO_INICIAL, id: acao.id, rodando: true };
    case "evento":
      return aplicarEvento(estado, acao.evento);
    case "falha":
      return { ...estado, rodando: false, erro: { mensagem: acao.mensagem, codigo: "execucao" } };
  }
}

function mensagemDe(erro: unknown): string {
  if (erro instanceof ErroAgente) return erro.message;
  return "Não consegui falar com o Camaleão. Ele ainda está rodando?";
}

/**
 * Uma execução longa do agente: inicia, acompanha o stream (retomando a ativa ao abrir a tela),
 * responde a pergunta pendente e cancela.
 */
export function useExecucao(comando: ComandoExecucao) {
  const cliente = useAgente();
  const [estado, despachar] = useReducer(reduzir, ESTADO_INICIAL);
  const [id, setId] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  useEffect(() => {
    const controle = new AbortController();
    cliente
      .obter("/execucoes/ativas", esquemaExecucoesAtivas, controle.signal)
      .then(({ execucoes }) => {
        const ativa = execucoes.find((e) => e.comando === comando);
        if (ativa) setId((atual) => atual ?? ativa.id);
      })
      .catch(() => undefined);
    return () => {
      controle.abort();
    };
  }, [cliente, comando]);

  useEffect(() => {
    if (id === null) return;
    const controle = new AbortController();
    despachar({ tipo: "reiniciar", id });
    cliente
      .acompanhar(
        id,
        (evento) => {
          despachar({ tipo: "evento", evento });
        },
        () => {
          despachar({ tipo: "reiniciar", id });
        },
        controle.signal,
      )
      .catch((erro: unknown) => {
        if (!controle.signal.aborted) despachar({ tipo: "falha", mensagem: mensagemDe(erro) });
      });
    return () => {
      controle.abort();
    };
  }, [cliente, id]);

  const iniciar = useCallback(
    async (caminho: string, corpo: unknown = {}) => {
      setErroAcao(null);
      try {
        const criada =
          corpo instanceof FormData
            ? await cliente.enviarArquivo(caminho, corpo, esquemaExecucaoCriada)
            : await cliente.enviar("POST", caminho, corpo, esquemaExecucaoCriada);
        setId(criada.id);
      } catch (erro) {
        setErroAcao(mensagemDe(erro));
      }
    },
    [cliente],
  );

  const responder = useCallback(
    async (valor: boolean | number | string | null) => {
      if (!estado.id || !estado.pergunta) return;
      setErroAcao(null);
      try {
        await cliente.enviar(
          "POST",
          `/execucoes/${estado.id}/respostas`,
          { perguntaId: estado.pergunta.id, valor },
          esquemaOk,
        );
      } catch (erro) {
        setErroAcao(mensagemDe(erro));
      }
    },
    [cliente, estado.id, estado.pergunta],
  );

  const cancelar = useCallback(async () => {
    if (!estado.id) return;
    try {
      await cliente.enviar("POST", `/execucoes/${estado.id}/cancelar`, {}, esquemaCancelamento);
    } catch (erro) {
      setErroAcao(mensagemDe(erro));
    }
  }, [cliente, estado.id]);

  const novaRodada = useCallback(() => {
    setId(null);
  }, []);

  return {
    estado: id === null ? ESTADO_INICIAL : estado,
    iniciar,
    responder,
    cancelar,
    erroAcao,
    novaRodada,
  };
}

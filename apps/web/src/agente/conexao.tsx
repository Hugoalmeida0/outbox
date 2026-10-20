import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { esquemaEstadoCurriculo, VERSAO_CONTRATO, type Saude } from "@contrato";
import {
  ClienteAgente,
  codigoDoFragmento,
  ErroAgente,
  ErroSemAgente,
  lembrarEnderecoAgente,
} from "./cliente.ts";

export const INTERVALO_RECONEXAO_MS = 3000;

export type FaseConexao = "procurando" | "sem_agente" | "desatualizado" | "parear" | "pronto";

export interface Conexao {
  readonly fase: FaseConexao;
  readonly cliente: ClienteAgente;
  readonly saude: Saude | null;
  readonly erroPareamento: string | null;
  readonly parear: (codigo: string) => Promise<void>;
  readonly trocarEndereco: (url: string) => void;
}

const ContextoConexao = createContext<Conexao | null>(null);

export function useConexao(): Conexao {
  const conexao = use(ContextoConexao);
  if (!conexao) throw new Error("useConexao fora do ProvedorConexao");
  return conexao;
}

/** Atalho para as telas: o cliente já pareado. */
export function useAgente(): ClienteAgente {
  return useConexao().cliente;
}

export interface PropsProvedor {
  readonly children: ReactNode;
  /** Testes injetam um cliente sobre um `fetch` simulado. */
  readonly criarCliente?: (
    aoPerderPareamento: () => void,
    endereco: string | null,
  ) => ClienteAgente;
}

/**
 * Procura o agente a cada 3 s, confere a versão do contrato, pareia pelo fragmento `#parear=` (e o
 * apaga do endereço) e valida o token guardado. Um 401 em qualquer tela volta ao pareamento.
 */
export function ProvedorConexao({ children, criarCliente }: PropsProvedor) {
  const [fase, setFase] = useState<FaseConexao>("procurando");
  const [saude, setSaude] = useState<Saude | null>(null);
  const [erroPareamento, setErroPareamento] = useState<string | null>(null);
  const [endereco, setEndereco] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const fragmento = useRef(codigoDoFragmento(globalThis.location.hash));

  const cliente = useMemo(() => {
    const perder = () => {
      setFase("parear");
    };
    return criarCliente
      ? criarCliente(perder, endereco)
      : new ClienteAgente({
          aoPerderPareamento: perder,
          ...(endereco ? { baseUrl: endereco } : {}),
        });
  }, [criarCliente, endereco]);

  useEffect(() => {
    const controle = new AbortController();
    let espera: ReturnType<typeof setTimeout> | undefined;
    const procurar = async () => {
      try {
        const lida = await cliente.saude(controle.signal);
        setSaude(lida);
        if (lida.versaoContrato !== VERSAO_CONTRATO) {
          setFase("desatualizado");
          return;
        }
        const codigo = fragmento.current;
        if (codigo) {
          fragmento.current = null;
          globalThis.history.replaceState(null, "", globalThis.location.pathname);
          await cliente.parear(codigo).catch(() => undefined);
        }
        if (!cliente.pareado) {
          setFase("parear");
          return;
        }
        await cliente.obter("/curriculo", esquemaEstadoCurriculo, controle.signal);
        setFase("pronto");
      } catch (erro) {
        if (controle.signal.aborted) return;
        if (erro instanceof ErroAgente && erro.status === 401) {
          setFase("parear");
          return;
        }
        if (erro instanceof ErroSemAgente || erro instanceof ErroAgente) setFase("sem_agente");
        espera = setTimeout(() => {
          setTentativa((t) => t + 1);
        }, INTERVALO_RECONEXAO_MS);
      }
    };
    void procurar();
    return () => {
      controle.abort();
      clearTimeout(espera);
    };
  }, [cliente, tentativa]);

  const parear = useCallback(
    async (codigo: string) => {
      setErroPareamento(null);
      try {
        await cliente.parear(codigo);
        setFase("pronto");
      } catch (erro) {
        setErroPareamento(
          erro instanceof ErroAgente
            ? (erro.corpo?.mensagem ?? "Esse código não funcionou. Confira o terminal.")
            : "Não consegui falar com o Camaleão. Ele está rodando?",
        );
      }
    },
    [cliente],
  );

  const trocarEndereco = useCallback((url: string) => {
    lembrarEnderecoAgente(url);
    setEndereco(url.trim() || null);
    setFase("procurando");
  }, []);

  const valor = useMemo(
    () => ({ fase, cliente, saude, erroPareamento, parear, trocarEndereco }),
    [fase, cliente, saude, erroPareamento, parear, trocarEndereco],
  );
  return <ContextoConexao value={valor}>{children}</ContextoConexao>;
}

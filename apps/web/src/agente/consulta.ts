import { useCallback, useEffect, useState } from "react";
import type { ZodType } from "zod";
import { ErroAgente } from "./cliente.ts";
import { useAgente } from "./conexao.tsx";

export interface Consulta<T> {
  readonly dados: T | null;
  readonly erro: string | null;
  readonly carregando: boolean;
  readonly recarregar: () => void;
}

/** GET de uma rota do agente, validado pelo contrato, com recarga sob demanda. */
export function useConsulta<T>(caminho: string, schema: ZodType<T>): Consulta<T> {
  const cliente = useAgente();
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const controle = new AbortController();
    setCarregando(true);
    cliente
      .obter(caminho, schema, controle.signal)
      .then((lido) => {
        setDados(lido);
        setErro(null);
      })
      .catch((e: unknown) => {
        if (controle.signal.aborted) return;
        setErro(e instanceof ErroAgente ? e.message : "Não consegui falar com o Camaleão.");
      })
      .finally(() => {
        if (!controle.signal.aborted) setCarregando(false);
      });
    return () => {
      controle.abort();
    };
  }, [cliente, caminho, schema, versao]);

  const recarregar = useCallback(() => {
    setVersao((v) => v + 1);
  }, []);
  return { dados, erro, carregando, recarregar };
}

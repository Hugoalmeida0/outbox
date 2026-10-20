import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import { problemasDoZod, type ProblemaCampo } from "#dominio/compartilhado/validar.ts";
import { esquemaPerfil, type Perfil } from "#dominio/respostas/perfil.ts";
import type { ArmazemCurriculo } from "../portas/armazem-curriculo.ts";

export interface SaidaObterPerfil {
  /** Perfil válido, ou `null` quando falta o arquivo ou algum campo obrigatório. */
  readonly perfil: Perfil | null;
  /** O que está no YAML, mesmo inválido, para o formulário mostrar o perfil parcial. */
  readonly dadosBrutos: unknown;
  readonly erros: readonly ProblemaCampo[];
}

export interface DepsObterPerfil {
  readonly curriculo: Pick<ArmazemCurriculo, "lerPerfilBruto">;
}

/** Lê `curriculo/perfil.yaml` para o formulário: o perfil validado, os dados brutos e cada problema. */
export function obterPerfil(deps: DepsObterPerfil): SaidaObterPerfil {
  let bruto: { readonly existe: boolean; readonly dados: unknown };
  try {
    bruto = deps.curriculo.lerPerfilBruto();
  } catch (erro) {
    if (!(erro instanceof ErroUsuario)) throw erro;
    return { perfil: null, dadosBrutos: null, erros: [{ caminho: "", mensagem: erro.message }] };
  }
  if (!bruto.existe) {
    return {
      perfil: null,
      dadosBrutos: null,
      erros: [{ caminho: "", mensagem: "curriculo/perfil.yaml ainda não foi preenchido" }],
    };
  }
  const resultado = esquemaPerfil.safeParse(bruto.dados);
  return resultado.success
    ? { perfil: resultado.data, dadosBrutos: bruto.dados, erros: [] }
    : { perfil: null, dadosBrutos: bruto.dados, erros: problemasDoZod(resultado.error) };
}

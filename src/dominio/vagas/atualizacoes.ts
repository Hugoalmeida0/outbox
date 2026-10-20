import { ErroValidacao } from "../compartilhado/erros.ts";
import { chaveDedup } from "./chave.ts";
import type { Motor } from "./motores.ts";
import type { Rota } from "./status.ts";
import type { AtualizacaoVaga, CamposAtualizaveisVaga, UrlCanonica, Vaga } from "./vaga.ts";

function atualizacao(campos: CamposAtualizaveisVaga): AtualizacaoVaga {
  return campos as AtualizacaoVaga;
}

/** Score de 0 a 100 (aderência e ATS), ou `null` quando não calculado. */
function percentual(campo: string, valor: number | null): number | null {
  if (valor !== null && (!Number.isInteger(valor) || valor < 0 || valor > 100)) {
    throw new ErroValidacao(campo, `score fora de 0 a 100: ${String(valor)}`);
  }
  return valor;
}

export interface DadosResolucao {
  readonly motor: Motor;
  readonly urlResolvida: string | null;
  readonly rota: Rota | null;
  /** Ausente quando a URL canônica não muda (ex.: troca de rota no preparo). */
  readonly urlCanonica?: UrlCanonica;
}

/** Grava para onde a vaga leva: motor, URL resolvida, rota e, se mudou, a URL canônica. */
export function registrarResolucao(r: DadosResolucao): AtualizacaoVaga {
  return atualizacao({
    motor: r.motor,
    urlResolvida: r.urlResolvida,
    rota: r.rota,
    ...(r.urlCanonica !== undefined ? { urlCanonica: r.urlCanonica } : {}),
  });
}

export interface DadosExtracao {
  readonly empresa: string;
  readonly cargo: string;
  readonly localidade?: string | null | undefined;
  readonly publicadaEm?: string | null | undefined;
}

/** Grava os dados extraídos do anúncio. */
export function registrarExtracao(e: DadosExtracao): AtualizacaoVaga {
  return atualizacao({
    empresa: e.empresa,
    cargo: e.cargo,
    localidade: e.localidade ?? null,
    publicadaEm: e.publicadaEm ?? null,
  });
}

/** Grava o idioma da análise e a chave de deduplicação derivada de empresa, cargo e localidade. */
export function registrarAnalise(idioma: string | null, extracao: DadosExtracao): AtualizacaoVaga {
  return atualizacao({
    idioma,
    chaveDedup: chaveDedup(extracao.empresa, extracao.cargo, extracao.localidade),
  });
}

/** Grava a aderência (0 a 100). `null` apaga o score, ex.: vaga encerrada. */
export function registrarAderencia(score: number | null): AtualizacaoVaga {
  return atualizacao({ aderencia: percentual("aderencia", score) });
}

/** Grava o score ATS antes e depois do tailoring e se o camaleão falhou no lastro. */
export function registrarCurriculo(ats: {
  readonly antes: number | null;
  readonly depois: number | null;
  readonly camaleaoFalhou: boolean;
}): AtualizacaoVaga {
  return atualizacao({
    atsAntes: percentual("atsAntes", ats.antes),
    atsDepois: percentual("atsDepois", ats.depois),
    camaleaoFalhou: ats.camaleaoFalhou ? "lastro" : null,
  });
}

/** Marca que o usuário anexou o currículo à mão no formulário. */
export function marcarAnexoManual(): AtualizacaoVaga {
  return atualizacao({ anexoManual: true });
}

/** Conta mais uma tentativa de preparo que falhou. */
export function contarTentativaPreparo(vaga: Pick<Vaga, "tentativasPreparo">): AtualizacaoVaga {
  return atualizacao({ tentativasPreparo: vaga.tentativasPreparo + 1 });
}

/** Zera as tentativas ao reabrir a vaga. */
export function reiniciarTentativasPreparo(): AtualizacaoVaga {
  return atualizacao({ tentativasPreparo: 0 });
}

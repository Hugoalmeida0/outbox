import type { RegistroFalhas } from "../portas/registro-falhas.ts";

export interface GrupoFalha {
  readonly conector: string;
  readonly passo: string;
  readonly quantidade: number;
  readonly maisRecente: string;
  readonly urlMaisRecente: string;
}

export interface DadosFalhas {
  readonly grupos: readonly GrupoFalha[];
  readonly semConector: readonly { readonly motor: string; readonly quantidade: number }[];
}

/** Dados do `camaleao falhas`: falhas abertas por conector e passo, e ranking de motores sem conector. */
export function listarFalhas(deps: {
  readonly falhas: Pick<RegistroFalhas, "listarAbertas">;
}): DadosFalhas {
  const abertas = deps.falhas.listarAbertas();
  const grupos = new Map<string, GrupoFalha>();
  const semConector = new Map<string, number>();
  for (const r of abertas) {
    if (r.tipo === "sem_conector") {
      const motor = r.motor.replace(/^dominio:/, "");
      semConector.set(motor, (semConector.get(motor) ?? 0) + 1);
      continue;
    }
    const conector = r.conector ?? r.motor;
    const passo = r.passo ?? "desconhecido";
    const chave = `${conector}\u0000${passo}`;
    const atual = grupos.get(chave);
    const maisNovo = !atual || r.data > atual.maisRecente;
    grupos.set(chave, {
      conector,
      passo,
      quantidade: (atual?.quantidade ?? 0) + 1,
      maisRecente: maisNovo ? r.data : atual.maisRecente,
      urlMaisRecente: maisNovo ? r.url : atual.urlMaisRecente,
    });
  }
  return {
    grupos: [...grupos.values()].sort(
      (a, b) => b.quantidade - a.quantidade || a.conector.localeCompare(b.conector),
    ),
    semConector: [...semConector.entries()]
      .map(([motor, quantidade]) => ({ motor, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade || a.motor.localeCompare(b.motor)),
  };
}

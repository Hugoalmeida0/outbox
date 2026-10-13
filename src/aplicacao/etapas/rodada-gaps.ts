import { calcularAderencia, recalcularComGaps } from "#dominio/analise/aderencia.ts";
import { paraKebab } from "#dominio/compartilhado/texto.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { executarComLimite } from "../compartilhado/concorrencia.ts";
import type { ArmazemCurriculo } from "../portas/armazem-curriculo.ts";
import type { Interacao } from "../portas/interacao.ts";
import type { RepositorioVagas } from "../portas/repositorio-vagas.ts";
import { atualizarAnalise } from "./analisar-vaga.ts";
import { gerarCurriculo, type DepsGerarCurriculo } from "./gerar-curriculo.ts";

export type DepsRodadaGaps = DepsGerarCurriculo & {
  readonly vagas: Pick<
    RepositorioVagas,
    | "listarGapsAbertos"
    | "responderGaps"
    | "termosConfirmados"
    | "buscar"
    | "atualizar"
    | "transicionar"
  >;
  readonly curriculo: Pick<
    ArmazemCurriculo,
    "lerMaster" | "lerPerfil" | "adicionarSkill" | "negarGap"
  >;
  readonly interacao: Interacao;
  readonly paralelo: number;
};

interface GapAgrupado {
  readonly termo: string;
  readonly termoNormalizado: string;
  readonly vagas: Set<IdVaga>;
}

function idSkillLivre(base: string, existentes: ReadonlySet<string>): string {
  let id = base || "skill";
  for (let n = 2; existentes.has(id); n++) id = `${base}-${String(n)}`;
  return id;
}

/**
 * Pergunta, uma vez por termo e em ordem de frequência, os requisitos ausentes das vagas a aplicar. "Sim"
 * grava a skill no master (`origem: aprendido`); "não" grava em `gaps.yaml`. As vagas afetadas por algum
 * "sim" têm a aderência recalculada e o currículo refeito. Devolve as vagas refeitas.
 */
export async function rodadaGaps(
  deps: DepsRodadaGaps,
  ids: readonly IdVaga[],
  sinal: AbortSignal,
): Promise<IdVaga[]> {
  const grupos = new Map<string, GapAgrupado>();
  for (const gap of deps.vagas.listarGapsAbertos(ids)) {
    const grupo = grupos.get(gap.termoNormalizado) ?? {
      termo: gap.termo,
      termoNormalizado: gap.termoNormalizado,
      vagas: new Set(),
    };
    grupo.vagas.add(gap.vagaId);
    grupos.set(gap.termoNormalizado, grupo);
  }
  const ordenados = [...grupos.values()].sort(
    (a, b) => b.vagas.size - a.vagas.size || a.termo.localeCompare(b.termo),
  );
  const afetadas = new Set<IdVaga>();

  for (const grupo of ordenados) {
    if (sinal.aborted) break;
    const quantidade = grupo.vagas.size === 1 ? "1 vaga" : `${String(grupo.vagas.size)} vagas`;
    const tem = await deps.interacao.perguntarSimNao(
      `A vaga pede ${grupo.termo} (${quantidade}). Você tem?`,
    );
    if (!tem) {
      deps.curriculo.negarGap(grupo.termoNormalizado);
      deps.vagas.responderGaps(grupo.termoNormalizado, "nao");
      continue;
    }
    const anos = await deps.interacao.perguntarNumero(
      `Quantos anos de experiência com ${grupo.termo}?`,
      { min: 0, max: 50 },
    );
    const evidencia = await deps.interacao.perguntarTexto(
      `Onde você usou ${grupo.termo}? (uma linha)`,
    );
    const master = deps.curriculo.lerMaster();
    const existentes = new Set(master.skills.map((s) => s.id));
    deps.curriculo.adicionarSkill({
      id: idSkillLivre(paraKebab(grupo.termo), existentes),
      nome: grupo.termo,
      aliases: [],
      categoria: "ferramenta",
      anos,
      origem: "aprendido",
      evidencia: evidencia.trim() || `confirmado na revisão em ${deps.relogio.hoje()}`,
      aprendidoEm: deps.relogio.hoje(),
      vagaOrigem: [...grupo.vagas][0] ?? 0,
    });
    for (const id of deps.vagas.responderGaps(grupo.termoNormalizado, "sim")) afetadas.add(id);
  }

  if (afetadas.size === 0) return [];
  const confirmados = new Set(deps.vagas.termosConfirmados());
  const perfil = deps.curriculo.lerPerfil();
  const refeitas: IdVaga[] = [];
  await executarComLimite(
    [...afetadas],
    deps.paralelo,
    async (id, s) => {
      const vaga = deps.vagas.buscar(id);
      if (vaga?.status !== "PRONTA") return;
      const analise = atualizarAnalise(deps.artefatos, vaga, (a) => ({
        ...a,
        requisitos: recalcularComGaps(a, confirmados).requisitos,
      }));
      if (!analise) return;
      const r = calcularAderencia(
        analise,
        perfil.preferencias,
        perfil.diversidade,
        perfil.documentos.dataNascimento,
        deps.relogio.hoje(),
      );
      deps.vagas.atualizar(id, { aderencia: r.score });
      await gerarCurriculo(deps, vaga, analise, s);
      deps.vagas.transicionar(id, "PRONTA");
      refeitas.push(id);
    },
    sinal,
  );
  return refeitas;
}

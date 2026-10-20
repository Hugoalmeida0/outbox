import { calcularAderencia, recalcularComGaps } from "#dominio/analise/aderencia.ts";
import { lerChaveGapIdioma, nivelAtende, nivelNoMaster } from "#dominio/analise/idiomas.ts";
import { paraKebab } from "#dominio/compartilhado/texto.ts";
import { NIVEIS_IDIOMA, type NivelIdioma } from "#dominio/curriculo/master.ts";
import { registrarAderencia } from "#dominio/vagas/atualizacoes.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { executarComLimite } from "../compartilhado/concorrencia.ts";
import { transicionarVaga } from "../compartilhado/transicionar-vaga.ts";
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
    | "transacao"
    | "gravarTransicao"
  >;
  readonly curriculo: Pick<
    ArmazemCurriculo,
    "lerMaster" | "lerPerfil" | "adicionarSkill" | "definirIdioma" | "negarGap"
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

const ROTULO_NIVEL: Record<NivelIdioma, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  avancado: "Avançado",
  fluente: "Fluente",
  nativo: "Nativo",
};

/**
 * Gap de idioma: pergunta só o nível. Atualiza `idiomas` do master e devolve se o nível atende ao exigido
 * (`null` quando a pessoa não fala o idioma).
 */
async function perguntarNivelIdioma(
  deps: DepsRodadaGaps,
  grupo: GapAgrupado,
  idioma: string,
  exigido: NivelIdioma,
  quantidade: string,
): Promise<boolean> {
  const nomeIdioma = grupo.termo;
  const atual = nivelNoMaster(deps.curriculo.lerMaster().idiomas, idioma);
  if (nivelAtende(atual, exigido)) return true;
  const resposta = await deps.interacao.escolher<NivelIdioma | "nenhum">(
    `A vaga pede ${nomeIdioma} ${ROTULO_NIVEL[exigido].toLowerCase()} (${quantidade}). Qual o seu nível de ${nomeIdioma}?`,
    [
      ...NIVEIS_IDIOMA.map((n) => ({ valor: n, rotulo: ROTULO_NIVEL[n] })),
      { valor: "nenhum" as const, rotulo: "Não falo" },
    ],
  );
  if (resposta === "nenhum") return false;
  deps.curriculo.definirIdioma(nomeIdioma, resposta);
  return nivelAtende(resposta, exigido);
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
    const idiomaExigido = lerChaveGapIdioma(grupo.termoNormalizado);
    if (idiomaExigido) {
      const atende = await perguntarNivelIdioma(
        deps,
        grupo,
        idiomaExigido.idioma,
        idiomaExigido.nivel,
        quantidade,
      );
      if (atende) {
        for (const id of deps.vagas.responderGaps(grupo.termoNormalizado, "sim")) afetadas.add(id);
      } else {
        deps.curriculo.negarGap(grupo.termoNormalizado);
        deps.vagas.responderGaps(grupo.termoNormalizado, "nao");
      }
      continue;
    }
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
  const idiomas = deps.curriculo.lerMaster().idiomas;
  const refeitas: IdVaga[] = [];
  await executarComLimite(
    [...afetadas],
    deps.paralelo,
    async (id, s) => {
      const vaga = deps.vagas.buscar(id);
      if (vaga?.status !== "PRONTA") return;
      const analise = atualizarAnalise(deps.artefatos, vaga, (a) => ({
        ...a,
        requisitos: recalcularComGaps(a, confirmados, idiomas).requisitos,
      }));
      if (!analise) return;
      const r = calcularAderencia(
        analise,
        perfil.preferencias,
        perfil.diversidade,
        perfil.documentos.dataNascimento,
        deps.relogio.hoje(),
      );
      deps.vagas.atualizar(id, registrarAderencia(r.score));
      await gerarCurriculo(deps, vaga, analise, s);
      transicionarVaga(deps.vagas, id, "PRONTA");
      refeitas.push(id);
    },
    sinal,
  );
  return refeitas;
}

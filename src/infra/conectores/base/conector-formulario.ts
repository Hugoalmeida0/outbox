import type { Page } from "playwright";
import type { ConectorAts, CtxPreenchimento } from "#aplicacao/portas/conector-ats.ts";
import { ErroFalhaConector, ErroLimiteUso } from "#aplicacao/portas/erros.ts";
import type { FormularioAberto } from "#aplicacao/portas/formulario-aberto.ts";
import { normalizarTexto } from "#dominio/compartilhado/texto.ts";
import type { Campo } from "#dominio/respostas/campo.ts";
import type { PacoteCandidatura, RespostaSugerida } from "#dominio/respostas/pacote.ts";
import type { Motor } from "#dominio/vagas/motores.ts";
import type { VagaExtraida } from "#dominio/vagas/vaga-extraida.ts";
import type { CofreCredenciais } from "#infra/credenciais/cofre.ts";
import type { LeitorHeadless } from "#infra/navegador/leitor-headless.ts";
import type { ClienteHttp } from "#infra/sistema/cliente-http.ts";
import { preencherCampo } from "./campos.ts";
import { listarOpcoes } from "./combobox.ts";
import { lerDescritores, paraCampos, type DescritorCampo } from "./descritores.ts";
import { ErroSemOpcao } from "./erro-sem-opcao.ts";
import { FormularioPlaywright, type RegrasConfirmacao } from "./formulario-playwright.ts";
import { dispensarCookies, navegar, tratarAutenticacao, type ModoAutenticacao } from "./pagina.ts";
import { passo, type ContextoPasso } from "./passo.ts";

/** Dependências de infraestrutura entregues pela composição a todos os conectores. */
export interface DepsConector {
  /** Nova aba no navegador do Camaleão (CDP); nos testes, uma página com fixtures. */
  abrirPagina(): Promise<Page>;
  readonly leitor: LeitorHeadless;
  readonly http: ClienteHttp;
  readonly cofre?: CofreCredenciais;
}

/** Definição declarativa de um conector: o que muda entre ATS. O fluxo comum fica em `criarConector`. */
export interface DefinicaoConector {
  readonly motor: Motor;
  readonly versao: string;
  /** URL da página que contém o formulário de candidatura. */
  urlFormulario(url: string): string;
  /** Leva a página até o formulário aparecer (ex.: clicar em "Apply for this job"). */
  abrir?(pagina: Page): Promise<void>;
  /** Seletores de elementos a ignorar na leitura (ex.: upload de autopreenchimento do Ashby). */
  readonly ignorar?: readonly string[];
  readonly seletorEnviar: string;
  readonly confirmacao: RegrasConfirmacao;
  /** Campos que a leitura genérica não enxerga (ex.: botões sim/não do Ashby). */
  lerExtras?(pagina: Page): Promise<DescritorCampo[]>;
  /** Preenchimento específico; devolve `true` quando tratou o campo. */
  preencherEspecial?(pagina: Page, campo: DescritorCampo, valor: string): Promise<boolean>;
  extrairVaga?(url: string, sinal: AbortSignal, deps: DepsConector): Promise<VagaExtraida | null>;
  /** Campos obtidos por API, sem navegador (ex.: Greenhouse). */
  lerCamposApi?(url: string, sinal: AbortSignal, deps: DepsConector): Promise<Campo[] | null>;
  /** Campos só aparecem depois de login/etapas: o `preparar` não os lê. */
  readonly camposSoNoAplicar?: boolean;
  /** Formulário em várias etapas: botão de avançar e limite de etapas. */
  readonly etapas?: { readonly proximo: RegExp; readonly maxEtapas: number };
  readonly autenticacao?: ModoAutenticacao;
}

/** Nenhuma ação do conector espera indefinidamente: a falha aparece e o agente pode assumir. */
const TIMEOUT_ACAO_MS = 10_000;

type IndiceRespostas = Map<string, RespostaSugerida>;

function chaveRotulo(rotulo: string): string {
  return `rotulo:${normalizarTexto(rotulo)}`;
}

function indexar(
  respostas: readonly RespostaSugerida[],
  indice: IndiceRespostas = new Map(),
): IndiceRespostas {
  for (const r of respostas) {
    if (r.campoId) indice.set(`id:${r.campoId}`, r);
    if (r.rotulo) indice.set(chaveRotulo(r.rotulo), r);
  }
  return indice;
}

function acharResposta(indice: IndiceRespostas, campo: Campo): RespostaSugerida | undefined {
  return (
    indice.get(`id:${campo.id}`) ??
    (campo.rotulo ? indice.get(chaveRotulo(campo.rotulo)) : undefined)
  );
}

async function lerCamposDaPagina(
  pagina: Page,
  definicao: DefinicaoConector,
): Promise<{ descritores: DescritorCampo[]; campos: Campo[] }> {
  const descritores = [
    ...(await lerDescritores(pagina, definicao.ignorar ?? [])),
    ...(definicao.lerExtras ? await definicao.lerExtras(pagina) : []),
  ];
  return { descritores, campos: paraCampos(descritores) };
}

async function preencherEtapa(
  contexto: ContextoPasso,
  definicao: DefinicaoConector,
  pacote: PacoteCandidatura,
  ctx: CtxPreenchimento,
  indice: IndiceRespostas,
): Promise<void> {
  const { pagina } = contexto;
  const { descritores, campos } = await passo("ler-campos", null, contexto, () =>
    lerCamposDaPagina(pagina, definicao),
  );
  const faltantes = campos.filter(
    (c) => c.tipo !== "arquivo" && acharResposta(indice, c) === undefined,
  );
  if (faltantes.length > 0) indexar(await ctx.responderAoVivo(faltantes), indice);
  ctx.informar(`preenchendo ${String(campos.length)} campo(s)…`);

  for (const [i, campo] of campos.entries()) {
    const descritor = descritores[i];
    if (!descritor) continue;
    const nome = campo.rotulo || campo.id;
    if (campo.tipo === "arquivo" && campo.categoria === "anexo") {
      // Anexo que não é CV nem carta (laudo, portfólio): nunca recebe o currículo.
      if (campo.obrigatorio)
        contexto.naoPreenchidos.push(`${nome} (anexo que você precisa enviar)`);
      continue;
    }
    const valor =
      campo.tipo === "arquivo"
        ? campo.categoria === "carta"
          ? (pacote.pdfCarta ?? null)
          : pacote.pdfCurriculo
        : (acharResposta(indice, campo)?.valor ?? null);
    if (valor === null || valor === "") {
      if (campo.obrigatorio) contexto.naoPreenchidos.push(`${nome} (sem resposta)`);
      continue;
    }
    const preencher = (v: string): Promise<void> =>
      passo(`preencher:${nome}`, descritor.seletor, contexto, async () => {
        if (
          definicao.preencherEspecial &&
          (await definicao.preencherEspecial(pagina, descritor, v))
        )
          return;
        await preencherCampo(pagina, descritor, v);
      });
    try {
      await preencher(valor);
    } catch (erro) {
      // Falha num campo não derruba o conector: ele segue para os próximos e o campo fica para o usuário
      // completar na revisão. O agente só assume em falhas estruturais (abrir, autenticar, avançar etapa).
      if (pagina.isClosed()) throw erro;
      const semOpcao = erro instanceof Error && erro.cause instanceof ErroSemOpcao;
      if (semOpcao && (await reescolherEPreencher(pagina, campo, descritor, valor, ctx, preencher)))
        continue;
      contexto.naoPreenchidos.push(
        `${nome} (${semOpcao ? "nenhuma opção corresponde à resposta" : "falhou"})`,
      );
    }
  }
}

/**
 * A resposta não casou com nenhuma opção: lê as opções reais do campo e pede uma nova escolha (uma vez).
 * Devolve `true` se o campo ficou preenchido.
 */
async function reescolherEPreencher(
  pagina: Page,
  campo: Campo,
  descritor: DescritorCampo,
  valorAnterior: string,
  ctx: CtxPreenchimento,
  preencher: (valor: string) => Promise<void>,
): Promise<boolean> {
  if (!ctx.reescolher) return false;
  try {
    const opcoes = await listarOpcoes(pagina, descritor);
    if (opcoes.length === 0) return false;
    const novo = await ctx.reescolher(campo, opcoes);
    if (!novo || normalizarTexto(novo) === normalizarTexto(valorAnterior)) return false;
    await preencher(novo);
    return true;
  } catch (erro) {
    if (pagina.isClosed() || erro instanceof ErroLimiteUso) throw erro;
    return false;
  }
}

/**
 * Cria um `ConectorAts` a partir da definição (Strategy por composição, ADR-010). O conector abre, lê,
 * preenche e devolve o formulário aberto — nunca envia.
 */
export function criarConector(definicao: DefinicaoConector, deps: DepsConector): ConectorAts {
  const conector: ConectorAts = {
    motor: definicao.motor,
    versao: definicao.versao,

    async lerCampos(url: string, sinal: AbortSignal): Promise<Campo[] | null> {
      if (definicao.camposSoNoAplicar) return null;
      try {
        if (definicao.lerCamposApi) return await definicao.lerCamposApi(url, sinal, deps);
        return await deps.leitor.comPagina(async (pagina) => {
          await navegar(pagina, definicao.urlFormulario(url));
          await dispensarCookies(pagina);
          if (definicao.abrir) await definicao.abrir(pagina);
          return (await lerCamposDaPagina(pagina, definicao)).campos;
        }, sinal);
      } catch {
        // Sem campos no preparo: o aplicar responde ao vivo.
        return null;
      }
    },

    async abrirEPreencher(url, pacote, ctx, sinal): Promise<FormularioAberto> {
      const pagina = await deps.abrirPagina();
      pagina.setDefaultTimeout(TIMEOUT_ACAO_MS);
      const formulario = new FormularioPlaywright(pagina, {
        rota: "conector",
        seletorEnviar: definicao.seletorEnviar,
        confirmacao: definicao.confirmacao,
        ...(definicao.ignorar ? { ignorar: definicao.ignorar } : {}),
      });
      const contexto: ContextoPasso = {
        pagina,
        formulario,
        aguardarUsuario: async (m) => {
          await ctx.aguardarUsuario(m);
          ctx.informar("retomando o preenchimento…");
        },
        dispensados: new Set(),
        naoPreenchidos: [],
      };
      const aoAbortar = (): void => {
        void formulario.fechar();
      };
      sinal.addEventListener("abort", aoAbortar, { once: true });
      try {
        await passo("abrir", null, contexto, () => navegar(pagina, definicao.urlFormulario(url)));
        await dispensarCookies(pagina);
        if (definicao.autenticacao) {
          const modo = definicao.autenticacao;
          await passo("autenticar", null, contexto, () =>
            tratarAutenticacao(pagina, modo, (m) => ctx.aguardarUsuario(m), deps.cofre),
          );
        }
        if (definicao.abrir) {
          const abrir = definicao.abrir.bind(definicao);
          await passo("abrir-formulario", null, contexto, () => abrir(pagina));
        }
        const indice = indexar(pacote.respostas);
        const maxEtapas = definicao.etapas?.maxEtapas ?? 1;
        for (let etapa = 0; etapa < maxEtapas; etapa++) {
          await preencherEtapa(contexto, definicao, pacote, ctx, indice);
          if (!definicao.etapas) break;
          if (
            await pagina
              .locator(definicao.seletorEnviar)
              .filter({ visible: true })
              .count()
              .catch(() => 0)
          )
            break;
          const proximo = pagina.getByRole("button", { name: definicao.etapas.proximo }).first();
          if (!(await proximo.isVisible().catch(() => false))) break;
          await passo(`avancar-etapa-${String(etapa + 1)}`, null, contexto, async () => {
            await proximo.click();
            await pagina
              .waitForLoadState("networkidle", { timeout: 10_000 })
              .catch(() => undefined);
          });
        }
        if (contexto.naoPreenchidos.length > 0) {
          ctx.informar(
            `não consegui preencher: ${contexto.naoPreenchidos.join("; ")}. Complete no navegador antes de enviar.`,
          );
        }
        return formulario;
      } catch (erro) {
        if (erro instanceof ErroFalhaConector) throw erro;
        throw new ErroFalhaConector("desconhecido", null, formulario, { cause: erro });
      } finally {
        sinal.removeEventListener("abort", aoAbortar);
      }
    },
  };
  if (definicao.extrairVaga) {
    const extrair = definicao.extrairVaga.bind(definicao);
    return { ...conector, extrairVaga: (url, sinal) => extrair(url, sinal, deps) };
  }
  return conector;
}

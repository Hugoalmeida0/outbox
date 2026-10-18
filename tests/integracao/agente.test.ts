import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ExecutorAgenteClaude, FERRAMENTAS_AGENTE } from "#infra/agente/executor-agente-claude.ts";
import { executarClaude } from "#infra/llm/processo-claude.ts";
import { LeitorHeadless } from "#infra/navegador/leitor-headless.ts";
import { RAIZ } from "#infra/sistema/caminhos.ts";
import type { EntradaAgente } from "#aplicacao/portas/executor-agente.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { respostaJson, usarClaudeFalso, type ClaudeFalso } from "#testes/apoio/claude-falso.ts";
import { servirFixtures } from "#testes/apoio/fixtures.ts";
import { aquecerNavegador, pdfDeTeste } from "#testes/apoio/harness-conector.ts";
import { umPacote, umaResposta, umaVaga } from "#testes/apoio/builders.ts";
import { ArmazemArtefatosMemoria } from "#testes/apoio/fakes/armazens.ts";
import { RegistradorMemoria } from "#testes/apoio/fakes/basicos.ts";
import { descreverContratoFormulario } from "#testes/contratos/contrato-formulario.ts";

const URL_VAGA = "https://acme.wd5.myworkdayjobs.com/pt-BR/Careers/job/Dev_R1";
const leitor = new LeitorHeadless({
  interceptar: servirFixtures([
    [URL_VAGA, { html: "<html><body><form><input name='nome' value=''></form></body></html>" }],
  ]),
});
beforeAll(() => aquecerNavegador(leitor));
afterAll(() => leitor.fechar());

async function paginaNaVaga() {
  const pagina = await (await leitor.novoContexto()).newPage();
  await pagina.goto(URL_VAGA);
  return pagina;
}

function criarExecutor(artefatos = new ArmazemArtefatosMemoria()) {
  return new ExecutorAgenteClaude({
    executar: executarClaude,
    paginaMaisRecente: paginaNaVaga,
    garantirNavegador: () => Promise.resolve(),
    endpointCdp: "http://127.0.0.1:9333",
    raiz: RAIZ,
    pastaTmp: mkdtempSync(join(tmpdir(), "outbox-agente-")),
    pastaPrompts: join(RAIZ, "prompts"),
    modelo: "sonnet",
    maxTokensThinking: 0,
    artefatos,
    registrador: new RegistradorMemoria(),
  });
}

function entrada(saldo = { turnos: 40, ms: 60_000 }): EntradaAgente {
  return {
    vaga: umaVaga({ id: 11 as IdVaga, motor: "workday" }),
    urlCandidatura: URL_VAGA,
    hostsPermitidos: ["acme.wd5.myworkdayjobs.com", "*.myworkdayjobs.com"],
    saldo,
    pacote: umPacote({
      vagaId: 11,
      pdfCurriculo: pdfDeTeste(),
      respostas: [
        umaResposta({ rotulo: "Por que nós?", valor: "Admiro o produto" }),
        umaResposta({
          rotulo: "Pretensão salarial",
          categoria: "salario",
          valor: "15000",
          sensivel: true,
          fonte: "codigo",
          chaveProtegida: "p1",
        }),
      ],
    }),
  };
}

const pronto = respostaJson({
  status: "PRONTO_PARA_REVISAO",
  seletorEnviar: "button[type=submit]",
  passos: ["abriu", "preencheu"],
  perguntasRespondidasNaHora: [{ rotulo: "Disponibilidade", valor: "Imediata" }],
});

describe("ExecutorAgenteClaude com o claude falso", () => {
  let falso: ClaudeFalso | undefined;
  afterEach(() => falso?.restaurar());
  const ctx = (pausas: string[] = []) => ({
    aguardarUsuario: (m: string) => {
      pausas.push(m);
      return Promise.resolve();
    },
  });

  it("monta prompt sem valores sensíveis, restringe ferramentas e configura os MCPs", async () => {
    falso = usarClaudeFalso([{ resultado: pronto, turnos: 6 }]);
    const artefatos = new ArmazemArtefatosMemoria();
    const r = await criarExecutor(artefatos).preencher(
      entrada(),
      ctx(),
      new AbortController().signal,
    );
    expect(r.tipo).toBe("pronto");
    const [chamada] = falso.chamadas();
    expect(chamada?.prompt).toContain("Por que nós?: Admiro o produto");
    expect(chamada?.prompt).toContain("Pretensão salarial: [protegida p1]");
    expect(chamada?.prompt).not.toContain("15000");
    const args = chamada?.args ?? [];
    expect(args[args.indexOf("--max-turns") + 1]).toBe("40");
    expect(args[args.indexOf("--tools") + 1]).toBe("");
    const permitidas = args[args.indexOf("--allowedTools") + 1] ?? "";
    expect(permitidas).toBe(FERRAMENTAS_AGENTE.join(","));
    expect(permitidas).not.toMatch(/evaluate|run_code|cookie|storage|route|press_key/);
    expect(args).toContain("--strict-mcp-config");
    const config = JSON.parse(
      readFileSync(args[args.indexOf("--mcp-config") + 1] ?? "", "utf8"),
    ) as {
      mcpServers: Record<string, { args: string[]; env?: Record<string, string> }>;
    };
    expect(config.mcpServers.playwright?.args).toContain("--cdp-endpoint");
    expect(config.mcpServers["outbox-segredos"]?.env).toEqual({
      OUTBOX_VAGA_ID: "11",
      OUTBOX_HOSTS_PERMITIDOS: "acme.wd5.myworkdayjobs.com,*.myworkdayjobs.com",
    });
    const pdfCopiado = /Currículo \(PDF\): (.+)/.exec(chamada?.prompt ?? "")?.[1]?.trim() ?? "";
    expect(existsSync(pdfCopiado)).toBe(true);
    expect(pdfCopiado).toContain("agente-11");
    expect(artefatos.lerTexto(11, "agente.json")).toContain("pronto");
    if (r.tipo === "pronto") {
      expect(r.formulario.rota).toBe("agente");
      expect(r.perguntasRespondidasNaHora).toEqual([
        { rotulo: "Disponibilidade", valor: "Imediata" },
      ]);
      expect(await r.formulario.confirmarEnvio(100)).toBe("indeterminada");
      await r.formulario.fechar();
    }
  });

  it("pausa em BLOQUEADO e retoma a sessão descontando os turnos", async () => {
    falso = usarClaudeFalso([
      { contem: "resolveu o bloqueio", resultado: pronto, turnos: 3 },
      {
        resultado: respostaJson({ status: "BLOQUEADO", observacoes: "CAPTCHA", passos: [] }),
        turnos: 10,
        usos: 1,
      },
    ]);
    const pausas: string[] = [];
    const r = await criarExecutor().preencher(entrada(), ctx(pausas), new AbortController().signal);
    expect(r.tipo).toBe("pronto");
    expect(pausas[0]).toMatch(/CAPTCHA/);
    const chamadas = falso.chamadas();
    expect(chamadas).toHaveLength(2);
    const segunda = chamadas[1]?.args ?? [];
    expect(segunda[segunda.indexOf("--max-turns") + 1]).toBe("30");
    expect(segunda.slice(-2)).toEqual(["--resume", "sessao-1"]);
  });

  it("mapeia sem formulário, Easy Apply e insiste no JSON final", async () => {
    falso = usarClaudeFalso([
      { resultado: respostaJson({ status: "SEM_FORMULARIO", passos: ["procurou"] }) },
    ]);
    expect(
      (await criarExecutor().preencher(entrada(), ctx(), new AbortController().signal)).tipo,
    ).toBe("sem_formulario");
    falso.restaurar();
    falso = usarClaudeFalso([
      {
        contem: "somente com o JSON final",
        resultado: respostaJson({ status: "EASY_APPLY", passos: [] }),
      },
      { resultado: "fiz tudo, mas esqueci o json", usos: 1 },
    ]);
    expect(
      (await criarExecutor().preencher(entrada(), ctx(), new AbortController().signal)).tipo,
    ).toBe("easy_apply");
  });

  it("vira teto quando estoura turnos, tempo ou saldo", async () => {
    falso = usarClaudeFalso([{ erro: "max_turns" }]);
    expect(
      (await criarExecutor().preencher(entrada(), ctx(), new AbortController().signal)).tipo,
    ).toBe("teto");
    falso.restaurar();
    falso = usarClaudeFalso([{ atrasoMs: 3000, resultado: pronto }]);
    expect(
      (
        await criarExecutor().preencher(
          entrada({ turnos: 40, ms: 300 }),
          ctx(),
          new AbortController().signal,
        )
      ).tipo,
    ).toBe("teto");
    expect(
      (
        await criarExecutor().preencher(
          entrada({ turnos: 0, ms: 1000 }),
          ctx(),
          new AbortController().signal,
        )
      ).tipo,
    ).toBe("teto");
  });
});

descreverContratoFormulario("FormularioPlaywright (agente)", async () => {
  const falso = usarClaudeFalso([{ resultado: pronto }]);
  const r = await criarExecutor().preencher(
    entrada(),
    { aguardarUsuario: () => Promise.resolve() },
    new AbortController().signal,
  );
  falso.restaurar();
  if (r.tipo !== "pronto") throw new Error("esperava formulário pronto");
  return { formulario: r.formulario, encerrar: () => Promise.resolve() };
});

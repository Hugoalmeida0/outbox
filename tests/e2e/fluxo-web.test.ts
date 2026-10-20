// e2e do site (AC15): o agente real (`camaleao agente`) numa pasta temporária, o site do build servido
// pelo `vite preview` e um Chromium headless percorrendo parear → importar → perfil → adicionar →
// preparar → aplicar simulando até a revisão → pular.
//
// O importar usa o `claude` falso. Preparar e aplicar rodam os casos de uso reais sobre o banco do agente,
// mas com resolução, extração, conector e LLM falsos: os testes não fazem rede nem abrem navegador visível.
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { stripVTControlCharacters } from "node:util";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { aplicarVagas } from "#aplicacao/casos-de-uso/aplicar-vagas.ts";
import { prepararVagas } from "#aplicacao/casos-de-uso/preparar-vagas.ts";
import { criarContainer, type Container } from "#composicao";
import { abrirConexao } from "#infra/banco/conexao.ts";
import { RepositorioVagasSqlite } from "#infra/banco/repositorio-vagas-sqlite.ts";
import { CONFIG_PADRAO } from "#infra/config/esquema-config.ts";
import { executar } from "#interfaces/cli/principal.ts";
import { umaAnalise, umCurriculoGerado, umMaster } from "#testes/apoio/builders.ts";
import { respostaJson, usarClaudeFalso, type ClaudeFalso } from "#testes/apoio/claude-falso.ts";
import { criarAmbienteAplicacao } from "#testes/apoio/deps-aplicacao.ts";
import { RelogioFixo } from "#testes/apoio/fakes/basicos.ts";
import {
  CatalogoConectoresFake,
  ConectorFake,
  FormularioAbertoFake,
} from "#testes/apoio/fakes/formularios.ts";

const WEB = fileURLToPath(new URL("../../apps/web/", import.meta.url));
const VITE = join(WEB, "node_modules", "vite", "bin", "vite.js");
const URL_VAGA = "https://job-boards.greenhouse.io/acme/jobs/4242";

async function portaLivre(): Promise<number> {
  const s = createServer();
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
  const endereco = s.address();
  await new Promise((r) => s.close(r));
  return typeof endereco === "object" && endereco ? endereco.port : 0;
}

async function esperarHttp(url: string, limiteMs = 30_000): Promise<void> {
  const fim = Date.now() + limiteMs;
  while (Date.now() < fim) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Ainda subindo: tenta de novo.
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`não subiu: ${url}`);
}

/** Preparar e aplicar reais sobre o banco do agente, com portas de rede, navegador e LLM falsas. */
function comFluxoFalso(container: Container): Container {
  const conector = new ConectorFake(
    "greenhouse",
    new FormularioAbertoFake({
      valores: [{ rotulo: "First Name", valor: "Ana", ehArquivo: false }],
    }),
  );
  conector.campos = [
    { id: "fn", rotulo: "First Name", tipo: "texto", obrigatorio: true, categoria: "padrao" },
  ];
  const amb = criarAmbienteAplicacao({ catalogo: new CatalogoConectoresFake(conector) });
  amb.gerador
    .sempre("analisar-vaga", umaAnalise())
    .sempre("tailoring", umCurriculoGerado())
    .sempre("responder-perguntas", { respostas: [], salarios: [] });
  amb.extrator.definir(URL_VAGA, {
    estruturada: { empresa: "Acme", cargo: "Dev", descricao: "TypeScript", localidade: "Remoto" },
    textoPagina: "TypeScript",
  });
  // O mesmo banco que o agente usa no adicionar e no status.
  container.casos.listarStatus({});
  const vagas = new RepositorioVagasSqlite(abrirConexao(container.caminhos.db), new RelogioFixo());
  const deps = () => ({ ...amb.deps(), vagas });
  return {
    ...container,
    casos: {
      ...container.casos,
      prepararVagas: (entrada, progresso, sinal) =>
        prepararVagas({ ...deps(), progresso }, entrada, sinal),
      aplicarVagas: (entrada, interacao, sinal) =>
        aplicarVagas({ ...deps(), interacao }, entrada, sinal),
    },
  };
}

describe("site + agente local, ponta a ponta (AC15)", () => {
  let navegador: Browser | undefined;
  let preview: ChildProcess | undefined;
  let claude: ClaudeFalso | undefined;
  let interromper: () => void = () => undefined;
  let execucao: Promise<number> = Promise.resolve(0);
  const linhas: string[] = [];
  let portaAgente = 0;
  let site = "";

  beforeAll(async () => {
    if (!existsSync(join(WEB, "dist", "index.html"))) {
      throw new Error("build do site ausente: rode `npm run -w apps/web build` antes");
    }
    claude = usarClaudeFalso([
      { contem: "Converta o currículo", resultado: respostaJson(umMaster()) },
    ]);
    const portaSite = await portaLivre();
    portaAgente = await portaLivre();
    site = `http://localhost:${String(portaSite)}`;
    const raiz = mkdtempSync(join(tmpdir(), "camaleao-e2e-"));
    const config = {
      ...CONFIG_PADRAO,
      agente: { ...CONFIG_PADRAO.agente, porta: portaAgente, origensPermitidas: [site] },
      notificacao: { toast: false },
    };
    let ouvinte: (() => void) | null = null;
    execucao = executar(["node", "camaleao", "agente", "--sem-navegador"], {
      saida: {
        escrever: (t) => linhas.push(stripVTControlCharacters(t)),
        erro: (t) => linhas.push(stripVTControlCharacters(t)),
      },
      fabricarContainer: () =>
        comFluxoFalso(
          criarContainer({ raiz, config, nivelLog: "erro", escreverTerminal: () => undefined }),
        ),
      alvoSinais: { on: (_e, o) => (ouvinte = o), off: () => undefined },
      sair: () => undefined,
    });
    interromper = () => ouvinte?.();

    preview = spawn(
      process.execPath,
      [VITE, "preview", "--port", String(portaSite), "--strictPort", "--host", "localhost"],
      { cwd: WEB, stdio: "ignore" },
    );
    await esperarHttp(`http://127.0.0.1:${String(portaAgente)}/saude`);
    await esperarHttp(`${site}/`);
    navegador = await chromium.launch({ headless: true });
  }, 90_000);

  afterAll(async () => {
    await navegador?.close();
    preview?.kill();
    interromper();
    await execucao;
    claude?.restaurar();
  });

  it("pareia, importa, salva o perfil, adiciona, prepara e revisa sem enviar", async () => {
    const codigo = /Código de pareamento: (\S+)/.exec(linhas.join("\n"))?.[1]?.replace("-", "");
    expect(codigo).toMatch(/^[A-Z2-9]{8}$/);
    if (!navegador) throw new Error("navegador não iniciou");
    const contexto = await navegador.newContext();
    await contexto.addInitScript(
      (agente) => {
        localStorage.setItem("camaleao.agente", agente);
      },
      `http://127.0.0.1:${String(portaAgente)}`,
    );
    const pagina = await contexto.newPage();
    pagina.setDefaultTimeout(20_000);

    // Pareamento pelo fragmento, como na janela aberta pelo agente.
    await pagina.goto(`${site}/#parear=${codigo ?? ""}`);
    await pagina.getByRole("navigation", { name: "Principal" }).waitFor();
    expect(new URL(pagina.url()).hash).toBe("");

    // Importar um .md com o claude falso.
    await pagina.goto(`${site}/curriculo/importar`);
    const cv = join(mkdtempSync(join(tmpdir(), "camaleao-e2e-cv-")), "cv.md");
    writeFileSync(cv, "# Ana Exemplo da Silva\nDesenvolvedora full stack.");
    await pagina.locator("#arquivo").setInputFiles(cv);
    await pagina.getByRole("button", { name: "Importar", exact: true }).click();
    await pagina.getByText("Master criado:").waitFor();

    // Perfil mínimo: o importar criou o perfil a partir do exemplo; ajusta e salva.
    await pagina.goto(`${site}/curriculo/perfil`);
    await pagina.getByLabel("Resposta padrão para “como soube da vaga?”").fill("Indicação");
    await pagina.getByRole("button", { name: "Salvar perfil" }).click();
    await pagina.getByText("Perfil salvo!").waitFor();

    // Adicionar a vaga.
    await pagina.goto(`${site}/vagas/adicionar`);
    await pagina.getByLabel("Links das vagas").fill(URL_VAGA);
    await pagina.getByRole("button", { name: /Adicionar 1 à fila/ }).click();
    await pagina.getByRole("heading", { name: "adicionada 1" }).waitFor();

    // Preparar.
    await pagina.getByRole("link", { name: "Preparar" }).click();
    await pagina.getByRole("button", { name: "Bora preparar" }).click();
    await pagina.getByText("Deixei 1 vaga prontinha pra você revisar.").waitFor();

    // Aplicar simulando até a revisão e pular.
    await pagina.getByRole("link", { name: "Revisar e aplicar" }).click();
    await pagina.getByLabel(/Só simular/).check();
    await pagina.getByRole("button", { name: "Bora aplicar" }).click();
    await pagina.getByRole("region", { name: /Revisão da vaga #1/ }).waitFor();
    await pagina.getByRole("button", { name: "Pular esta vaga" }).click();
    await pagina.getByText(/Revisamos 1 vaga: 1 pulada\./).waitFor();

    await pagina.goto(`${site}/vagas`);
    await pagina.getByRole("cell", { name: "PULADA" }).waitFor();
    await contexto.close();
  }, 120_000);
});

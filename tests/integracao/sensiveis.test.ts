// AC11 de ponta a ponta: preparar e aplicar com o claude falso, infra real de arquivos e logs; nenhum valor
// sensível do perfil aparece nos logs de LLM, no log JSONL, no registro de falhas nem no prompt do agente.
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify } from "yaml";
import { afterEach, describe, expect, it } from "vitest";
import { aplicarVagas } from "#aplicacao/casos-de-uso/aplicar-vagas.ts";
import { prepararVagas } from "#aplicacao/casos-de-uso/preparar-vagas.ts";
import type { Campo } from "#dominio/respostas/campo.ts";
import { listaPii } from "#dominio/falhas/pii.ts";
import { canonizar } from "#dominio/vagas/motores.ts";
import { ExecutorAgenteClaude } from "#infra/agente/executor-agente-claude.ts";
import { ArmazemArtefatosFs } from "#infra/armazenamento/armazem-artefatos-fs.ts";
import { ArmazemCurriculoYaml } from "#infra/armazenamento/armazem-curriculo-yaml.ts";
import { RegistroFalhasFs } from "#infra/armazenamento/registro-falhas-fs.ts";
import { GeradorEstruturadoClaude } from "#infra/llm/gerador-estruturado-claude.ts";
import { executarClaude } from "#infra/llm/processo-claude.ts";
import { RegistradorJsonl } from "#infra/log/registrador-jsonl.ts";
import { criarCaminhos, RAIZ } from "#infra/sistema/caminhos.ts";
import { umaAnalise, umCurriculoGerado, umMaster, umPerfil } from "#testes/apoio/builders.ts";
import { respostaJson, usarClaudeFalso, type ClaudeFalso } from "#testes/apoio/claude-falso.ts";
import { CONFIG_TESTE } from "#testes/apoio/deps-aplicacao.ts";
import { ExtratorFake, RenderizadorFake, ResolvedorFake } from "#testes/apoio/fakes/armazens.ts";
import {
  InteracaoRoteirizada,
  NotificadorEspiao,
  ProgressoEspiao,
  RelogioFixo,
} from "#testes/apoio/fakes/basicos.ts";
import { CatalogoConectoresFake, ConectorFake } from "#testes/apoio/fakes/formularios.ts";
import { criarRepositorioMemoria } from "#testes/apoio/repositorio-memoria.ts";

/** Valores de `umPerfil()` que nunca podem sair da máquina nem ir a log. */
const SENSIVEIS = [
  "123.456.789-09",
  "12345678909",
  "12.345.678-9",
  "1995-06-15",
  "15/06/1995",
  "15000",
  "20000",
  "60000",
  "mulher_cis",
  "Rua Exemplo Fictícia",
  "01000-000",
];

const CAMPOS: Campo[] = [
  { id: "nome", rotulo: "Nome completo", tipo: "texto", obrigatorio: true, categoria: "padrao" },
  { id: "cpf", rotulo: "CPF", tipo: "texto", obrigatorio: true, categoria: "documento" },
  {
    id: "nasc",
    rotulo: "Data de nascimento",
    tipo: "data",
    obrigatorio: true,
    categoria: "documento",
  },
  { id: "cep", rotulo: "CEP", tipo: "texto", obrigatorio: false, categoria: "documento" },
  {
    id: "sal",
    rotulo: "Pretensão salarial (R$)",
    tipo: "texto",
    obrigatorio: true,
    categoria: "salario",
  },
  {
    id: "gen",
    rotulo: "Gênero",
    tipo: "select",
    obrigatorio: false,
    opcoes: ["Mulher", "Homem", "Prefiro não informar"],
    categoria: "diversidade",
  },
  {
    id: "q1",
    rotulo: "Por que você quer trabalhar aqui?",
    tipo: "textarea",
    obrigatorio: true,
    categoria: "pergunta",
  },
];

function arquivosDeTexto(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivosDeTexto(caminho);
    return /\.(json|jsonl|md|txt|html)$/.test(nome) ? [caminho] : [];
  });
}

let claude: ClaudeFalso | null = null;
afterEach(() => {
  claude?.restaurar();
  claude = null;
});

describe("dados sensíveis fora do LLM e dos logs (AC11, AC16, AC27)", () => {
  it("preparar e aplicar não vazam documentos, salário, diversidade nem endereço", async () => {
    claude = usarClaudeFalso([
      { contem: "Analise a vaga e compare", resultado: respostaJson(umaAnalise()) },
      { contem: "Gere o currículo camaleão", resultado: respostaJson(umCurriculoGerado()) },
      {
        contem: "Responda as perguntas do formulário",
        resultado: respostaJson({
          respostas: [{ campoId: "q1", valor: "Admiro o produto." }],
          salarios: [{ campoId: "sal", regime: "clt", periodo: "mensal", moeda: "BRL" }],
        }),
      },
      {
        contem: "Você opera um navegador",
        resultado: respostaJson({
          status: "PRONTO_PARA_REVISAO",
          passos: ["retomou o formulário"],
        }),
      },
    ]);

    const raiz = mkdtempSync(join(tmpdir(), "camaleao-sensiveis-"));
    const caminhos = criarCaminhos(raiz, RAIZ);
    mkdirSync(caminhos.curriculoDir, { recursive: true });
    writeFileSync(caminhos.master, stringify(umMaster()));
    writeFileSync(caminhos.perfil, stringify(umPerfil()));
    const relogio = new RelogioFixo();
    const curriculo = new ArmazemCurriculoYaml(caminhos, relogio);
    curriculo.garantirArquivosAuxiliares();
    const artefatos = new ArmazemArtefatosFs(caminhos, () => umMaster().pessoal.nome);
    const registrador = new RegistradorJsonl({
      pastaLogs: caminhos.logsDir,
      relogio,
      obterPii: () => listaPii(umMaster().pessoal, umPerfil()),
      escreverTerminal: () => undefined,
    });
    const cwd = join(caminhos.tmpDir, "llm-cwd");
    mkdirSync(cwd, { recursive: true });
    const gerador = new GeradorEstruturadoClaude({
      pastaPrompts: caminhos.promptsDir,
      cwd,
      modelo: "sonnet",
      maxTokensThinking: 0,
      timeoutMs: 30_000,
      executar: executarClaude,
    });
    const conector = new ConectorFake("greenhouse");
    conector.campos = CAMPOS;
    const agente = new ExecutorAgenteClaude({
      executar: executarClaude,
      paginaMaisRecente: () => Promise.resolve(null),
      garantirNavegador: () => Promise.resolve(),
      endpointCdp: "http://127.0.0.1:9",
      raiz: RAIZ,
      pastaTmp: caminhos.tmpDir,
      pastaPrompts: caminhos.promptsDir,
      modelo: "sonnet",
      maxTokensThinking: 0,
      artefatos,
      registrador,
    });
    const vagas = criarRepositorioMemoria(relogio);
    const url = "https://job-boards.greenhouse.io/acme/jobs/1";
    const { canonica, motor } = canonizar(url);
    const vaga = vagas.inserir({
      urlOriginal: url,
      canal: motor,
      urlCanonica: canonica,
      motor,
      status: "NOVA",
    });
    const deps = {
      vagas,
      curriculo,
      artefatos,
      falhas: new RegistroFalhasFs(caminhos.falhasDir),
      gerador,
      resolvedor: new ResolvedorFake(),
      extrator: new ExtratorFake(),
      renderizador: new RenderizadorFake(),
      catalogo: new CatalogoConectoresFake(conector),
      agente,
      notificador: new NotificadorEspiao(),
      registrador,
      relogio,
      interacao: new InteracaoRoteirizada(),
      progresso: new ProgressoEspiao(),
      config: CONFIG_TESTE,
      cartaMaxPalavras: CONFIG_TESTE.cartaMaxPalavras,
    };

    await prepararVagas(deps, { forcar: false, reavaliar: false }, new AbortController().signal);
    expect(vagas.buscar(vaga.id)?.status).toBe("PRONTA");
    conector.falharNoPasso = "preencher:cpf";
    await aplicarVagas(deps, { simular: true }, new AbortController().signal);
    expect(vagas.buscar(vaga.id)).toMatchObject({ status: "MANUAL", motivo: "sem_formulario" });

    // Um log descuidado com o perfil inteiro: a redação (por valor e por chave) precisa segurar.
    registrador.avisar(`perfil carregado para ${umMaster().pessoal.nome}`, { perfil: umPerfil() });

    // Controles positivos: os sensíveis existem localmente e todas as fontes a varrer foram geradas.
    const respostas = readFileSync(join(caminhos.vagasDir, "00001", "respostas.json"), "utf8");
    expect(respostas).toContain("123.456.789-09");
    expect(respostas).toContain("Mulher");
    const arquivos = [
      ...arquivosDeTexto(caminhos.dadosDir),
      ...arquivosDeTexto(caminhos.falhasDir),
    ].filter((a) => !a.endsWith("respostas.json"));
    expect(arquivos.filter((a) => /[\\/]llm[\\/]\d+-/.test(a)).length).toBeGreaterThanOrEqual(3);
    const log = arquivos
      .filter((a) => a.endsWith(".jsonl"))
      .map((a) => readFileSync(a, "utf8"))
      .join("");
    expect(log).toContain("perfil carregado para [REDACTED]");
    expect(log).toContain('"cpf":"[OMITIDO]"');
    expect(arquivos.some((a) => a.includes("falhas") && a.endsWith(".html"))).toBe(true);
    const promptAgente =
      claude.chamadas().find((c) => c.prompt.includes("Você opera um navegador"))?.prompt ?? "";
    expect(promptAgente).toMatch(/CPF: \[protegida p\d\]/);
    expect(promptAgente).toContain("Por que você quer trabalhar aqui?: Admiro o produto.");

    const fontes = [
      ...arquivos.map((a) => ({ nome: a, texto: readFileSync(a, "utf8") })),
      ...claude.chamadas().map((c, i) => ({ nome: `prompt ${String(i)}`, texto: c.prompt })),
    ];
    const vazamentos = fontes.flatMap(({ nome, texto }) =>
      SENSIVEIS.filter((s) => texto.includes(s)).map((s) => `${s} em ${nome}`),
    );
    expect(vazamentos).toEqual([]);
    expect(promptAgente).not.toContain("Mulher");
  });
});

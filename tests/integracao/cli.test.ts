// CLI ponta a ponta sobre a composição real, numa raiz temporária (AC1, AC21, AC26, AC30, AC31).
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { criarContainer, type Container } from "#composicao";
import { executar } from "#interfaces/cli/principal.ts";
import { umMaster } from "#testes/apoio/builders.ts";
import { respostaJson, usarClaudeFalso, type ClaudeFalso } from "#testes/apoio/claude-falso.ts";

interface Execucao {
  readonly codigo: number;
  readonly saida: string;
  readonly erro: string;
  readonly container: Container | null;
}

function novaRaiz(): string {
  return mkdtempSync(join(tmpdir(), "camaleao-cli-"));
}

async function rodar(raiz: string, ...args: string[]): Promise<Execucao> {
  const saida: string[] = [];
  const erro: string[] = [];
  let container: Container | null = null;
  const codigo = await executar(["node", "camaleao", ...args], {
    saida: { escrever: (t) => saida.push(t), erro: (t) => erro.push(t) },
    fabricarContainer: () =>
      (container = criarContainer({
        raiz,
        nivelLog: "avisar",
        escreverTerminal: (l) => erro.push(l),
      })),
    alvoSinais: { on: () => undefined, off: () => undefined },
    sair: () => undefined,
  });
  return {
    codigo,
    saida: stripVTControlCharacters(saida.join("\n")),
    erro: stripVTControlCharacters(erro.join("\n")),
    container,
  };
}

let claude: ClaudeFalso | null = null;
afterEach(() => {
  claude?.restaurar();
  claude = null;
});

describe("CLI: ajuda e uso inválido", () => {
  it("--help lista os 9 comandos sem criar container (AC1)", async () => {
    const r = await rodar(novaRaiz(), "--help");
    expect(r.codigo).toBe(0);
    for (const comando of [
      "importar",
      "adicionar",
      "preparar",
      "aplicar",
      "status",
      "retorno",
      "falhas",
      "navegador",
      "renderizar-master",
    ]) {
      expect(r.saida).toContain(comando);
    }
    expect(r.container).toBeNull();
  });

  it("comando, opção ou argumento inválidos saem com 2", async () => {
    const raiz = novaRaiz();
    expect((await rodar(raiz, "voar")).codigo).toBe(2);
    expect((await rodar(raiz, "preparar", "--paralelo", "9")).erro).toContain(
      "paralelo: vai de 1 a 8",
    );
    expect((await rodar(raiz, "status", "--status", "talvez")).codigo).toBe(2);
    expect((await rodar(raiz, "retorno", "1", "CONTRATADA")).erro).toContain(
      "status: use um destes: EM_PROCESSO, OFERTA, RECUSADA, ENVIADA",
    );
    expect((await rodar(raiz, "importar", join(raiz, "nao-existe.pdf"))).codigo).toBe(2);
    writeFileSync(join(raiz, "cv.odt"), "x");
    expect((await rodar(raiz, "importar", join(raiz, "cv.odt"))).erro).toContain(
      "formato não suportado (.odt)",
    );
  });
});

describe("CLI: fila, status, retorno e falhas", () => {
  it("adiciona por argumento e arquivo, lista, registra retorno e recusa transição inválida", async () => {
    const raiz = novaRaiz();
    const lista = join(raiz, "vagas.txt");
    writeFileSync(
      lista,
      "# vagas da semana\n\nhttps://jobs.lever.co/acme/0f8e4c7a-1111-2222-3333-444455556666\n",
    );
    const adicao = await rodar(
      raiz,
      "adicionar",
      "https://job-boards.greenhouse.io/acme/jobs/1?gh_src=x",
      "isto não é url",
      "-a",
      lista,
    );
    expect(adicao.codigo).toBe(0);
    expect(adicao.saida).toContain("adicionada 2 · inválida 1");
    expect(
      (await rodar(raiz, "adicionar", "https://job-boards.greenhouse.io/acme/jobs/1")).saida,
    ).toContain("já na fila 1");
    expect((await rodar(raiz, "adicionar", "nada")).codigo).toBe(2);

    const status = await rodar(raiz, "status", "--status", "nova");
    expect(status.codigo).toBe(0);
    expect(status.saida).toContain("Vagas: 2  (NOVA 2)");
    expect(status.saida).toMatch(/1\s+NOVA\s+-\s+-\s+-\s+greenhouse\s+greenhouse/);
    expect(status.saida).toMatch(/2\s+NOVA\s+-\s+-\s+-\s+lever\s+lever/);

    const invalido = await rodar(raiz, "retorno", "1", "OFERTA");
    expect(invalido.codigo).toBe(1);
    expect(invalido.erro).toContain(
      "erro: transição NOVA → OFERTA não permitida. Aceitas a partir de NOVA:",
    );
    expect((await rodar(raiz, "retorno", "99", "OFERTA")).erro).toContain(
      "vaga #99 não encontrada",
    );

    expect((await rodar(raiz, "falhas")).saida).toBe("Nenhuma falha aberta em falhas/.");
    expect(existsSync(join(raiz, "dados", "camaleao.db"))).toBe(true);
  });

  it("move o banco legado dados/outbox.db (com -wal e -shm) para dados/camaleao.db e avisa", async () => {
    const raiz = novaRaiz();
    const dados = join(raiz, "dados");
    expect((await rodar(raiz, "adicionar", "https://jobs.ashbyhq.com/acme/1")).codigo).toBe(0);
    for (const sufixo of ["", "-wal", "-shm"]) {
      const atual = join(dados, `camaleao.db${sufixo}`);
      if (existsSync(atual)) renameSync(atual, join(dados, `outbox.db${sufixo}`));
    }
    writeFileSync(join(dados, "outbox.db-shm"), "");

    const r = await rodar(raiz, "status");
    expect(r.codigo).toBe(0);
    expect(r.saida).toContain("Vagas: 1");
    expect(r.erro).toContain("banco renomeado de dados/outbox.db para dados/camaleao.db");
    expect(readdirSync(dados).filter((a) => a.startsWith("outbox.db"))).toEqual([]);

    writeFileSync(join(dados, "outbox.db"), "");
    const ambos = await rodar(raiz, "status");
    expect(ambos.saida).toContain("Vagas: 1");
    expect(ambos.erro).toContain("dados/outbox.db ignorado: dados/camaleao.db já existe");
  });

  it("status, retorno e falhas não instanciam navegador, leitor, renderizador, notificador nem LLM (AC31)", async () => {
    const raiz = novaRaiz();
    const pesados = [
      "leitor",
      "navegador",
      "renderizador",
      "notificador",
      "catalogo",
      "resolvedor",
      "extrator",
      "gerador",
      "agente",
      "cofre",
    ];
    for (const args of [
      ["status"],
      ["falhas"],
      ["retorno", "1", "OFERTA"],
      ["adicionar", "https://jobs.ashbyhq.com/acme/1"],
    ]) {
      const r = await rodar(raiz, ...args);
      const instanciados = [...(r.container?.instanciados() ?? [])];
      expect(
        instanciados.filter((n) => pesados.includes(n)),
        args.join(" "),
      ).toEqual([]);
    }
  });
});

describe("CLI: execução exclusiva (AC26)", () => {
  it("um segundo preparar simultâneo falha com mensagem e código 2; trava de PID morto é recuperada", async () => {
    const raiz = novaRaiz();
    const travas = join(raiz, "dados", "travas");
    mkdirSync(travas, { recursive: true });
    writeFileSync(join(travas, "preparar.lock"), String(process.ppid));
    const r = await rodar(raiz, "preparar");
    expect(r.codigo).toBe(2);
    expect(r.erro).toContain(`já existe um \`preparar\` em execução (pid ${String(process.ppid)})`);

    writeFileSync(join(travas, "aplicar.lock"), "999999");
    const aplicar = await rodar(raiz, "aplicar", "--simular");
    expect(aplicar.codigo).toBe(0);
    expect(aplicar.saida).toContain("Nenhuma vaga revisada.");
    expect(existsSync(join(travas, "aplicar.lock"))).toBe(false);
  });
});

describe("CLI: importar com o claude falso (AC2)", () => {
  it("converte um .md no master, cria os auxiliares e recusa sobrescrever sem a flag", async () => {
    const raiz = novaRaiz();
    claude = usarClaudeFalso([{ resultado: respostaJson(umMaster()) }]);
    const cv = join(raiz, "cv.md");
    writeFileSync(cv, "# Ana Exemplo da Silva\nDesenvolvedora full stack, TypeScript e React.");

    const r = await rodar(raiz, "importar", cv);
    expect(r.erro).toBe("");
    expect(r.codigo).toBe(0);
    expect(r.saida).toMatch(
      /master criado em curriculo[\\/]master\.yaml: \d+ experiência\(s\), \d+ skill\(s\)\./,
    );
    for (const arquivo of ["master.yaml", "perfil.yaml", "respostas.yaml", "gaps.yaml"]) {
      expect(existsSync(join(raiz, "curriculo", arquivo)), arquivo).toBe(true);
    }
    expect(readFileSync(join(raiz, "curriculo", "master.yaml"), "utf8")).toContain(
      "Ana Exemplo da Silva",
    );
    const [chamada] = claude.chamadas();
    expect(chamada?.prompt).toContain('<conteudo_nao_confiavel origem="curriculo">');
    expect(chamada?.args).toContain("--max-turns");

    const repetido = await rodar(raiz, "importar", cv);
    expect(repetido.codigo).toBe(2);
    expect(repetido.erro).toContain("master.yaml já existe; use --sobrescrever");
    expect(claude.chamadas()).toHaveLength(1);

    const sobrescrito = await rodar(raiz, "importar", cv, "--sobrescrever");
    expect(sobrescrito.codigo).toBe(0);
    expect(sobrescrito.saida).toMatch(
      /Backup do master anterior: curriculo[\\/]master\.yaml\.bak-\d{14}/,
    );
  });

  it("falha do claude vira erro de execução com código 1", async () => {
    const raiz = novaRaiz();
    claude = usarClaudeFalso([{ erro: "falha" }]);
    const cv = join(raiz, "cv.txt");
    writeFileSync(cv, "Ana Exemplo da Silva");
    const r = await rodar(raiz, "importar", cv);
    expect(r.codigo).toBe(1);
    expect(r.erro).toMatch(/^erro: /m);
  });
});

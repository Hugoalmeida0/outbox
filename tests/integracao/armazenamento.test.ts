import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ArmazemCurriculoYaml } from "#infra/armazenamento/armazem-curriculo-yaml.ts";
import { ArmazemArtefatosFs } from "#infra/armazenamento/armazem-artefatos-fs.ts";
import { RegistroFalhasFs } from "#infra/armazenamento/registro-falhas-fs.ts";
import { criarCaminhos, RAIZ } from "#infra/sistema/caminhos.ts";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import { ErroInfra } from "#aplicacao/portas/erros.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { RelogioFixo } from "#testes/apoio/fakes/basicos.ts";
import { esquemaPerfil } from "#dominio/respostas/perfil.ts";
import { umMaster, umPerfil } from "#testes/apoio/builders.ts";

function ambiente() {
  const raiz = mkdtempSync(join(tmpdir(), "camaleao-arm-"));
  const caminhos = criarCaminhos(raiz, RAIZ);
  mkdirSync(caminhos.curriculoDir, { recursive: true });
  return {
    raiz,
    caminhos,
    armazem: new ArmazemCurriculoYaml(caminhos, new RelogioFixo("2026-10-10T13:14:15Z")),
  };
}

describe("ArmazemCurriculoYaml", () => {
  it("grava o master novo, recusa sobrescrever sem flag e faz backup com flag", () => {
    const { caminhos, armazem } = ambiente();
    expect(armazem.existeMaster()).toBe(false);
    expect(() => armazem.lerMaster()).toThrow(/camaleao importar/);
    expect(armazem.gravarMasterNovo(umMaster(), { sobrescrever: false })).toEqual({});
    expect(armazem.lerMaster().pessoal.nome).toBe("Ana Exemplo da Silva");
    expect(() => armazem.gravarMasterNovo(umMaster(), { sobrescrever: false })).toThrow(
      /use --sobrescrever/,
    );
    const { backup } = armazem.gravarMasterNovo(umMaster({ resumo: "Novo resumo." }), {
      sobrescrever: true,
    });
    expect(backup).toMatch(/master\.yaml\.bak-20261010131415$/);
    expect(existsSync(backup!)).toBe(true);
    expect(armazem.lerMaster().resumo).toBe("Novo resumo.");
    expect(readFileSync(caminhos.master, "utf8")).toMatch(/^# Currículo master/);
    expect(armazem.atualizadoEm()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("acrescenta skill aprendida preservando comentários", () => {
    const { caminhos, armazem } = ambiente();
    writeFileSync(caminhos.master, readFileSync(join(RAIZ, "curriculo.exemplo", "master.yaml")));
    armazem.adicionarSkill({
      id: "kafka",
      nome: "Kafka",
      aliases: [],
      categoria: "ferramenta",
      anos: 2,
      origem: "aprendido",
      evidencia: "Filas na Fintech Aurora",
      aprendidoEm: "2026-10-10",
      vagaOrigem: 7,
    });
    const texto = readFileSync(caminhos.master, "utf8");
    expect(texto).toContain("# Currículo master FICTÍCIO de exemplo");
    expect(texto).toContain("# categoria: linguagem, framework");
    expect(armazem.lerMaster().skills.at(-1)).toMatchObject({
      id: "kafka",
      origem: "aprendido",
      vagaOrigem: 7,
    });
  });

  it("aponta o campo inválido do YAML", () => {
    const { caminhos, armazem } = ambiente();
    writeFileSync(caminhos.perfil, "endereco: {cidade: X, pais: Y}\n");
    expect(() => armazem.lerPerfil()).toThrow(ErroUsuario);
    expect(() => armazem.lerPerfil()).toThrow(/perfil\.yaml: disponibilidade/);
    writeFileSync(caminhos.perfil, "a: [");
    expect(() => armazem.lerPerfil()).toThrow(/não é um YAML válido/);
  });

  it("cria auxiliares a partir dos exemplos e lê banco e gaps", () => {
    const { caminhos, armazem } = ambiente();
    expect(() => armazem.lerPerfil()).toThrow(/perfil\.yaml não encontrado/);
    expect(armazem.lerBanco()).toEqual([]);
    expect(armazem.lerGapsNegados()).toEqual([]);
    const criados = armazem.garantirArquivosAuxiliares();
    expect(criados.map((c) => c.split(/[\\/]/).at(-1))).toEqual([
      "perfil.yaml",
      "respostas.yaml",
      "gaps.yaml",
    ]);
    expect(armazem.garantirArquivosAuxiliares()).toEqual([]);
    expect(armazem.lerPerfil().comoSoube).toBe("LinkedIn");
    expect(armazem.lerBanco()).toHaveLength(2);
    expect(existsSync(caminhos.master)).toBe(false);
  });

  it("grava o banco preservando o comentário do topo e acumula gaps negados", () => {
    const { caminhos, armazem } = ambiente();
    armazem.garantirArquivosAuxiliares();
    const banco = armazem.lerBanco();
    armazem.gravarBanco([...banco, { ...banco[0]!, id: "r-0003", pergunta: "Nova?" }]);
    expect(readFileSync(caminhos.respostas, "utf8")).toMatch(/^# Banco de respostas/);
    expect(armazem.lerBanco().map((e) => e.id)).toEqual(["r-0001", "r-0002", "r-0003"]);
    armazem.negarGap("kafka");
    armazem.negarGap("kafka");
    armazem.negarGap("go");
    expect(armazem.lerGapsNegados()).toEqual(["kafka", "go"]);
    expect(readFileSync(caminhos.gaps, "utf8")).toContain("# Termos que você declarou");
  });

  it("lê o perfil bruto e grava o perfil preservando comentários e a ordem das chaves (AC11)", () => {
    const { caminhos, armazem } = ambiente();
    expect(armazem.lerPerfilBruto()).toEqual({ existe: false, dados: null });

    // Sem arquivo, parte do exemplo: os comentários explicativos vêm junto, os valores fictícios não.
    const perfil = { ...umPerfil(), comoSoube: "Indicação" };
    armazem.gravarPerfil(perfil);
    const criado = readFileSync(caminhos.perfil, "utf8");
    expect(criado).toContain("# Perfil FICTÍCIO de exemplo");
    expect(criado).not.toContain("000.000.000-00");
    expect(armazem.lerPerfil()).toEqual(esquemaPerfil.parse(perfil));

    writeFileSync(
      caminhos.perfil,
      `# meu perfil\n${criado.replace("comoSoube:", "# como soube\ncomoSoube:")}`,
    );
    const { salario: _salario, ...semSalario } = perfil;
    armazem.gravarPerfil({
      ...semSalario,
      preferencias: { ...perfil.preferencias, modelos: ["remoto"] },
    });
    const texto = readFileSync(caminhos.perfil, "utf8");
    expect(texto).toMatch(/^# meu perfil/);
    expect(texto).toContain("# como soube\ncomoSoube: Indicação");
    expect(texto).toContain("modelos: [ remoto ]");
    expect(texto).not.toMatch(/^salario:/m);
    expect(Object.keys(armazem.lerPerfilBruto().dados as object).slice(0, 2)).toEqual([
      "documentos",
      "endereco",
    ]);
    expect(armazem.lerPerfil().salario).toBeUndefined();

    writeFileSync(caminhos.perfil, "a: [");
    expect(() => armazem.lerPerfilBruto()).toThrow(/não é um YAML válido/);
  });

  it("cria banco e gaps quando os arquivos não existem", () => {
    const { armazem } = ambiente();
    armazem.negarGap("rust");
    expect(armazem.lerGapsNegados()).toEqual(["rust"]);
    armazem.gravarBanco([]);
    expect(armazem.lerBanco()).toEqual([]);
  });
});

describe("ArmazemArtefatosFs", () => {
  const { caminhos } = ambiente();
  const artefatos = new ArmazemArtefatosFs(caminhos, () => "Ana Exemplo da Silva");
  const id = 42 as IdVaga;

  it("resolve caminhos na pasta da vaga com nomes de PDF do candidato", () => {
    expect(artefatos.caminho(id, "pdf-curriculo")).toMatch(
      /dados[\\/]vagas[\\/]00042[\\/]Ana-Silva-Curriculo.pdf$/,
    );
    expect(artefatos.caminho(id, "pdf-carta")).toMatch(/Ana-Silva-Carta.pdf$/);
    expect(artefatos.caminhoMaster("pdf")).toMatch(/dados[\\/]master[\\/]Ana-Silva-Curriculo.pdf$/);
    expect(artefatos.pastaLlm(id)).toMatch(/00042[\\/]llm$/);
  });

  it("inclui a empresa da vaga no nome dos PDFs da vaga, mas não no do master", () => {
    const comEmpresa = new ArmazemArtefatosFs(
      caminhos,
      () => "Ana Exemplo da Silva",
      () => "Fintech Aurora",
    );
    expect(comEmpresa.caminho(id, "pdf-curriculo")).toMatch(
      /00042[\\/]Ana-Silva-Curriculo-Fintech-Aurora\.pdf$/,
    );
    expect(comEmpresa.caminho(id, "pdf-carta")).toMatch(/Ana-Silva-Carta-Fintech-Aurora\.pdf$/);
    expect(comEmpresa.caminhoMaster("pdf")).toMatch(/master[\\/]Ana-Silva-Curriculo\.pdf$/);
  });

  it("grava e lê JSON e texto de forma atômica, validando ao ler", () => {
    expect(artefatos.existe(id, "vaga.json")).toBe(false);
    expect(artefatos.lerJson(id, "vaga.json", z.object({}))).toBeNull();
    artefatos.gravarJson(id, "vaga.json", { empresa: "Acme" });
    expect(artefatos.lerJson(id, "vaga.json", z.object({ empresa: z.string() }))).toEqual({
      empresa: "Acme",
    });
    expect(() => artefatos.lerJson(id, "vaga.json", z.object({ cargo: z.string() }))).toThrow(
      ErroInfra,
    );
    artefatos.gravarTexto(id, "descricao.md", "# Vaga");
    expect(artefatos.lerTexto(id, "descricao.md")).toBe("# Vaga");
    expect(readdirSync(join(caminhos.vagasDir, "00042")).sort()).toEqual([
      "descricao.md",
      "vaga.json",
    ]);
  });

  it("mantém o texto do master genérico e sua data", () => {
    expect(artefatos.masterGeradoEm()).toBeNull();
    expect(artefatos.lerTextoMaster()).toBeNull();
    artefatos.gravarTextoMaster("texto");
    expect(artefatos.lerTextoMaster()).toBe("texto");
    expect(artefatos.masterGeradoEm()).toMatch(/^\d{4}-/);
  });
});

describe("RegistroFalhasFs", () => {
  const base = {
    conector: "greenhouse",
    versaoConector: "1.0.0",
    motor: "greenhouse",
    dominio: "job-boards.greenhouse.io",
    url: "https://job-boards.greenhouse.io/acme/jobs/1",
    idVaga: 7,
    data: "2026-10-10T10:00:00-03:00",
    passo: "preencher:perguntas",
    seletor: "#q1",
    erro: "TimeoutError",
    stack: null,
    resultadoAgente: null,
    passosAgente: [],
    resolvida: false,
  };

  it("grava JSON e snapshot por ocorrência, sem sobrescrever, e atualiza", () => {
    const pasta = mkdtempSync(join(tmpdir(), "camaleao-falhas-"));
    const registro = new RegistroFalhasFs(pasta);
    const id1 = registro.registrar({ ...base, tipo: "falha_conector" }, "<html></html>");
    const id2 = registro.registrar({ ...base, tipo: "falha_conector" }, "<html></html>");
    const id3 = registro.registrar(
      {
        ...base,
        tipo: "sem_conector",
        conector: null,
        versaoConector: null,
        motor: "dominio:vagas.b3.com.br",
      },
      "<p/>",
    );
    expect([id1, id2, id3]).toEqual([
      "greenhouse/2026-10-10-7",
      "greenhouse/2026-10-10-7-2",
      "_sem-conector/vagas.b3.com.br/2026-10-10-7",
    ]);
    expect(readFileSync(join(pasta, "greenhouse", "2026-10-10-7.html"), "utf8")).toBe(
      "<html></html>",
    );
    registro.atualizar(id1, { resultadoAgente: "PRONTO_PARA_REVISAO", passosAgente: ["abriu"] });
    const abertas = registro.listarAbertas();
    expect(abertas).toHaveLength(3);
    expect(
      abertas.find((r) => r.snapshot === "2026-10-10-7.html" && r.tipo === "falha_conector")
        ?.resultadoAgente,
    ).toBe("PRONTO_PARA_REVISAO");
  });

  it("ignora resolvidas e pastas inexistentes", () => {
    const pasta = mkdtempSync(join(tmpdir(), "camaleao-falhas-"));
    expect(new RegistroFalhasFs(join(pasta, "nada")).listarAbertas()).toEqual([]);
    const registro = new RegistroFalhasFs(pasta);
    const id = registro.registrar({ ...base, tipo: "falha_conector" }, "<html/>");
    const arquivo = join(pasta, `${id}.json`);
    writeFileSync(
      arquivo,
      readFileSync(arquivo, "utf8").replace('"resolvida": false', '"resolvida": true'),
    );
    expect(registro.listarAbertas()).toEqual([]);
  });
});

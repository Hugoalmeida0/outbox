import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CofreCredenciaisJson, gerarSenha } from "#infra/credenciais/cofre-credenciais-json.ts";
import { ServicoSegredos } from "#infra/credenciais/servico-segredos.ts";
import { LeitorHeadless } from "#infra/navegador/leitor-headless.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { servirFixtures } from "#testes/apoio/fixtures.ts";
import { RegistradorMemoria, RelogioFixo } from "#testes/apoio/fakes/basicos.ts";
import { ArmazemArtefatosMemoria, ArmazemCurriculoMemoria } from "#testes/apoio/fakes/armazens.ts";
import { umaResposta } from "#testes/apoio/builders.ts";
import { aquecerNavegador } from "#testes/apoio/harness-conector.ts";

describe("gerarSenha e CofreCredenciaisJson", () => {
  it("gera senha de 20 caracteres com as quatro classes", () => {
    for (let i = 0; i < 20; i++) {
      const senha = gerarSenha();
      expect(senha).toHaveLength(20);
      expect(senha).toMatch(/[A-Z]/);
      expect(senha).toMatch(/[a-z]/);
      expect(senha).toMatch(/\d/);
      expect(senha).toMatch(/[!@#$%&*?]/);
    }
    expect(gerarSenha(() => 0)).toBe(gerarSenha(() => 0));
  });

  it("cria uma senha por tenant, reutiliza depois e ignora caixa", () => {
    const caminho = join(mkdtempSync(join(tmpdir(), "outbox-cofre-")), "credenciais.json");
    const cofre = new CofreCredenciaisJson(
      caminho,
      () => "ana.exemplo@example.com",
      new RelogioFixo(),
    );
    const primeira = cofre.obterOuCriar("Acme.wd5.MyWorkdayJobs.com");
    expect(primeira).toMatchObject({ email: "ana.exemplo@example.com", recemCriada: true });
    expect(cofre.obterOuCriar("acme.wd5.myworkdayjobs.com")).toEqual({
      ...primeira,
      recemCriada: false,
    });
    expect(cofre.obterOuCriar("outra.myworkdayjobs.com").senha).not.toBe(primeira.senha);
    expect(Object.keys(JSON.parse(readFileSync(caminho, "utf8")) as object)).toEqual([
      "acme.wd5.myworkdayjobs.com",
      "outra.myworkdayjobs.com",
    ]);
  });
});

describe("ServicoSegredos", () => {
  const formulario = `<html><body>
    <input id="senha" type="password"><input id="cpf"><input id="nasc"><input id="nasc2" type="date">
    <select id="salario"><option value="">Selecione</option><option>Até 10 mil</option><option>De 10 a 20 mil</option></select>
  </body></html>`;
  const leitor = new LeitorHeadless({
    interceptar: servirFixtures([
      ["https://acme.wd5.myworkdayjobs.com/", { html: formulario }],
      ["https://malicioso.exemplo.com/", { html: formulario }],
    ]),
  });
  beforeAll(() => aquecerNavegador(leitor));
  afterAll(() => leitor.fechar());

  const caminhoCofre = join(mkdtempSync(join(tmpdir(), "outbox-cofre-")), "credenciais.json");
  const cofre = new CofreCredenciaisJson(
    caminhoCofre,
    () => "ana.exemplo@example.com",
    new RelogioFixo(),
  );
  const artefatos = new ArmazemArtefatosMemoria();
  artefatos.gravarJson(7, "respostas.json", [
    umaResposta({
      rotulo: "Pretensão",
      categoria: "salario",
      valor: "De 10 a 20 mil",
      sensivel: true,
      fonte: "codigo",
      chaveProtegida: "p1",
    }),
  ]);
  const registrador = new RegistradorMemoria();

  async function servico(url: string) {
    const pagina = await (await leitor.novoContexto()).newPage();
    await pagina.goto(url);
    return {
      pagina,
      servico: new ServicoSegredos({
        obterPagina: () => Promise.resolve(pagina),
        cofre,
        curriculo: new ArmazemCurriculoMemoria(),
        artefatos,
        hostsPermitidos: ["*.myworkdayjobs.com"],
        vagaId: 7 as IdVaga,
        registrador,
      }),
    };
  }

  it("preenche a senha do tenant sem devolver o valor e informa se é nova", async () => {
    const { pagina, servico: s } = await servico("https://acme.wd5.myworkdayjobs.com/login");
    const resultado = await s.preencherSenha("#senha");
    expect(resultado).toEqual({ ok: true, senhaRecemCriada: true });
    const senha = cofre.obterOuCriar("acme.wd5.myworkdayjobs.com").senha;
    expect(await pagina.locator("#senha").inputValue()).toBe(senha);
    expect(JSON.stringify(resultado)).not.toContain(senha);
    expect(await s.preencherSenha("#senha")).toEqual({ ok: true, senhaRecemCriada: false });
    expect(s.emailCadastro()).toEqual({ email: "ana.exemplo@example.com" });
  });

  it("preenche documentos nos formatos pedidos e respostas protegidas", async () => {
    const { pagina, servico: s } = await servico("https://acme.wd5.myworkdayjobs.com/form");
    expect(await s.preencherDadoSensivel("cpf", "#cpf")).toEqual({ ok: true });
    expect(await s.preencherDadoSensivel("dataNascimento", "#nasc", "ddmmaaaa")).toEqual({
      ok: true,
    });
    expect(await s.preencherDadoSensivel("dataNascimento", "#nasc2", "aaaa-mm-dd")).toEqual({
      ok: true,
    });
    expect(await s.preencherRespostaProtegida("p1", "#salario")).toEqual({ ok: true });
    expect(await pagina.locator("#cpf").inputValue()).toBe("123.456.789-09");
    expect(await pagina.locator("#nasc").inputValue()).toBe("15061995");
    expect(await pagina.locator("#nasc2").inputValue()).toBe("1995-06-15");
    expect(await pagina.locator("#salario option:checked").textContent()).toBe("De 10 a 20 mil");
    expect(await s.preencherRespostaProtegida("p9", "#salario")).toEqual({
      ok: false,
      erro: "resposta protegida não encontrada",
    });
    expect(await s.preencherDadoSensivel("cpf", "#inexistente")).toEqual({
      ok: false,
      erro: "não foi possível preencher o campo",
    });
  });

  it("recusa qualquer ferramenta fora da allowlist de hosts", async () => {
    const { pagina, servico: s } = await servico("https://malicioso.exemplo.com/");
    expect(await s.preencherSenha("#senha")).toEqual({ ok: false, erro: "host não permitido" });
    expect(await s.preencherDadoSensivel("cpf", "#cpf")).toEqual({
      ok: false,
      erro: "host não permitido",
    });
    expect(await s.preencherRespostaProtegida("p1", "#salario")).toEqual({
      ok: false,
      erro: "host não permitido",
    });
    expect(await pagina.locator("#cpf").inputValue()).toBe("");
  });

  it("não registra segredos em log", () => {
    const log = JSON.stringify(registrador.entradas);
    expect(log).not.toContain("123.456.789-09");
    expect(log).not.toContain(cofre.obterOuCriar("acme.wd5.myworkdayjobs.com").senha);
    expect(log).toContain("host não permitido");
  });

  it("sem página aberta, devolve erro", async () => {
    const s = new ServicoSegredos({
      obterPagina: () => Promise.resolve(null),
      cofre,
      curriculo: new ArmazemCurriculoMemoria(),
      artefatos,
      hostsPermitidos: [],
      vagaId: null,
      registrador,
    });
    expect(await s.preencherSenha("#x")).toEqual({ ok: false, erro: "nenhuma página aberta" });
  });
});

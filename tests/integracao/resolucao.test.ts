import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { z } from "zod";
import { LeitorHeadless } from "#infra/navegador/leitor-headless.ts";
import {
  eloAgregadores,
  eloDetectarAts,
  eloDireto,
  eloGithub,
  eloPortalGupy,
  ResolvedorEncadeado,
} from "#infra/resolucao/resolvedor-encadeado.ts";
import { destinoDeRedirecionamento } from "#infra/resolucao/agregadores.ts";
import { detectarAtsNoHtml } from "#infra/resolucao/detectar-ats.ts";
import { extrairJsonLd } from "#infra/extracao/json-ld.ts";
import { htmlParaTexto } from "#infra/extracao/html-texto.ts";
import { ExtratorEstrutural } from "#infra/extracao/extrator-estrutural.ts";
import type { ClienteHttp } from "#infra/sistema/cliente-http.ts";
import { canonizar } from "#dominio/vagas/motores.ts";
import {
  ErroAgregadorExigeLogin,
  ErroExtracao,
  ErroHttp,
  ErroResolucao,
  ErroVagaIndisponivel,
} from "#aplicacao/portas/erros.ts";
import { lerFixture, servirFixtures, type MapaFixtures } from "#testes/apoio/fixtures.ts";
import { CatalogoConectoresFake, ConectorFake } from "#testes/apoio/fakes/formularios.ts";
import { RegistradorMemoria } from "#testes/apoio/fakes/basicos.ts";
import { aquecerNavegador } from "#testes/apoio/harness-conector.ts";

const UUID = "0f8e4c7a-1111-2222-3333-444455556666";
const MAPA: MapaFixtures = [
  ["https://carreiras.inter.co/", { arquivo: "resolucao/carreira-gh-jid.html" }],
  ["https://acme.com/vaga-lever", { arquivo: "resolucao/carreira-lever.html" }],
  ["https://portal.acme.com/", { arquivo: "resolucao/carreira-sem-ats.html" }],
  ["https://acme.com/workday", { arquivo: "resolucao/carreira-workday-listagem.html" }],
  ["https://www.linkedin.com/jobs/view/1", { arquivo: "resolucao/linkedin-externo.html" }],
  ["https://www.linkedin.com/jobs/view/2", { arquivo: "resolucao/linkedin-clique.html" }],
  ["https://www.linkedin.com/jobs/view/3", { arquivo: "resolucao/linkedin-easy.html" }],
  ["https://www.linkedin.com/jobs/view/4", { arquivo: "resolucao/linkedin-login.html" }],
  ["https://portal.gupy.io/", { arquivo: "resolucao/portal-gupy.html" }],
  ["https://jobs.ashbyhq.com/", { html: "<html><body>Ashby</body></html>" }],
  ["https://vagas.exemplo.com/jsonld", { arquivo: "resolucao/vaga-jsonld.html" }],
  ["https://vagas.exemplo.com/sem", { arquivo: "resolucao/vaga-sem-jsonld.html" }],
];

const leitor = new LeitorHeadless({ interceptar: servirFixtures(MAPA) });
beforeAll(() => aquecerNavegador(leitor));
afterAll(() => leitor.fechar());

const abrirPagina = async () => (await leitor.novoContexto()).newPage();
const resolvedor = new ResolvedorEncadeado([
  eloDireto,
  eloAgregadores(abrirPagina),
  eloGithub,
  eloPortalGupy(leitor),
  eloDetectarAts(leitor),
]);
const sinal = new AbortController().signal;

async function resolver(url: string) {
  const { canonica, motor } = canonizar(url);
  return resolvedor.resolver(canonica, motor, sinal);
}

describe("ResolvedorEncadeado", () => {
  it("motor da v1 resolve direto para o conector", async () => {
    expect(await resolver(`https://jobs.lever.co/acme/${UUID}/apply`)).toEqual({
      motor: "lever",
      urlResolvida: `https://jobs.lever.co/acme/${UUID}`,
      canonica: `https://jobs.lever.co/acme/${UUID}`,
      rota: "conector",
    });
  });

  it("página de carreira com Greenhouse embutido vira canônica do Greenhouse", async () => {
    expect(await resolver("https://carreiras.inter.co/vagas?gh_jid=12345")).toMatchObject({
      motor: "greenhouse",
      canonica: "https://job-boards.greenhouse.io/inter/jobs/12345",
      rota: "conector",
    });
  });

  it("página com uma única vaga de ATS é resolvida para ela", async () => {
    expect(await resolver("https://acme.com/vaga-lever")).toMatchObject({
      motor: "lever",
      rota: "conector",
    });
  });

  it("domínio sem ATS e listagem de ATS sem conector ficam com o agente", async () => {
    expect(await resolver("https://portal.acme.com/vaga/9")).toMatchObject({
      motor: "dominio:portal.acme.com",
      rota: "agente",
    });
    expect(await resolver("https://acme.com/workday")).toMatchObject({
      motor: "workday",
      rota: "agente",
    });
  });

  it("LinkedIn com link externo segue o redirecionamento até o ATS", async () => {
    expect(await resolver("https://www.linkedin.com/jobs/view/1/")).toMatchObject({
      motor: "lever",
      canonica: `https://jobs.lever.co/acme/${UUID}`,
      rota: "conector",
    });
  });

  it("LinkedIn com botão que abre nova aba captura a URL de destino", async () => {
    expect(await resolver("https://www.linkedin.com/jobs/view/2")).toMatchObject({
      motor: "ashby",
      rota: "conector",
    });
  });

  it("Easy Apply vira manual e página com login exige login", async () => {
    expect(await resolver("https://www.linkedin.com/jobs/view/3")).toMatchObject({
      rota: "manual",
      manual: { motivo: "easy_apply" },
    });
    await expect(resolver("https://www.linkedin.com/jobs/view/4")).rejects.toBeInstanceOf(
      ErroAgregadorExigeLogin,
    );
  });

  it("portal.gupy.io leva à vaga da empresa", async () => {
    expect(await resolver("https://portal.gupy.io/job/abc")).toMatchObject({
      motor: "gupy",
      canonica: "https://empresa.gupy.io/jobs/1234567",
    });
  });

  it("issue do GitHub fica para a análise decidir", async () => {
    expect(await resolver("https://github.com/backend-br/vagas/issues/9")).toMatchObject({
      motor: "github",
      rota: "a_definir",
    });
  });

  it("falha de leitura vira ErroResolucao e não há elo para cadeia vazia", async () => {
    await expect(resolver("https://desconhecido.exemplo.com/x")).rejects.toBeInstanceOf(
      ErroResolucao,
    );
    const vazio = new ResolvedorEncadeado([]);
    const { canonica, motor } = canonizar("https://x.com/a");
    await expect(vazio.resolver(canonica, motor, sinal)).rejects.toThrow(/nenhum resolvedor/);
  });
});

describe("detectarAtsNoHtml e redirecionamentos", () => {
  it("ignora agregadores e devolve só o motor quando há várias vagas", () => {
    expect(
      detectarAtsNoHtml(
        lerFixture("resolucao/carreira-workday-listagem.html"),
        "https://acme.com/",
      ),
    ).toEqual({
      motor: "workday",
    });
    expect(
      detectarAtsNoHtml(
        "<a href='https://www.linkedin.com/jobs/view/1'>x</a>",
        "https://acme.com/",
      ),
    ).toBeNull();
  });

  it("extrai o destino de links de redirecionamento", () => {
    expect(
      destinoDeRedirecionamento(
        "https://www.linkedin.com/redir?url=https%3A%2F%2Facme.gupy.io%2Fjobs%2F1",
        "https://www.linkedin.com/",
      ),
    ).toBe("https://acme.gupy.io/jobs/1");
    expect(destinoDeRedirecionamento("/jobs/view/2", "https://www.linkedin.com/")).toBeNull();
    expect(destinoDeRedirecionamento("https://jobs.lever.co/a", "https://www.linkedin.com/")).toBe(
      "https://jobs.lever.co/a",
    );
  });
});

describe("extração", () => {
  it("lê JSON-LD JobPosting dentro de @graph, convertendo a descrição em texto", () => {
    expect(extrairJsonLd(lerFixture("resolucao/vaga-jsonld.html"))).toEqual({
      empresa: "Acme Pagamentos",
      cargo: "Desenvolvedora Back-end Sênior",
      descricao: "Buscamos pessoa com Node.js & TypeScript.\n- Kafka\n- AWS",
      localidade: "São Paulo, SP, Brasil",
      publicadaEm: "2026-09-28",
      regimeTexto: "FULL_TIME, CONTRACTOR",
    });
    expect(extrairJsonLd("<html></html>")).toBeNull();
    expect(extrairJsonLd('<script type="application/ld+json">{quebrado</script>')).toBeNull();
    expect(
      extrairJsonLd(
        '<script type="application/ld+json">{"@type":"JobPosting","title":"x"}</script>',
      ),
    ).toBeNull();
  });

  it("converte HTML em texto com quebras e entidades", () => {
    expect(
      htmlParaTexto(
        "<p>Olá&nbsp;mundo &#8211; &#x41;</p><script>x()</script><ul><li>a</li><li>b</li></ul>",
      ),
    ).toBe("Olá mundo – A\n- a\n- b");
  });

  const httpFalso = (issue: unknown): ClienteHttp => ({
    obterJson: <T>(_url: string, schema: z.ZodType<T>) => Promise.resolve(schema.parse(issue)),
    obterTexto: () => Promise.reject(new Error("não usado")),
  });

  it("usa a API do conector, depois o JSON-LD, e sempre devolve o texto da página", async () => {
    const conector = new ConectorFake("greenhouse");
    conector.vagaExtraida = { empresa: "Via API", cargo: "Dev", descricao: "Descrição da API" };
    const extrator = new ExtratorEstrutural({
      catalogo: new CatalogoConectoresFake(conector),
      leitor,
      http: httpFalso({}),
      registrador: new RegistradorMemoria(),
    });
    expect(
      await extrator.extrair("https://job-boards.greenhouse.io/x/jobs/1", "greenhouse", sinal),
    ).toEqual({
      estruturada: { empresa: "Via API", cargo: "Dev", descricao: "Descrição da API" },
      textoPagina: "Descrição da API",
    });
    const viaJsonLd = await extrator.extrair(
      "https://vagas.exemplo.com/jsonld",
      "dominio:vagas.exemplo.com",
      sinal,
    );
    expect(viaJsonLd.estruturada?.empresa).toBe("Acme Pagamentos");
    expect(viaJsonLd.textoPagina).toContain("Texto visível da vaga.");
    const semEstrutura = await extrator.extrair(
      "https://vagas.exemplo.com/sem",
      "dominio:vagas.exemplo.com",
      sinal,
    );
    expect(semEstrutura).toEqual({
      estruturada: null,
      textoPagina: expect.stringContaining("Cypress"),
    });
    await expect(
      extrator.extrair("https://nada.exemplo.com/", "dominio:nada.exemplo.com", sinal),
    ).rejects.toBeInstanceOf(ErroExtracao);
  });

  it("cai para a página quando a API do conector falha e lê issues do GitHub pela API", async () => {
    const conector = new ConectorFake("lever");
    conector.extrairVaga = () => Promise.reject(new Error("API fora"));
    const registrador = new RegistradorMemoria();
    const extrator = new ExtratorEstrutural({
      catalogo: new CatalogoConectoresFake(conector),
      leitor,
      http: httpFalso({ title: "[Remoto] Dev Node", body: "Envie e-mail para vagas@acme.com" }),
      registrador,
    });
    const r = await extrator.extrair("https://vagas.exemplo.com/jsonld", "lever", sinal);
    expect(r.estruturada?.cargo).toBe("Desenvolvedora Back-end Sênior");
    expect(registrador.entradas[0]?.nivel).toBe("avisar");
    expect(
      await extrator.extrair("https://github.com/backend-br/vagas/issues/9", "github", sinal),
    ).toEqual({
      estruturada: null,
      textoPagina: "[Remoto] Dev Node\n\nEnvie e-mail para vagas@acme.com",
    });
    await expect(extrator.extrair("https://github.com/x", "github", sinal)).rejects.toBeInstanceOf(
      ErroExtracao,
    );
  });

  it("404 da API do conector é vaga encerrada: não cai para a página", async () => {
    const conector = new ConectorFake("lever");
    conector.extrairVaga = () => Promise.reject(new ErroHttp("HTTP 404 em api.lever.co", 404));
    const registrador = new RegistradorMemoria();
    const extrator = new ExtratorEstrutural({
      catalogo: new CatalogoConectoresFake(conector),
      leitor,
      http: httpFalso({}),
      registrador,
    });
    await expect(
      extrator.extrair("https://vagas.exemplo.com/jsonld", "lever", sinal),
    ).rejects.toBeInstanceOf(ErroVagaIndisponivel);
    expect(registrador.entradas).toEqual([]);
  });
});

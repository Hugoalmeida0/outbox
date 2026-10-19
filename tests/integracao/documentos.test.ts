import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LeitorHeadless } from "#infra/navegador/leitor-headless.ts";
import {
  contarPaginas,
  RenderizadorPdfPlaywright,
} from "#infra/documentos/renderizador-pdf-playwright.ts";
import { escaparHtml, htmlCurriculo } from "#infra/documentos/template-html.ts";
import { detectarBloqueio } from "#infra/navegador/bloqueios.ts";
import { montarCarta, montarDocumento } from "#dominio/curriculo/documento.ts";
import { umCurriculoGerado, umMaster } from "#testes/apoio/builders.ts";
import { lerPdf } from "#testes/apoio/pdf.ts";
import { aquecerNavegador } from "#testes/apoio/harness-conector.ts";

const leitor = new LeitorHeadless({ interceptar: (rota) => rota.abort() });
const renderizador = new RenderizadorPdfPlaywright(leitor);
const pasta = mkdtempSync(join(tmpdir(), "outbox-pdf-"));
const sinal = new AbortController().signal;

beforeAll(() => aquecerNavegador(leitor));
afterAll(async () => {
  await leitor.fechar();
});

describe("RenderizadorPdfPlaywright", () => {
  it("gera PDF A4 de coluna única com texto extraível e títulos no idioma", async () => {
    const master = umMaster();
    const destino = join(pasta, "Ana-Silva-Curriculo.pdf");
    const { paginas } = await renderizador.renderizarCurriculo(
      montarDocumento(master, null, "pt"),
      destino,
      sinal,
    );
    const pdf = await lerPdf(destino);
    expect(paginas).toBe(pdf.paginas);
    expect(pdf.paginas).toBe(1);
    expect(Math.round(pdf.largura)).toBe(595);
    expect(Math.round(pdf.altura)).toBe(842);
    expect(pdf.texto).toContain("Ana Exemplo da Silva");
    expect(pdf.texto).toContain("EXPERIÊNCIA");
    for (const exp of master.experiencias) {
      for (const b of exp.bullets) expect(pdf.texto).toContain(b.texto.slice(0, 40));
    }
  });

  it("renderiza o camaleão em inglês", async () => {
    const destino = join(pasta, "en.pdf");
    const gerado = umCurriculoGerado({
      idioma: "en",
      titulo: "Full Stack Developer",
      resumo: "Developer focused on TypeScript.",
    });
    await renderizador.renderizarCurriculo(
      montarDocumento(umMaster(), gerado, "en"),
      destino,
      sinal,
    );
    const pdf = await lerPdf(destino);
    expect(pdf.texto).toContain("SUMMARY");
    expect(pdf.texto).toContain("Full Stack Developer");
  });

  it("escapa HTML e não executa script nem acessa rede", async () => {
    const master = umMaster({
      resumo:
        '<script>document.body.innerHTML="hackeado"</script><img src="http://exemplo.com/x.png">',
    });
    const destino = join(pasta, "escape.pdf");
    await renderizador.renderizarCurriculo(montarDocumento(master, null, "pt"), destino, sinal);
    const pdf = await lerPdf(destino);
    expect(pdf.texto).toContain("<script>");
    expect(pdf.texto).toContain("Ana Exemplo da Silva");
    expect(pdf.texto).not.toContain("hackeado Ana");
    expect(htmlCurriculo(montarDocumento(master, null, "pt"))).not.toContain("<script>document");
  });

  it("renderiza a carta e respeita o cancelamento", async () => {
    const destino = join(pasta, "carta.pdf");
    await renderizador.renderizarCarta(
      montarCarta({ ...umMaster().pessoal }, "Olá.\n\nQuero a vaga.", "pt"),
      destino,
      sinal,
    );
    expect((await lerPdf(destino)).texto).toContain("Quero a vaga.");
    const abortado = new AbortController();
    abortado.abort();
    await expect(
      renderizador.renderizarCarta(
        montarCarta({ ...umMaster().pessoal }, "x", "pt"),
        destino,
        abortado.signal,
      ),
    ).rejects.toThrow();
  });

  it("conta páginas e escapa os 5 caracteres especiais", () => {
    expect(contarPaginas(Buffer.from("/Type /Pages /Type /Page /Type/Page"))).toBe(2);
    expect(escaparHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });
});

describe("detectarBloqueio e LeitorHeadless", () => {
  it("detecta CAPTCHA visível, verificação de e-mail e nada", async () => {
    await leitor.comPagina(async (pagina) => {
      await pagina.setContent(
        '<iframe src="https://www.google.com/recaptcha/api2/anchor" width="300" height="80"></iframe>',
      );
      expect(await detectarBloqueio(pagina)).toBe("captcha");
      // Desafio do reCAPTCHA invisível que apareceu de fato: o iframe `bframe` ficou visível.
      await pagina.setContent(
        '<iframe src="https://www.google.com/recaptcha/api2/bframe?k=x" width="400" height="580"></iframe>',
      );
      expect(await detectarBloqueio(pagina)).toBe("captcha");
      await pagina.setContent(
        '<iframe src="https://www.google.com/recaptcha/api2/anchor" style="display:none"></iframe><p>ok</p>',
      );
      expect(await detectarBloqueio(pagina)).toBeNull();
      await pagina.setContent("<p>Enviamos um código de verificação para o seu e-mail</p>");
      expect(await detectarBloqueio(pagina)).toBe("verificacao_email");
    });
  });

  it("ignora o selo do reCAPTCHA invisível, o desafio ainda escondido e o hCaptcha invisível", async () => {
    await leitor.comPagina(async (pagina) => {
      // Marcação do Greenhouse real: selo fixo no canto e iframe de desafio fora da tela, escondido.
      await pagina.setContent(
        '<div class="grecaptcha-badge" style="width:256px;height:60px;position:fixed;bottom:14px;right:-186px">' +
          '<iframe title="reCAPTCHA" width="256" height="60" src="https://www.recaptcha.net/recaptcha/enterprise/anchor?ar=1&amp;k=x&amp;size=invisible&amp;cb=y"></iframe></div>' +
          '<div style="visibility:hidden;position:absolute;top:-10000px">' +
          '<iframe src="https://www.recaptcha.net/recaptcha/enterprise/bframe?k=x" width="400" height="580"></iframe></div>' +
          '<iframe src="https://newassets.hcaptcha.com/captcha/v1/x/static/hcaptcha.html#frame=checkbox-invisible" width="300" height="80"></iframe>' +
          "<button>Submit application</button>",
      );
      expect(await detectarBloqueio(pagina)).toBeNull();
    });
  });

  it("lê página interceptada devolvendo URL final, HTML e texto", async () => {
    const leitorFixture = new LeitorHeadless({
      interceptar: (rota) =>
        rota.request().url().startsWith("https://vagas.exemplo.com/")
          ? rota.fulfill({
              contentType: "text/html",
              body: "<html><body><h1>Vaga X</h1></body></html>",
            })
          : rota.abort(),
    });
    try {
      const lida = await leitorFixture.ler("https://vagas.exemplo.com/1", undefined, 5000);
      expect(lida.urlFinal).toBe("https://vagas.exemplo.com/1");
      expect(lida.texto).toContain("Vaga X");
      expect(lida.html).toContain("<h1>Vaga X</h1>");
      await expect(
        leitorFixture.ler("https://bloqueado.exemplo.com/", undefined, 3000),
      ).rejects.toThrow(/não foi possível ler/);
    } finally {
      await leitorFixture.fechar();
    }
  });
});

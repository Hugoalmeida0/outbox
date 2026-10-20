// Currículo ATS de 1 página: valida o PDF real (Chromium) contra a especificação, e não só o documento.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  TAMANHO_BASE_MINIMO,
  montarDocumento,
  type DocumentoCurriculo,
} from "#dominio/curriculo/documento.ts";
import { encaixarEmUmaPagina, todasAsSkills } from "#dominio/curriculo/encaixe.ts";
import { esquemaMaster, type IdiomaCurriculo, type Master } from "#dominio/curriculo/master.ts";
import { aplicarNuncaListar } from "#dominio/curriculo/nunca-listar.ts";
import { numerosDe } from "#dominio/curriculo/numeros.ts";
import { RenderizadorPdfPlaywright } from "#infra/documentos/renderizador-pdf-playwright.ts";
import { LeitorHeadless } from "#infra/navegador/leitor-headless.ts";
import { umCurriculoGerado, umMaster } from "#testes/apoio/builders.ts";
import { aquecerNavegador } from "#testes/apoio/harness-conector.ts";
import { contarFontes, inspecionarPdf, pngDaPagina } from "#testes/apoio/pdf.ts";

const leitor = new LeitorHeadless({ interceptar: (rota) => rota.abort() });
const renderizador = new RenderizadorPdfPlaywright(leitor);
const pasta = mkdtempSync(join(tmpdir(), "camaleao-ats-"));
const sinal = new AbortController().signal;

beforeAll(() => aquecerNavegador(leitor));
afterAll(async () => {
  await leitor.fechar();
});

const masterExemplo: Master = esquemaMaster.parse(
  parse(readFileSync(new URL("../../curriculo.exemplo/master.yaml", import.meta.url), "utf8")),
);

/** Master com muito conteúdo, para o encaixe precisar reduzir a fonte e cortar. */
function masterDenso(): Master {
  const base = umMaster();
  const experiencias = Array.from({ length: 8 }, (_, e) => ({
    id: `exp-${String(e)}`,
    empresa: `Empresa ${String.fromCharCode(65 + e)}`,
    cargo: "Desenvolvedora",
    inicio: `${String(2024 - 2 * e)}-01`,
    fim: e === 0 ? null : `${String(2025 - 2 * e)}-12`,
    local: "Remoto",
    bullets: Array.from({ length: 6 }, (_, b) => ({
      id: `exp-${String(e)}-b${String(b)}`,
      texto:
        `Construí e mantive serviços de integração entre sistemas legados e novas APIs, ` +
        `com testes automatizados e monitoramento contínuo na empresa ${String(e)}, parte ${String(b)}.`,
      skills: ["typescript"],
    })),
  }));
  const certificacoes = Array.from({ length: 6 }, (_, c) => ({
    id: `cert-${String(c)}`,
    nome: `Certificação ${String(c)}`,
    emissor: "Emissor",
    ano: 2020 + c,
  }));
  return { ...base, experiencias, certificacoes };
}

interface PdfGerado {
  readonly caminho: string;
  readonly documento: DocumentoCurriculo;
  readonly paginas: number;
  readonly tamanhoBase: number;
  readonly cortes: readonly string[];
}

let contador = 0;
async function gerar(
  master: Master,
  idioma: IdiomaCurriculo = master.idioma,
  gerado = null as ReturnType<typeof umCurriculoGerado> | null,
): Promise<PdfGerado> {
  const filtrado = aplicarNuncaListar(master);
  const caminho = join(pasta, `curriculo-${String((contador += 1))}.pdf`);
  const resultado = await encaixarEmUmaPagina(
    montarDocumento(filtrado, gerado, idioma),
    todasAsSkills(filtrado),
    (doc) => renderizador.renderizarCurriculo(doc, caminho, sinal),
  );
  return {
    caminho,
    documento: resultado.documento,
    paginas: resultado.paginas,
    tamanhoBase: resultado.tamanhoBase,
    cortes: resultado.cortes,
  };
}

const TITULOS = {
  pt: [
    "RESUMO",
    "EXPERIÊNCIA PROFISSIONAL",
    "PROJETOS",
    "FORMAÇÃO",
    "CERTIFICAÇÕES E RECONHECIMENTOS",
    "COMPETÊNCIAS TÉCNICAS",
  ],
  en: ["SUMMARY", "EXPERIENCE", "PROJECTS", "EDUCATION", "CERTIFICATIONS & AWARDS", "SKILLS"],
} as const;

/** Números do PDF que não existem no texto dos dados mestres (guarda contra número inventado). */
function numerosForaDoMaster(textoPdf: string, master: Master): string[] {
  const permitidos = new Set(numerosDe(JSON.stringify(master)));
  return numerosDe(textoPdf).filter((n) => !permitidos.has(n));
}

describe("currículo ATS: página e ordem", () => {
  it("o master de exemplo sai em exatamente 1 página A4, com texto na ordem de leitura", async () => {
    const { caminho, paginas } = await gerar(masterExemplo);
    const pdf = await inspecionarPdf(caminho);
    expect(paginas).toBe(1);
    expect(pdf.paginas).toBe(1);
    expect(Math.round(pdf.largura)).toBe(595);
    expect(Math.round(pdf.altura)).toBe(842);

    const posicoes = [
      masterExemplo.pessoal.nome,
      masterExemplo.pessoal.titulo,
      masterExemplo.pessoal.email,
      ...TITULOS.pt,
    ].map((trecho) => pdf.texto.indexOf(trecho));
    expect(
      posicoes.every((p) => p >= 0),
      `faltou algum trecho: ${posicoes.join(",")}`,
    ).toBe(true);
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
  });

  it("todos os títulos de seção aparecem em português e em inglês", async () => {
    const pt = await inspecionarPdf((await gerar(masterExemplo)).caminho);
    for (const titulo of TITULOS.pt) expect(pt.texto, titulo).toContain(titulo);

    const en = await inspecionarPdf(
      (
        await gerar(
          masterExemplo,
          "en",
          umCurriculoGerado({
            idioma: "en",
            experiencias: masterExemplo.experiencias.map((e) => ({
              id: e.id,
              bullets: [{ texto: "Built services.", origem: [e.bullets[0]!.id] }],
            })),
            projetos: [
              {
                id: "proj-gestor-financas",
                bullets: [{ texto: "Built an app.", origem: ["proj-gestor-financas-b1"] }],
              },
            ],
            skills: ["typescript"],
            formacao: ["form-usp"],
            certificacoes: ["cert-aws-cloud-practitioner"],
          }),
        )
      ).caminho,
    );
    for (const titulo of TITULOS.en) expect(en.texto, titulo).toContain(titulo);
  });

  it("não tem seção Idiomas, Objetivo nem título Currículo no corpo", async () => {
    const { texto } = await inspecionarPdf((await gerar(masterExemplo)).caminho);
    expect(texto).not.toMatch(/OBJETIVO|CURRICULUM VITAE|REFER[ÊE]NCIAS DISPON/i);
    expect(texto).not.toMatch(/(^|\s)IDIOMAS(\s|$)/);
  });

  it("um master denso é encaixado em 1 página reduzindo a fonte e cortando por prioridade", async () => {
    const denso = await gerar(masterDenso());
    const pdf = await inspecionarPdf(denso.caminho);
    expect(pdf.paginas).toBe(1);
    expect(denso.tamanhoBase).toBeLessThan(9.5);
    expect(denso.tamanhoBase).toBeGreaterThanOrEqual(TAMANHO_BASE_MINIMO);
    expect(denso.cortes.length).toBeGreaterThan(0);
  }, 120_000);
});

describe("currículo ATS: conteúdo proibido", () => {
  const PROIBIDOS: readonly [string, RegExp][] = [
    ["CPF", /\d{3}\.\d{3}\.\d{3}-\d{2}/],
    ["CEP", /\b\d{5}-\d{3}\b/],
    ["data de nascimento", /data de nascimento|date of birth/i],
    ["estado civil", /estado civil|solteir[oa]|casad[oa]/i],
    ["placeholder", /\[QUANTIFICAR\]|\bTODO\b|\bXX\b|lorem/i],
  ];

  it.each(PROIBIDOS)("o PDF não contém %s", async (_nome, regex) => {
    const { texto } = await inspecionarPdf((await gerar(masterExemplo)).caminho);
    expect(texto).not.toMatch(regex);
  });

  it("detecta um padrão proibido quando ele aparece (o teste de fato falha)", async () => {
    const sujo = umMaster({ resumo: "Meu CPF é 123.456.789-09 e sou solteira. TODO." });
    const { texto } = await inspecionarPdf((await gerar(sujo)).caminho);
    const achados = PROIBIDOS.filter(([, regex]) => regex.test(texto)).map(([nome]) => nome);
    expect(achados).toEqual(["CPF", "estado civil", "placeholder"]);
  });

  it("todo número do PDF existe nos dados mestres", async () => {
    const { texto } = await inspecionarPdf((await gerar(masterExemplo)).caminho);
    expect(numerosForaDoMaster(texto, masterExemplo)).toEqual([]);
  });

  it("detecta número que não existe nos dados mestres (o teste de fato falha)", async () => {
    const mestre = umMaster();
    const inventado = umCurriculoGerado({ resumo: "Reduzi custos em 99% ao longo de 17 anos." });
    const { texto } = await inspecionarPdf((await gerar(mestre, "pt", inventado)).caminho);
    expect(numerosForaDoMaster(texto, mestre)).toEqual(["99", "17"]);
  });

  it("termos nuncaListar não aparecem no PDF (e aparecem sem a restrição)", async () => {
    const base = umMaster();
    const comPhp = {
      ...base,
      skills: [
        ...base.skills,
        {
          id: "php",
          nome: "PHP",
          aliases: [],
          categoria: "linguagem" as const,
          origem: "master" as const,
        },
      ],
    };
    const sem = await inspecionarPdf((await gerar(comPhp)).caminho);
    expect(sem.texto).toContain("PHP");
    const com = await inspecionarPdf((await gerar({ ...comPhp, nuncaListar: ["PHP"] })).caminho);
    expect(com.texto).not.toContain("PHP");
  });
});

describe("currículo ATS: fonte, margem, imagens e metadados", () => {
  it("fonte de corpo ≥ 8,8 pt (contato = B − 0,5) e margens laterais ≥ 12 mm", async () => {
    for (const master of [masterExemplo, masterDenso()]) {
      const pdf = await inspecionarPdf((await gerar(master)).caminho);
      expect(Math.min(...pdf.tamanhosDeFonte)).toBeGreaterThanOrEqual(
        TAMANHO_BASE_MINIMO - 0.5 - 0.05,
      );
      const frequencia = new Map<number, number>();
      for (const t of pdf.tamanhosDeFonte) {
        const chave = Math.round(t * 10) / 10;
        frequencia.set(chave, (frequencia.get(chave) ?? 0) + 1);
      }
      const corpo = [...frequencia.entries()].sort((a, b) => b[1] - a[1])[0]![0];
      expect(corpo).toBeGreaterThanOrEqual(TAMANHO_BASE_MINIMO - 0.05);
      expect(pdf.margensMm.esquerda).toBeGreaterThanOrEqual(12);
      expect(pdf.margensMm.direita).toBeGreaterThanOrEqual(12);
      expect(pdf.margensMm.topo).toBeGreaterThanOrEqual(9);
      expect(pdf.margensMm.base).toBeGreaterThanOrEqual(8);
    }
  });

  it("não contém imagens", async () => {
    const pdf = await inspecionarPdf((await gerar(masterExemplo)).caminho);
    expect(pdf.operadoresDeImagem).toBe(0);
  });

  it("embute as fontes no PDF", async () => {
    const { descritores, embutidas } = contarFontes((await gerar(masterExemplo)).caminho);
    expect(descritores).toBeGreaterThan(0);
    expect(embutidas).toBeGreaterThanOrEqual(descritores);
  });

  it("define o Title do PDF como 'Nome — Currículo'", async () => {
    const pdf = await inspecionarPdf((await gerar(masterExemplo)).caminho);
    expect(pdf.titulo).toBe("Ana Exemplo da Silva — Currículo");
  });
});

describe("currículo ATS: snapshot visual", () => {
  it("renderiza a primeira página em PNG a 80 dpi para revisão", async () => {
    const { caminho } = await gerar(masterExemplo);
    const png = await pngDaPagina(caminho, 80);
    // A4 a 80 dpi: 210 x 297 mm = ~661 x 935 px; a assinatura PNG confirma o formato.
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(16)).toBeGreaterThanOrEqual(661);
    expect(png.readUInt32BE(16)).toBeLessThanOrEqual(662);
    expect(png.readUInt32BE(20)).toBeGreaterThanOrEqual(935);
    expect(png.readUInt32BE(20)).toBeLessThanOrEqual(936);
    const pastaSnapshot = new URL("../__snapshots__/", import.meta.url);
    mkdirSync(pastaSnapshot, { recursive: true });
    writeFileSync(new URL("curriculo-p1.png", pastaSnapshot), png);
  });
});

import { describe, expect, it } from "vitest";
import { umMaster } from "#testes/apoio/builders.ts";
import type {
  DocumentoCurriculo,
  ItemExperiencia,
  ItemProjeto,
  SecaoDocumento,
} from "./documento.ts";
import {
  encaixarEmUmaPagina,
  proximoCorte,
  skillsAderentes,
  todasAsSkills,
} from "./encaixe.ts";

interface OpcoesExp {
  readonly atual?: boolean;
  readonly prioridadeCorte?: number;
  readonly prioridades?: readonly (number | undefined)[];
}

/** Experiência com um bullet por entrada de `skills`; cada bullet cita as skills da sua entrada. */
function experiencia(
  empresa: string,
  inicio: string,
  skills: readonly (readonly string[])[],
  { atual = false, prioridadeCorte, prioridades = [] }: OpcoesExp = {},
): ItemExperiencia {
  return {
    cargo: "Dev",
    empresa,
    periodo: `${inicio} – x`,
    bullets: skills.map((_, i) => `${empresa} b${String(i + 1)}`),
    corte: {
      inicio,
      atual,
      ...(prioridadeCorte !== undefined ? { prioridadeCorte } : {}),
      skills: [...new Set(skills.flat())],
      bullets: skills.map((s, i) => {
        const prioridade = prioridades[i];
        return { skills: s, ...(prioridade !== undefined ? { prioridadeCorte: prioridade } : {}) };
      }),
    },
  };
}

function projeto(nome: string, bullets: number, extra: Partial<ItemProjeto> = {}): ItemProjeto {
  return {
    nome,
    bullets: Array.from({ length: bullets }, (_, i) => `${nome} b${String(i + 1)}`),
    corte: { skills: ["react"] },
    ...extra,
  };
}

function documento(secoes: readonly SecaoDocumento[]): DocumentoCurriculo {
  return {
    idioma: "pt",
    nome: "Ana",
    titulo: "Dev",
    contato: [],
    secoes,
    tamanhoBase: 9.5,
  };
}

function textoDoDocumento(doc: DocumentoCurriculo): string[] {
  return doc.secoes.flatMap((s) => {
    switch (s.tipo) {
      case "experiencia":
        return s.itens.flatMap((i) => [`exp:${i.empresa}`, ...i.bullets]);
      case "projetos":
        return s.itens.flatMap((i) => [`proj:${i.nome}`, ...i.bullets]);
      case "certificacoes":
        return s.itens.map((i) => i.texto);
      default:
        return [];
    }
  });
}

const aderentes = new Set(["ts"]);

describe("proximoCorte", () => {
  it("experiência antiga sem aderência perde os bullets e depois é removida", () => {
    const doc = documento([
      {
        tipo: "experiencia",
        titulo: "EXP",
        itens: [
          experiencia("Atual", "2022-01", [["ts"], ["ts"], ["ts"], ["ts"]], { atual: true }),
          experiencia("Antiga", "2015-01", [["php"]]),
        ],
      },
    ]);
    const primeiro = proximoCorte(doc, aderentes);
    expect(primeiro?.descricao).toBe('bullets da experiência "Antiga"');
    const segundo = proximoCorte(primeiro!.doc, aderentes);
    expect(segundo?.descricao).toBe('experiência "Antiga"');
    expect(textoDoDocumento(segundo!.doc)).not.toContain("exp:Antiga");
  });

  it("experiência com aderência é protegida (10) mas limitada a 2 bullets pela prioridade 4", () => {
    const doc = documento([
      {
        tipo: "experiencia",
        titulo: "EXP",
        itens: [experiencia("Meio", "2019-01", [["ts"], ["php"], ["ts"]])],
      },
    ]);
    const corte = proximoCorte(doc, aderentes);
    // O bullet de menor aderência (o 2º) sai primeiro.
    expect(corte?.descricao).toBe('bullet 2 da experiência "Meio"');
    const depois = proximoCorte(corte!.doc, aderentes);
    // Com 2 bullets só resta o degrau protegido (valor 10).
    expect(depois?.descricao).toBe('bullets da experiência "Meio"');
    expect(proximoCorte(doc, aderentes, 9)?.descricao).toBe('bullet 2 da experiência "Meio"');
    expect(proximoCorte(corte!.doc, aderentes, 9)).toBeNull();
  });

  it("a experiência atual nunca é removida nem fica com menos de 4 bullets", () => {
    const doc = documento([
      {
        tipo: "experiencia",
        titulo: "EXP",
        itens: [experiencia("Atual", "2022-01", [["ts"], ["a"], ["b"], ["c"], ["d"]], { atual: true })],
      },
    ]);
    const primeiro = proximoCorte(doc, aderentes);
    expect(primeiro?.descricao).toBe('bullet 5 da experiência "Atual"');
    expect(proximoCorte(primeiro!.doc, aderentes)).toBeNull();
  });

  it("prioridadeCorte explícito substitui o implícito e vence o critério automático", () => {
    const doc = documento([
      {
        tipo: "experiencia",
        titulo: "EXP",
        itens: [
          experiencia("Antiga", "2015-01", [["php"]]),
          experiencia("Protegida", "2016-01", [["php"]], { prioridadeCorte: 10 }),
          experiencia("Cara", "2017-01", [["ts"]], { prioridadeCorte: 1 }),
        ],
      },
    ]);
    // "Cara" tem aderência, mas a prioridade explícita 1 empata com a implícita de "Antiga":
    // vence a menor aderência (Antiga, 0), depois "Cara".
    const primeiro = proximoCorte(doc, aderentes);
    expect(primeiro?.descricao).toBe('bullets da experiência "Antiga"');
    const semAntiga = documento([
      {
        tipo: "experiencia",
        titulo: "EXP",
        itens: [experiencia("Protegida", "2016-01", [["php"]], { prioridadeCorte: 10 }), experiencia("Cara", "2017-01", [["ts"]], { prioridadeCorte: 1 })],
      },
    ]);
    expect(proximoCorte(semAntiga, aderentes)?.descricao).toBe('bullets da experiência "Cara"');
  });

  it("empate de valor e aderência sai pela experiência mais antiga", () => {
    const doc = documento([
      {
        tipo: "experiencia",
        titulo: "EXP",
        itens: [
          experiencia("Nova", "2018-01", [["php"]]),
          experiencia("Velha", "2012-01", [["php"]]),
        ],
      },
    ]);
    expect(proximoCorte(doc, aderentes)?.descricao).toBe('bullets da experiência "Velha"');
  });

  it("bullets de projeto além do 2º saem com valor 3, o último primeiro", () => {
    const doc = documento([
      { tipo: "projetos", titulo: "PROJ", itens: [projeto("P", 4)] },
    ]);
    const primeiro = proximoCorte(doc, aderentes);
    expect(primeiro?.descricao).toBe('bullet 4 do projeto "P"');
    const segundo = proximoCorte(primeiro!.doc, aderentes);
    expect(segundo?.descricao).toBe('bullet 3 do projeto "P"');
    expect(proximoCorte(segundo!.doc, aderentes)).toBeNull();
  });

  it("certificação só sai com prioridadeCorte explícito; a seção some quando esvazia", () => {
    const doc = documento([
      {
        tipo: "certificacoes",
        titulo: "CERT",
        itens: [{ texto: "A", prioridadeCorte: 2 }, { texto: "B" }],
      },
    ]);
    const primeiro = proximoCorte(doc, aderentes);
    expect(primeiro?.descricao).toBe('certificação "A"');
    expect(proximoCorte(primeiro!.doc, aderentes)).toBeNull();

    const unica = documento([
      { tipo: "certificacoes", titulo: "CERT", itens: [{ texto: "A", prioridadeCorte: 2 }] },
    ]);
    expect(proximoCorte(unica, aderentes)?.doc.secoes).toEqual([]);
  });

  it("ordem entre tipos: experiência sem aderência (1) < certificação com 3 < bullet de projeto (3 e 4)", () => {
    const doc = documento([
      { tipo: "projetos", titulo: "PROJ", itens: [projeto("P", 3)] },
      { tipo: "certificacoes", titulo: "CERT", itens: [{ texto: "A", prioridadeCorte: 2 }] },
      { tipo: "experiencia", titulo: "EXP", itens: [experiencia("Velha", "2010-01", [["php"]])] },
    ]);
    const descricoes: string[] = [];
    let atual: DocumentoCurriculo = doc;
    for (let proximo = proximoCorte(atual, aderentes); proximo; proximo = proximoCorte(atual, aderentes)) {
      descricoes.push(proximo.descricao);
      atual = proximo.doc;
    }
    expect(descricoes).toEqual([
      'bullets da experiência "Velha"',
      'experiência "Velha"',
      'certificação "A"',
      'bullet 3 do projeto "P"',
    ]);
  });
});

describe("encaixarEmUmaPagina", () => {
  it("reduz só a fonte, de 0,1 em 0,1, e para quando cabe", async () => {
    const doc = documento([{ tipo: "resumo", titulo: "RESUMO", texto: "x" }]);
    const tamanhos: number[] = [];
    const resultado = await encaixarEmUmaPagina(doc, aderentes, (d) => {
      tamanhos.push(d.tamanhoBase);
      return Promise.resolve({ paginas: d.tamanhoBase > 9.2 ? 2 : 1 });
    });
    expect(tamanhos).toEqual([9.5, 9.4, 9.3, 9.2]);
    expect(resultado).toMatchObject({ coube: true, paginas: 1, tamanhoBase: 9.2, cortes: [], sobrou: [] });
  });

  it("não renderiza de novo quando já cabe em B = 9,5", async () => {
    let chamadas = 0;
    const resultado = await encaixarEmUmaPagina(
      documento([{ tipo: "resumo", titulo: "RESUMO", texto: "x" }]),
      aderentes,
      () => {
        chamadas += 1;
        return Promise.resolve({ paginas: 1 });
      },
    );
    expect(chamadas).toBe(1);
    expect(resultado.tamanhoBase).toBe(9.5);
  });

  it("depois de 9,0 corta os desprotegidos antes de descer ao piso de 8,8", async () => {
    const doc = documento([
      {
        tipo: "experiencia",
        titulo: "EXP",
        itens: [
          experiencia("Atual", "2022-01", [["ts"], ["ts"], ["ts"], ["ts"]], { atual: true }),
          experiencia("Velha", "2010-01", [["php"]]),
        ],
      },
    ]);
    const resultado = await encaixarEmUmaPagina(doc, aderentes, (d) => {
      const temVelha = textoDoDocumento(d).includes("Velha b1");
      return Promise.resolve({ paginas: temVelha ? 2 : 1 });
    });
    expect(resultado.coube).toBe(true);
    expect(resultado.tamanhoBase).toBe(9.0);
    expect(resultado.cortes).toEqual(['bullets da experiência "Velha"']);
  });

  it("corta protegidos (≥ 9) só depois de chegar a 8,8", async () => {
    const doc = documento([
      {
        tipo: "experiencia",
        titulo: "EXP",
        itens: [
          experiencia("Atual", "2022-01", [["ts"], ["ts"], ["ts"], ["ts"]], { atual: true }),
          experiencia("Protegida", "2018-01", [["php"]], { prioridadeCorte: 9 }),
        ],
      },
    ]);
    const tamanhos: number[] = [];
    const resultado = await encaixarEmUmaPagina(doc, aderentes, (d) => {
      tamanhos.push(d.tamanhoBase);
      return Promise.resolve({ paginas: textoDoDocumento(d).includes("Protegida b1") ? 2 : 1 });
    });
    expect(resultado).toMatchObject({ coube: true, tamanhoBase: 8.8 });
    expect(resultado.cortes).toEqual(['bullets da experiência "Protegida"']);
    expect(Math.min(...tamanhos)).toBe(8.8);
  });

  it("se nada resolver, termina em 8,8 com tudo cortado e lista o que sobrou", async () => {
    const doc = documento([
      {
        tipo: "experiencia",
        titulo: "EXP",
        itens: [
          experiencia("Atual", "2022-01", [["ts"], ["ts"], ["ts"], ["ts"], ["ts"]], { atual: true }),
          experiencia("Velha", "2010-01", [["php"]]),
        ],
      },
      { tipo: "projetos", titulo: "PROJ", itens: [projeto("P", 3)] },
    ]);
    const tamanhos: number[] = [];
    const resultado = await encaixarEmUmaPagina(doc, aderentes, (d) => {
      tamanhos.push(d.tamanhoBase);
      return Promise.resolve({ paginas: 2 });
    });
    expect(resultado.coube).toBe(false);
    expect(resultado.paginas).toBe(2);
    expect(resultado.tamanhoBase).toBe(8.8);
    expect(Math.min(...tamanhos)).toBe(8.8);
    expect(resultado.cortes).toContain('experiência "Velha"');
    expect(resultado.sobrou).toEqual(['experiência "Atual": 4 bullet(s)', 'projeto "P": 2 bullet(s)']);
  });

  it("o último documento renderizado é o devolvido", async () => {
    const doc = documento([
      { tipo: "experiencia", titulo: "EXP", itens: [experiencia("Velha", "2010-01", [["php"]])] },
    ]);
    let ultimo: DocumentoCurriculo | undefined;
    const resultado = await encaixarEmUmaPagina(doc, aderentes, (d) => {
      ultimo = d;
      return Promise.resolve({ paginas: d.secoes.length > 0 ? 2 : 1 });
    });
    expect(resultado.documento).toBe(ultimo);
    expect(resultado.coube).toBe(true);
  });
});

describe("aderência de skills", () => {
  it("skillsAderentes usa nome e aliases contra as keywords; todasAsSkills usa o master todo", () => {
    const master = umMaster();
    const keywords = [{ termo: "TS", tipo: "tecnologia" as const }];
    expect([...skillsAderentes(master, keywords)]).toEqual(["typescript"]);
    expect(todasAsSkills(master).size).toBe(master.skills.length);
  });
});

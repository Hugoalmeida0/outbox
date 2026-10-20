import { stripVTControlCharacters } from "node:util";
import { describe, expect, it } from "vitest";
import type { DadosStatus, LinhaStatus } from "#aplicacao/casos-de-uso/listar-status.ts";
import { TODOS_STATUS, type Status } from "#dominio/vagas/status.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { formatarAdicao } from "./adicao.ts";
import { formatarFalhas } from "./falhas.ts";
import {
  cortarNaLargura,
  formatarCabecalhoPreparo,
  formatarConclusao,
  formatarDuracao,
  rotuloVaga,
} from "./progresso.ts";
import { formatarResumoPreparo } from "./resumo-preparo.ts";
import { formatarResumoAplicacao, formatarResumoRevisao } from "./resumo-revisao.ts";
import { formatarStatus } from "./status.ts";
import { formatarTabela, truncar } from "./tabela.ts";

const puro = (texto: string): string => stripVTControlCharacters(texto);

function linha(id: number, status: Status, extra: Partial<LinhaStatus> = {}): LinhaStatus {
  return {
    id: id as IdVaga,
    status,
    motivo: null,
    etapa: null,
    empresa: "Acme",
    cargo: "Dev Sênior",
    canal: "linkedin",
    motor: "greenhouse",
    aderencia: 85,
    atsAntes: 42,
    atsDepois: 78,
    atualizadaEm: "2026-10-10T13:14:15-03:00",
    ...extra,
  };
}

function contagens(parcial: Partial<Record<Status, number>>): Record<Status, number> {
  return Object.fromEntries(TODOS_STATUS.map((s) => [s, parcial[s] ?? 0])) as Record<
    Status,
    number
  >;
}

describe("tabela", () => {
  it("alinha colunas e trunca", () => {
    expect(
      formatarTabela(
        ["A", "BB"],
        [
          ["xxx", "y"],
          ["z", ""],
        ],
      ),
    ).toBe("A    BB\n---  --\nxxx  y\nz");
    expect(truncar("abcdef", 4)).toBe("abc…");
    expect(truncar("abc", 4)).toBe("abc");
  });
});

describe("formatarStatus (AC10, AC21)", () => {
  it("mostra contagens, tabela com ATS antes→depois e o que aguarda o usuário", () => {
    const manual = linha(3, "MANUAL", {
      motivo: "candidatura_por_email",
      aderencia: null,
      atsAntes: null,
      atsDepois: null,
    });
    const dados: DadosStatus = {
      contagens: contagens({ PRONTA: 1, MANUAL: 1, PENDENTE_TESTE: 1 }),
      linhas: [linha(1, "PRONTA"), manual, linha(7, "PENDENTE_TESTE", { empresa: null })],
      aguardandoVoce: {
        manuais: [{ ...manual, destino: "vagas@acme.com" }],
        pendentesTeste: [linha(7, "PENDENTE_TESTE", { empresa: null })],
      },
    };
    expect(puro(formatarStatus(dados))).toBe(
      [
        "Vagas: 3  (PRONTA 1 · MANUAL 1 · PENDENTE_TESTE 1)",
        "",
        "ID  STATUS          MOTIVO/ETAPA           EMPRESA  CARGO       CANAL     MOTOR       ADER.  ATS    ATUALIZADA",
        "--  --------------  ---------------------  -------  ----------  --------  ----------  -----  -----  ----------------",
        "1   PRONTA          -                      Acme     Dev Sênior  linkedin  greenhouse  85     42→78  2026-10-10 13:14",
        "3   MANUAL          candidatura_por_email  Acme     Dev Sênior  linkedin  greenhouse  -      -      2026-10-10 13:14",
        "7   PENDENTE_TESTE  -                      -        Dev Sênior  linkedin  greenhouse  85     42→78  2026-10-10 13:14",
        "",
        "Aguardando você:",
        "  MANUAL          #3 Acme · Dev Sênior (candidatura_por_email: envie para vagas@acme.com)",
        "  PENDENTE_TESTE  #7 (empresa?) · Dev Sênior: conclua o teste e rode `camaleao retorno 7 ENVIADA`",
      ].join("\n"),
    );
  });

  it("vazio, com e sem filtro", () => {
    const vazio: DadosStatus = {
      contagens: contagens({}),
      linhas: [],
      aguardandoVoce: { manuais: [], pendentesTeste: [] },
    };
    expect(puro(formatarStatus(vazio))).toBe(
      "Vagas: 0\n\nNenhuma vaga. Adicione com `camaleao adicionar <url>`.",
    );
    expect(puro(formatarStatus(vazio, "OFERTA"))).toBe(
      "Vagas: 0\n\nNenhuma vaga com status OFERTA.",
    );
  });
});

describe("formatarFalhas (AC21)", () => {
  it("agrupa por conector e passo e lista os motores sem conector", () => {
    const texto = puro(
      formatarFalhas({
        grupos: [
          {
            conector: "greenhouse",
            passo: "preencher:CPF",
            quantidade: 2,
            maisRecente: "2026-10-05T10:00:00-03:00",
            urlMaisRecente: "https://a/2",
          },
        ],
        semConector: [{ motor: "workday", quantidade: 3 }],
      }),
    );
    expect(texto).toBe(
      [
        "Falhas de conector abertas: 2",
        "CONECTOR    PASSO          QTD  MAIS RECENTE      URL",
        "----------  -------------  ---  ----------------  -----------",
        "greenhouse  preencher:CPF  2    2026-10-05 10:00  https://a/2",
        "",
        "Vagas preenchidas pelo agente, sem conector:",
        "MOTOR    QTD",
        "-------  ---",
        "workday  3",
        "",
        "Detalhes e HTML sanitizado em falhas/. Para corrigir um conector: `npm run capturar-fixture -- <url>`.",
      ].join("\n"),
    );
    expect(formatarFalhas({ grupos: [], semConector: [] })).toBe(
      "Nenhuma falha aberta em falhas/.",
    );
  });
});

describe("resumos de preparo e aplicação", () => {
  it("preparo com erros, limite e próximo passo", () => {
    expect(
      puro(
        formatarResumoPreparo({
          processadas: 3,
          contagens: { PRONTA: 2, ERRO_PREPARO: 1 },
          erros: [{ id: 4 as IdVaga, motivo: "extracao_falhou", mensagem: "página fora do ar" }],
          reavaliadas: 1,
          interrompido: "limite",
        }),
      ),
    ).toBe(
      [
        "1 vaga(s) descartada(s) reaberta(s) pelos gaps aprendidos.",
        "Preparo: 3 vaga(s) processada(s)",
        "  PRONTA 2 · ERRO_PREPARO 1",
        "Erros (tentam de novo no próximo `preparar`):",
        "  #4 extracao_falhou: página fora do ar",
        "Limite de uso do Claude atingido: as vagas restantes continuam NOVA. Rode `camaleao preparar` mais tarde.",
        "Próximo passo: `camaleao aplicar` (2 pronta(s)).",
      ].join("\n"),
    );
    expect(
      formatarResumoPreparo({
        processadas: 0,
        contagens: {},
        erros: [],
        reavaliadas: 0,
        interrompido: null,
      }),
    ).toBe("Nenhuma vaga para preparar. Adicione com `camaleao adicionar <url>`.");
    expect(
      puro(
        formatarResumoPreparo({
          processadas: 1,
          contagens: {},
          erros: [],
          reavaliadas: 0,
          interrompido: "cancelado",
        }),
      ),
    ).toContain("Interrompido: as vagas em andamento continuam no status anterior.");
  });

  it("aplicação com desfechos e interrupções", () => {
    expect(
      puro(
        formatarResumoAplicacao({
          revisadas: 2,
          desfechos: { enviada: 1, manual_automatica: 1 },
          interrompido: null,
        }),
      ),
    ).toBe("Aplicação: 2 vaga(s) revisada(s)  (enviada 1 · manual (automático) 1)");
    expect(formatarResumoAplicacao({ revisadas: 0, desfechos: {}, interrompido: null })).toBe(
      "Nenhuma vaga revisada.",
    );
    expect(
      puro(formatarResumoAplicacao({ revisadas: 0, desfechos: {}, interrompido: "limite" })),
    ).toContain("Limite de uso");
    expect(
      puro(
        formatarResumoAplicacao({
          revisadas: 1,
          desfechos: { sair: 1 },
          interrompido: "cancelado",
        }),
      ),
    ).toContain("nada foi enviado");
  });

  it("revisão mostra ATS, gaps, alertas, só as respostas novas, carta e PDF (AC10)", () => {
    expect(
      puro(
        formatarResumoRevisao({
          vagaId: 12,
          empresa: "Acme",
          cargo: "Dev",
          motor: "lever",
          rota: "conector",
          url: "https://jobs.lever.co/acme/1/apply",
          aderencia: 90,
          atsAntes: 40,
          atsDepois: 81,
          gapsRestantes: ["Kafka"],
          alertas: ["PDF com mais de 2 páginas"],
          respostas: [
            { rotulo: "Nome", valor: "Ana", nova: false },
            { rotulo: "Por que nós?", valor: "Pelo\nproduto.", nova: true },
            { rotulo: "Empresa atual", valor: "Acme", nova: true, vaziaNaPagina: true },
          ],
          cartaInicio: "Prezados,\n\nQuero a vaga.",
          caminhoPdf: "C:/dados/vagas/00012/Ana-Silva-Curriculo.pdf",
        }),
      ),
    ).toBe(
      [
        "──── Vaga #12: Acme · Dev ────",
        "Motor: lever (conector)",
        "URL: https://jobs.lever.co/acme/1/apply",
        "Aderência: 90 · ATS: 40 → 81",
        "Gaps restantes: Kafka",
        "Alertas:",
        "  ! PDF com mais de 2 páginas",
        "Vazias na página (preencha no navegador):",
        "  ⚠ Empresa atual: Acme",
        "Respostas novas (confira no navegador):",
        "  • Por que nós?: Pelo produto.",
        "1 resposta(s) já conhecida(s) preenchida(s).",
        "Carta (início):",
        "  Prezados,",
        "  ",
        "  Quero a vaga.",
        "PDF: C:/dados/vagas/00012/Ana-Silva-Curriculo.pdf",
        "Edite o que quiser direto no navegador antes de escolher.",
      ].join("\n"),
    );
  });
});

describe("formatarAdicao", () => {
  it("uma linha por URL e totais", () => {
    expect(
      formatarAdicao([
        { url: "https://jobs.lever.co/a/1", resultado: "adicionada", id: 1 as IdVaga },
        { url: "nao-e-url", resultado: "invalida", detalhe: "URL inválida" },
        {
          url: "https://jobs.lever.co/a/2",
          resultado: "ja_na_fila",
          id: 2 as IdVaga,
          status: "PRONTA",
        },
      ]),
    ).toBe(
      [
        "RESULTADO   ID  URL                        DETALHE",
        "----------  --  -------------------------  -------------",
        "adicionada  1   https://jobs.lever.co/a/1",
        "inválida    -   nao-e-url                  URL inválida",
        "já na fila  2   https://jobs.lever.co/a/2  status PRONTA",
        "",
        "adicionada 1 · já na fila 1 · inválida 1",
      ].join("\n"),
    );
  });
});

describe("formatarProgresso", () => {
  const vaga = {
    id: 7 as IdVaga,
    empresa: null,
    cargo: null,
    urlOriginal: "https://www.linkedin.com/jobs/view/1",
  };

  it("formata durações em segundos, minutos e horas", () => {
    expect([0, 59_999, 60_000, 125_000, 3_725_000].map(formatarDuracao)).toEqual([
      "0s",
      "59s",
      "1m00s",
      "2m05s",
      "1h02m",
    ]);
  });

  it("corta pela largura no terminal, contando CJK e emoji como 2 colunas", () => {
    expect(cortarNaLargura("Ação", 4)).toBe("Ação");
    expect(cortarNaLargura("Desenvolvedora", 6)).toBe("Desen…");
    expect(cortarNaLargura("🚀 Dev", 6)).toBe("🚀 Dev");
    expect(cortarNaLargura("🚀🚀 Dev", 6)).toBe("🚀🚀 …");
    expect(cortarNaLargura("株式会社", 6)).toBe("株式…");
    expect(cortarNaLargura("👨‍👩‍👧 Família Dev", 6)).toBe("👨‍👩‍👧 Fa…");
  });

  it("rotula a vaga pela empresa e pelo cargo, ou pelo host antes da extração", () => {
    expect(rotuloVaga(vaga)).toBe("#7 linkedin.com");
    expect(rotuloVaga({ ...vaga, empresa: " Blip Global ", cargo: null })).toBe("#7 Blip Global");
    expect(rotuloVaga({ ...vaga, urlOriginal: "sem-url" })).toBe("#7 sem-url");
  });

  it("antecipa a demora no cabeçalho e resume a conclusão com motivo e aderência", () => {
    expect(formatarCabecalhoPreparo(1, 1)).toBe(
      "Preparando 1 vaga(s). Cada uma leva alguns minutos (várias chamadas ao Claude).",
    );
    const descartada = {
      ...vaga,
      empresa: "Acme",
      status: "DESCARTADA" as const,
      motivo: "aderencia_baixa" as const,
      aderencia: 42,
    };
    expect(puro(formatarConclusao(descartada, null, 70_000))).toBe(
      "– #7 Acme: DESCARTADA aderencia_baixa, aderência 42 (1m10s)",
    );
    expect(
      puro(
        formatarConclusao(
          { ...vaga, status: "MANUAL", motivo: "easy_apply", aderencia: null },
          null,
          null,
        ),
      ),
    ).toBe("! #7 linkedin.com: MANUAL easy_apply");
  });
});

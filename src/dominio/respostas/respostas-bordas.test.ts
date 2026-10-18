// Casos de borda das respostas resolvidas por código: diversidade, salário, consentimento, aprendizado.
import { describe, expect, it } from "vitest";
import { umaResposta } from "#testes/apoio/builders.ts";
import { aplicarAprendizado } from "./aprendizado.ts";
import type { BancoRespostas } from "./banco.ts";
import { classificarCampoDetalhado } from "./classificar-campo.ts";
import { respostaConsentimento } from "./consentimento.ts";
import { respostaDiversidade } from "./diversidade.ts";
import { escolherFaixa, resolverRegime } from "./salario.ts";

describe("respostaDiversidade", () => {
  const opcoes = ["Sim", "Não", "Prefiro não informar"];

  it("PcD e LGBTQIA+ respondem sim ou não pelo perfil", () => {
    expect(respostaDiversidade("pcd", opcoes, { pcd: true })).toEqual({
      valor: "Sim",
      confianca: "alta",
    });
    expect(respostaDiversidade("pcd", opcoes, { pcd: false })).toEqual({
      valor: "Não",
      confianca: "alta",
    });
    expect(respostaDiversidade("lgbtqia", opcoes, { lgbtqia: true })).toEqual({
      valor: "Sim",
      confianca: "alta",
    });
    expect(respostaDiversidade("lgbtqia", opcoes, { lgbtqia: false })).toEqual({
      valor: "Não",
      confianca: "alta",
    });
  });

  it("sem dado, sem opção correspondente ou veterano: prefiro não informar; sem essa opção, null", () => {
    expect(respostaDiversidade("pcd", opcoes, {})).toEqual({
      valor: "Prefiro não informar",
      confianca: "alta",
    });
    expect(respostaDiversidade("lgbtqia", opcoes, undefined)).toEqual({
      valor: "Prefiro não informar",
      confianca: "alta",
    });
    expect(
      respostaDiversidade("veterano", ["Yes", "No", "I don't wish to answer"], { pcd: true }),
    ).toEqual({
      valor: "I don't wish to answer",
      confianca: "alta",
    });
    expect(respostaDiversidade("raca", ["Amarela"], { raca: "preta" })).toEqual({
      valor: null,
      confianca: "baixa",
    });
    expect(respostaDiversidade("genero", undefined, { genero: "mulher_cis" })).toEqual({
      valor: null,
      confianca: "baixa",
    });
  });
});

describe("salário", () => {
  it("regime não informado usa a primeira preferência, ou CLT sem preferências", () => {
    expect(resolverRegime("nao_informado", ["pj", "clt"])).toEqual({
      regime: "pj",
      confianca: "baixa",
    });
    expect(resolverRegime("nao_informado", [])).toEqual({ regime: "clt", confianca: "baixa" });
    expect(resolverRegime("contractor", [])).toEqual({ regime: "contractor", confianca: "alta" });
  });

  it("escolhe a faixa que contém o valor, a mais próxima acima ou a mais alta", () => {
    const faixas = ["Até 5 mil", "De 5.001 a 10.000", "10k a 15k", "Acima de 15.000"];
    expect(escolherFaixa(faixas, 4000)).toBe("Até 5 mil");
    expect(escolherFaixa(faixas, 12_000)).toBe("10k a 15k");
    expect(escolherFaixa(faixas, 99_000)).toBe("Acima de 15.000");
    expect(escolherFaixa(["R$ 8.000", "R$ 12.000"], 9000)).toBe("R$ 12.000");
    expect(escolherFaixa(["R$ 3.000", "R$ 4.000"], 9000)).toBe("R$ 4.000");
    expect(escolherFaixa(["A combinar", "Prefiro não dizer"], 9000)).toBeNull();
  });
});

describe("respostaConsentimento", () => {
  it("radio: aceita por padrão, recusa o que o perfil recusa; sem opção reconhecível, null", () => {
    expect(
      respostaConsentimento(
        { tipo: "radio", obrigatorio: true, opcoes: ["Sim, concordo", "Não"] },
        "tratamentoDados",
        {},
      ),
    ).toEqual({ valor: "Sim, concordo", confianca: "alta" });
    expect(
      respostaConsentimento(
        { tipo: "radio", obrigatorio: false, opcoes: ["Yes", "No"] },
        "reterDados",
        {},
      ),
    ).toEqual({ valor: "Yes", confianca: "alta" });
    expect(
      respostaConsentimento(
        { tipo: "radio", obrigatorio: false, opcoes: ["Yes", "No"] },
        "reterDados",
        { reterDados: false },
      ),
    ).toEqual({ valor: "No", confianca: "alta" });
    expect(
      respostaConsentimento(
        { tipo: "radio", obrigatorio: true, opcoes: ["Talvez"] },
        "tratamentoDados",
        {},
      ),
    ).toEqual({ valor: null, confianca: "baixa" });
    expect(
      respostaConsentimento({ tipo: "radio", obrigatorio: true }, "tratamentoDados", {}),
    ).toEqual({ valor: null, confianca: "baixa" });
    expect(
      respostaConsentimento({ tipo: "checkbox", obrigatorio: false }, "comunicacoes", {
        comunicacoes: false,
      }),
    ).toEqual({ valor: "Não", confianca: "alta" });
  });

  it("tratamento de dados obrigatório é aceito mesmo com o perfil recusando", () => {
    expect(
      respostaConsentimento({ tipo: "checkbox", obrigatorio: true }, "tratamentoDados", {
        tratamentoDados: false,
      }).valor,
    ).toBe("Sim");
  });

  it("não confunde a negativa que contém 'concordo' com a afirmativa", () => {
    const opcoes = [
      "Não. Eu não concordo com a coleta e uso dessas informações",
      "Sim. Eu concordo com a coleta e uso dessas informações",
    ];
    expect(
      respostaConsentimento({ tipo: "select", obrigatorio: true, opcoes }, "diversidade", {}).valor,
    ).toBe(opcoes[1]);
    expect(
      respostaConsentimento({ tipo: "select", obrigatorio: true, opcoes }, "diversidade", {
        diversidade: false,
      }).valor,
    ).toBe(opcoes[0]);
  });
});

describe("classificarCampoDetalhado: fallback pelo tipo", () => {
  it("rótulo desconhecido em campo de e-mail ou telefone vira padrão", () => {
    expect(classificarCampoDetalhado({ rotulo: "Contato principal", tipo: "email" })).toEqual({
      categoria: "padrao",
      chave: "email",
    });
    expect(classificarCampoDetalhado({ rotulo: "Contato principal", tipo: "telefone" })).toEqual({
      categoria: "padrao",
      chave: "telefone",
    });
    expect(classificarCampoDetalhado({ rotulo: "Contato principal", tipo: "texto" })).toEqual({
      categoria: "pergunta",
    });
  });
});

describe("aplicarAprendizado: tipos e variantes", () => {
  const hoje = "2026-10-10";

  it("grava o tipo da resposta pelo tipo do campo", () => {
    const banco = aplicarAprendizado(
      [],
      [
        {
          resposta: umaResposta({ rotulo: "Nível de inglês?", tipoCampo: "radio" }),
          valorFinal: "Avançado",
          editada: false,
        },
        {
          resposta: umaResposta({ rotulo: "Aceita viajar?", tipoCampo: "checkbox" }),
          valorFinal: "Sim",
          editada: false,
        },
        {
          resposta: umaResposta({ rotulo: "Anos de Java?", tipoCampo: "numero" }),
          valorFinal: "3",
          editada: false,
        },
        {
          resposta: umaResposta({ rotulo: "Área?", tipoCampo: "select" }),
          valorFinal: "Backend",
          editada: false,
        },
      ],
      "pt",
      hoje,
    );
    expect(banco.map((e) => [e.pergunta, e.tipo])).toEqual([
      ["Nível de inglês?", "opcao"],
      ["Aceita viajar?", "sim_nao"],
      ["Anos de Java?", "numero"],
      ["Área?", "opcao"],
    ]);
  });

  it("edição de resposta do banco atualiza sem duplicar a variante já conhecida", () => {
    const banco: BancoRespostas = [
      {
        id: "r-0007",
        pergunta: "Por que nós?",
        variantes: ["Why us?"],
        idioma: "pt",
        tipo: "texto",
        resposta: "Antiga",
        atualizadaEm: "2026-01-01",
      },
    ];
    const novo = aplicarAprendizado(
      banco,
      [
        {
          resposta: umaResposta({ rotulo: "Why us?", fonte: "banco:r-0007" }),
          valorFinal: "Nova",
          editada: true,
        },
      ],
      "en",
      hoje,
    );
    expect(novo).toEqual([{ ...banco[0], resposta: "Nova", atualizadaEm: hoje }]);
    expect(banco[0]?.resposta).toBe("Antiga");
  });
});

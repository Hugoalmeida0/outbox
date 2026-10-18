import { describe, expect, it } from "vitest";
import { umMaster, umPerfil, umaResposta } from "#testes/apoio/builders.ts";
import { aplicarAprendizado } from "./aprendizado.ts";
import {
  classificarCampo,
  classificarCampoDetalhado,
  classificarFormulario,
} from "./classificar-campo.ts";
import { respostaDiversidade } from "./diversidade.ts";
import { respostaConsentimento } from "./consentimento.ts";
import { calcularSalario, escolherFaixa, resolverRegime, valorSalarioAtual } from "./salario.ts";
import { formatarData, valorDocumento, valorPadrao } from "./valor-codigo.ts";
import type { BancoRespostas } from "./banco.ts";

describe("classificarCampo", () => {
  it.each([
    ["CPF", "texto", "documento"],
    ["Data de nascimento", "data", "documento"],
    ["CEP", "texto", "documento"],
    ["Pretensão salarial", "numero", "salario"],
    ["Salary expectations (USD)", "texto", "salario"],
    ["Gênero", "select", "diversidade"],
    ["Raça/Cor", "select", "diversidade"],
    ["Você é PcD?", "radio", "diversidade"],
    ["Cover Letter", "textarea", "carta"],
    ["Resume/CV", "arquivo", "curriculo"],
    ["Cover letter", "arquivo", "carta"],
    ["Link para o seu currículo", "texto", "pergunta"],
    ["E-mail", "texto", "padrao"],
    ["Se sim, informe o e-mail corporativo da pessoa que te indicou!", "texto", "pergunta"],
    ["Referred by (email)", "email", "pergunta"],
    ["Emergency contact phone", "telefone", "pergunta"],
    ["Preferred First Name", "texto", "padrao"],
    ["Phone", "telefone", "padrao"],
    ["LinkedIn Profile", "texto", "padrao"],
    ["Por que você quer trabalhar aqui?", "textarea", "pergunta"],
    ["Qualquer coisa", "email", "padrao"],
    ["Which city/state do you currently reside in?", "texto", "padrao"],
    ["Are you open to on-site work?", "radio", "pergunta"],
    ["Personal website", "texto", "padrao"],
    // Perguntas longas (formulários da CI&T no Lever) que só citam palavras de campo-padrão.
    [
      "Você possui algum familiar (como pais, irmãos, sogros, cunhados, cônjuges, ou filhos) que atualmente trabalha na CI&T?",
      "select",
      "pergunta",
    ],
    [
      "Do you have availability for on-site work at the Campinas office (Brazil) every day?",
      "select",
      "pergunta",
    ],
    [
      "Você tem disponibilidade para trabalho presencial na cidade de Campinas todos os dias?",
      "select",
      "pergunta",
    ],
    [
      "If you feel comfortable, please share your current or last salary and benefits",
      "texto",
      "salario_atual",
    ],
    [
      "Caso se sinta confortável, compartilhe seu salário atual ou ultimo e benefícios!",
      "texto",
      "salario_atual",
    ],
    ["Último salário", "numero", "salario_atual"],
    [
      "What is your salary expectation? Only the numeric value (no currency, text, or benefits)/ Qual é a sua pretensão salarial?",
      "texto",
      "salario",
    ],
    ["Qual sua pretensão salarial para vagas CLT?", "texto", "salario"],
  ] as const)("%s (%s) → %s", (rotulo, tipo, categoria) => {
    expect(classificarCampo({ rotulo, tipo })).toBe(categoria);
  });

  it("usa autocomplete antes do rótulo", () => {
    expect(
      classificarCampoDetalhado({ rotulo: "Campo 1", tipo: "texto", autocomplete: "given-name" }),
    ).toEqual({
      categoria: "padrao",
      chave: "primeiroNome",
    });
    expect(
      classificarCampoDetalhado({ rotulo: "x", tipo: "texto", autocomplete: "postal-code" }),
    ).toEqual({
      categoria: "documento",
      chave: "cep",
    });
  });

  it("usa o atributo name quando o rótulo não ajuda", () => {
    expect(classificarCampoDetalhado({ rotulo: "", nome: "first_name", tipo: "texto" })).toEqual({
      categoria: "padrao",
      chave: "primeiroNome",
    });
  });

  it("trata Nome como primeiro nome só quando o formulário pede sobrenome", () => {
    expect(classificarFormulario([{ rotulo: "Nome", tipo: "texto" }])).toEqual([
      { categoria: "padrao", chave: "nome" },
    ]);
    expect(
      classificarFormulario([
        { rotulo: "Nome", tipo: "texto" },
        { rotulo: "Sobrenome", tipo: "texto" },
      ]),
    ).toEqual([
      { categoria: "padrao", chave: "primeiroNome" },
      { categoria: "padrao", chave: "sobrenome" },
    ]);
  });
});

describe("valores por código", () => {
  const contato = { ...umMaster().pessoal };
  const perfil = umPerfil();

  it.each([
    ["nome", "Ana Exemplo da Silva"],
    ["primeiroNome", "Ana"],
    ["sobrenome", "Exemplo da Silva"],
    ["email", "ana.exemplo@example.com"],
    ["linkedin", "https://www.linkedin.com/in/ana-exemplo"],
    ["portfolio", "https://github.com/ana-exemplo"],
    ["pais", "Brasil"],
  ] as const)("padrão %s", (chave, esperado) => {
    expect(valorPadrao(chave, contato)).toBe(esperado);
  });

  it("formata documentos conforme o campo", () => {
    expect(valorDocumento("cpf", "texto", perfil.documentos, perfil.endereco)).toBe(
      "123.456.789-09",
    );
    expect(valorDocumento("dataNascimento", "texto", perfil.documentos, perfil.endereco)).toBe(
      "15/06/1995",
    );
    expect(valorDocumento("dataNascimento", "data", perfil.documentos, perfil.endereco)).toBe(
      "1995-06-15",
    );
    expect(valorDocumento("cep", "texto", perfil.documentos, perfil.endereco)).toBe("01000-000");
    expect(valorDocumento("complemento", "texto", perfil.documentos, perfil.endereco)).toBeNull();
    expect(formatarData("2000-01-02", "texto")).toBe("02/01/2000");
  });
});

describe("salário", () => {
  const tabela = umPerfil().salario;

  it.each([
    [{ regime: "clt", periodo: "mensal", moeda: "BRL" }, 15000],
    [{ regime: "clt", periodo: "anual", moeda: "BRL" }, 195000],
    [{ regime: "pj", periodo: "mensal", moeda: "BRL" }, 20000],
    [{ regime: "pj", periodo: "anual", moeda: "BRL" }, 240000],
    [{ regime: "contractor", periodo: "anual", moeda: "USD" }, 60000],
    [{ regime: "clt", periodo: "mensal", moeda: "USD" }, 5000],
  ] as const)("%o → %i", (pedido, valor) => {
    expect(calcularSalario(pedido, tabela)).toBe(valor);
  });

  it("usa o primeiro regime preferido quando a vaga não informa", () => {
    expect(resolverRegime("nao_informado", ["pj", "clt"])).toEqual({
      regime: "pj",
      confianca: "baixa",
    });
    expect(resolverRegime("clt", ["pj"])).toEqual({ regime: "clt", confianca: "alta" });
  });

  it.each([
    [
      ["Até R$ 10.000", "R$ 10.001 a R$ 15.000", "Acima de R$ 15.000"],
      15000,
      "R$ 10.001 a R$ 15.000",
    ],
    [["Até R$ 10.000", "R$ 10.001 a R$ 15.000", "Acima de R$ 15.000"], 18000, "Acima de R$ 15.000"],
    [["5k-10k", "10k-14k", "20k-30k"], 15000, "20k-30k"],
    [["1 mil a 2 mil", "2 mil a 3 mil"], 9000, "2 mil a 3 mil"],
    [["$50,000 - $70,000", "$70,000+"], 60000, "$50,000 - $70,000"],
    [["Prefiro não dizer"], 1000, null],
  ] as const)("faixa entre %o para %i", (opcoes, valor, esperado) => {
    expect(escolherFaixa(opcoes, valor)).toBe(esperado);
  });
});

describe("salário atual", () => {
  it("usa o texto do perfil e nunca a pretensão; sem dado, null", () => {
    expect(valorSalarioAtual("7.000 CLT + VR/VA", false)).toBe("7.000 CLT + VR/VA");
    expect(valorSalarioAtual("7.000 CLT + VR/VA", true)).toBe("7000");
    expect(valorSalarioAtual("R$ 12.500,50", true)).toBe("12500.50");
    expect(valorSalarioAtual("sem número", true)).toBeNull();
    expect(valorSalarioAtual(undefined, false)).toBeNull();
  });
});

describe("diversidade", () => {
  const opcoesGenero = [
    "Mulher cis",
    "Mulher trans",
    "Homem cis",
    "Não binário",
    "Prefiro não informar",
  ];

  it("escolhe a opção mais específica do valor do perfil", () => {
    expect(respostaDiversidade("genero", opcoesGenero, { genero: "mulher_trans" })).toEqual({
      valor: "Mulher trans",
      confianca: "alta",
    });
    expect(
      respostaDiversidade("genero", ["Feminino", "Masculino"], { genero: "mulher_cis" }).valor,
    ).toBe("Feminino");
  });

  it("mapeia raça e PcD por sinônimos PT/EN", () => {
    expect(respostaDiversidade("raca", ["White", "Black", "Asian"], { raca: "preta" }).valor).toBe(
      "Black",
    );
    expect(
      respostaDiversidade("pcd", ["Sim", "Não possuo deficiência"], { pcd: false }).valor,
    ).toBe("Não possuo deficiência");
  });

  it("cai para prefiro não informar sem dado e devolve null sem essa opção", () => {
    expect(respostaDiversidade("raca", opcoesGenero, undefined).valor).toBe("Prefiro não informar");
    expect(
      respostaDiversidade("veterano", ["Yes", "No", "I decline to self-identify"], undefined).valor,
    ).toBe("I decline to self-identify");
    expect(respostaDiversidade("raca", ["Branca", "Preta"], {})).toEqual({
      valor: null,
      confianca: "baixa",
    });
  });
});

describe("aplicarAprendizado", () => {
  const banco: BancoRespostas = [
    {
      id: "r-0001",
      pergunta: "Disponível para híbrido?",
      variantes: [],
      idioma: "pt",
      tipo: "sim_nao",
      resposta: "Sim",
      atualizadaEm: "2026-01-01",
    },
  ];

  it("acrescenta respostas geradas e atualiza as do banco editadas", () => {
    const resultado = aplicarAprendizado(
      banco,
      [
        {
          resposta: umaResposta({ rotulo: "Quantos anos de React?", tipoCampo: "numero" }),
          valorFinal: "5",
          editada: false,
        },
        {
          resposta: umaResposta({ rotulo: "Aceita híbrido?", fonte: "banco:r-0001" }),
          valorFinal: "Não",
          editada: true,
        },
      ],
      "pt",
      "2026-10-10",
    );
    expect(resultado).toEqual([
      { ...banco[0], resposta: "Não", atualizadaEm: "2026-10-10", variantes: ["Aceita híbrido?"] },
      {
        id: "r-0002",
        pergunta: "Quantos anos de React?",
        variantes: [],
        idioma: "pt",
        tipo: "numero",
        resposta: "5",
        atualizadaEm: "2026-10-10",
      },
    ]);
    expect(banco[0]!.resposta).toBe("Sim");
  });

  it("ignora sensíveis, específicas da vaga, não perguntas e respostas do banco não editadas", () => {
    const resultado = aplicarAprendizado(
      banco,
      [
        { resposta: umaResposta({ sensivel: true }), valorFinal: "x", editada: true },
        { resposta: umaResposta({ especificaDaVaga: true }), valorFinal: "x", editada: true },
        { resposta: umaResposta({ categoria: "carta" }), valorFinal: "x", editada: true },
        { resposta: umaResposta({ fonte: "banco:r-0001" }), valorFinal: "Sim", editada: false },
      ],
      "pt",
      "2026-10-10",
    );
    expect(resultado).toEqual(banco);
  });
});

describe("consentimento e ajustes vistos em formulários reais", () => {
  it("classifica checkboxes e radios de consentimento", () => {
    expect(
      classificarCampo({
        rotulo: "I confirm that I have read the Privacy Policy",
        tipo: "checkbox",
      }),
    ).toBe("consentimento");
    expect(
      classificarCampo({ rotulo: "Aceito os termos de uso", nome: "lgpd", tipo: "checkbox" }),
    ).toBe("consentimento");
    expect(classificarCampo({ rotulo: "SMS", nome: "communicationConsent", tipo: "radio" })).toBe(
      "consentimento",
    );
    expect(classificarCampo({ rotulo: "Are you Hispanic/Latino?", tipo: "select" })).toBe(
      "diversidade",
    );
  });

  it("aceita por padrão e recusa o opt-in que o perfil recusa", () => {
    expect(
      respostaConsentimento({ tipo: "checkbox", obrigatorio: true }, "tratamentoDados", {}),
    ).toEqual({ valor: "Sim", confianca: "alta" });
    expect(
      respostaConsentimento(
        { tipo: "checkbox", obrigatorio: false, opcoes: ["x"] },
        "reterDados",
        {},
      ),
    ).toEqual({ valor: "Sim", confianca: "alta" });
    const opcoes = [
      "Yes - I consent to receiving text messages",
      "No - I do not consent to receiving text messages",
    ];
    expect(
      respostaConsentimento({ tipo: "radio", obrigatorio: false, opcoes }, "comunicacoes", {
        comunicacoes: false,
      }).valor,
    ).toBe(opcoes[1]);
    expect(
      respostaConsentimento({ tipo: "radio", obrigatorio: false, opcoes }, "comunicacoes", {})
        .valor,
    ).toBe(opcoes[0]);
    expect(
      respostaConsentimento(
        { tipo: "radio", obrigatorio: true, opcoes: ["Talvez"] },
        "tratamentoDados",
        {},
      ),
    ).toEqual({ valor: null, confianca: "baixa" });
  });

  it("classifica o tipo de opt-in visto nos formulários reais", () => {
    const tipo = (rotulo: string, t: "select" | "checkbox" = "select"): unknown => {
      const c = classificarCampoDetalhado({ rotulo, tipo: t });
      return c.categoria === "consentimento" ? c.chave : c.categoria;
    };
    expect(tipo("On Data Privacy")).toBe("tratamentoDados");
    expect(
      tipo(
        "Do you agree that this interview may be transcribed using artificial intelligence tools?",
      ),
    ).toBe("transcricaoIa");
    expect(
      tipo("Would you like your resume to be shared with Blip partners for future open roles?"),
    ).toBe("compartilharParceiros");
    expect(
      tipo(
        "By checking this box, I agree to allow Blip Global to retain my data for future opportunities",
        "checkbox",
      ),
    ).toBe("reterDados");
    expect(
      tipo(
        "Autorizo a CI&T a enviar informações através de mídias sociais, telefone e email sobre novas oportunidades",
        "checkbox",
      ),
    ).toBe("comunicacoes");
    expect(tipo("Consentimento - Diversidade e Inclusão (D&I)")).toBe("diversidade");
    expect(
      tipo(
        "As respostas abaixo são opcionais. Estes dados serão usados para nossas ações afirmativas. Você se sente confortável de responder as questões abaixo?",
      ),
    ).toBe("diversidade");
    // "in terms of" não é consentimento.
    expect(tipo("In terms of English, how fluent are you?")).toBe("pergunta");
  });

  it("sem consentimento de diversidade, responde 'prefiro não informar' mesmo com o dado no perfil", () => {
    const opcoes = ["Parda", "Branca", "Prefiro não informar"];
    expect(respostaDiversidade("raca", opcoes, { raca: "parda" }).valor).toBe("Parda");
    expect(respostaDiversidade("raca", opcoes, { raca: "parda" }, false).valor).toBe(
      "Prefiro não informar",
    );
    expect(respostaDiversidade("raca", ["Parda", "Branca"], { raca: "parda" }, false)).toEqual({
      valor: null,
      confianca: "baixa",
    });
  });

  it("reconhece 'I don't wish to answer' como prefiro não informar", () => {
    expect(
      respostaDiversidade("raca", ["Yes", "No", "I don't wish to answer"], { raca: "parda" }).valor,
    ).toBe("I don't wish to answer");
  });
});

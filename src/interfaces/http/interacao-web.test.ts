import { describe, expect, it } from "vitest";
import type { ResumoRevisao } from "#aplicacao/portas/interacao.ts";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import type { EventoExecucao } from "./contrato.ts";
import { ErroPerguntaNaoPendente, InteracaoWeb } from "./interacao-web.ts";

function criar(assinar: (caminho: string) => string | null = (c) => `/arquivos/${c.length}`) {
  const eventos: EventoExecucao[] = [];
  const controle = new AbortController();
  let proximo = 0;
  const interacao = new InteracaoWeb({
    publicar: (e) => eventos.push(e),
    sinal: controle.signal,
    assinarArquivo: assinar,
    gerarId: () => `p${String(++proximo)}`,
  });
  return { interacao, eventos, controle };
}

describe("InteracaoWeb (AC7)", () => {
  it("emite cada pergunta e só a pendente aceita resposta, na ordem", async () => {
    const { interacao, eventos } = criar();
    const sim = interacao.perguntarSimNao("Essa vaga pede Kafka. Você tem?");
    expect(eventos).toEqual([
      {
        tipo: "pergunta",
        pergunta: { id: "p1", tipo: "sim_nao", mensagem: "Essa vaga pede Kafka. Você tem?" },
      },
    ]);
    expect(interacao.perguntaPendente?.id).toBe("p1");
    expect(() => interacao.responder("p9", true)).toThrow(ErroPerguntaNaoPendente);
    expect(() => interacao.responder("p1", "sim")).toThrow(ErroUsuario);
    interacao.responder("p1", true);
    await expect(sim).resolves.toBe(true);
    expect(eventos.at(-1)).toEqual({ tipo: "respondida", perguntaId: "p1" });
    expect(() => interacao.responder("p1", false)).toThrow(ErroPerguntaNaoPendente);

    const numero = interacao.perguntarNumero("Quantos anos?", { min: 0, max: 50 });
    expect(eventos.at(-1)).toMatchObject({ pergunta: { tipo: "numero", min: 0, max: 50 } });
    expect(() => interacao.responder("p2", 51)).toThrow(/entre 0 e 50/);
    expect(() => interacao.responder("p2", 2.5)).toThrow(/inteiro/);
    interacao.responder("p2", 3);
    await expect(numero).resolves.toBe(3);

    const escolha = interacao.escolher("O que fazer?", [
      { valor: "enviar", rotulo: "[e]nviar" },
      { valor: "pular", rotulo: "[p]ular" },
    ]);
    expect(() => interacao.responder("p3", "apagar")).toThrow(/uma das opções/);
    interacao.responder("p3", "pular");
    await expect(escolha).resolves.toBe("pular");

    const texto = interacao.perguntarTexto("Qual?");
    interacao.responder("p4", "Kafka");
    await expect(texto).resolves.toBe("Kafka");

    const pausa = interacao.aguardarUsuario("Resolva o CAPTCHA");
    expect(eventos.at(-1)).toMatchObject({ pergunta: { tipo: "aguardar" } });
    interacao.responder("p5", null);
    await expect(pausa).resolves.toBeUndefined();
  });

  it("cancelar rejeita a pergunta pendente como o Ctrl+C num prompt", async () => {
    const { interacao, controle } = criar();
    const pendente = interacao.perguntarSimNao("Continuar?");
    controle.abort();
    await expect(pendente).rejects.toMatchObject({ name: "AbortPromptError" });
    expect(interacao.perguntaPendente).toBeNull();
    await expect(interacao.perguntarTexto("Outra?")).rejects.toMatchObject({
      name: "AbortPromptError",
    });
  });

  it("revisão, avisos e arquivos viram eventos com URL de uso único no lugar do caminho", async () => {
    const { interacao, eventos } = criar((c) => (c.includes("vagas") ? "/arquivos/abc" : null));
    const resumo: ResumoRevisao = {
      vagaId: 1,
      empresa: "Acme",
      cargo: "Dev",
      motor: "greenhouse",
      rota: "conector",
      url: "https://x",
      aderencia: 80,
      atsAntes: 60,
      atsDepois: 85,
      gapsRestantes: ["kafka"],
      alertas: [],
      respostas: [
        { rotulo: "Pretensão", valor: "(sem resposta)", nova: true, vaziaNaPagina: true },
      ],
      cartaInicio: "Olá",
      caminhoPdf: "/dados/vagas/00001/cv.pdf",
    };
    interacao.exibirResumoRevisao(resumo);
    interacao.informar("\nVaga #1: abrindo");
    await interacao.abrirArquivo("/dados/vagas/00001/cv.pdf");
    await interacao.abrirArquivo("/etc/passwd");
    const { caminhoPdf: _caminho, ...semCaminho } = resumo;
    expect(eventos).toEqual([
      { tipo: "revisao", resumo: { ...semCaminho, urlPdf: "/arquivos/abc" } },
      { tipo: "aviso", mensagem: "Vaga #1: abrindo" },
      { tipo: "abrir_arquivo", url: "/arquivos/abc" },
      { tipo: "aviso", mensagem: "Não consegui abrir esse arquivo pelo site." },
    ]);
  });
});

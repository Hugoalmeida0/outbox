import { stripVTControlCharacters } from "node:util";
import { describe, expect, it } from "vitest";
import type { CasosDeUso, Container } from "#composicao";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { umaVaga } from "#testes/apoio/builders.ts";
import { InteracaoRoteirizada } from "#testes/apoio/fakes/basicos.ts";
import type { ContextoComando } from "../contexto.ts";
import { InteracaoTerminal } from "../interacao-terminal.ts";
import { executar } from "../principal.ts";
import { urlsDoArquivo } from "./adicionar.ts";
import { comandoAplicar } from "./aplicar.ts";
import { comandoNavegador } from "./navegador.ts";
import { comandoPreparar } from "./preparar.ts";
import { comandoRenderizarMaster } from "./renderizar-master.ts";

/** Container dublê: só os casos usados pelo teste; o resto falha se chamado. */
function containerDuble(casos: Partial<CasosDeUso>) {
  const registros: { mensagem: string; erro: unknown }[] = [];
  const travas: string[] = [];
  let encerrado = 0;
  const container = {
    caminhos: { raiz: "/proj", navegadorDir: "/proj/dados/navegador" },
    config: {},
    casos: new Proxy(casos, {
      get: (alvo, nome: string) =>
        (alvo as Record<string, unknown>)[nome] ??
        (() => {
          throw new Error(`caso ${nome} não esperado`);
        }),
    }),
    adquirirTrava: (comando: string) => {
      travas.push(`+${comando}`);
      return { liberar: () => travas.push(`-${comando}`) };
    },
    registrarErro: (mensagem: string, erro: unknown) => registros.push({ mensagem, erro }),
    criarServicoSegredos: () => {
      throw new Error("não usado");
    },
    instanciados: () => new Set<string>(),
    encerrar: () => {
      encerrado++;
      return Promise.resolve();
    },
  } as unknown as Container;
  return { container, registros, travas, encerrados: () => encerrado };
}

function contexto(container: Container, controle = new AbortController()) {
  const saida: string[] = [];
  const ctx: ContextoComando = {
    container: () => container,
    saida: { escrever: (t) => saida.push(t), erro: (t) => saida.push(t) },
    sinal: controle.signal,
    cancelar: () => {
      controle.abort();
    },
  };
  return { ctx, saida };
}

describe("comandos", () => {
  it("preparar repassa as opções, libera a trava e sai com 130 quando cancelado", async () => {
    const entradas: unknown[] = [];
    const { container, travas } = containerDuble({
      prepararVagas: (entrada) => {
        entradas.push(entrada);
        return Promise.resolve({
          processadas: 1,
          contagens: {},
          erros: [],
          reavaliadas: 0,
          interrompido: "cancelado",
        });
      },
    });
    const { ctx } = contexto(container);
    expect(await comandoPreparar(ctx, { forcar: true, paralelo: "3" })).toBe(130);
    expect(entradas).toEqual([{ forcar: true, reavaliar: false, paralelo: 3 }]);
    expect(travas).toEqual(["+preparar", "-preparar"]);
  });

  it("preparar mostra o andamento de cada vaga antes do resumo", async () => {
    const { container } = containerDuble({
      prepararVagas: (_entrada, progresso) => {
        progresso.emitir({ tipo: "inicio", total: 1, paralelo: 1 });
        progresso.emitir({
          tipo: "concluida",
          vaga: umaVaga({ id: 1 as IdVaga, empresa: "Acme", status: "PRONTA" }),
          erro: null,
        });
        return Promise.resolve({
          processadas: 1,
          contagens: { PRONTA: 1 },
          erros: [],
          reavaliadas: 0,
          interrompido: null,
        });
      },
    });
    const { ctx, saida } = contexto(container);
    expect(await comandoPreparar(ctx, {})).toBe(0);
    expect(saida.map((l) => stripVTControlCharacters(l))).toEqual([
      expect.stringMatching(/^Preparando 1 vaga\(s\)\./),
      "✓ #1 Acme: PRONTA",
      expect.stringMatching(/^Preparo: 1 vaga\(s\) processada\(s\)/),
    ]);
  });

  it("preparar libera a trava mesmo com erro", async () => {
    const { container, travas } = containerDuble({
      prepararVagas: () => Promise.reject(new Error("x")),
    });
    await expect(comandoPreparar(contexto(container).ctx, {})).rejects.toThrow("x");
    expect(travas).toEqual(["+preparar", "-preparar"]);
  });

  it("aplicar repassa simulação, id e a interação, e avisa no modo simulação", async () => {
    const recebidos: unknown[] = [];
    const interacao = new InteracaoRoteirizada();
    const { container } = containerDuble({
      aplicarVagas: (entrada, i) => {
        recebidos.push(entrada, i);
        return Promise.resolve({ revisadas: 1, desfechos: { mantida: 1 }, interrompido: null });
      },
    });
    const { ctx, saida } = contexto(container);
    expect(await comandoAplicar(ctx, { simular: true, id: "7" }, interacao)).toBe(0);
    expect(recebidos).toEqual([{ simular: true, id: 7 }, interacao]);
    expect(saida[0]).toBe("Modo simulação: preenche e revisa, mas nada é enviado.");
  });

  it("navegador e renderizar-master apresentam caminhos relativos", async () => {
    const { container } = containerDuble({
      abrirNavegador: () => Promise.resolve(),
      renderizarMaster: () =>
        Promise.resolve({ pdf: "/proj/dados/master/Ana-Silva-Curriculo.pdf", paginas: 3 }),
    });
    const { ctx, saida } = contexto(container);
    await comandoNavegador(ctx);
    await comandoRenderizarMaster(ctx);
    expect(saida.join("\n")).toMatch(/perfil em dados[\\/]navegador/);
    expect(saida.join("\n")).toMatch(
      /PDF do master: dados[\\/]master[\\/]Ana-Silva-Curriculo.pdf \(3 página\(s\)\)/,
    );
    expect(saida.join("\n")).toContain("passou de 2 páginas");
  });

  it("lê URLs de arquivo ignorando vazias e comentários", () => {
    expect(urlsDoArquivo("# topo\r\n\r\n https://a/1 \n#x\nhttps://b/2")).toEqual([
      "https://a/1",
      "https://b/2",
    ]);
  });
});

describe("executar", () => {
  async function rodar(casos: Partial<CasosDeUso>, ...args: string[]) {
    const duble = containerDuble(casos);
    const saida: string[] = [];
    const codigo = await executar(["node", "camaleao", ...args], {
      saida: { escrever: (t) => saida.push(t), erro: (t) => saida.push(t) },
      fabricarContainer: () => duble.container,
      alvoSinais: { on: () => undefined, off: () => undefined },
    });
    return { codigo, saida: saida.join("\n"), ...duble };
  }

  it("erro inesperado vai ao registrador (stack no log) e sai com 1; o container é encerrado", async () => {
    const r = await rodar(
      {
        listarFalhas: () => {
          throw new TypeError("quebrou");
        },
      },
      "falhas",
    );
    expect(r.codigo).toBe(1);
    expect(r.registros).toHaveLength(1);
    expect(r.registros[0]?.mensagem).toBe("erro: erro inesperado: quebrou (stack em dados/logs/)");
    expect(r.saida).toBe("");
    expect(r.encerrados()).toBe(1);
  });

  it("erro previsto é mostrado sem ir ao log", async () => {
    const r = await rodar(
      {
        listarFalhas: () => {
          throw new ErroUsuario("sem permissão em falhas/");
        },
      },
      "falhas",
    );
    expect(r.codigo).toBe(2);
    expect(r.saida).toContain("erro: sem permissão em falhas/");
    expect(r.registros).toEqual([]);
  });
});

describe("InteracaoTerminal", () => {
  it("prompt cancelado aborta o comando e propaga a interrupção", async () => {
    const controle = new AbortController();
    controle.abort();
    let cancelado = 0;
    const interacao = new InteracaoTerminal({
      saida: { escrever: () => undefined, erro: () => undefined },
      sinal: controle.signal,
      cancelar: () => {
        cancelado++;
      },
    });
    await expect(interacao.perguntarSimNao("Você tem Kafka?")).rejects.toMatchObject({
      name: "AbortPromptError",
    });
    expect(cancelado).toBe(1);
  });

  it("informa, exibe a revisão e abre arquivos pelo abridor injetado", async () => {
    const linhas: string[] = [];
    const abertos: string[] = [];
    const interacao = new InteracaoTerminal({
      saida: { escrever: (t) => linhas.push(t), erro: () => undefined },
      sinal: new AbortController().signal,
      cancelar: () => undefined,
      abrir: (c) => Promise.resolve(abertos.push(c)),
    });
    interacao.informar("olá");
    interacao.exibirResumoRevisao({
      vagaId: 1,
      empresa: "Acme",
      cargo: "Dev",
      motor: "lever",
      rota: "conector",
      url: "https://x",
      aderencia: 80,
      atsAntes: 1,
      atsDepois: 2,
      gapsRestantes: [],
      alertas: [],
      respostas: [],
      caminhoPdf: "/cv.pdf",
    });
    await interacao.abrirArquivo("/cv.pdf");
    expect(linhas[0]).toBe("olá");
    expect(linhas[1]).toContain("Vaga #1: Acme · Dev");
    expect(abertos).toEqual(["/cv.pdf"]);
  });
});

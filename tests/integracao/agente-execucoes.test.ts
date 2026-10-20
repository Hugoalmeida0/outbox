// Execuções pelo site (AC5 a AC8): stream de eventos com replay, perguntas respondidas pelo site, envio
// só pela escolha "enviar", trava compartilhada com a CLI e upload do currículo.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { aplicarVagas } from "#aplicacao/casos-de-uso/aplicar-vagas.ts";
import { prepararVagas, type ResumoPreparo } from "#aplicacao/casos-de-uso/preparar-vagas.ts";
import { criarContainer, type CasosDeUso, type Container } from "#composicao";
import type { EventoExecucao, Pergunta } from "#interfaces/http/contrato.ts";
import { ate, lerEventos, montarAgente } from "#testes/apoio/agente-http.ts";
import { umaAnalise, umaVaga, umCurriculoGerado, umMaster } from "#testes/apoio/builders.ts";
import { criarAmbienteAplicacao } from "#testes/apoio/deps-aplicacao.ts";
import {
  CatalogoConectoresFake,
  ConectorFake,
  FormularioAbertoFake,
} from "#testes/apoio/fakes/formularios.ts";

function container(casos: Partial<CasosDeUso> = {}): Container {
  const raiz = mkdtempSync(join(tmpdir(), "camaleao-agente-exec-"));
  const real = criarContainer({ raiz, nivelLog: "erro", escreverTerminal: () => undefined });
  return { ...real, casos: { ...real.casos, ...casos } };
}

const ehFim = (e: EventoExecucao) => e.tipo === "fim" || e.tipo === "erro";
const ehPergunta = (e: EventoExecucao) => e.tipo === "pergunta";

describe("preparar pelo site (AC6, AC8)", () => {
  it("mostra o andamento ao vivo, reapresenta tudo ao reconectar e para como o Ctrl+C", async () => {
    let liberar: () => void = () => undefined;
    const vaga = umaVaga({ id: 1 as never, empresa: "Acme", cargo: "Dev" });
    const preparar: CasosDeUso["prepararVagas"] = async (entrada, progresso, sinal) => {
      expect(entrada).toEqual({ forcar: true, reavaliar: false, paralelo: 3 });
      progresso.emitir({ tipo: "inicio", total: 1, paralelo: 3 });
      progresso.emitir({ tipo: "etapa", vaga, etapa: "analisar" });
      await new Promise<void>((resolver) => {
        liberar = resolver;
        sinal.addEventListener("abort", () => {
          resolver();
        });
      });
      progresso.emitir({ tipo: "concluida", vaga, erro: null });
      const resumo: ResumoPreparo = {
        processadas: 1,
        contagens: { NOVA: 1 },
        erros: [],
        reavaliadas: 0,
        interrompido: sinal.aborted ? "cancelado" : null,
      };
      return resumo;
    };
    const agente = montarAgente(container({ prepararVagas: preparar }));
    await agente.parear();

    expect((await agente.post("/execucoes/preparar", { paralelo: 9 })).status).toBe(422);
    const criada = await agente.post("/execucoes/preparar", { forcar: true, paralelo: 3 });
    expect(criada.status).toBe(202);
    const { id } = (await criada.json()) as { id: string };

    const stream = await agente.requisitar(`/execucoes/${id}/eventos`);
    expect(stream.headers.get("content-type")).toContain("text/event-stream");
    const eventos = lerEventos(stream);
    const vistos = await ate(eventos, (e) => e.tipo === "progresso" && e.evento.tipo === "etapa");
    expect(vistos).toEqual([
      { tipo: "progresso", evento: { tipo: "inicio", total: 1, paralelo: 3 } },
      {
        tipo: "progresso",
        evento: {
          tipo: "etapa",
          etapa: "analisar",
          vaga: { id: 1, empresa: "Acme", cargo: "Dev", status: "NOVA", motivo: null },
        },
      },
    ]);

    const segundo = await agente.post("/execucoes/preparar");
    expect(segundo.status).toBe(409);
    expect(await segundo.json()).toEqual({
      mensagem: "Já tem um preparar rodando. Bora esperar ele terminar?",
    });
    expect(await (await agente.requisitar("/execucoes/ativas")).json()).toMatchObject({
      execucoes: [{ id, comando: "preparar" }],
    });

    // Recarregar a página: um stream novo começa do primeiro evento.
    const recarga = lerEventos(await agente.requisitar(`/execucoes/${id}/eventos`));
    expect(await ate(recarga, (e) => e.tipo === "progresso" && e.evento.tipo === "etapa")).toEqual(
      vistos,
    );

    expect(await (await agente.post(`/execucoes/${id}/cancelar`)).json()).toEqual({
      estado: "cancelando",
    });
    const resto = await ate(eventos, ehFim);
    expect(resto.at(-1)).toMatchObject({
      tipo: "fim",
      resultado: { comando: "preparar", interrompido: "cancelado" },
    });
    expect(await ate(recarga)).toEqual(resto);
    expect((await agente.requisitar("/execucoes/nada/eventos")).status).toBe(404);

    // Terminado, a trava sai e um novo preparar pode começar.
    const novo = await agente.post("/execucoes/preparar", { forcar: true, paralelo: 3 });
    expect(novo.status).toBe(202);
    liberar();
  });

  it("com um preparar da CLI rodando (trava de outro processo vivo), o site recebe 409", async () => {
    const c = container();
    mkdirSync(c.caminhos.travasDir, { recursive: true });
    writeFileSync(join(c.caminhos.travasDir, "preparar.lock"), String(process.ppid));
    const agente = montarAgente(c);
    await agente.parear();
    const r = await agente.post("/execucoes/preparar");
    expect(r.status).toBe(409);
    expect(((await r.json()) as { mensagem: string }).mensagem).toContain("Já tem um preparar");
  });
});

describe("aplicar pelo site (AC7)", () => {
  async function ambiente() {
    const formulario = new FormularioAbertoFake({
      valores: [
        { rotulo: "First Name", valor: "Ana", ehArquivo: false },
        { rotulo: "Por que você quer trabalhar aqui?", valor: "", ehArquivo: false },
      ],
    });
    const conector = new ConectorFake("greenhouse", formulario);
    conector.campos = [
      { id: "fn", rotulo: "First Name", tipo: "texto", obrigatorio: true, categoria: "padrao" },
      {
        id: "q1",
        rotulo: "Por que você quer trabalhar aqui?",
        tipo: "textarea",
        obrigatorio: true,
        categoria: "pergunta",
      },
    ];
    const amb = criarAmbienteAplicacao({ catalogo: new CatalogoConectoresFake(conector) });
    amb.gerador
      .sempre("analisar-vaga", umaAnalise())
      .sempre("tailoring", umCurriculoGerado())
      .sempre("responder-perguntas", {
        respostas: [{ campoId: "q1", valor: "Admiro o produto." }],
        salarios: [],
      });
    const url = "https://job-boards.greenhouse.io/acme/jobs/1";
    amb.extrator.definir(url, {
      estruturada: { empresa: "Acme", cargo: "Dev", descricao: "TypeScript", localidade: "Remoto" },
      textoPagina: "TypeScript",
    });
    const vaga = amb.inserirVaga(url);
    await prepararVagas(
      amb.deps(),
      { forcar: false, reavaliar: false },
      new AbortController().signal,
    );
    expect(amb.vagas.buscar(vaga.id)?.status).toBe("PRONTA");
    const aplicar: CasosDeUso["aplicarVagas"] = (entrada, interacao, sinal) =>
      aplicarVagas({ ...amb.deps(), interacao }, entrada, sinal);
    const agente = montarAgente(container({ aplicarVagas: aplicar }));
    await agente.parear();
    return { agente, formulario, amb, vaga };
  }

  async function ateMenu(agente: Awaited<ReturnType<typeof ambiente>>["agente"], corpo = {}) {
    const { id } = (await (await agente.post("/execucoes/aplicar", corpo)).json()) as {
      id: string;
    };
    const eventos = lerEventos(await agente.requisitar(`/execucoes/${id}/eventos`));
    const vistos = await ate(eventos, ehPergunta);
    const pergunta = (vistos.at(-1) as { pergunta: Pergunta }).pergunta;
    return { id, eventos, vistos, pergunta };
  }

  it("revisão com respostas vazias destacadas; só a pergunta pendente aceita resposta; envio só por enviar", async () => {
    const { agente, formulario, amb, vaga } = await ambiente();
    const { id, eventos, vistos, pergunta } = await ateMenu(agente);
    const revisao = vistos.find((e) => e.tipo === "revisao");
    expect(revisao).toMatchObject({
      resumo: { empresa: "Acme", rota: "conector", urlPdf: null },
    });
    expect(revisao?.tipo === "revisao" && revisao.resumo.respostas).toContainEqual(
      expect.objectContaining({ rotulo: "Por que você quer trabalhar aqui?", vaziaNaPagina: true }),
    );
    expect(pergunta).toMatchObject({ tipo: "escolha", mensagem: "O que fazer com esta vaga?" });
    expect(pergunta.opcoes?.map((o) => o.valor)).toEqual([
      "enviar",
      "pular",
      "manual",
      "ver_pdf",
      "sair",
    ]);
    expect(formulario.enviados).toBe(0);

    const errada = await agente.post(`/execucoes/${id}/respostas`, {
      perguntaId: "outra",
      valor: "enviar",
    });
    expect(errada.status).toBe(409);
    const foraDasOpcoes = await agente.post(`/execucoes/${id}/respostas`, {
      perguntaId: pergunta.id,
      valor: "apagar",
    });
    expect(foraDasOpcoes.status).toBe(422);
    expect(formulario.enviados).toBe(0);

    const enviar = await agente.post(`/execucoes/${id}/respostas`, {
      perguntaId: pergunta.id,
      valor: "enviar",
    });
    expect(enviar.status).toBe(200);
    const fim = await ate(eventos, ehFim);
    expect(fim).toContainEqual({ tipo: "respondida", perguntaId: pergunta.id });
    expect(fim.at(-1)).toMatchObject({
      resultado: { comando: "aplicar", desfechos: { enviada: 1 } },
    });
    expect(formulario.enviados).toBe(1);
    expect(amb.vagas.buscar(vaga.id)?.status).toBe("ENVIADA");
    expect(
      (
        await agente.post(`/execucoes/${id}/respostas`, {
          perguntaId: pergunta.id,
          valor: "enviar",
        })
      ).status,
    ).toBe(409);
  });

  it("simular nunca envia, nem escolhendo enviar; pular não envia", async () => {
    const { agente, formulario } = await ambiente();
    const simulado = await ateMenu(agente, { simular: true });
    expect(simulado.vistos[0]).toEqual({
      tipo: "aviso",
      mensagem: "Modo simulação: preenche e revisa, mas nada é enviado.",
    });
    await agente.post(`/execucoes/${simulado.id}/respostas`, {
      perguntaId: simulado.pergunta.id,
      valor: "enviar",
    });
    expect((await ate(simulado.eventos, ehFim)).at(-1)).toMatchObject({
      resultado: { desfechos: { mantida: 1 } },
    });

    const pulado = await ateMenu(agente);
    await agente.post(`/execucoes/${pulado.id}/respostas`, {
      perguntaId: pulado.pergunta.id,
      valor: "pular",
    });
    expect((await ate(pulado.eventos, ehFim)).at(-1)).toMatchObject({
      resultado: { desfechos: { pulada: 1 } },
    });
    expect(formulario.enviados).toBe(0);
  });

  it("cancelar com uma pergunta pendente encerra sem enviar", async () => {
    const { agente, formulario } = await ambiente();
    const { id, eventos } = await ateMenu(agente);
    await agente.post(`/execucoes/${id}/cancelar`);
    expect((await ate(eventos, ehFim)).at(-1)).toMatchObject({
      resultado: { comando: "aplicar", interrompido: "cancelado" },
    });
    expect(formulario.enviados).toBe(0);
  });
});

describe("importar e renderizar master pelo site (AC5)", () => {
  it("importa o upload por um temporário apagado no fim e recusa formato e tamanho", async () => {
    const recebidos: { ehPdf: boolean; texto?: string; sobrescrever: boolean }[] = [];
    const importar: CasosDeUso["importarCurriculo"] = (entrada) => {
      recebidos.push(entrada);
      return Promise.resolve({ criados: [], master: umMaster() });
    };
    const c = container({ importarCurriculo: importar });
    const agente = montarAgente(c);
    await agente.parear();
    const enviar = (
      nome: string,
      conteudo: string | Uint8Array<ArrayBuffer>,
      sobrescrever = false,
    ) => {
      const corpo = new FormData();
      corpo.set("arquivo", new File([conteudo], nome));
      corpo.set("sobrescrever", String(sobrescrever));
      return agente.requisitar("/execucoes/importar", { method: "POST", body: corpo });
    };

    const criada = await enviar("cv.md", "# Ana Exemplo da Silva", true);
    expect(criada.status).toBe(202);
    const { id } = (await criada.json()) as { id: string };
    const fim = await ate(lerEventos(await agente.requisitar(`/execucoes/${id}/eventos`)), ehFim);
    expect(fim.at(-1)).toEqual({
      tipo: "fim",
      resultado: {
        comando: "importar",
        master: "curriculo/master.yaml",
        criados: [],
        experiencias: umMaster().experiencias.length,
        skills: umMaster().skills.length,
      },
    });
    expect(recebidos).toMatchObject([
      { ehPdf: false, texto: "# Ana Exemplo da Silva", sobrescrever: true },
    ]);
    expect(readdirSync(c.caminhos.tmpDir).filter((a) => a.startsWith("importar-"))).toEqual([]);

    expect((await enviar("cv.odt", "x")).status).toBe(422);
    expect((await enviar("cv.pdf", new Uint8Array(10 * 1024 * 1024 + 1))).status).toBe(413);
    expect(recebidos).toHaveLength(1);
  });

  it("renderizar master devolve o link de uso único do PDF", async () => {
    const c = container();
    const pdf = join(c.caminhos.masterDir, "Ana-Curriculo.pdf");
    const renderizar: CasosDeUso["renderizarMaster"] = () => {
      mkdirSync(c.caminhos.masterDir, { recursive: true });
      writeFileSync(pdf, "%PDF");
      return Promise.resolve({ pdf, paginas: 3 });
    };
    const agente = montarAgente({ ...c, casos: { ...c.casos, renderizarMaster: renderizar } });
    await agente.parear();
    const { id } = (await (await agente.post("/execucoes/renderizar-master")).json()) as {
      id: string;
    };
    const eventos = await ate(
      lerEventos(await agente.requisitar(`/execucoes/${id}/eventos`)),
      ehFim,
    );
    expect(eventos[0]).toMatchObject({
      tipo: "aviso",
      mensagem: expect.stringContaining("2 páginas"),
    });
    const fim = eventos.at(-1);
    expect(fim).toMatchObject({ resultado: { comando: "renderizar_master", paginas: 3 } });
    const url =
      fim?.tipo === "fim" && fim.resultado.comando === "renderizar_master"
        ? fim.resultado.urlPdf
        : "";
    agente.semToken();
    expect(await (await agente.requisitar(url)).text()).toBe("%PDF");
    expect(existsSync(pdf)).toBe(true);
  });
});

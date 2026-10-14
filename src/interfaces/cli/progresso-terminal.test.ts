import { stripVTControlCharacters } from "node:util";
import { describe, expect, it } from "vitest";
import type { IdVaga } from "#dominio/vagas/vaga.ts";
import { umaVaga } from "#testes/apoio/builders.ts";
import type { RegiaoViva } from "./contexto.ts";
import { ProgressoTerminal } from "./progresso-terminal.ts";
import { criarSaidaTerminal, type FluxoTerminal } from "./saida-terminal.ts";

const puro = (texto: string): string => stripVTControlCharacters(texto);

function relogio() {
  const estado = { ms: 0 };
  return {
    agora: () => estado.ms,
    avancar: (ms: number) => {
      estado.ms += ms;
    },
  };
}

describe("ProgressoTerminal sem região viva", () => {
  it("escreve no stderr uma linha por etapa e a conclusão com a duração", () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const r = relogio();
    const progresso = new ProgressoTerminal({
      saida: { escrever: (t) => stdout.push(t), erro: (t) => stderr.push(puro(t)) },
      agora: r.agora,
    });
    const vaga = umaVaga({ id: 3 as IdVaga, urlOriginal: "https://www.linkedin.com/jobs/view/1" });
    const extraida = { ...vaga, empresa: "Acme ", cargo: "Dev" };

    progresso.emitir({ tipo: "inicio", total: 2, paralelo: 2 });
    progresso.emitir({ tipo: "etapa", vaga, etapa: "resolver" });
    r.avancar(5_000);
    progresso.emitir({ tipo: "etapa", vaga: extraida, etapa: "analisar" });
    r.avancar(130_000);
    progresso.emitir({
      tipo: "concluida",
      vaga: { ...extraida, status: "PRONTA", aderencia: 85 },
      erro: null,
    });
    progresso.encerrar();

    expect(stdout).toEqual([]);
    expect(stderr).toEqual([
      "Preparando 2 vaga(s), 2 por vez. Cada uma leva alguns minutos (várias chamadas ao Claude).",
      "  #3 linkedin.com: resolvendo o link…",
      "  #3 Acme · Dev: analisando a aderência…",
      "✓ #3 Acme · Dev: PRONTA, aderência 85 (2m15s)",
    ]);
  });
});

describe("ProgressoTerminal com região viva", () => {
  function montar(colunas = 80) {
    const quadros: string[][] = [];
    const fixas: string[] = [];
    const controle = { tique: (): void => undefined, paradas: 0 };
    const regiao: RegiaoViva = {
      desenhar: (linhas) => quadros.push(linhas.map(puro)),
      colunas: () => colunas,
    };
    const r = relogio();
    const progresso = new ProgressoTerminal({
      saida: { escrever: () => undefined, erro: (t) => fixas.push(puro(t)), regiaoViva: regiao },
      agora: r.agora,
      repetir: (fn) => {
        controle.tique = fn;
        return () => {
          controle.paradas++;
        };
      },
    });
    return { progresso, quadros, fixas, controle, r };
  }

  it("anima uma linha por vaga em andamento mais o rodapé; a conclusão sai fixa acima", () => {
    const { progresso, quadros, fixas, controle, r } = montar();
    const a = umaVaga({ id: 1 as IdVaga, empresa: "Acme", cargo: "Dev" });
    const b = umaVaga({ id: 2 as IdVaga, empresa: "Beta", cargo: "QA" });

    progresso.emitir({ tipo: "inicio", total: 2, paralelo: 2 });
    progresso.emitir({ tipo: "etapa", vaga: a, etapa: "analisar" });
    r.avancar(1_000);
    progresso.emitir({ tipo: "etapa", vaga: b, etapa: "extrair" });
    r.avancar(41_000);
    controle.tique();
    expect(quadros.at(-1)).toEqual([
      "⠙ #1 Acme · Dev: analisando a aderência… 42s",
      "⠙ #2 Beta · QA: lendo a vaga… 41s",
      "  0 de 2 concluída(s) · 42s no total",
    ]);

    progresso.emitir({
      tipo: "concluida",
      vaga: { ...a, status: "ERRO_PREPARO", motivo: "llm_falhou" },
      erro: "tempo esgotado",
    });
    expect(fixas.at(-1)).toBe("✗ #1 Acme · Dev: ERRO_PREPARO llm_falhou — tempo esgotado (42s)");
    expect(quadros.at(-1)).toEqual([
      "⠙ #2 Beta · QA: lendo a vaga… 41s",
      "  1 de 2 concluída(s) · 42s no total",
    ]);

    progresso.encerrar();
    progresso.encerrar();
    expect(quadros.at(-1)).toEqual([]);
    expect(controle.paradas).toBe(1);
    // As etapas só aparecem na região: fixas ficam o cabeçalho e a conclusão.
    expect(fixas).toHaveLength(2);
  });

  it("corta o rótulo para a linha caber na largura do terminal", () => {
    const { progresso, quadros } = montar(40);
    progresso.emitir({ tipo: "inicio", total: 1, paralelo: 1 });
    progresso.emitir({
      tipo: "etapa",
      vaga: umaVaga({ empresa: "Empresa com um nome bem comprido", cargo: "Desenvolvedora" }),
      etapa: "gerar_curriculo",
    });
    const linhas = quadros.at(-1) ?? [];
    expect(linhas[0]).toMatch(/…: gerando o currículo… 0s$/);
    for (const linha of linhas) expect(linha.length).toBeLessThan(40);
  });
});

describe("criarSaidaTerminal", () => {
  function fluxo(isTTY: boolean) {
    const escrito: string[] = [];
    const f: FluxoTerminal = { write: (t) => escrito.push(t), isTTY, columns: 100 };
    return { escrito, fluxo: f };
  }

  it("sem stderr interativo, escreve linhas comuns e não oferece região viva", () => {
    const out = fluxo(true);
    const err = fluxo(false);
    const saida = criarSaidaTerminal(out.fluxo, err.fluxo);
    saida.escrever("resumo");
    saida.erro("aviso");
    expect(saida.regiaoViva).toBeUndefined();
    expect(out.escrito).toEqual(["resumo\n"]);
    expect(err.escrito).toEqual(["aviso\n"]);
  });

  it("com stderr interativo, redesenha a região no lugar e escreve acima dela", () => {
    const out = fluxo(true);
    const err = fluxo(true);
    const saida = criarSaidaTerminal(out.fluxo, err.fluxo);
    const regiao = saida.regiaoViva;
    expect(regiao?.colunas()).toBe(100);

    regiao?.desenhar(["a", "b"]);
    regiao?.desenhar(["c"]);
    saida.erro("aviso");
    saida.escrever("resumo");
    regiao?.desenhar([]);
    regiao?.desenhar([]);

    expect(err.escrito).toEqual([
      "a\nb\n",
      "\x1b[2A\x1b[0Jc\n",
      "\x1b[1A\x1b[0Javiso\nc\n",
      "\x1b[1A\x1b[0J",
      "c\n",
      "\x1b[1A\x1b[0J",
    ]);
    expect(out.escrito).toEqual(["resumo\n"]);
  });
});

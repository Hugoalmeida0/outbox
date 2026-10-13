import { CommanderError } from "commander";
import { describe, expect, it } from "vitest";
import { ErroLimiteUso } from "#aplicacao/portas/erros.ts";
import { ErroTransicaoInvalida, ErroUsuario } from "#dominio/compartilhado/erros.ts";
import { codigoDoErro, ehErroPrevisto, mensagemDoErro } from "./codigos-saida.ts";
import { instalarSinais, type AlvoSinais } from "./sinais.ts";

function erroNomeado(nome: string): Error {
  const erro = new Error("x");
  erro.name = nome;
  return erro;
}

describe("codigos-saida (AC30)", () => {
  it.each([
    [new ErroUsuario("arquivo não encontrado"), 2],
    [new CommanderError(1, "commander.unknownCommand", "x"), 2],
    [new CommanderError(0, "commander.helpDisplayed", "x"), 0],
    [new ErroTransicaoInvalida("NOVA", "OFERTA", ["PRONTA"]), 1],
    [new ErroLimiteUso(), 1],
    [new Error("bug"), 1],
    ["string lançada", 1],
    [erroNomeado("ExitPromptError"), 130],
    [erroNomeado("AbortPromptError"), 130],
  ])("%o → %i", (erro, codigo) => {
    expect(codigoDoErro(erro)).toBe(codigo);
  });

  it("mensagens: previstas mostram o texto, inesperadas apontam o log e o commander fala por si", () => {
    expect(mensagemDoErro(new ErroUsuario("master.yaml já existe"))).toBe("master.yaml já existe");
    expect(mensagemDoErro(new Error("boom"))).toBe("erro inesperado: boom (stack em dados/logs/)");
    expect(mensagemDoErro(42)).toBe("erro inesperado (stack em dados/logs/)");
    expect(mensagemDoErro(new CommanderError(1, "c", "x"))).toBeNull();
    expect(mensagemDoErro(erroNomeado("ExitPromptError"))).toBe("interrompido");
    expect(ehErroPrevisto(new ErroUsuario("x"))).toBe(true);
    expect(ehErroPrevisto(new Error("x"))).toBe(false);
  });
});

describe("sinais (AC26)", () => {
  function alvoFalso() {
    const ouvintes = new Set<() => void>();
    const alvo: AlvoSinais = {
      on: (_e, f) => ouvintes.add(f),
      off: (_e, f) => ouvintes.delete(f),
    };
    return { alvo, disparar: () => [...ouvintes].forEach((f) => f()), ouvintes };
  }

  it("primeiro Ctrl+C aborta e avisa; o segundo sai com 130; remover desinstala", () => {
    const { alvo, disparar, ouvintes } = alvoFalso();
    const controle = new AbortController();
    const avisos: string[] = [];
    const saidas: number[] = [];
    const remover = instalarSinais(
      controle,
      (m) => avisos.push(m),
      (c) => saidas.push(c),
      alvo,
    );
    disparar();
    expect(controle.signal.aborted).toBe(true);
    expect(avisos).toEqual(["encerrando… (Ctrl+C de novo para forçar)"]);
    expect(saidas).toEqual([]);
    disparar();
    expect(saidas).toEqual([130]);
    remover();
    expect(ouvintes.size).toBe(0);
  });
});

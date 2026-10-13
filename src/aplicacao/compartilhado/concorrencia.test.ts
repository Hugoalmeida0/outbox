import { describe, expect, it } from "vitest";
import { executarComLimite } from "./concorrencia.ts";
import { ErroLimiteUso } from "../portas/erros.ts";

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("executarComLimite", () => {
  it("respeita o limite de execuções simultâneas", async () => {
    let ativos = 0;
    let pico = 0;
    const feitos: number[] = [];
    await executarComLimite(
      [1, 2, 3, 4, 5],
      2,
      async (n) => {
        ativos++;
        pico = Math.max(pico, ativos);
        await esperar(5);
        feitos.push(n);
        ativos--;
      },
      new AbortController().signal,
    );
    expect(pico).toBe(2);
    expect(feitos.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("para de iniciar itens e relança ErroLimiteUso depois dos em andamento", async () => {
    const iniciados: number[] = [];
    const promessa = executarComLimite(
      [1, 2, 3, 4, 5, 6],
      2,
      async (n) => {
        iniciados.push(n);
        await esperar(n === 1 ? 20 : 1);
        if (n === 2) throw new ErroLimiteUso();
      },
      new AbortController().signal,
    );
    await expect(promessa).rejects.toBeInstanceOf(ErroLimiteUso);
    expect(iniciados).toEqual([1, 2]);
  });

  it("para de iniciar itens quando o sinal aborta", async () => {
    const controle = new AbortController();
    const iniciados: number[] = [];
    await executarComLimite(
      [1, 2, 3],
      1,
      (n) => {
        iniciados.push(n);
        controle.abort();
        return Promise.resolve();
      },
      controle.signal,
    );
    expect(iniciados).toEqual([1]);
  });

  it("propaga outros erros e lida com lista vazia", async () => {
    await expect(
      executarComLimite(
        [1],
        2,
        () => Promise.reject(new Error("boom")),
        new AbortController().signal,
      ),
    ).rejects.toThrow("boom");
    await expect(
      executarComLimite([], 2, () => Promise.resolve(), new AbortController().signal),
    ).resolves.toBeUndefined();
  });
});

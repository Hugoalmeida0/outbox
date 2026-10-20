import { describe, expect, it } from "vitest";
import { ErroValidacao } from "../compartilhado/erros.ts";
import {
  contarTentativaPreparo,
  marcarAnexoManual,
  registrarAderencia,
  registrarAnalise,
  registrarCurriculo,
  registrarExtracao,
  registrarResolucao,
  reiniciarTentativasPreparo,
} from "./atualizacoes.ts";
import type { Motor } from "./motores.ts";
import type { UrlCanonica } from "./vaga.ts";

describe("atualizações da vaga", () => {
  it("resolução só troca a URL canônica quando informada", () => {
    const base = { motor: "gupy" as Motor, urlResolvida: "https://x", rota: "conector" as const };
    expect(registrarResolucao(base)).not.toHaveProperty("urlCanonica");
    expect(registrarResolucao({ ...base, urlCanonica: "https://c" as UrlCanonica })).toMatchObject({
      urlCanonica: "https://c",
    });
  });

  it("extração normaliza ausentes para null e a análise deriva a chave de dedup", () => {
    const extracao = { empresa: "Acme", cargo: "Desenvolvedor(a)" };
    expect(registrarExtracao(extracao)).toEqual({
      empresa: "Acme",
      cargo: "Desenvolvedor(a)",
      localidade: null,
      publicadaEm: null,
    });
    expect(registrarAnalise("pt", extracao)).toEqual({
      idioma: "pt",
      chaveDedup: "acme|desenvolvedor|",
    });
  });

  it.each([-1, 101, 50.5])("recusa score fora de 0 a 100: %s", (score) => {
    expect(() => registrarAderencia(score)).toThrow(ErroValidacao);
    expect(() => registrarCurriculo({ antes: score, depois: 10, camaleaoFalhou: false })).toThrow(
      ErroValidacao,
    );
  });

  it("aceita scores válidos e null", () => {
    expect(registrarAderencia(null)).toEqual({ aderencia: null });
    expect(registrarCurriculo({ antes: 0, depois: 100, camaleaoFalhou: true })).toEqual({
      atsAntes: 0,
      atsDepois: 100,
      camaleaoFalhou: "lastro",
    });
  });

  it("conta e reinicia tentativas; marca anexo manual", () => {
    expect(contarTentativaPreparo({ tentativasPreparo: 2 })).toEqual({ tentativasPreparo: 3 });
    expect(reiniciarTentativasPreparo()).toEqual({ tentativasPreparo: 0 });
    expect(marcarAnexoManual()).toEqual({ anexoManual: true });
  });
});

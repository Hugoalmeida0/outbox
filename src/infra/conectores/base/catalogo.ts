import type { CatalogoConectores } from "#aplicacao/portas/catalogo-conectores.ts";
import type { ConectorAts } from "#aplicacao/portas/conector-ats.ts";
import type { Motor } from "#dominio/vagas/motores.ts";
import { criarConector, type DefinicaoConector, type DepsConector } from "./conector-formulario.ts";

/** Catálogo de conectores por motor (Registry): instancia cada conector sob demanda. */
export class CatalogoConectoresPlaywright implements CatalogoConectores {
  private readonly definicoes: ReadonlyMap<Motor, DefinicaoConector>;
  private readonly deps: DepsConector;
  private readonly cache = new Map<Motor, ConectorAts>();

  constructor(definicoes: readonly DefinicaoConector[], deps: DepsConector) {
    this.definicoes = new Map(definicoes.map((d) => [d.motor, d]));
    this.deps = deps;
  }

  para(motor: Motor): ConectorAts | null {
    const existente = this.cache.get(motor);
    if (existente) return existente;
    const definicao = this.definicoes.get(motor);
    if (!definicao) return null;
    const conector = criarConector(definicao, this.deps);
    this.cache.set(motor, conector);
    return conector;
  }
}

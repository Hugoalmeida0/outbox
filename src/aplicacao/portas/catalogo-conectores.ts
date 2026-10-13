import type { Motor } from "#dominio/vagas/motores.ts";
import type { ConectorAts } from "./conector-ats.ts";

/** Catálogo de conectores por motor (Registry, ADR-010). */
export interface CatalogoConectores {
  para(motor: Motor): ConectorAts | null;
}

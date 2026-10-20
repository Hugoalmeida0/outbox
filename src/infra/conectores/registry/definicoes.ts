import type { DefinicaoConector } from "#infra/conectores/base/conector-formulario.ts";
import { definicaoAshby } from "#infra/conectores/strategy/ashby/conector.ts";
import { definicaoGreenhouse } from "#infra/conectores/strategy/greenhouse/conector.ts";
import { definicaoGupy } from "#infra/conectores/strategy/gupy/conector.ts";
import { definicaoInhire } from "#infra/conectores/strategy/inhire/conector.ts";
import { definicaoLever } from "#infra/conectores/strategy/lever/conector.ts";
import { definicaoSmartRecruiters } from "#infra/conectores/strategy/smartrecruiters/conector.ts";
import { definicaoTeamtailor } from "#infra/conectores/strategy/teamtailor/conector.ts";
import { definicaoWorkable } from "#infra/conectores/strategy/workable/conector.ts";

/** Os 8 conectores da v1 (MOTORES_COM_CONECTOR_V1). Um conector novo entra aqui e em seu diretório. */
export const DEFINICOES_V1: readonly DefinicaoConector[] = [
  definicaoGreenhouse,
  definicaoLever,
  definicaoAshby,
  definicaoGupy,
  definicaoInhire,
  definicaoSmartRecruiters,
  definicaoWorkable,
  definicaoTeamtailor,
];

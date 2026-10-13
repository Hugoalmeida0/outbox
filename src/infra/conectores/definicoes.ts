import type { DefinicaoConector } from "./base/conector-formulario.ts";
import { definicaoAshby } from "./ashby/conector.ts";
import { definicaoGreenhouse } from "./greenhouse/conector.ts";
import { definicaoGupy } from "./gupy/conector.ts";
import { definicaoInhire } from "./inhire/conector.ts";
import { definicaoLever } from "./lever/conector.ts";
import { definicaoSmartRecruiters } from "./smartrecruiters/conector.ts";
import { definicaoTeamtailor } from "./teamtailor/conector.ts";
import { definicaoWorkable } from "./workable/conector.ts";

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

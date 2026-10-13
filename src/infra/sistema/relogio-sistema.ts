import type { Relogio } from "#aplicacao/portas/relogio.ts";

function doisDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

/** Formata uma data em ISO 8601 com o offset local (ex.: 2026-10-09T14:03:00-03:00). */
export function isoLocal(data: Date): string {
  const offsetMin = -data.getTimezoneOffset();
  const sinal = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const offset = `${sinal}${doisDigitos(Math.floor(abs / 60))}:${doisDigitos(abs % 60)}`;
  return (
    `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}` +
    `T${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}:${doisDigitos(data.getSeconds())}${offset}`
  );
}

export class RelogioSistema implements Relogio {
  agora(): Date {
    return new Date();
  }

  agoraIso(): string {
    return isoLocal(new Date());
  }

  hoje(): string {
    return isoLocal(new Date()).slice(0, 10);
  }
}

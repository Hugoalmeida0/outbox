/** Fonte única de data e hora (permite testes determinísticos). */
export interface Relogio {
  agora(): Date;
  /** ISO 8601 com offset local, ex.: 2026-10-09T14:03:00-03:00. */
  agoraIso(): string;
  /** Data local AAAA-MM-DD. */
  hoje(): string;
}

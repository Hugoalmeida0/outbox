import { styleText } from "node:util";

type Formato = Parameters<typeof styleText>[0];

// styleText só aplica cor quando a saída suporta (TTY, sem NO_COLOR); em pipes e testes sai texto puro.
const pintar =
  (formato: Formato) =>
  (texto: string): string =>
    styleText(formato, texto);

export const cores = {
  vermelho: pintar("red"),
  verde: pintar("green"),
  amarelo: pintar("yellow"),
  ciano: pintar("cyan"),
  cinza: pintar("gray"),
  negrito: pintar("bold"),
} as const;

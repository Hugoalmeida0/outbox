import { readFileSync } from "node:fs";

/** Versão do `package.json` (exibida no `--version` e devolvida em `GET /saude`). */
export function versaoDoPacote(): string {
  const pacote = JSON.parse(
    readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
  ) as { version?: string };
  return pacote.version ?? "0.0.0";
}

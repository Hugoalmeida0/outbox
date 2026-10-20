#!/usr/bin/env node
// Executável do Camaleão. Filtra apenas os avisos experimentais esperados (node:sqlite e type stripping)
// antes de qualquer import e delega para a CLI em TypeScript, executada nativamente pelo Node 24 (ADR-004).
const emitirAvisoOriginal = process.emitWarning.bind(process);

process.emitWarning = (aviso, ...resto) => {
  const texto = typeof aviso === "string" ? aviso : (aviso?.message ?? "");
  if (/SQLite|Type Stripping/i.test(texto)) return;
  emitirAvisoOriginal(aviso, ...resto);
};

const { executar } = await import("../src/interfaces/cli/principal.ts");
process.exitCode = await executar(process.argv);

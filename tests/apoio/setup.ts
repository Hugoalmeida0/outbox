// Bloqueia rede externa em todos os testes (arquitetura.md §11.1). Só 127.0.0.1/localhost passam,
// para os testes de integração do cliente HTTP com servidor local.
const fetchOriginal = globalThis.fetch;

const HOSTS_LOCAIS = new Set(["127.0.0.1", "localhost", "[::1]"]);

function hostDe(entrada: Parameters<typeof fetch>[0]): string {
  const url =
    typeof entrada === "string" ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
  return new URL(url).hostname;
}

globalThis.fetch = async (entrada: Parameters<typeof fetch>[0], init?: RequestInit) => {
  if (!HOSTS_LOCAIS.has(hostDe(entrada))) {
    throw new Error("rede bloqueada em testes");
  }
  return fetchOriginal(entrada, init);
};

// Mesmo filtro do bin/camaleao.js: o aviso experimental do node:sqlite é esperado.
const emitirAvisoOriginal = process.emitWarning.bind(process) as (...args: unknown[]) => void;
process.emitWarning = (aviso: string | Error, ...resto: unknown[]): void => {
  const texto = typeof aviso === "string" ? aviso : aviso.message;
  if (/SQLite/i.test(texto)) return;
  emitirAvisoOriginal(aviso, ...resto);
};

// Executa um comando da CLI registrando cada módulo resolvido e imprime { codigo, carregados } em JSON.
// Uso: node tests/apoio/espiar-modulos.ts <raiz-temporaria> <comando> [args...]
import { registerHooks } from "node:module";

const carregados: string[] = [];
registerHooks({
  resolve(especificador, contexto, proximo) {
    const resultado = proximo(especificador, contexto);
    carregados.push(resultado.url);
    return resultado;
  },
});

const [raiz, ...args] = process.argv.slice(2);
if (raiz === undefined) throw new Error("informe a raiz temporária");
const { criarContainer } = await import("#composicao");
const { executar } = await import("#interfaces/cli/principal.ts");
const codigo = await executar(["node", "outbox", ...args], {
  saida: { escrever: () => undefined, erro: () => undefined },
  fabricarContainer: () => criarContainer({ raiz }),
});
process.stdout.write(JSON.stringify({ codigo, carregados }));

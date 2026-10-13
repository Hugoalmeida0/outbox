// Captura uma página real como fixture sanitizada para os testes de conector (spec T13).
// Uso: npm run capturar-fixture -- <url> <motor> <nome> [--sobrescrever]
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { ErroUsuario } from "#dominio/compartilhado/erros.ts";
import { listaPii } from "#dominio/falhas/pii.ts";
import { sanitizarHtml } from "#dominio/falhas/sanitizar.ts";
import { ArmazemCurriculoYaml } from "#infra/armazenamento/armazem-curriculo-yaml.ts";
import { carregarConfig } from "#infra/config/carregar-config.ts";
import { NavegadorOutbox } from "#infra/navegador/navegador-outbox.ts";
import { criarCaminhos, RAIZ } from "#infra/sistema/caminhos.ts";
import { escreverAtomico } from "#infra/sistema/escrita-atomica.ts";
import { isoLocal, RelogioSistema } from "#infra/sistema/relogio-sistema.ts";

export interface ArgumentosCaptura {
  readonly url: string;
  readonly motor: string;
  readonly nome: string;
  readonly sobrescrever: boolean;
}

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

export function lerArgumentos(argv: readonly string[]): ArgumentosCaptura {
  const sobrescrever = argv.includes("--sobrescrever");
  const [url, motor, nome] = argv.filter((a) => a !== "--sobrescrever");
  if (url === undefined || motor === undefined || nome === undefined) {
    throw new ErroUsuario("uso: npm run capturar-fixture -- <url> <motor> <nome> [--sobrescrever]");
  }
  if (!/^https?:\/\//.test(url) || !URL.canParse(url))
    throw new ErroUsuario(`URL inválida: ${url}`);
  if (!SLUG.test(motor)) throw new ErroUsuario(`motor deve ser kebab-case: ${motor}`);
  if (!SLUG.test(nome)) throw new ErroUsuario(`nome deve ser kebab-case: ${nome}`);
  return { url, motor, nome, sobrescrever };
}

/** HTML sanitizado (sem scripts, valores de input nem PII) com a origem e a data num comentário no topo. */
export function montarFixture(
  html: string,
  url: string,
  data: string,
  pii: readonly string[],
): string {
  // "--" encerraria o comentário HTML antes da hora.
  const origem = url.replaceAll("--", "%2D%2D");
  return `<!-- origem: ${origem} | capturada em ${data} -->\n${sanitizarHtml(html, pii)}\n`;
}

async function principal(): Promise<void> {
  const args = lerArgumentos(process.argv.slice(2));
  const destino = join(RAIZ, "tests", "fixtures", args.motor, `${args.nome}.html`);
  if (existsSync(destino) && !args.sobrescrever) {
    throw new ErroUsuario(`${destino} já existe; use --sobrescrever`);
  }
  const caminhos = criarCaminhos();
  const config = carregarConfig(caminhos.config);
  const curriculo = new ArmazemCurriculoYaml(caminhos, new RelogioSistema());
  let pii: string[] = [];
  try {
    const master = curriculo.lerMaster();
    try {
      pii = listaPii(master.pessoal, curriculo.lerPerfil());
    } catch {
      pii = listaPii(master.pessoal);
    }
  } catch {
    process.stderr.write(
      "aviso: sem curriculo/master.yaml; a PII não será redigida por valor (inputs e scripts saem mesmo assim).\n",
    );
  }

  const navegador = new NavegadorOutbox({
    portaCdp: config.navegador.portaCdp,
    executavel: config.navegador.executavel,
    pastaPerfil: caminhos.navegadorDir,
  });
  const pagina = await navegador.paginaNova();
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    await pagina.goto(args.url);
    await terminal.question(
      "Navegue até o estado que quer capturar (formulário aberto) e pressione Enter… ",
    );
    escreverAtomico(
      destino,
      montarFixture(await pagina.content(), args.url, isoLocal(new Date()), pii),
    );
    process.stdout.write(`fixture salva em ${destino}\nRevise o arquivo antes de versionar.\n`);
  } finally {
    terminal.close();
    await pagina.close().catch(() => undefined);
    await navegador.desconectar();
  }
}

if (import.meta.main) {
  principal().catch((erro: unknown) => {
    process.stderr.write(`erro: ${erro instanceof Error ? erro.message : String(erro)}\n`);
    process.exitCode = erro instanceof ErroUsuario ? 2 : 1;
  });
}

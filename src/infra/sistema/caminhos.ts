import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Raiz do repositório, resolvida a partir deste arquivo (src/infra/sistema). */
export const RAIZ = fileURLToPath(new URL("../../../", import.meta.url));

export interface Caminhos {
  readonly raiz: string;
  readonly config: string;
  readonly curriculoDir: string;
  readonly master: string;
  readonly perfil: string;
  readonly respostas: string;
  readonly gaps: string;
  readonly exemplosDir: string;
  readonly dadosDir: string;
  readonly db: string;
  readonly navegadorDir: string;
  readonly credenciais: string;
  readonly vagasDir: string;
  readonly masterDir: string;
  readonly tmpDir: string;
  readonly logsDir: string;
  readonly travasDir: string;
  readonly falhasDir: string;
  readonly promptsDir: string;
  readonly migracoesDir: string;
}

/** Caminhos absolutos do projeto a partir de uma raiz (os testes usam uma raiz temporária). */
export function criarCaminhos(raiz: string = RAIZ, raizCodigo: string = RAIZ): Caminhos {
  const curriculoDir = join(raiz, "curriculo");
  const dadosDir = join(raiz, "dados");
  return {
    raiz,
    config: join(raiz, "config.yaml"),
    curriculoDir,
    master: join(curriculoDir, "master.yaml"),
    perfil: join(curriculoDir, "perfil.yaml"),
    respostas: join(curriculoDir, "respostas.yaml"),
    gaps: join(curriculoDir, "gaps.yaml"),
    exemplosDir: join(raizCodigo, "curriculo.exemplo"),
    dadosDir,
    db: join(dadosDir, "outbox.db"),
    navegadorDir: join(dadosDir, "navegador"),
    credenciais: join(dadosDir, "credenciais.json"),
    vagasDir: join(dadosDir, "vagas"),
    masterDir: join(dadosDir, "master"),
    tmpDir: join(dadosDir, "tmp"),
    logsDir: join(dadosDir, "logs"),
    travasDir: join(dadosDir, "travas"),
    falhasDir: join(raiz, "falhas"),
    promptsDir: join(raizCodigo, "prompts"),
    migracoesDir: join(raizCodigo, "src", "infra", "banco", "migracoes"),
  };
}

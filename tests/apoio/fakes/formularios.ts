// Fakes de formulário, conector, catálogo e agente.
import type { CatalogoConectores } from "#aplicacao/portas/catalogo-conectores.ts";
import type { ConectorAts, CtxPreenchimento } from "#aplicacao/portas/conector-ats.ts";
import { ErroFalhaConector } from "#aplicacao/portas/erros.ts";
import type {
  EntradaAgente,
  ExecutorAgente,
  ResultadoAgente,
} from "#aplicacao/portas/executor-agente.ts";
import type {
  DesfechoEnvio,
  FormularioAberto,
  ValorLido,
} from "#aplicacao/portas/formulario-aberto.ts";
import type { Campo } from "#dominio/respostas/campo.ts";
import type { PacoteCandidatura } from "#dominio/respostas/pacote.ts";
import type { Motor } from "#dominio/vagas/motores.ts";
import type { VagaExtraida } from "#dominio/vagas/vaga-extraida.ts";

export class FormularioAbertoFake implements FormularioAberto {
  readonly rota: "conector" | "agente";
  enviados = 0;
  fechado = false;
  telas: string[] = [];
  valores: ValorLido[];
  desfecho: DesfechoEnvio;
  html = "<html><body><input name='nome' value='Ana Exemplo da Silva'></body></html>";
  private readonly url: string;

  constructor(
    opcoes: {
      rota?: "conector" | "agente";
      valores?: ValorLido[];
      desfecho?: DesfechoEnvio;
      url?: string;
    } = {},
  ) {
    this.rota = opcoes.rota ?? "conector";
    this.valores = opcoes.valores ?? [];
    this.desfecho = opcoes.desfecho ?? "enviada";
    this.url = opcoes.url ?? "https://job-boards.greenhouse.io/empresa/jobs/1";
  }

  urlAtual(): string {
    return this.url;
  }
  capturarTela(destino: string): Promise<void> {
    this.telas.push(destino);
    return Promise.resolve();
  }
  capturarHtml(): Promise<string> {
    return Promise.resolve(this.html);
  }
  lerValores(): Promise<ValorLido[]> {
    return Promise.resolve(this.valores);
  }
  enviar(): Promise<void> {
    this.enviados++;
    return Promise.resolve();
  }
  confirmarEnvio(): Promise<DesfechoEnvio> {
    return Promise.resolve(this.desfecho);
  }
  fechar(): Promise<void> {
    this.fechado = true;
    return Promise.resolve();
  }
}

export class ConectorFake implements ConectorAts {
  readonly motor: Motor;
  readonly versao = "1.0.0";
  formulario: FormularioAbertoFake;
  campos: Campo[] | null = null;
  vagaExtraida: VagaExtraida | null = null;
  camposAoVivo: Campo[] = [];
  falharNoPasso: string | null = null;
  pacotesRecebidos: PacoteCandidatura[] = [];

  constructor(motor: Motor = "greenhouse", formulario = new FormularioAbertoFake()) {
    this.motor = motor;
    this.formulario = formulario;
  }

  extrairVaga(): Promise<VagaExtraida | null> {
    return Promise.resolve(this.vagaExtraida);
  }

  lerCampos(): Promise<Campo[] | null> {
    return Promise.resolve(this.campos);
  }

  async abrirEPreencher(
    _url: string,
    pacote: PacoteCandidatura,
    ctx: CtxPreenchimento,
  ): Promise<FormularioAberto> {
    this.pacotesRecebidos.push(pacote);
    if (this.camposAoVivo.length > 0) await ctx.responderAoVivo(this.camposAoVivo);
    if (this.falharNoPasso !== null) {
      throw new ErroFalhaConector(this.falharNoPasso, "#campo", this.formulario, {
        cause: new Error("seletor não encontrado"),
      });
    }
    return this.formulario;
  }
}

export class CatalogoConectoresFake implements CatalogoConectores {
  private readonly conectores = new Map<Motor, ConectorAts>();

  constructor(...conectores: ConectorAts[]) {
    for (const c of conectores) this.conectores.set(c.motor, c);
  }

  para(motor: Motor): ConectorAts | null {
    return this.conectores.get(motor) ?? null;
  }
}

export class ExecutorAgenteFake implements ExecutorAgente {
  readonly entradas: EntradaAgente[] = [];
  resultado: ResultadoAgente;

  constructor(resultado?: ResultadoAgente) {
    this.resultado = resultado ?? {
      tipo: "pronto",
      formulario: new FormularioAbertoFake({ rota: "agente", desfecho: "indeterminada" }),
      passos: ["abriu", "preencheu"],
      perguntasRespondidasNaHora: [],
    };
  }

  /** Quando definido, `preencher` falha com este erro (ex.: o `claude -p` quebrou). */
  erro: Error | null = null;

  preencher(entrada: EntradaAgente): Promise<ResultadoAgente> {
    this.entradas.push(entrada);
    return this.erro ? Promise.reject(this.erro) : Promise.resolve(this.resultado);
  }
}

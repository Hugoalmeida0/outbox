import type { DatabaseSync, SQLInputValue, StatementSync } from "node:sqlite";
import { z } from "zod";
import { ErroInfra } from "#aplicacao/portas/erros.ts";
import type { OpcoesTransicaoVaga, RepositorioVagas } from "#aplicacao/portas/repositorio-vagas.ts";
import type { Relogio } from "#aplicacao/portas/relogio.ts";
import type { Motor } from "#dominio/vagas/motores.ts";
import { ETAPAS, MOTIVOS, ROTAS, TODOS_STATUS, type Status } from "#dominio/vagas/status.ts";
import { validarTransicao } from "#dominio/vagas/transicoes.ts";
import type {
  AtualizacaoVaga,
  ChaveDedup,
  Evento,
  GapAberto,
  IdVaga,
  NovaVaga,
  RespostaEnviada,
  UrlCanonica,
  Vaga,
} from "#dominio/vagas/vaga.ts";

const TODOS_MOTIVOS = Object.values(MOTIVOS).flat() as [string, ...string[]];
const esquemaMotor = z.string().regex(/^(?:[a-z]+|dominio:.+)$/);
const esquemaStatus = z.enum(TODOS_STATUS as [Status, ...Status[]]);

const esquemaLinhaVaga = z.object({
  id: z.number().int(),
  url_original: z.string(),
  canal: esquemaMotor,
  url_canonica: z.string(),
  url_resolvida: z.string().nullable(),
  motor: esquemaMotor,
  rota: z.enum(ROTAS).nullable(),
  status: esquemaStatus,
  motivo: z.enum(TODOS_MOTIVOS).nullable(),
  duplicada_de: z.number().int().nullable(),
  empresa: z.string().nullable(),
  cargo: z.string().nullable(),
  localidade: z.string().nullable(),
  chave_dedup: z.string().nullable(),
  idioma: z.string().nullable(),
  publicada_em: z.string().nullable(),
  adicionada_em: z.string(),
  aderencia: z.number().int().nullable(),
  ats_antes: z.number().int().nullable(),
  ats_depois: z.number().int().nullable(),
  camaleao_falhou: z.string().nullable(),
  anexo_manual: z.number().int(),
  tentativas_preparo: z.number().int(),
  etapa: z.enum(ETAPAS).nullable(),
  enviada_em: z.string().nullable(),
  atualizada_em: z.string(),
});

const esquemaLinhaEvento = z.object({
  id: z.number().int(),
  vaga_id: z.number().int(),
  de_status: esquemaStatus.nullable(),
  para_status: esquemaStatus,
  etapa: z.enum(ETAPAS).nullable(),
  nota: z.string().nullable(),
  criado_em: z.string(),
});

function paraVaga(linha: unknown): Vaga {
  const r = esquemaLinhaVaga.safeParse(linha);
  if (!r.success)
    throw new ErroInfra(`linha inválida em vagas: ${r.error.issues[0]?.message ?? ""}`);
  const l = r.data;
  return {
    id: l.id as IdVaga,
    urlOriginal: l.url_original,
    canal: l.canal as Motor,
    urlCanonica: l.url_canonica as UrlCanonica,
    urlResolvida: l.url_resolvida,
    motor: l.motor as Motor,
    rota: l.rota,
    status: l.status,
    motivo: l.motivo as Vaga["motivo"],
    duplicadaDe: l.duplicada_de as IdVaga | null,
    empresa: l.empresa,
    cargo: l.cargo,
    localidade: l.localidade,
    chaveDedup: l.chave_dedup as ChaveDedup | null,
    idioma: l.idioma,
    publicadaEm: l.publicada_em,
    adicionadaEm: l.adicionada_em,
    aderencia: l.aderencia,
    atsAntes: l.ats_antes,
    atsDepois: l.ats_depois,
    camaleaoFalhou: l.camaleao_falhou,
    anexoManual: l.anexo_manual === 1,
    tentativasPreparo: l.tentativas_preparo,
    etapa: l.etapa,
    enviadaEm: l.enviada_em,
    atualizadaEm: l.atualizada_em,
  };
}

/** Mapeamento camelCase (domínio) → snake_case (tabela) dos campos atualizáveis. */
const COLUNAS: Readonly<Record<keyof AtualizacaoVaga, string>> = {
  urlCanonica: "url_canonica",
  urlResolvida: "url_resolvida",
  motor: "motor",
  rota: "rota",
  empresa: "empresa",
  cargo: "cargo",
  localidade: "localidade",
  chaveDedup: "chave_dedup",
  idioma: "idioma",
  publicadaEm: "publicada_em",
  aderencia: "aderencia",
  atsAntes: "ats_antes",
  atsDepois: "ats_depois",
  camaleaoFalhou: "camaleao_falhou",
  anexoManual: "anexo_manual",
  tentativasPreparo: "tentativas_preparo",
};

function valorSql(valor: unknown): SQLInputValue {
  if (valor === undefined || valor === null) return null;
  if (typeof valor === "boolean") return valor ? 1 : 0;
  return valor as SQLInputValue;
}

function marcadores(n: number): string {
  return Array.from({ length: n }, () => "?").join(", ");
}

/** Repositório SQLite do agregado Vaga (ADR-008). */
export class RepositorioVagasSqlite implements RepositorioVagas {
  private readonly db: DatabaseSync;
  private readonly relogio: Relogio;
  private profundidade = 0;
  private readonly sql: {
    inserir: StatementSync;
    buscar: StatementSync;
    porUrl: StatementSync;
    porChave: StatementSync;
    evento: StatementSync;
    eventos: StatementSync;
    apagarGapsAbertos: StatementSync;
    inserirGap: StatementSync;
    responderGaps: StatementSync;
    confirmados: StatementSync;
    resposta: StatementSync;
  };

  constructor(db: DatabaseSync, relogio: Relogio) {
    this.db = db;
    this.relogio = relogio;
    this.sql = {
      inserir: db.prepare(
        `INSERT INTO vagas (url_original, canal, url_canonica, motor, status, motivo, duplicada_de, adicionada_em, atualizada_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ),
      buscar: db.prepare("SELECT * FROM vagas WHERE id = ?"),
      porUrl: db.prepare("SELECT * FROM vagas WHERE url_canonica = ? ORDER BY id DESC LIMIT 1"),
      porChave: db.prepare("SELECT * FROM vagas WHERE chave_dedup = ? AND id <> ? ORDER BY id"),
      evento: db.prepare(
        "INSERT INTO eventos (vaga_id, de_status, para_status, etapa, nota, criado_em) VALUES (?, ?, ?, ?, ?, ?)",
      ),
      eventos: db.prepare("SELECT * FROM eventos WHERE vaga_id = ? ORDER BY id"),
      apagarGapsAbertos: db.prepare("DELETE FROM gaps WHERE vaga_id = ? AND resposta IS NULL"),
      inserirGap: db.prepare(
        "INSERT INTO gaps (vaga_id, termo, termo_normalizado) VALUES (?, ?, ?)",
      ),
      responderGaps: db.prepare(
        "UPDATE gaps SET resposta = ? WHERE termo_normalizado = ? AND resposta IS NULL RETURNING vaga_id",
      ),
      confirmados: db.prepare(
        "SELECT DISTINCT termo_normalizado FROM gaps WHERE resposta = 'sim' ORDER BY termo_normalizado",
      ),
      resposta: db.prepare(
        "INSERT INTO respostas_enviadas (vaga_id, rotulo, valor, fonte, editada, sensivel, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ),
    };
  }

  transacao<T>(fn: () => T): T {
    if (this.profundidade > 0) return this.executarSincrono(fn);
    this.db.exec("BEGIN IMMEDIATE");
    this.profundidade++;
    try {
      const resultado = this.executarSincrono(fn);
      this.db.exec("COMMIT");
      return resultado;
    } catch (erro) {
      this.db.exec("ROLLBACK");
      throw erro;
    } finally {
      this.profundidade--;
    }
  }

  private executarSincrono<T>(fn: () => T): T {
    const resultado = fn();
    if (resultado !== null && typeof resultado === "object" && "then" in resultado) {
      throw new ErroInfra(
        "transacao() exige função síncrona: não mantenha transação aberta durante await",
      );
    }
    return resultado;
  }

  inserir(nova: NovaVaga): Vaga {
    return this.transacao(() => {
      const agora = this.relogio.agoraIso();
      const r = this.sql.inserir.run(
        nova.urlOriginal,
        nova.canal,
        nova.urlCanonica,
        nova.motor,
        nova.status,
        valorSql(nova.motivo),
        valorSql(nova.duplicadaDe),
        agora,
        agora,
      );
      const id = Number(r.lastInsertRowid) as IdVaga;
      this.sql.evento.run(id, null, nova.status, null, null, agora);
      return this.buscarObrigatoria(id);
    });
  }

  buscar(id: IdVaga): Vaga | null {
    const linha = this.sql.buscar.get(id);
    return linha === undefined ? null : paraVaga(linha);
  }

  private buscarObrigatoria(id: IdVaga): Vaga {
    const vaga = this.buscar(id);
    if (!vaga) throw new ErroInfra(`vaga #${String(id)} não encontrada`);
    return vaga;
  }

  buscarPorUrlCanonica(url: UrlCanonica): Vaga | null {
    const linha = this.sql.porUrl.get(url);
    return linha === undefined ? null : paraVaga(linha);
  }

  buscarPorChave(chave: ChaveDedup, excetoId: IdVaga): Vaga[] {
    return this.sql.porChave.all(chave, excetoId).map(paraVaga);
  }

  listarPorStatus(
    status: readonly Status[],
    filtro: { readonly ids?: readonly IdVaga[] } = {},
  ): Vaga[] {
    if (status.length === 0) return [];
    const parametros: SQLInputValue[] = [...status];
    let sql = `SELECT * FROM vagas WHERE status IN (${marcadores(status.length)})`;
    if (filtro.ids !== undefined) {
      if (filtro.ids.length === 0) return [];
      sql += ` AND id IN (${marcadores(filtro.ids.length)})`;
      parametros.push(...filtro.ids);
    }
    return this.db
      .prepare(`${sql} ORDER BY id`)
      .all(...parametros)
      .map(paraVaga);
  }

  atualizar(id: IdVaga, campos: AtualizacaoVaga): void {
    const entradas = (Object.keys(campos) as (keyof AtualizacaoVaga)[]).filter((k) => k in COLUNAS);
    if (entradas.length === 0) return;
    const sets = entradas.map((k) => `${COLUNAS[k]} = ?`).join(", ");
    const valores = entradas.map((k) => valorSql(campos[k]));
    this.db
      .prepare(`UPDATE vagas SET ${sets}, atualizada_em = ? WHERE id = ?`)
      .run(...valores, this.relogio.agoraIso(), id);
  }

  transicionar(id: IdVaga, para: Status, opcoes: OpcoesTransicaoVaga = {}): void {
    this.transacao(() => {
      const atual = this.buscarObrigatoria(id);
      validarTransicao(atual.status, para, { motivo: opcoes.motivo, etapa: opcoes.etapa });
      const agora = this.relogio.agoraIso();
      const enviada = (para === "ENVIADA" || para === "PENDENTE_TESTE") && atual.enviadaEm === null;
      this.db
        .prepare(
          `UPDATE vagas SET status = ?, motivo = ?, etapa = ?, duplicada_de = COALESCE(?, duplicada_de),
             enviada_em = COALESCE(enviada_em, ?), atualizada_em = ? WHERE id = ?`,
        )
        .run(
          para,
          valorSql(opcoes.motivo),
          para === "EM_PROCESSO" ? valorSql(opcoes.etapa) : null,
          valorSql(opcoes.duplicadaDe),
          enviada ? agora : null,
          agora,
          id,
        );
      this.sql.evento.run(
        id,
        atual.status,
        para,
        valorSql(opcoes.etapa),
        valorSql(opcoes.nota),
        agora,
      );
    });
  }

  listarEventos(id: IdVaga): Evento[] {
    return this.sql.eventos.all(id).map((linha) => {
      const l = esquemaLinhaEvento.parse(linha);
      return {
        id: l.id,
        vagaId: l.vaga_id as IdVaga,
        deStatus: l.de_status,
        paraStatus: l.para_status,
        etapa: l.etapa,
        nota: l.nota,
        criadoEm: l.criado_em,
      };
    });
  }

  inserirGaps(
    id: IdVaga,
    termos: readonly { readonly termo: string; readonly termoNormalizado: string }[],
  ): void {
    this.transacao(() => {
      this.sql.apagarGapsAbertos.run(id);
      for (const t of termos) this.sql.inserirGap.run(id, t.termo, t.termoNormalizado);
    });
  }

  listarGapsAbertos(ids: readonly IdVaga[]): GapAberto[] {
    if (ids.length === 0) return [];
    const linhas = this.db
      .prepare(
        `SELECT vaga_id, termo, termo_normalizado FROM gaps WHERE resposta IS NULL AND vaga_id IN (${marcadores(ids.length)}) ORDER BY id`,
      )
      .all(...ids) as { vaga_id: number; termo: string; termo_normalizado: string }[];
    return linhas.map((l) => ({
      vagaId: l.vaga_id as IdVaga,
      termo: l.termo,
      termoNormalizado: l.termo_normalizado,
    }));
  }

  responderGaps(termoNormalizado: string, resposta: "sim" | "nao"): IdVaga[] {
    const linhas = this.sql.responderGaps.all(resposta, termoNormalizado) as { vaga_id: number }[];
    return [...new Set(linhas.map((l) => l.vaga_id as IdVaga))];
  }

  termosConfirmados(): string[] {
    return (this.sql.confirmados.all() as { termo_normalizado: string }[]).map(
      (l) => l.termo_normalizado,
    );
  }

  registrarRespostasEnviadas(id: IdVaga, respostas: readonly RespostaEnviada[]): void {
    this.transacao(() => {
      const agora = this.relogio.agoraIso();
      for (const r of respostas) {
        this.sql.resposta.run(
          id,
          r.rotulo,
          r.sensivel ? null : valorSql(r.valor),
          r.fonte,
          r.editada ? 1 : 0,
          r.sensivel ? 1 : 0,
          agora,
        );
      }
    });
  }
}

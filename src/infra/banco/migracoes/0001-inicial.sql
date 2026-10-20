-- Schema inicial do Camaleão v1. Nunca edite uma migração publicada: crie NNNN-descricao.sql nova.
CREATE TABLE vagas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url_original TEXT NOT NULL,
  canal TEXT NOT NULL,
  url_canonica TEXT NOT NULL,
  url_resolvida TEXT,
  motor TEXT NOT NULL,
  rota TEXT,
  status TEXT NOT NULL,
  motivo TEXT,
  duplicada_de INTEGER REFERENCES vagas(id),
  empresa TEXT,
  cargo TEXT,
  localidade TEXT,
  chave_dedup TEXT,
  idioma TEXT,
  publicada_em TEXT,
  adicionada_em TEXT NOT NULL,
  aderencia INTEGER,
  ats_antes INTEGER,
  ats_depois INTEGER,
  camaleao_falhou TEXT,
  anexo_manual INTEGER NOT NULL DEFAULT 0,
  tentativas_preparo INTEGER NOT NULL DEFAULT 0,
  etapa TEXT,
  enviada_em TEXT,
  atualizada_em TEXT NOT NULL
) STRICT;
CREATE INDEX ix_vagas_url_canonica ON vagas(url_canonica);
CREATE INDEX ix_vagas_chave_dedup ON vagas(chave_dedup);
CREATE INDEX ix_vagas_status ON vagas(status);
CREATE INDEX ix_vagas_enviada_em ON vagas(enviada_em);

CREATE TABLE eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vaga_id INTEGER NOT NULL REFERENCES vagas(id),
  de_status TEXT,
  para_status TEXT NOT NULL,
  etapa TEXT,
  nota TEXT,
  criado_em TEXT NOT NULL
) STRICT;
CREATE INDEX ix_eventos_vaga ON eventos(vaga_id);
CREATE INDEX ix_eventos_para_status ON eventos(para_status, etapa);

CREATE TABLE respostas_enviadas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vaga_id INTEGER NOT NULL REFERENCES vagas(id),
  rotulo TEXT NOT NULL,
  valor TEXT,
  fonte TEXT NOT NULL,
  editada INTEGER NOT NULL DEFAULT 0,
  sensivel INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL
) STRICT;
CREATE INDEX ix_respostas_vaga ON respostas_enviadas(vaga_id);

CREATE TABLE gaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vaga_id INTEGER NOT NULL REFERENCES vagas(id),
  termo TEXT NOT NULL,
  termo_normalizado TEXT NOT NULL,
  resposta TEXT
) STRICT;
CREATE INDEX ix_gaps_vaga ON gaps(vaga_id);
CREATE INDEX ix_gaps_termo ON gaps(termo_normalizado);

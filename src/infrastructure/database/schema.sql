-- Schema DDL para Plataforma DevTest (PostgreSQL)

CREATE TABLE IF NOT EXISTS processos_seletivos (
  id VARCHAR(64) PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  edital VARCHAR(255) NOT NULL,
  inicio_inscricoes TIMESTAMPTZ NOT NULL,
  fim_inscricoes TIMESTAMPTZ NOT NULL,
  inicio_provas TIMESTAMPTZ NOT NULL,
  fim_provas TIMESTAMPTZ NOT NULL,
  peso_prova_tecnica INT NOT NULL,
  peso_barema_curricular INT NOT NULL,
  nota_corte_minima INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PUBLICADO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trilhas (
  id VARCHAR(64) PRIMARY KEY,
  processo_seletivo_id VARCHAR(64) NOT NULL REFERENCES processos_seletivos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS criterios_barema (
  id VARCHAR(64) PRIMARY KEY,
  processo_seletivo_id VARCHAR(64) NOT NULL REFERENCES processos_seletivos(id) ON DELETE CASCADE,
  tipo VARCHAR(64) NOT NULL,
  descricao TEXT NOT NULL,
  pontuacao_unitaria NUMERIC(6,2) NOT NULL,
  pontuacao_maxima NUMERIC(6,2) NOT NULL,
  permite_multiplos BOOLEAN NOT NULL DEFAULT FALSE,
  exige_comprovante BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS candidatos (
  id VARCHAR(64) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inscricoes (
  id VARCHAR(64) PRIMARY KEY,
  numero_inscricao VARCHAR(64) UNIQUE NOT NULL,
  codigo_anonimo VARCHAR(64) UNIQUE NOT NULL,
  candidato_id VARCHAR(64) NOT NULL REFERENCES candidatos(id) ON DELETE CASCADE,
  candidato_nome VARCHAR(255) NOT NULL,
  candidato_email VARCHAR(255) NOT NULL,
  candidato_cpf VARCHAR(14) NOT NULL,
  processo_seletivo_id VARCHAR(64) NOT NULL REFERENCES processos_seletivos(id) ON DELETE CASCADE,
  processo_seletivo_titulo VARCHAR(255) NOT NULL,
  trilha_id VARCHAR(64) NOT NULL,
  trilha_nome VARCHAR(255) NOT NULL,
  itens_barema JSONB NOT NULL,
  pontuacao_provisoria_barema NUMERIC(6,2) NOT NULL,
  pontuacao_homologada_barema NUMERIC(6,2),
  status_auditoria_barema VARCHAR(32) NOT NULL DEFAULT 'PENDENTE',
  auditoria_barema JSONB,
  extrato_barema JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inscricoes ADD COLUMN IF NOT EXISTS pontuacao_homologada_barema NUMERIC(6,2);
ALTER TABLE inscricoes ADD COLUMN IF NOT EXISTS status_auditoria_barema VARCHAR(32) NOT NULL DEFAULT 'PENDENTE';
ALTER TABLE inscricoes ADD COLUMN IF NOT EXISTS auditoria_barema JSONB;

CREATE INDEX IF NOT EXISTS idx_trilhas_ps ON trilhas(processo_seletivo_id);
CREATE INDEX IF NOT EXISTS idx_barema_ps ON criterios_barema(processo_seletivo_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_cand ON inscricoes(candidato_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_ps ON inscricoes(processo_seletivo_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_cod_anon ON inscricoes(codigo_anonimo);

CREATE TABLE IF NOT EXISTS desafios (
  id VARCHAR(64) PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  categoria VARCHAR(32) NOT NULL DEFAULT 'pleno',
  enunciado_markdown TEXT NOT NULL,
  linguagem VARCHAR(32) NOT NULL,
  codigo_template TEXT NOT NULL,
  suite_testes_publicos TEXT NOT NULL,
  suite_testes_ocultos TEXT NOT NULL,
  timeout_seconds INT NOT NULL DEFAULT 10,
  memory_limit_mb INT NOT NULL DEFAULT 512,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS runner_jobs (
  id VARCHAR(64) PRIMARY KEY,
  state VARCHAR(32) NOT NULL,
  payload JSONB NOT NULL,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Dono do job (candidato ou membro da Banca) para restringir a leitura do resultado
ALTER TABLE runner_jobs ADD COLUMN IF NOT EXISTS owner_id VARCHAR(64);

CREATE TABLE IF NOT EXISTS submissoes (
  id VARCHAR(64) PRIMARY KEY,
  inscricao_id VARCHAR(64) NOT NULL,
  processo_seletivo_id VARCHAR(64) NOT NULL REFERENCES processos_seletivos(id) ON DELETE CASCADE,
  desafio_id VARCHAR(64) NOT NULL REFERENCES desafios(id) ON DELETE CASCADE,
  linguagem VARCHAR(32) NOT NULL,
  codigo_fonte TEXT NOT NULL,
  status_execucao VARCHAR(32) NOT NULL,
  nota_corretude NUMERIC(6,2) NOT NULL,
  nota_qualidade NUMERIC(6,2) NOT NULL,
  nota_desempenho NUMERIC(6,2) NOT NULL,
  nota_tecnica_total NUMERIC(6,2) NOT NULL,
  atende_nota_corte BOOLEAN NOT NULL,
  status_classificacao VARCHAR(64) NOT NULL,
  relatorio_execucao JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(inscricao_id, desafio_id)
);

CREATE INDEX IF NOT EXISTS idx_submissoes_inscricao ON submissoes(inscricao_id);
CREATE INDEX IF NOT EXISTS idx_submissoes_ps ON submissoes(processo_seletivo_id);

ALTER TABLE processos_seletivos ADD COLUMN IF NOT EXISTS etapa_anonima_encerrada BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE processos_seletivos ADD COLUMN IF NOT EXISTS janela_recursos_aberta BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS recursos (
  id VARCHAR(64) PRIMARY KEY,
  inscricao_id VARCHAR(64) NOT NULL,
  processo_seletivo_id VARCHAR(64) NOT NULL REFERENCES processos_seletivos(id) ON DELETE CASCADE,
  candidato_id VARCHAR(64) NOT NULL,
  codigo_anonimo VARCHAR(64) NOT NULL,
  alvo_contestacao VARCHAR(32) NOT NULL,
  fundamentacao TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'EM_ANALISE',
  parecer_banca TEXT,
  nova_pontuacao_alvo NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recursos_ps ON recursos(processo_seletivo_id);
CREATE INDEX IF NOT EXISTS idx_recursos_insc ON recursos(inscricao_id);

CREATE TABLE IF NOT EXISTS usuarios_banca (
  id VARCHAR(64) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Banco Global de Desafios: remove colunas legadas 1:N da tabela desafios
ALTER TABLE desafios DROP COLUMN IF EXISTS processo_seletivo_id;
ALTER TABLE desafios DROP COLUMN IF EXISTS trilha_id;
ALTER TABLE desafios ADD COLUMN IF NOT EXISTS categoria VARCHAR(32) NOT NULL DEFAULT 'pleno';

-- Tabela associativa de Composição de Prova / Desafios vinculados ao Processo Seletivo e à Trilha Técnica
CREATE TABLE IF NOT EXISTS processo_seletivo_desafios (
  id VARCHAR(64) PRIMARY KEY,
  processo_seletivo_id VARCHAR(64) NOT NULL REFERENCES processos_seletivos(id) ON DELETE CASCADE,
  trilha_id VARCHAR(64) REFERENCES trilhas(id) ON DELETE CASCADE,
  desafio_id VARCHAR(64) NOT NULL REFERENCES desafios(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE processo_seletivo_desafios ADD COLUMN IF NOT EXISTS trilha_id VARCHAR(64) REFERENCES trilhas(id) ON DELETE CASCADE;
ALTER TABLE processo_seletivo_desafios DROP CONSTRAINT IF EXISTS processo_seletivo_desafios_processo_seletivo_id_desafio_id_key;

CREATE INDEX IF NOT EXISTS idx_ps_desafios_ps ON processo_seletivo_desafios(processo_seletivo_id);
CREATE INDEX IF NOT EXISTS idx_ps_desafios_trilha ON processo_seletivo_desafios(trilha_id);
CREATE INDEX IF NOT EXISTS idx_ps_desafios_desafio ON processo_seletivo_desafios(desafio_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_psd_trilha_desafio ON processo_seletivo_desafios (trilha_id, desafio_id) WHERE trilha_id IS NOT NULL;





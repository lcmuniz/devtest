import crypto from "crypto";
import { LinguagemDesafio } from "@/domain/desafio/desafio";
import { RunnerResult, RunnerStatus } from "@/domain/runner/runner-contract";
import { StatusClassificacaoTecnica } from "@/domain/submissao/autoavaliacao-tecnica";
import { getDbPool, ensureSchemaInitialized } from "@/infrastructure/database/db";

export interface SubmissaoInput {
  id?: string;
  inscricaoId: string;
  processoSeletivoId: string;
  desafioId: string;
  linguagem: LinguagemDesafio;
  codigoFonte: string;
  statusExecucao: RunnerStatus;
  notaCorretude: number;
  notaQualidade: number;
  notaDesempenho: number;
  notaTecnicaTotal: number;
  atendeNotaCorte: boolean;
  statusClassificacao: StatusClassificacaoTecnica;
  relatorioExecucao: RunnerResult;
}

export interface SubmissaoEntity extends SubmissaoInput {
  id: string;
  createdAt: string;
}

function mapRowToSubmissao(row: any): SubmissaoEntity {
  return {
    id: row.id,
    inscricaoId: row.inscricao_id,
    processoSeletivoId: row.processo_seletivo_id,
    desafioId: row.desafio_id,
    linguagem: row.linguagem as LinguagemDesafio,
    codigoFonte: row.codigo_fonte,
    statusExecucao: row.status_execucao as RunnerStatus,
    notaCorretude: Number(row.nota_corretude),
    notaQualidade: Number(row.nota_qualidade),
    notaDesempenho: Number(row.nota_desempenho),
    notaTecnicaTotal: Number(row.nota_tecnica_total),
    atendeNotaCorte: Boolean(row.atende_nota_corte),
    statusClassificacao: row.status_classificacao as StatusClassificacaoTecnica,
    relatorioExecucao: row.relatorio_execucao,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export class PostgresSubmissaoRepository {
  private async ensureTable(): Promise<void> {
    await ensureSchemaInitialized();
    const pool = getDbPool();
    await pool.query(`
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
      )
    `);
  }

  async create(input: SubmissaoInput): Promise<SubmissaoEntity> {
    await this.ensureTable();
    const pool = getDbPool();
    const id = input.id || `sub-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const res = await pool.query(
      `INSERT INTO submissoes
        (id, inscricao_id, processo_seletivo_id, desafio_id, linguagem, codigo_fonte, status_execucao, nota_corretude, nota_qualidade, nota_desempenho, nota_tecnica_total, atende_nota_corte, status_classificacao, relatorio_execucao, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        id,
        input.inscricaoId,
        input.processoSeletivoId,
        input.desafioId,
        input.linguagem,
        input.codigoFonte,
        input.statusExecucao,
        input.notaCorretude,
        input.notaQualidade,
        input.notaDesempenho,
        input.notaTecnicaTotal,
        input.atendeNotaCorte,
        input.statusClassificacao,
        JSON.stringify(input.relatorioExecucao),
        now,
      ]
    );

    return mapRowToSubmissao(res.rows[0]);
  }

  async findByInscricaoAndDesafio(
    inscricaoId: string,
    desafioId: string
  ): Promise<SubmissaoEntity | null> {
    await this.ensureTable();
    const pool = getDbPool();
    const res = await pool.query(
      `SELECT * FROM submissoes WHERE inscricao_id = $1 AND desafio_id = $2`,
      [inscricaoId, desafioId]
    );
    if (res.rows.length === 0) return null;
    return mapRowToSubmissao(res.rows[0]);
  }

  async findAll(filtros?: {
    inscricaoId?: string;
    desafioId?: string;
    processoSeletivoId?: string;
  }): Promise<SubmissaoEntity[]> {
    await this.ensureTable();
    const pool = getDbPool();

    const conditions: string[] = [];
    const params: any[] = [];

    if (filtros?.inscricaoId) {
      params.push(filtros.inscricaoId);
      conditions.push(`inscricao_id = $${params.length}`);
    }
    if (filtros?.desafioId) {
      params.push(filtros.desafioId);
      conditions.push(`desafio_id = $${params.length}`);
    }
    if (filtros?.processoSeletivoId) {
      params.push(filtros.processoSeletivoId);
      conditions.push(`processo_seletivo_id = $${params.length}`);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const res = await pool.query(
      `SELECT * FROM submissoes ${where} ORDER BY created_at DESC`,
      params
    );
    return res.rows.map(mapRowToSubmissao);
  }

  async updateNotaTecnica(
    inscricaoId: string,
    dados: {
      notaTecnicaTotal: number;
      atendeNotaCorte: boolean;
      statusClassificacao: StatusClassificacaoTecnica;
    }
  ): Promise<SubmissaoEntity | null> {
    await this.ensureTable();
    const pool = getDbPool();
    const res = await pool.query(
      `UPDATE submissoes
       SET nota_tecnica_total = $1,
           atende_nota_corte = $2,
           status_classificacao = $3
       WHERE inscricao_id = $4
       RETURNING *`,
      [
        dados.notaTecnicaTotal,
        dados.atendeNotaCorte,
        dados.statusClassificacao,
        inscricaoId,
      ]
    );
    if (res.rows.length === 0) return null;
    return mapRowToSubmissao(res.rows[0]);
  }

  async reset(): Promise<void> {
    await this.ensureTable();
    const pool = getDbPool();
    await pool.query("TRUNCATE TABLE submissoes CASCADE");
  }
}

let submissaoRepoInstance: PostgresSubmissaoRepository | null = null;

export function getSubmissaoRepository(): PostgresSubmissaoRepository {
  if (!submissaoRepoInstance) {
    submissaoRepoInstance = new PostgresSubmissaoRepository();
  }
  return submissaoRepoInstance;
}

export async function resetSubmissaoRepository(): Promise<void> {
  await getSubmissaoRepository().reset();
}

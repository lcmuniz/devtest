import crypto from "crypto";
import {
  AlvoContestacaoRecurso,
  StatusRecurso,
} from "@/domain/recurso/homologacao-recurso";
import { getDbPool, ensureSchemaInitialized } from "@/infrastructure/database/db";

export interface RecursoInput {
  id?: string;
  inscricaoId: string;
  processoSeletivoId: string;
  candidatoId: string;
  codigoAnonimo: string;
  alvoContestacao: AlvoContestacaoRecurso;
  fundamentacao: string;
}

export interface RecursoEntity extends RecursoInput {
  id: string;
  status: StatusRecurso;
  parecerBanca?: string | null;
  novaPontuacaoAlvo?: number | null;
  createdAt: string;
  updatedAt: string;
}

function mapRowToRecurso(row: any): RecursoEntity {
  return {
    id: row.id,
    inscricaoId: row.inscricao_id,
    processoSeletivoId: row.processo_seletivo_id,
    candidatoId: row.candidato_id,
    codigoAnonimo: row.codigo_anonimo,
    alvoContestacao: row.alvo_contestacao as AlvoContestacaoRecurso,
    fundamentacao: row.fundamentacao,
    status: row.status as StatusRecurso,
    parecerBanca: row.parecer_banca ?? null,
    novaPontuacaoAlvo:
      row.nova_pontuacao_alvo !== null && row.nova_pontuacao_alvo !== undefined
        ? Number(row.nova_pontuacao_alvo)
        : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export class PostgresRecursoRepository {
  private async ensureTable(): Promise<void> {
    await ensureSchemaInitialized();
    const pool = getDbPool();
    await pool.query(`
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
      )
    `);
  }

  async create(input: RecursoInput): Promise<RecursoEntity> {
    await this.ensureTable();
    const pool = getDbPool();
    const id = input.id || `rec-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const res = await pool.query(
      `INSERT INTO recursos
        (id, inscricao_id, processo_seletivo_id, candidato_id, codigo_anonimo, alvo_contestacao, fundamentacao, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'EM_ANALISE', $8, $9)
       RETURNING *`,
      [
        id,
        input.inscricaoId,
        input.processoSeletivoId,
        input.candidatoId,
        input.codigoAnonimo,
        input.alvoContestacao,
        input.fundamentacao,
        now,
        now,
      ]
    );

    return mapRowToRecurso(res.rows[0]);
  }

  async findById(id: string): Promise<RecursoEntity | null> {
    await this.ensureTable();
    const pool = getDbPool();
    const res = await pool.query(`SELECT * FROM recursos WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return mapRowToRecurso(res.rows[0]);
  }

  async findAll(filtros?: {
    processoSeletivoId?: string;
    inscricaoId?: string;
  }): Promise<RecursoEntity[]> {
    await this.ensureTable();
    const pool = getDbPool();

    const conditions: string[] = [];
    const params: any[] = [];

    if (filtros?.processoSeletivoId) {
      params.push(filtros.processoSeletivoId);
      conditions.push(`processo_seletivo_id = $${params.length}`);
    }
    if (filtros?.inscricaoId) {
      params.push(filtros.inscricaoId);
      conditions.push(`inscricao_id = $${params.length}`);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const res = await pool.query(
      `SELECT * FROM recursos ${where} ORDER BY created_at DESC`,
      params
    );
    return res.rows.map(mapRowToRecurso);
  }

  async registrarJulgamento(
    id: string,
    dados: {
      status: "DEFERIDO" | "INDEFERIDO";
      parecerBanca: string;
      novaPontuacaoAlvo?: number | null;
    }
  ): Promise<RecursoEntity | null> {
    await this.ensureTable();
    const pool = getDbPool();
    const res = await pool.query(
      `UPDATE recursos
       SET status = $1,
           parecer_banca = $2,
           nova_pontuacao_alvo = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [dados.status, dados.parecerBanca, dados.novaPontuacaoAlvo ?? null, id]
    );
    if (res.rows.length === 0) return null;
    return mapRowToRecurso(res.rows[0]);
  }

  async reset(): Promise<void> {
    await this.ensureTable();
    const pool = getDbPool();
    await pool.query("TRUNCATE TABLE recursos CASCADE");
  }
}

let recursoRepoInstance: PostgresRecursoRepository | null = null;

export function getRecursoRepository(): PostgresRecursoRepository {
  if (!recursoRepoInstance) {
    recursoRepoInstance = new PostgresRecursoRepository();
  }
  return recursoRepoInstance;
}

export async function resetRecursoRepository(): Promise<void> {
  await getRecursoRepository().reset();
}

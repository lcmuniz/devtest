import crypto from "crypto";
import {
  DesafioInput,
  DesafioEntity,
  LinguagemDesafio,
} from "@/domain/desafio/desafio";
import { getDbPool, ensureSchemaInitialized } from "@/infrastructure/database/db";

export interface DesafioRepository {
  create(input: DesafioInput): Promise<DesafioEntity>;
  update(id: string, input: DesafioInput): Promise<DesafioEntity | null>;
  findById(id: string): Promise<DesafioEntity | null>;
  findAll(filtros?: {
    processoSeletivoId?: string;
    trilhaId?: string;
    linguagem?: string;
  }): Promise<DesafioEntity[]>;
  vincularDesafiosAoProcesso(
    processoSeletivoId: string,
    desafiosIds: string[],
    trilhaId?: string
  ): Promise<void>;
  desvincularDesafioDoProcesso(
    processoSeletivoId: string,
    desafioId: string,
    trilhaId?: string
  ): Promise<void>;
  listarDesafiosDoProcesso(
    processoSeletivoId: string,
    trilhaId?: string
  ): Promise<DesafioEntity[]>;
  reset(): Promise<void>;
}

function mapRowToDesafio(row: any): DesafioEntity {
  return {
    id: row.id,
    processoSeletivoId: row.processo_seletivo_id || "",
    trilhaId: row.trilha_id || "",
    titulo: row.titulo,
    categoria: ((row.categoria || "pleno") as string).toLowerCase() as "junior" | "pleno" | "senior",
    enunciadoMarkdown: row.enunciado_markdown,
    linguagem: row.linguagem as LinguagemDesafio,
    codigoTemplate: row.codigo_template,
    suiteTestesPublicos: row.suite_testes_publicos,
    suiteTestesOcultos: row.suite_testes_ocultos,
    timeoutSeconds: Number(row.timeout_seconds),
    memoryLimitMb: Number(row.memory_limit_mb),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export class PostgresDesafioRepository implements DesafioRepository {
  private async ensureCategoriaColumn(): Promise<void> {
    await ensureSchemaInitialized();
    const pool = getDbPool();
    await pool.query(`ALTER TABLE desafios ADD COLUMN IF NOT EXISTS categoria VARCHAR(32) NOT NULL DEFAULT 'pleno';`);
  }

  async create(input: DesafioInput): Promise<DesafioEntity> {
    await this.ensureCategoriaColumn();
    const pool = getDbPool();
    const id = input.id || `desafio-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const categoria = input.categoria || "pleno";

    const res = await pool.query(
      `INSERT INTO desafios
        (id, titulo, categoria, enunciado_markdown, linguagem, codigo_template, suite_testes_publicos, suite_testes_ocultos, timeout_seconds, memory_limit_mb, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        id,
        input.titulo,
        categoria,
        input.enunciadoMarkdown,
        input.linguagem,
        input.codigoTemplate,
        input.suiteTestesPublicos,
        input.suiteTestesOcultos,
        input.timeoutSeconds,
        input.memoryLimitMb,
        now,
        now,
      ]
    );

    if (input.processoSeletivoId) {
      await this.vincularDesafiosAoProcesso(input.processoSeletivoId, [id], input.trilhaId);
    }

    return mapRowToDesafio(res.rows[0]);
  }

  async update(id: string, input: DesafioInput): Promise<DesafioEntity | null> {
    await this.ensureCategoriaColumn();
    const pool = getDbPool();
    const now = new Date().toISOString();
    const categoria = input.categoria || "pleno";

    const res = await pool.query(
      `UPDATE desafios
       SET titulo = $1,
           categoria = $2,
           enunciado_markdown = $3,
           linguagem = $4,
           codigo_template = $5,
           suite_testes_publicos = $6,
           suite_testes_ocultos = $7,
           timeout_seconds = $8,
           memory_limit_mb = $9,
           updated_at = $10
       WHERE id = $11
       RETURNING *`,
      [
        input.titulo,
        categoria,
        input.enunciadoMarkdown,
        input.linguagem,
        input.codigoTemplate,
        input.suiteTestesPublicos,
        input.suiteTestesOcultos,
        input.timeoutSeconds,
        input.memoryLimitMb,
        now,
        id,
      ]
    );

    if (res.rows.length === 0) return null;
    return mapRowToDesafio(res.rows[0]);
  }

  async findById(id: string): Promise<DesafioEntity | null> {
    await ensureSchemaInitialized();
    const pool = getDbPool();
    const res = await pool.query(`SELECT * FROM desafios WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return mapRowToDesafio(res.rows[0]);
  }

  async findAll(filtros?: {
    processoSeletivoId?: string;
    trilhaId?: string;
    linguagem?: string;
  }): Promise<DesafioEntity[]> {
    await ensureSchemaInitialized();
    const pool = getDbPool();

    // Se filtrou por processoSeletivoId ou trilhaId, busca desafios vinculados pela tabela associativa N:N
    if (filtros?.processoSeletivoId || filtros?.trilhaId) {
      const conditions: string[] = [];
      const params: any[] = [];

      if (filtros.processoSeletivoId) {
        params.push(filtros.processoSeletivoId);
        conditions.push(`psd.processo_seletivo_id = $${params.length}`);
      }

      if (filtros.trilhaId) {
        params.push(filtros.trilhaId);
        conditions.push(`psd.trilha_id = $${params.length}`);
      }

      if (filtros.linguagem) {
        params.push(filtros.linguagem.toLowerCase());
        conditions.push(`LOWER(d.linguagem) = $${params.length}`);
      }

      const res = await pool.query(
        `SELECT DISTINCT d.*
         FROM desafios d
         INNER JOIN processo_seletivo_desafios psd ON psd.desafio_id = d.id
         WHERE ${conditions.join(" AND ")}
         ORDER BY d.created_at DESC`,
        params
      );
      return res.rows.map(mapRowToDesafio);
    }

    const conditions: string[] = [];
    const params: any[] = [];

    if (filtros?.linguagem) {
      params.push(filtros.linguagem.toLowerCase());
      conditions.push(`LOWER(linguagem) = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const res = await pool.query(
      `SELECT * FROM desafios ${whereClause} ORDER BY created_at DESC`,
      params
    );

    return res.rows.map(mapRowToDesafio);
  }

  async vincularDesafiosAoProcesso(
    processoSeletivoId: string,
    desafiosIds: string[],
    trilhaId?: string
  ): Promise<void> {
    await ensureSchemaInitialized();
    const pool = getDbPool();

    // Se não informou trilhaId, tenta associar à primeira trilha do processo seletivo
    let tId = trilhaId;
    if (!tId) {
      const tRes = await pool.query(
        `SELECT id FROM trilhas WHERE processo_seletivo_id = $1 ORDER BY id ASC LIMIT 1`,
        [processoSeletivoId]
      );
      if (tRes.rows.length > 0) {
        tId = tRes.rows[0].id;
      }
    }

    for (let i = 0; i < desafiosIds.length; i++) {
      const desafioId = desafiosIds[i];
      const id = `psd-${crypto.randomUUID()}`;
      if (tId) {
        await pool.query(
          `INSERT INTO processo_seletivo_desafios (id, processo_seletivo_id, trilha_id, desafio_id, ordem)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [id, processoSeletivoId, tId, desafioId, i]
        );
      } else {
        await pool.query(
          `INSERT INTO processo_seletivo_desafios (id, processo_seletivo_id, trilha_id, desafio_id, ordem)
           VALUES ($1, $2, NULL, $3, $4)
           ON CONFLICT DO NOTHING`,
          [id, processoSeletivoId, desafioId, i]
        );
      }
    }
  }

  async desvincularDesafioDoProcesso(
    processoSeletivoId: string,
    desafioId: string,
    trilhaId?: string
  ): Promise<void> {
    await ensureSchemaInitialized();
    const pool = getDbPool();
    if (trilhaId) {
      await pool.query(
        `DELETE FROM processo_seletivo_desafios
         WHERE processo_seletivo_id = $1 AND desafio_id = $2 AND trilha_id = $3`,
        [processoSeletivoId, desafioId, trilhaId]
      );
    } else {
      await pool.query(
        `DELETE FROM processo_seletivo_desafios
         WHERE processo_seletivo_id = $1 AND desafio_id = $2`,
        [processoSeletivoId, desafioId]
      );
    }
  }

  async listarDesafiosDoProcesso(
    processoSeletivoId: string,
    trilhaId?: string
  ): Promise<DesafioEntity[]> {
    return this.findAll({ processoSeletivoId, trilhaId });
  }

  async reset(): Promise<void> {
    await ensureSchemaInitialized();
    const pool = getDbPool();
    await pool.query("TRUNCATE TABLE processo_seletivo_desafios CASCADE");
    await pool.query("TRUNCATE TABLE desafios CASCADE");
  }
}

let desafioRepoInstance: DesafioRepository | null = null;

export function getDesafioRepository(): DesafioRepository {
  if (!desafioRepoInstance) {
    desafioRepoInstance = new PostgresDesafioRepository();
  }
  return desafioRepoInstance;
}

export async function resetDesafioRepository(): Promise<void> {
  await getDesafioRepository().reset();
}

/** O desafio está vinculado ao processo e/ou trilha? */
export async function desafioPertenceAoProcesso(
  desafioId: string,
  processoSeletivoId: string,
  trilhaId?: string
): Promise<boolean> {
  const desafios = await getDesafioRepository().findAll({ processoSeletivoId, trilhaId });
  return desafios.some((d) => d.id === desafioId);
}

/** Retorna os IDs dos processos seletivos aos quais este desafio está vinculado */
export async function buscarProcessosDoDesafio(
  desafioId: string
): Promise<string[]> {
  await ensureSchemaInitialized();
  const pool = getDbPool();
  const res = await pool.query(
    `SELECT processo_seletivo_id FROM processo_seletivo_desafios WHERE desafio_id = $1 ORDER BY ordem ASC, created_at ASC`,
    [desafioId]
  );
  return res.rows.map((r: any) => r.processo_seletivo_id);
}


import crypto from "crypto";
import {
  ProcessoSeletivoInput,
  TrilhaInput,
  CriterioBaremaInput,
} from "@/domain/processo-seletivo/processo-seletivo";
import { getDbPool, ensureSchemaInitialized } from "@/infrastructure/database/db";

export interface TrilhaEntity extends TrilhaInput {
  id: string;
}

export interface CriterioBaremaEntity extends CriterioBaremaInput {
  id: string;
}

export interface ProcessoSeletivoEntity extends Omit<ProcessoSeletivoInput, "trilhas" | "barema"> {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: "PUBLICADO";
  etapaAnonimaEncerrada?: boolean;
  janelaRecursosAberta?: boolean;
  trilhas: TrilhaEntity[];
  barema: CriterioBaremaEntity[];
}

export interface ProcessoSeletivoRepository {
  create(input: ProcessoSeletivoInput): Promise<ProcessoSeletivoEntity>;
  update(id: string, input: ProcessoSeletivoInput): Promise<ProcessoSeletivoEntity | null>;
  encerrarEtapaAnonima(id: string): Promise<ProcessoSeletivoEntity | null>;
  findAll(): Promise<ProcessoSeletivoEntity[]>;
  findById(id: string): Promise<ProcessoSeletivoEntity | null>;
  reset(): Promise<void>;
}

export class PostgresProcessoSeletivoRepository implements ProcessoSeletivoRepository {
  async create(input: ProcessoSeletivoInput): Promise<ProcessoSeletivoEntity> {
    await ensureSchemaInitialized();
    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const id = input.id || `ps-${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      await client.query(
        `INSERT INTO processos_seletivos 
          (id, titulo, edital, inicio_inscricoes, fim_inscricoes, inicio_provas, fim_provas, peso_prova_tecnica, peso_barema_curricular, nota_corte_minima, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          id,
          input.titulo,
          input.edital,
          input.inicioInscricoes,
          input.fimInscricoes,
          input.inicioProvas,
          input.fimProvas,
          input.pesoProvaTecnica,
          input.pesoBaremaCurricular,
          input.notaCorteMinima,
          "PUBLICADO",
          now,
          now,
        ]
      );

      const trilhas: TrilhaEntity[] = [];
      for (const t of input.trilhas) {
        const trilhaId = t.id || `trilha-${crypto.randomUUID()}`;
        await client.query(
          `INSERT INTO trilhas (id, processo_seletivo_id, nome, descricao)
           VALUES ($1, $2, $3, $4)`,
          [trilhaId, id, t.nome, t.descricao || ""]
        );
        trilhas.push({
          id: trilhaId,
          nome: t.nome,
          descricao: t.descricao || "",
        });
      }

      const barema: CriterioBaremaEntity[] = [];
      for (const b of input.barema) {
        const baremaId = b.id || `barema-${crypto.randomUUID()}`;
        await client.query(
          `INSERT INTO criterios_barema 
            (id, processo_seletivo_id, tipo, descricao, pontuacao_unitaria, pontuacao_maxima, permite_multiplos, exige_comprovante)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            baremaId,
            id,
            b.tipo,
            b.descricao,
            b.pontuacaoUnitaria,
            b.pontuacaoMaxima,
            b.permiteMultiplos ?? false,
            b.exigeComprovante ?? true,
          ]
        );
        barema.push({
          id: baremaId,
          tipo: b.tipo,
          descricao: b.descricao,
          pontuacaoUnitaria: b.pontuacaoUnitaria,
          pontuacaoMaxima: b.pontuacaoMaxima,
          permiteMultiplos: b.permiteMultiplos ?? false,
          exigeComprovante: b.exigeComprovante ?? true,
        });
      }

      await client.query("COMMIT");

      return {
        ...input,
        id,
        createdAt: now,
        updatedAt: now,
        status: "PUBLICADO",
        trilhas,
        barema,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  private async ensureHomologacaoColumns(): Promise<void> {
    await ensureSchemaInitialized();
    const pool = getDbPool();
    await pool.query(`
      ALTER TABLE processos_seletivos ADD COLUMN IF NOT EXISTS etapa_anonima_encerrada BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE processos_seletivos ADD COLUMN IF NOT EXISTS janela_recursos_aberta BOOLEAN NOT NULL DEFAULT FALSE;
    `);
  }

  async findAll(): Promise<ProcessoSeletivoEntity[]> {
    await this.ensureHomologacaoColumns();
    const pool = getDbPool();

    const psRes = await pool.query(
      `SELECT * FROM processos_seletivos ORDER BY created_at DESC`
    );

    const resultados: ProcessoSeletivoEntity[] = [];

    for (const row of psRes.rows) {
      const trilhasRes = await pool.query(
        `SELECT id, nome, descricao FROM trilhas WHERE processo_seletivo_id = $1`,
        [row.id]
      );
      const baremaRes = await pool.query(
        `SELECT id, tipo, descricao, pontuacao_unitaria, pontuacao_maxima, permite_multiplos, exige_comprovante 
         FROM criterios_barema WHERE processo_seletivo_id = $1`,
        [row.id]
      );

      resultados.push({
        id: row.id,
        titulo: row.titulo,
        edital: row.edital,
        inicioInscricoes: new Date(row.inicio_inscricoes).toISOString(),
        fimInscricoes: new Date(row.fim_inscricoes).toISOString(),
        inicioProvas: new Date(row.inicio_provas).toISOString(),
        fimProvas: new Date(row.fim_provas).toISOString(),
        pesoProvaTecnica: Number(row.peso_prova_tecnica),
        pesoBaremaCurricular: Number(row.peso_barema_curricular),
        notaCorteMinima: Number(row.nota_corte_minima),
        status: row.status as "PUBLICADO",
        etapaAnonimaEncerrada: Boolean(row.etapa_anonima_encerrada),
        janelaRecursosAberta: Boolean(row.janela_recursos_aberta),
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
        trilhas: trilhasRes.rows.map((t) => ({
          id: t.id,
          nome: t.nome,
          descricao: t.descricao || "",
        })),
        barema: baremaRes.rows.map((b) => ({
          id: b.id,
          tipo: b.tipo,
          descricao: b.descricao,
          pontuacaoUnitaria: Number(b.pontuacao_unitaria),
          pontuacaoMaxima: Number(b.pontuacao_maxima),
          permiteMultiplos: Boolean(b.permite_multiplos),
          exigeComprovante: Boolean(b.exige_comprovante),
        })),
      });
    }

    return resultados;
  }

  async findById(id: string): Promise<ProcessoSeletivoEntity | null> {
    await this.ensureHomologacaoColumns();
    const pool = getDbPool();

    const psRes = await pool.query(
      `SELECT * FROM processos_seletivos WHERE id = $1`,
      [id]
    );

    if (psRes.rows.length === 0) return null;
    const row = psRes.rows[0];

    const trilhasRes = await pool.query(
      `SELECT id, nome, descricao FROM trilhas WHERE processo_seletivo_id = $1`,
      [id]
    );
    const baremaRes = await pool.query(
      `SELECT id, tipo, descricao, pontuacao_unitaria, pontuacao_maxima, permite_multiplos, exige_comprovante 
       FROM criterios_barema WHERE processo_seletivo_id = $1`,
      [id]
    );

    return {
      id: row.id,
      titulo: row.titulo,
      edital: row.edital,
      inicioInscricoes: new Date(row.inicio_inscricoes).toISOString(),
      fimInscricoes: new Date(row.fim_inscricoes).toISOString(),
      inicioProvas: new Date(row.inicio_provas).toISOString(),
      fimProvas: new Date(row.fim_provas).toISOString(),
      pesoProvaTecnica: Number(row.peso_prova_tecnica),
      pesoBaremaCurricular: Number(row.peso_barema_curricular),
      notaCorteMinima: Number(row.nota_corte_minima),
      status: row.status as "PUBLICADO",
      etapaAnonimaEncerrada: Boolean(row.etapa_anonima_encerrada),
      janelaRecursosAberta: Boolean(row.janela_recursos_aberta),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      trilhas: trilhasRes.rows.map((t) => ({
        id: t.id,
        nome: t.nome,
        descricao: t.descricao || "",
      })),
      barema: baremaRes.rows.map((b) => ({
        id: b.id,
        tipo: b.tipo,
        descricao: b.descricao,
        pontuacaoUnitaria: Number(b.pontuacao_unitaria),
        pontuacaoMaxima: Number(b.pontuacao_maxima),
        permiteMultiplos: Boolean(b.permite_multiplos),
        exigeComprovante: Boolean(b.exige_comprovante),
      })),
    };
  }

  async encerrarEtapaAnonima(id: string): Promise<ProcessoSeletivoEntity | null> {
    await this.ensureHomologacaoColumns();
    const pool = getDbPool();
    await pool.query(
      `UPDATE processos_seletivos
       SET etapa_anonima_encerrada = TRUE,
           janela_recursos_aberta = TRUE,
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
    return this.findById(id);
  }

  async update(
    id: string,
    input: ProcessoSeletivoInput
  ): Promise<ProcessoSeletivoEntity | null> {
    await ensureSchemaInitialized();
    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const now = new Date().toISOString();

      const updateRes = await client.query(
        `UPDATE processos_seletivos
         SET titulo = $1,
             edital = $2,
             inicio_inscricoes = $3,
             fim_inscricoes = $4,
             inicio_provas = $5,
             fim_provas = $6,
             peso_prova_tecnica = $7,
             peso_barema_curricular = $8,
             nota_corte_minima = $9,
             updated_at = $10
         WHERE id = $11
         RETURNING created_at, status`,
        [
          input.titulo,
          input.edital,
          input.inicioInscricoes,
          input.fimInscricoes,
          input.inicioProvas,
          input.fimProvas,
          input.pesoProvaTecnica,
          input.pesoBaremaCurricular,
          input.notaCorteMinima,
          now,
          id,
        ]
      );

      if (updateRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      // Preserva IDs de trilhas existentes para não quebrar FK de desafios
      const existingTrilhasRes = await client.query(
        `SELECT id, nome FROM trilhas WHERE processo_seletivo_id = $1`,
        [id]
      );
      const existingTrilhas = existingTrilhasRes.rows;
      const keptTrilhaIds: string[] = [];
      const trilhas: TrilhaEntity[] = [];

      for (const t of input.trilhas) {
        const matchExisting =
          (t.id && existingTrilhas.find((et) => et.id === t.id)) ||
          existingTrilhas.find((et) => et.nome === t.nome);

        if (matchExisting) {
          await client.query(
            `UPDATE trilhas SET nome = $1, descricao = $2 WHERE id = $3`,
            [t.nome, t.descricao || "", matchExisting.id]
          );
          keptTrilhaIds.push(matchExisting.id);
          trilhas.push({
            id: matchExisting.id,
            nome: t.nome,
            descricao: t.descricao || "",
          });
        } else {
          const novoId = t.id || `trilha-${crypto.randomUUID()}`;
          await client.query(
            `INSERT INTO trilhas (id, processo_seletivo_id, nome, descricao) VALUES ($1, $2, $3, $4)`,
            [novoId, id, t.nome, t.descricao || ""]
          );
          keptTrilhaIds.push(novoId);
          trilhas.push({
            id: novoId,
            nome: t.nome,
            descricao: t.descricao || "",
          });
        }
      }

      if (keptTrilhaIds.length > 0) {
        await client.query(
          `DELETE FROM trilhas WHERE processo_seletivo_id = $1 AND NOT (id = ANY($2::varchar[]))`,
          [id, keptTrilhaIds]
        );
      }

      await client.query(
        `DELETE FROM criterios_barema WHERE processo_seletivo_id = $1`,
        [id]
      );
      const barema: CriterioBaremaEntity[] = [];
      for (const b of input.barema) {
        const baremaId = b.id || `barema-${crypto.randomUUID()}`;
        await client.query(
          `INSERT INTO criterios_barema
            (id, processo_seletivo_id, tipo, descricao, pontuacao_unitaria, pontuacao_maxima, permite_multiplos, exige_comprovante)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            baremaId,
            id,
            b.tipo,
            b.descricao,
            b.pontuacaoUnitaria,
            b.pontuacaoMaxima,
            b.permiteMultiplos ?? false,
            b.exigeComprovante ?? true,
          ]
        );
        barema.push({
          id: baremaId,
          tipo: b.tipo,
          descricao: b.descricao,
          pontuacaoUnitaria: b.pontuacaoUnitaria,
          pontuacaoMaxima: b.pontuacaoMaxima,
          permiteMultiplos: b.permiteMultiplos ?? false,
          exigeComprovante: b.exigeComprovante ?? true,
        });
      }

      await client.query("COMMIT");

      return {
        ...input,
        id,
        createdAt: new Date(updateRes.rows[0].created_at).toISOString(),
        updatedAt: now,
        status: "PUBLICADO",
        trilhas,
        barema,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async reset(): Promise<void> {
    await ensureSchemaInitialized();
    const pool = getDbPool();
    await pool.query("TRUNCATE TABLE processos_seletivos CASCADE");
  }
}

let repositoryInstance: ProcessoSeletivoRepository | null = null;

export function getRepository(): ProcessoSeletivoRepository {
  if (!repositoryInstance) {
    repositoryInstance = new PostgresProcessoSeletivoRepository();
  }
  return repositoryInstance;
}

export async function resetRepository(): Promise<void> {
  await getRepository().reset();
}

export const getProcessoSeletivoRepository = getRepository;
export const resetProcessoSeletivoRepository = resetRepository;

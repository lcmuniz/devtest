import crypto from "crypto";
import {
  CandidatoInput,
  ItemBaremaDeclarado,
  ResultadoCalculoBarema,
  limparCpf,
} from "@/domain/candidato/candidato-barema";
import {
  ItemBaremaAuditado,
  StatusAuditoriaBaremaGeral,
} from "@/domain/banca/painel-banca";
import { getDbPool, ensureSchemaInitialized } from "@/infrastructure/database/db";
import { gerarHashSenha } from "@/domain/auth/senha";

export interface CandidatoEntity {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  senhaHash: string;
  createdAt: string;
}

export interface InscricaoEntity {
  id: string;
  codigoAnonimo: string; // Hash opaco para atendimento a Correcao Cega (ADR-0001)
  candidatoId: string;
  candidatoNome: string;
  candidatoEmail: string;
  candidatoCpf: string;
  processoSeletivoId: string;
  processoSeletivoTitulo: string;
  trilhaId: string;
  trilhaNome: string;
  itensBarema: ItemBaremaDeclarado[];
  pontuacaoProvisoriaBarema: number;
  pontuacaoHomologadaBarema?: number | null;
  statusAuditoriaBarema?: StatusAuditoriaBaremaGeral;
  auditoriaBarema?: ItemBaremaAuditado[] | null;
  extratoBarema: ResultadoCalculoBarema;
  numeroInscricao: string;
  createdAt: string;
}

export interface CandidatoRepository {
  criarCandidato(input: CandidatoInput): Promise<CandidatoEntity>;
  buscarCandidatoPorEmail(email: string): Promise<CandidatoEntity | null>;
  buscarCandidatoPorCpf(cpf: string): Promise<CandidatoEntity | null>;
  buscarCandidatoPorCpfOuEmail(cpfOuEmail: string): Promise<CandidatoEntity | null>;
  buscarCandidatoPorId(id: string): Promise<CandidatoEntity | null>;

  criarInscricao(dados: Omit<InscricaoEntity, "id" | "numeroInscricao" | "codigoAnonimo" | "createdAt">): Promise<InscricaoEntity>;
  buscarInscricaoPorId(id: string): Promise<InscricaoEntity | null>;
  buscarInscricoesPorCandidato(candidatoId: string): Promise<InscricaoEntity[]>;
  buscarInscricoesPorProcesso(processoSeletivoId: string): Promise<InscricaoEntity[]>;
  buscarInscricaoPorCandidatoEProcesso(candidatoId: string, processoSeletivoId: string): Promise<InscricaoEntity | null>;
  buscarInscricaoPorCandidatoProcessoETrilha(
    candidatoId: string,
    processoSeletivoId: string,
    trilhaId: string
  ): Promise<InscricaoEntity | null>;
  atualizarAuditoriaBarema(
    inscricaoId: string,
    dados: {
      pontuacaoHomologadaBarema: number;
      statusAuditoriaBarema: StatusAuditoriaBaremaGeral;
      auditoriaBarema: ItemBaremaAuditado[];
    }
  ): Promise<InscricaoEntity | null>;
  atualizarItensBaremaInscricao(
    inscricaoId: string,
    dados: {
      itensBarema: ItemBaremaDeclarado[];
      pontuacaoProvisoriaBarema: number;
      extratoBarema: ResultadoCalculoBarema;
    }
  ): Promise<InscricaoEntity | null>;

  reset(): Promise<void>;
}

export class PostgresCandidatoRepository implements CandidatoRepository {
  async criarCandidato(input: CandidatoInput): Promise<CandidatoEntity> {
    await ensureSchemaInitialized();
    const pool = getDbPool();
    const id = input.id || `cand-${crypto.randomUUID()}`;
    const cpfLimpo = limparCpf(input.cpf);
    const senhaHash = await gerarHashSenha(input.senha);
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO candidatos (id, nome, email, cpf, senha_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, input.nome, input.email.toLowerCase().trim(), cpfLimpo, senhaHash, now]
    );

    return {
      id,
      nome: input.nome,
      email: input.email.toLowerCase().trim(),
      cpf: cpfLimpo,
      senhaHash,
      createdAt: now,
    };
  }

  async buscarCandidatoPorEmail(email: string): Promise<CandidatoEntity | null> {
    await ensureSchemaInitialized();
    const pool = getDbPool();
    const res = await pool.query(
      `SELECT * FROM candidatos WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      nome: row.nome,
      email: row.email,
      cpf: row.cpf,
      senhaHash: row.senha_hash,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async buscarCandidatoPorCpf(cpf: string): Promise<CandidatoEntity | null> {
    await ensureSchemaInitialized();
    const pool = getDbPool();
    const res = await pool.query(
      `SELECT * FROM candidatos WHERE cpf = $1`,
      [limparCpf(cpf)]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      nome: row.nome,
      email: row.email,
      cpf: row.cpf,
      senhaHash: row.senha_hash,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async buscarCandidatoPorCpfOuEmail(cpfOuEmail: string): Promise<CandidatoEntity | null> {
    await ensureSchemaInitialized();
    const pool = getDbPool();
    const limpo = cpfOuEmail.trim().toLowerCase();
    const possivelCpf = limparCpf(cpfOuEmail);

    const res = await pool.query(
      `SELECT * FROM candidatos WHERE email = $1 OR cpf = $2`,
      [limpo, possivelCpf]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      nome: row.nome,
      email: row.email,
      cpf: row.cpf,
      senhaHash: row.senha_hash,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async buscarCandidatoPorId(id: string): Promise<CandidatoEntity | null> {
    await ensureSchemaInitialized();
    const pool = getDbPool();
    const res = await pool.query(`SELECT * FROM candidatos WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      nome: row.nome,
      email: row.email,
      cpf: row.cpf,
      senhaHash: row.senha_hash,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async criarInscricao(
    dados: Omit<InscricaoEntity, "id" | "numeroInscricao" | "codigoAnonimo" | "createdAt">
  ): Promise<InscricaoEntity> {
    await ensureSchemaInitialized();
    const pool = getDbPool();

    const countRes = await pool.query(`SELECT COUNT(*) as total FROM inscricoes`);
    const total = parseInt(countRes.rows[0].total, 10);
    const contador = total + 1001;
    let numeroInscricao = `INSC-${new Date().getFullYear()}-${contador}`;

    // Garante que o número de inscrição seja único mesmo em concorrência
    const checkNum = await pool.query(`SELECT 1 FROM inscricoes WHERE numero_inscricao = $1`, [numeroInscricao]);
    if (checkNum.rowCount && checkNum.rowCount > 0) {
      numeroInscricao = `INSC-${new Date().getFullYear()}-${contador}-${Date.now().toString().slice(-4)}`;
    }

    const id = `insc-${crypto.randomUUID()}`;
    // Código anônimo com garantia de unicidade (ADR-0001 Correção Cega)
    let codigoAnonimo = "";
    for (let tentativa = 0; tentativa < 25; tentativa++) {
      const hash = crypto
        .createHash("sha256")
        .update(`${dados.candidatoId}:${dados.processoSeletivoId}:${dados.trilhaId}:${tentativa}`)
        .digest("hex");
      const numAnonimo = (parseInt(hash.substring(0, 6), 16) % 9000) + 1000;
      const candidatoTentativa = `CAND-${numAnonimo}`;
      const checkRes = await pool.query(`SELECT 1 FROM inscricoes WHERE codigo_anonimo = $1`, [candidatoTentativa]);
      if (!checkRes.rowCount || checkRes.rowCount === 0) {
        codigoAnonimo = candidatoTentativa;
        break;
      }
    }
    if (!codigoAnonimo) {
      codigoAnonimo = `CAND-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO inscricoes 
        (id, numero_inscricao, codigo_anonimo, candidato_id, candidato_nome, candidato_email, candidato_cpf, 
         processo_seletivo_id, processo_seletivo_titulo, trilha_id, trilha_nome, itens_barema, pontuacao_provisoria_barema, extrato_barema, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        id,
        numeroInscricao,
        codigoAnonimo,
        dados.candidatoId,
        dados.candidatoNome,
        dados.candidatoEmail,
        dados.candidatoCpf,
        dados.processoSeletivoId,
        dados.processoSeletivoTitulo,
        dados.trilhaId,
        dados.trilhaNome,
        JSON.stringify(dados.itensBarema),
        dados.pontuacaoProvisoriaBarema,
        JSON.stringify(dados.extratoBarema),
        now,
      ]
    );

    return {
      ...dados,
      id,
      numeroInscricao,
      codigoAnonimo,
      createdAt: now,
    };
  }

  private async ensureAuditoriaColumns(): Promise<void> {
    await ensureSchemaInitialized();
    const pool = getDbPool();
    await pool.query(`
      ALTER TABLE inscricoes ADD COLUMN IF NOT EXISTS pontuacao_homologada_barema NUMERIC(6,2);
      ALTER TABLE inscricoes ADD COLUMN IF NOT EXISTS status_auditoria_barema VARCHAR(32) NOT NULL DEFAULT 'PENDENTE';
      ALTER TABLE inscricoes ADD COLUMN IF NOT EXISTS auditoria_barema JSONB;
    `);
  }

  async buscarInscricaoPorId(id: string): Promise<InscricaoEntity | null> {
    await this.ensureAuditoriaColumns();
    const pool = getDbPool();
    const res = await pool.query(`SELECT * FROM inscricoes WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return this.mapInscricaoRow(res.rows[0]);
  }

  async buscarInscricoesPorCandidato(candidatoId: string): Promise<InscricaoEntity[]> {
    await this.ensureAuditoriaColumns();
    const pool = getDbPool();
    const res = await pool.query(
      `SELECT * FROM inscricoes WHERE candidato_id = $1 ORDER BY created_at DESC`,
      [candidatoId]
    );
    return res.rows.map((row) => this.mapInscricaoRow(row));
  }

  async buscarInscricoesPorProcesso(processoSeletivoId: string): Promise<InscricaoEntity[]> {
    await this.ensureAuditoriaColumns();
    const pool = getDbPool();
    const res = await pool.query(
      `SELECT * FROM inscricoes WHERE processo_seletivo_id = $1 ORDER BY created_at ASC`,
      [processoSeletivoId]
    );
    return res.rows.map((row) => this.mapInscricaoRow(row));
  }

  async buscarInscricaoPorCandidatoEProcesso(
    candidatoId: string,
    processoSeletivoId: string
  ): Promise<InscricaoEntity | null> {
    await this.ensureAuditoriaColumns();
    const pool = getDbPool();
    const res = await pool.query(
      `SELECT * FROM inscricoes WHERE candidato_id = $1 AND processo_seletivo_id = $2`,
      [candidatoId, processoSeletivoId]
    );
    if (res.rows.length === 0) return null;
    return this.mapInscricaoRow(res.rows[0]);
  }

  async buscarInscricaoPorCandidatoProcessoETrilha(
    candidatoId: string,
    processoSeletivoId: string,
    trilhaId: string
  ): Promise<InscricaoEntity | null> {
    await this.ensureAuditoriaColumns();
    const pool = getDbPool();
    const res = await pool.query(
      `SELECT * FROM inscricoes WHERE candidato_id = $1 AND processo_seletivo_id = $2 AND trilha_id = $3`,
      [candidatoId, processoSeletivoId, trilhaId]
    );
    if (res.rows.length === 0) return null;
    return this.mapInscricaoRow(res.rows[0]);
  }

  async atualizarAuditoriaBarema(
    inscricaoId: string,
    dados: {
      pontuacaoHomologadaBarema: number;
      statusAuditoriaBarema: StatusAuditoriaBaremaGeral;
      auditoriaBarema: ItemBaremaAuditado[];
    }
  ): Promise<InscricaoEntity | null> {
    await this.ensureAuditoriaColumns();
    const pool = getDbPool();
    const res = await pool.query(
      `UPDATE inscricoes
       SET pontuacao_homologada_barema = $1,
           status_auditoria_barema = $2,
           auditoria_barema = $3
       WHERE id = $4
       RETURNING *`,
      [
        dados.pontuacaoHomologadaBarema,
        dados.statusAuditoriaBarema,
        JSON.stringify(dados.auditoriaBarema),
        inscricaoId,
      ]
    );
    if (res.rows.length === 0) return null;
    return this.mapInscricaoRow(res.rows[0]);
  }

  async atualizarItensBaremaInscricao(
    inscricaoId: string,
    dados: {
      itensBarema: ItemBaremaDeclarado[];
      pontuacaoProvisoriaBarema: number;
      extratoBarema: ResultadoCalculoBarema;
    }
  ): Promise<InscricaoEntity | null> {
    await this.ensureAuditoriaColumns();
    const pool = getDbPool();
    const res = await pool.query(
      `UPDATE inscricoes
       SET itens_barema = $1,
           pontuacao_provisoria_barema = $2,
           extrato_barema = $3
       WHERE id = $4
       RETURNING *`,
      [
        JSON.stringify(dados.itensBarema),
        dados.pontuacaoProvisoriaBarema,
        JSON.stringify(dados.extratoBarema),
        inscricaoId,
      ]
    );
    if (res.rows.length === 0) return null;
    return this.mapInscricaoRow(res.rows[0]);
  }

  private mapInscricaoRow(row: any): InscricaoEntity {
    return {
      id: row.id,
      numeroInscricao: row.numero_inscricao,
      codigoAnonimo: row.codigo_anonimo,
      candidatoId: row.candidato_id,
      candidatoNome: row.candidato_nome,
      candidatoEmail: row.candidato_email,
      candidatoCpf: row.candidato_cpf,
      processoSeletivoId: row.processo_seletivo_id,
      processoSeletivoTitulo: row.processo_seletivo_titulo,
      trilhaId: row.trilha_id,
      trilhaNome: row.trilha_nome,
      itensBarema: typeof row.itens_barema === "string" ? JSON.parse(row.itens_barema) : row.itens_barema,
      pontuacaoProvisoriaBarema: Number(row.pontuacao_provisoria_barema),
      pontuacaoHomologadaBarema:
        row.pontuacao_homologada_barema !== null && row.pontuacao_homologada_barema !== undefined
          ? Number(row.pontuacao_homologada_barema)
          : null,
      statusAuditoriaBarema: (row.status_auditoria_barema as StatusAuditoriaBaremaGeral) || "PENDENTE",
      auditoriaBarema:
        row.auditoria_barema
          ? typeof row.auditoria_barema === "string"
            ? JSON.parse(row.auditoria_barema)
            : row.auditoria_barema
          : null,
      extratoBarema: typeof row.extrato_barema === "string" ? JSON.parse(row.extrato_barema) : row.extrato_barema,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async reset(): Promise<void> {
    await ensureSchemaInitialized();
    const pool = getDbPool();
    await pool.query("TRUNCATE TABLE inscricoes, candidatos CASCADE");
  }
}

let instance: CandidatoRepository | null = null;

export function getCandidatoRepository(): CandidatoRepository {
  if (!instance) {
    instance = new PostgresCandidatoRepository();
  }
  return instance;
}

export async function resetCandidatoRepository(): Promise<void> {
  await getCandidatoRepository().reset();
}

import crypto from "crypto";
import { RunnerPayload, RunnerResult } from "@/domain/runner/runner-contract";
import { SandboxExecutor } from "./sandbox-executor";
import { RemoteRunnerExecutor } from "./remote-executor";
import { getDbPool, ensureSchemaInitialized } from "@/infrastructure/database/db";

export type RunnerJobState = "queued" | "running" | "completed" | "failed";

export interface RunnerJobEntity {
  id: string;
  state: RunnerJobState;
  payload: RunnerPayload;
  ownerId?: string;
  result?: RunnerResult;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

const globalForRunner = globalThis as unknown as {
  __devtestRunnerCompletionPromises?: Map<string, Promise<RunnerJobEntity>>;
  __devtestRunnerQueueInstance?: RunnerQueueService;
};

function getSharedCompletionPromises(): Map<string, Promise<RunnerJobEntity>> {
  if (!globalForRunner.__devtestRunnerCompletionPromises) {
    globalForRunner.__devtestRunnerCompletionPromises = new Map();
  }
  return globalForRunner.__devtestRunnerCompletionPromises;
}

function mapRowToJob(row: any): RunnerJobEntity {
  return {
    id: row.id,
    state: row.state as RunnerJobState,
    payload: row.payload,
    ownerId: row.owner_id || undefined,
    result: row.result || undefined,
    error: row.error || undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

interface RunnerExecutor {
  execute(payload: RunnerPayload): Promise<RunnerResult>;
}

function criarExecutorPadrao(): RunnerExecutor {
  const url = process.env.RUNNER_URL;
  if (url) {
    const token = process.env.RUNNER_TOKEN;
    if (!token) throw new Error("RUNNER_URL definido sem RUNNER_TOKEN.");
    return new RemoteRunnerExecutor(url, token);
  }
  return new SandboxExecutor();
}

export class RunnerQueueService {
  private executor: RunnerExecutor;

  constructor(executor?: RunnerExecutor) {
    this.executor = executor || criarExecutorPadrao();
  }

  private async ensureTable(): Promise<void> {
    await ensureSchemaInitialized();
    const pool = getDbPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS runner_jobs (
        id VARCHAR(64) PRIMARY KEY,
        state VARCHAR(32) NOT NULL,
        payload JSONB NOT NULL,
        result JSONB,
        error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async enqueue(
    payload: RunnerPayload,
    ownerId?: string
  ): Promise<RunnerJobEntity> {
    await this.ensureTable();
    const pool = getDbPool();
    const id = `job-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO runner_jobs (id, state, payload, owner_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, "queued", JSON.stringify(payload), ownerId ?? null, now, now]
    );

    const job: RunnerJobEntity = {
      id,
      state: "queued",
      payload,
      ownerId,
      createdAt: now,
      updatedAt: now,
    };

    const promises = getSharedCompletionPromises();
    const processingPromise = this.processJob(id, payload);
    promises.set(id, processingPromise);

    return job;
  }

  private async processJob(
    id: string,
    payload: RunnerPayload
  ): Promise<RunnerJobEntity> {
    await this.ensureTable();
    const pool = getDbPool();
    const runningNow = new Date().toISOString();

    await pool.query(
      `UPDATE runner_jobs SET state = $1, updated_at = $2 WHERE id = $3`,
      ["running", runningNow, id]
    );

    try {
      const result = await this.executor.execute(payload);
      const doneNow = new Date().toISOString();
      const res = await pool.query(
        `UPDATE runner_jobs
         SET state = $1, result = $2, updated_at = $3
         WHERE id = $4
         RETURNING *`,
        ["completed", JSON.stringify(result), doneNow, id]
      );
      return mapRowToJob(res.rows[0]);
    } catch (err: any) {
      const failNow = new Date().toISOString();
      const errorMsg = err?.message || "Falha inesperada no worker do Runner.";
      const res = await pool.query(
        `UPDATE runner_jobs
         SET state = $1, error = $2, updated_at = $3
         WHERE id = $4
         RETURNING *`,
        ["failed", errorMsg, failNow, id]
      );
      return mapRowToJob(res.rows[0]);
    }
  }

  async getJob(
    id: string,
    options?: { wait?: boolean }
  ): Promise<RunnerJobEntity | null> {
    await this.ensureTable();
    const pool = getDbPool();
    const promises = getSharedCompletionPromises();

    if (options?.wait) {
      if (promises.has(id)) {
        await promises.get(id);
      } else {
        // Caso a requisição caia em outro worker/bundle do Next.js dev server, fazemos polling curto no banco
        for (let i = 0; i < 60; i++) {
          const checkRes = await pool.query(
            `SELECT * FROM runner_jobs WHERE id = $1`,
            [id]
          );
          if (checkRes.rows.length === 0) return null;
          const job = mapRowToJob(checkRes.rows[0]);
          if (job.state === "completed" || job.state === "failed") {
            return job;
          }
          await new Promise((r) => setTimeout(r, 100));
        }
      }
    }

    const res = await pool.query(`SELECT * FROM runner_jobs WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return mapRowToJob(res.rows[0]);
  }

  async reset(): Promise<void> {
    const promises = getSharedCompletionPromises();
    await Promise.allSettled(Array.from(promises.values()));
    promises.clear();
    await this.ensureTable();
    const pool = getDbPool();
    await pool.query("TRUNCATE TABLE runner_jobs");
  }
}

export function getRunnerQueue(): RunnerQueueService {
  if (!globalForRunner.__devtestRunnerQueueInstance) {
    globalForRunner.__devtestRunnerQueueInstance = new RunnerQueueService();
  }
  return globalForRunner.__devtestRunnerQueueInstance;
}

export async function resetRunnerQueue(): Promise<void> {
  if (globalForRunner.__devtestRunnerQueueInstance) {
    await globalForRunner.__devtestRunnerQueueInstance.reset();
  }
}

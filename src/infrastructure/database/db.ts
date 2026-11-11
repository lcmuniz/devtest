import { Pool } from "pg";
import fs from "fs";
import path from "path";

const isTestEnv =
  Boolean(process.env.VITEST) || process.env.NODE_ENV === "test";

const defaultDbName = isTestEnv ? "devtest_test_db" : "devtest_db";

const connectionString = isTestEnv
  ? process.env.TEST_DATABASE_URL || `postgres://postgres:postgres@localhost:5433/${defaultDbName}`
  : process.env.DATABASE_URL || `postgres://postgres:postgres@localhost:5433/${defaultDbName}`;

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

async function ensureDatabaseExists(): Promise<void> {
  if (!isTestEnv) return;
  const adminPool = new Pool({
    connectionString: "postgres://postgres:postgres@localhost:5433/postgres",
    max: 2,
  });
  try {
    const res = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [defaultDbName]
    );
    if (res.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE ${defaultDbName}`);
    }
  } catch {
    // Ignora se já existir em condição de corrida
  } finally {
    await adminPool.end();
  }
}

let schemaInitPromise: Promise<void> | null = null;

export async function ensureSchemaInitialized(): Promise<void> {
  if (schemaInitPromise) {
    return schemaInitPromise;
  }

  schemaInitPromise = (async () => {
    await ensureDatabaseExists();
    const p = getDbPool();
    try {
      const schemaPath = path.resolve(
        process.cwd(),
        "src/infrastructure/database/schema.sql"
      );
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, "utf-8");
        await p.query(sql);
      }
    } catch (err) {
      schemaInitPromise = null;
      console.error("Falha ao inicializar schema do PostgreSQL:", err);
    }
  })();

  return schemaInitPromise;
}

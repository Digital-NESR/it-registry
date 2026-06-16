/* PostgreSQL access layer (node-postgres).
   A single pool is cached on globalThis so that hot-reloading in dev and
   serverless invocation reuse on Vercel don't open a new pool every time. */
import { Pool } from "pg";

function makePool() {
  // Most managed providers (Azure, Neon, Supabase, Vercel, Railway) require
  // SSL with a cert chain Node won't verify by default — relax verification.
  const useSsl = String(process.env.PGSSL ?? "true").toLowerCase() !== "false";
  const ssl = useSsl ? { rejectUnauthorized: false } : false;

  // Prefer a full connection string when provided…
  if (process.env.DATABASE_URL) {
    return new Pool({ connectionString: process.env.DATABASE_URL, ssl, max: 5 });
  }

  // …otherwise assemble from individual POSTGRES_* parameters. This avoids
  // URL-encoding headaches when the password contains characters like % or @.
  const { POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD } = process.env;
  if (!POSTGRES_HOST || !POSTGRES_DB || !POSTGRES_USER) {
    throw new Error(
      "No database configuration found. Copy .env.example to .env.local and set either " +
      "DATABASE_URL or the POSTGRES_HOST/DB/USER/PASSWORD parameters."
    );
  }
  return new Pool({
    host: POSTGRES_HOST,
    port: Number(POSTGRES_PORT) || 5432,
    database: POSTGRES_DB,
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    ssl,
    max: 5,
  });
}

const globalForPg = globalThis;
export const pool = globalForPg.__nesrPgPool ?? (globalForPg.__nesrPgPool = makePool());

export function query(text, params) {
  return pool.query(text, params);
}

/** Ensure the applications table exists (idempotent). */
export async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS applications (
      id          SERIAL PRIMARY KEY,
      record      JSONB NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await query(
    `CREATE INDEX IF NOT EXISTS applications_approval_idx
       ON applications ((record->>'approvalStatus'));`
  );
}

const rowToApp = (row) => ({ ...row.record, id: row.id });

/** All applications, oldest id first. */
export async function listApps() {
  const { rows } = await query("SELECT id, record FROM applications ORDER BY id ASC");
  return rows.map(rowToApp);
}

/** One application by id, or null. */
export async function getApp(id) {
  const { rows } = await query("SELECT id, record FROM applications WHERE id = $1", [id]);
  return rows.length ? rowToApp(rows[0]) : null;
}

/** Insert a new application from a plain record object. Returns the saved app. */
export async function insertApp(record) {
  const clean = { ...record };
  delete clean.id; // id is owned by the database
  const { rows } = await query(
    "INSERT INTO applications (record) VALUES ($1) RETURNING id, record",
    [clean]
  );
  return rowToApp(rows[0]);
}

/** Replace an application's record. Returns the saved app, or null if missing. */
export async function updateApp(id, record) {
  const clean = { ...record };
  delete clean.id;
  const { rows } = await query(
    "UPDATE applications SET record = $2, updated_at = now() WHERE id = $1 RETURNING id, record",
    [id, clean]
  );
  return rows.length ? rowToApp(rows[0]) : null;
}

/** Delete an application. Returns true if a row was removed. */
export async function deleteApp(id) {
  const { rowCount } = await query("DELETE FROM applications WHERE id = $1", [id]);
  return rowCount > 0;
}

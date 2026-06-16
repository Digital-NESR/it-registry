/* PostgreSQL access layer (node-postgres).
   A single pool is cached on globalThis so that hot-reloading in dev and
   serverless invocation reuse on Vercel don't open a new pool every time. */
import { Pool } from "pg";

/** Build the PostgreSQL connection string from the individual POSTGRES_*
    parameters. The password is URL-encoded so special characters (e.g. % @)
    are safe inside the URL. */
export function buildConnectionString() {
  const { POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD } = process.env;
  if (!POSTGRES_HOST || !POSTGRES_DB || !POSTGRES_USER) {
    throw new Error(
      "Database not configured. Copy .env.example to .env.local and set " +
      "POSTGRES_HOST / POSTGRES_PORT / POSTGRES_DB / POSTGRES_USER / POSTGRES_PASSWORD."
    );
  }
  const port = Number(POSTGRES_PORT) || 5432;
  const user = encodeURIComponent(POSTGRES_USER);
  const pass = encodeURIComponent(POSTGRES_PASSWORD ?? "");
  return `postgresql://${user}:${pass}@${POSTGRES_HOST}:${port}/${POSTGRES_DB}`;
}

function makePool() {
  // Most managed providers (Azure, Neon, Supabase, Vercel, Railway) require
  // SSL with a cert chain Node won't verify by default — relax verification.
  const useSsl = String(process.env.PGSSL ?? "true").toLowerCase() !== "false";
  const ssl = useSsl ? { rejectUnauthorized: false } : false;

  // Always construct the URL from the POSTGRES_* parameters (per project setup).
  const connectionString = buildConnectionString();
  return new Pool({ connectionString, ssl, max: 5 });
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

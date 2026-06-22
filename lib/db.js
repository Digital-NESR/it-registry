/* PostgreSQL access layer (node-postgres).

   The applications table has one typed column per schema field (generated from
   lib/schema.js), plus workflow columns. Array fields (multiselect / app links)
   are JSONB columns. Uploaded documents live in a separate `documents` table.

   A single pool is cached on globalThis so dev hot-reload and serverless reuse
   don't open a new pool every time. */
import pg from "pg";
import { allKeys, fieldByKey, columnType, isArrayField } from "./schema.js";

// Return DATE columns as plain 'YYYY-MM-DD' strings and NUMERIC as JS numbers,
// matching what the frontend expects.
pg.types.setTypeParser(1082, (v) => v);                       // date
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // numeric

const { Pool } = pg;

/** Build the PostgreSQL connection string from the POSTGRES_* parameters.
    The password is URL-encoded so special characters (e.g. % @) are safe. */
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
  const useSsl = String(process.env.PGSSL ?? "true").toLowerCase() !== "false";
  const ssl = useSsl ? { rejectUnauthorized: false } : false;
  return new Pool({ connectionString: buildConnectionString(), ssl, max: 5 });
}

const globalForPg = globalThis;
export const pool = globalForPg.__nesrPgPool ?? (globalForPg.__nesrPgPool = makePool());
export function query(text, params) {
  return pool.query(text, params);
}

/* ---------- column mapping ---------- */
const snake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const DATE_WORKFLOW = new Set(["submittedDate", "decisionDate"]);

function typeForKey(key) {
  const f = fieldByKey[key];
  if (f) return columnType(f);
  return DATE_WORKFLOW.has(key) ? "DATE" : "TEXT";
}
function isArrayKey(key) {
  const f = fieldByKey[key];
  return f ? isArrayField(f) : false;
}

/** Convert a record value to what the parameterised query should bind. */
function toColumnValue(key, val) {
  if (isArrayKey(key)) {
    const arr = Array.isArray(val) ? val : val == null || val === "" ? [] : [val];
    return JSON.stringify(arr);
  }
  const type = typeForKey(key);
  if (type === "DATE") return val ? val : null;
  if (type === "NUMERIC") return val === "" || val == null ? null : Number(val);
  return val === "" || val == null ? null : String(val);
}

const COLS = allKeys;                                  // camelCase keys, in order
const SELECT_LIST = ["id", ...COLS.map((k) => `${snake(k)} AS "${k}"`)].join(", ");
const COL_DDL = COLS.map((k) => `${snake(k)} ${typeForKey(k)}`).join(",\n      ");

/** Ensure the schema exists; migrate away from the old single-JSONB table and
    add any newly-introduced columns. Heavy checks run once per process. */
let _schemaReady = false;
export async function ensureSchema() {
  if (_schemaReady) return;

  // If a previous (single `record` JSONB column) table exists, drop it.
  const legacy = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'record'`
  );
  if (legacy.rows.length) await query("DROP TABLE IF EXISTS applications CASCADE");

  await query(`
    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      ${COL_DDL},
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  // Add columns introduced after the table was first created (idempotent).
  for (const k of COLS) {
    await query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS ${snake(k)} ${typeForKey(k)}`);
  }
  await query(
    `CREATE INDEX IF NOT EXISTS applications_approval_idx ON applications (approval_status);`
  );
  await query(`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      application_id INT REFERENCES applications(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      content_type TEXT,
      size INT,
      data BYTEA NOT NULL,
      uploaded_by TEXT,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS documents_app_idx ON documents (application_id);`);
  await query(`
    CREATE TABLE IF NOT EXISTS cost_centers (
      id SERIAL PRIMARY KEY,
      country TEXT NOT NULL,
      company TEXT NOT NULL,
      department TEXT,
      cost_center TEXT NOT NULL
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS cost_centers_country_idx ON cost_centers (country);`);
  await query(`CREATE INDEX IF NOT EXISTS cost_centers_company_idx ON cost_centers (company);`);

  // ---- role management (also the user directory) ----
  await query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      email          TEXT PRIMARY KEY,
      display_name   TEXT,
      job_title      TEXT,
      photo          TEXT,
      role           TEXT NOT NULL DEFAULT 'Business Owner',
      delegate_email TEXT,
      delegate_start DATE,
      delegate_end   DATE,
      updated_by     TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  // Seed the initial IT Director and Manager (idempotent — never overwrites).
  await query(
    `INSERT INTO user_roles (email, display_name, role, updated_by)
       VALUES ($1,$2,'IT Director','system'), ($3,$4,'Manager','system')
       ON CONFLICT (email) DO NOTHING`,
    ["tmujber@nesr.com", "Tariq Mujber", "rparambath@nesr.com", "Riswan Parambath"]
  );

  // ---- audit log ----
  await query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id          SERIAL PRIMARY KEY,
      ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
      actor_email TEXT,
      actor_name  TEXT,
      action      TEXT NOT NULL,
      entity_type TEXT,
      entity_id   TEXT,
      summary     TEXT,
      metadata    JSONB
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS audit_ts_idx ON audit_log (ts DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS audit_actor_idx ON audit_log (actor_email);`);

  _schemaReady = true;
}

/* ---------- role management ---------- */
const ROLE_VALUES = ["Business Owner", "Manager", "IT Director"];

/** The user_roles row for an email (or null). */
export async function getUserRecord(email) {
  if (!email) return null;
  const { rows } = await query(
    `SELECT email, display_name AS "displayName", job_title AS "jobTitle", photo, role,
            delegate_email AS "delegateEmail", delegate_start AS "delegateStart", delegate_end AS "delegateEnd"
       FROM user_roles WHERE lower(email) = lower($1)`,
    [email]
  );
  return rows[0] || null;
}

/** All user_roles rows. */
export async function listRoles() {
  const { rows } = await query(
    `SELECT email, display_name AS "displayName", job_title AS "jobTitle", role,
            delegate_email AS "delegateEmail", delegate_start AS "delegateStart", delegate_end AS "delegateEnd",
            updated_by AS "updatedBy", updated_at AS "updatedAt"
       FROM user_roles ORDER BY
       CASE role WHEN 'IT Director' THEN 0 WHEN 'Manager' THEN 1 ELSE 2 END, lower(coalesce(display_name, email))`
  );
  return rows;
}

/** Upsert a user's profile on login without touching their assigned role. */
export async function upsertProfile({ email, displayName, jobTitle, photo }) {
  if (!email) return;
  await query(
    `INSERT INTO user_roles (email, display_name, job_title, photo, updated_by)
       VALUES ($1,$2,$3,$4,'sso')
     ON CONFLICT (email) DO UPDATE SET
       display_name = COALESCE(EXCLUDED.display_name, user_roles.display_name),
       job_title    = COALESCE(EXCLUDED.job_title, user_roles.job_title),
       photo        = COALESCE(EXCLUDED.photo, user_roles.photo),
       updated_at   = now()`,
    [email, displayName || null, jobTitle || null, photo || null]
  );
}

/** Set a user's role (creating the row if needed). */
export async function setRole(email, role, updatedBy) {
  if (!ROLE_VALUES.includes(role)) throw new Error("Invalid role");
  await query(
    `INSERT INTO user_roles (email, role, updated_by)
       VALUES ($1,$2,$3)
     ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [email, role, updatedBy || null]
  );
}

/** The current IT Director (approver) row, if any. */
export async function getApprover() {
  const { rows } = await query(
    `SELECT email, display_name AS "displayName",
            delegate_email AS "delegateEmail", delegate_start AS "delegateStart", delegate_end AS "delegateEnd"
       FROM user_roles WHERE role = 'IT Director' ORDER BY updated_at LIMIT 1`
  );
  return rows[0] || null;
}

/** Set / clear time-bound delegation on the IT Director row. */
export async function setDelegation({ delegateEmail, start, end }, updatedBy) {
  const approver = await getApprover();
  if (!approver) throw new Error("No IT Director is configured to delegate from");
  await query(
    `UPDATE user_roles SET delegate_email = $2, delegate_start = $3, delegate_end = $4,
       updated_by = $5, updated_at = now() WHERE lower(email) = lower($1)`,
    [approver.email, delegateEmail || null, start || null, end || null, updatedBy || null]
  );
  return getApprover();
}

/* ---------- audit log ---------- */
export async function logAudit({ actorEmail, actorName, action, entityType, entityId, summary, metadata }) {
  try {
    await query(
      `INSERT INTO audit_log (actor_email, actor_name, action, entity_type, entity_id, summary, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [actorEmail || null, actorName || null, action, entityType || null,
       entityId != null ? String(entityId) : null, summary || null, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (e) {
    // Never let audit logging break the main action.
    console.error("audit log failed:", e.message);
  }
}

export async function listAudit({ limit = 100, offset = 0, action, actor } = {}) {
  const where = [];
  const params = [];
  if (action) { params.push(action); where.push(`action = $${params.length}`); }
  if (actor) { params.push(`%${actor.toLowerCase()}%`); where.push(`lower(actor_email) LIKE $${params.length}`); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  params.push(limit); const lim = `$${params.length}`;
  params.push(offset); const off = `$${params.length}`;
  const { rows } = await query(
    `SELECT id, ts, actor_email AS "actorEmail", actor_name AS "actorName", action,
            entity_type AS "entityType", entity_id AS "entityId", summary, metadata
       FROM audit_log ${clause} ORDER BY ts DESC LIMIT ${lim} OFFSET ${off}`,
    params
  );
  return rows;
}

/** Portfolio + governance metrics for the admin analytics tab. */
export async function getAnalytics() {
  const [apps, byStatus, byApproval, byDept, roles, recent] = await Promise.all([
    query(`SELECT COUNT(*)::int n, COALESCE(SUM(tco),0)::bigint tco FROM applications`),
    query(`SELECT status, COUNT(*)::int n FROM applications GROUP BY status ORDER BY n DESC`),
    query(`SELECT approval_status AS k, COUNT(*)::int n FROM applications GROUP BY approval_status ORDER BY n DESC`),
    query(`SELECT department AS k, COUNT(*)::int n FROM applications WHERE department <> '' GROUP BY department ORDER BY n DESC LIMIT 10`),
    query(`SELECT role AS k, COUNT(*)::int n FROM user_roles GROUP BY role`),
    query(`SELECT COUNT(*)::int n FROM audit_log WHERE ts > now() - interval '7 days'`),
  ]);
  return {
    totalApps: apps.rows[0].n,
    totalTco: Number(apps.rows[0].tco),
    byStatus: byStatus.rows,
    byApproval: byApproval.rows,
    byDepartment: byDept.rows,
    byRole: roles.rows,
    auditLast7d: recent.rows[0].n,
    pending: byApproval.rows.find((r) => r.k === "Pending")?.n || 0,
    users: roles.rows.reduce((s, r) => s + r.n, 0),
  };
}

/** All cost-centre mapping rows (country, company, department, costCenter). */
export async function listCostCenters() {
  const { rows } = await query(
    `SELECT country, company, department, cost_center AS "costCenter"
       FROM cost_centers ORDER BY country, company, department`
  );
  return rows;
}

function rowToApp(row, docs = []) {
  const app = { id: row.id };
  for (const k of COLS) {
    let v = row[k];
    if (isArrayKey(k)) v = Array.isArray(v) ? v : [];
    app[k] = v;
  }
  app.documents = docs;
  return app;
}

/** Document metadata (no binary) grouped by application id. */
async function docsByApp(ids) {
  if (!ids.length) return {};
  const { rows } = await query(
    `SELECT id, application_id, filename, content_type, size, uploaded_by, uploaded_at
       FROM documents WHERE application_id = ANY($1) ORDER BY uploaded_at ASC`,
    [ids]
  );
  const map = {};
  for (const r of rows) (map[r.application_id] ??= []).push(r);
  return map;
}

/* ---------- applications CRUD ---------- */
export async function listApps() {
  const { rows } = await query(`SELECT ${SELECT_LIST} FROM applications ORDER BY id ASC`);
  const docs = await docsByApp(rows.map((r) => r.id));
  return rows.map((r) => rowToApp(r, docs[r.id] || []));
}

export async function getApp(id) {
  const { rows } = await query(`SELECT ${SELECT_LIST} FROM applications WHERE id = $1`, [id]);
  if (!rows.length) return null;
  const docs = await docsByApp([id]);
  return rowToApp(rows[0], docs[id] || []);
}

export async function insertApp(record) {
  const values = COLS.map((k) => toColumnValue(k, record[k]));
  const placeholders = COLS.map((_, i) => `$${i + 1}`).join(", ");
  const cols = COLS.map((k) => snake(k)).join(", ");
  const { rows } = await query(
    `INSERT INTO applications (${cols}) VALUES (${placeholders}) RETURNING ${SELECT_LIST}`,
    values
  );
  return rowToApp(rows[0]);
}

export async function updateApp(id, record) {
  const values = COLS.map((k) => toColumnValue(k, record[k]));
  const sets = COLS.map((k, i) => `${snake(k)} = $${i + 2}`).join(", ");
  const { rows } = await query(
    `UPDATE applications SET ${sets}, updated_at = now() WHERE id = $1 RETURNING ${SELECT_LIST}`,
    [id, ...values]
  );
  if (!rows.length) return null;
  const docs = await docsByApp([id]);
  return rowToApp(rows[0], docs[id] || []);
}

/** Patch only the given camelCase fields of one application. Returns saved app. */
export async function patchApp(id, partial) {
  const keys = Object.keys(partial).filter((k) => COLS.includes(k));
  if (!keys.length) return getApp(id);
  const sets = keys.map((k, i) => `${snake(k)} = $${i + 2}`).join(", ");
  const values = keys.map((k) => toColumnValue(k, partial[k]));
  await query(
    `UPDATE applications SET ${sets}, updated_at = now() WHERE id = $1`,
    [id, ...values]
  );
  return getApp(id);
}

export async function deleteApp(id) {
  const { rowCount } = await query("DELETE FROM applications WHERE id = $1", [id]);
  return rowCount > 0;
}

/** Keep upstream/downstream links bi-directional after `app` is saved:
    if A lists O upstream, O must list A downstream (and vice-versa). */
export async function reconcileLinks(app) {
  const all = await listApps();
  const aUp = new Set(app.upstreamSystems || []);
  const aDown = new Set(app.downstreamSystems || []);
  for (const o of all) {
    if (o.id === app.id) continue;
    const up = new Set(o.upstreamSystems || []);
    const down = new Set(o.downstreamSystems || []);
    let changed = false;
    // O upstream-of-A  ⇒  A.upstream has O  ⇒  O.downstream must have A
    if (aUp.has(o.name) ? !down.has(app.name) : down.has(app.name)) {
      aUp.has(o.name) ? down.add(app.name) : down.delete(app.name); changed = true;
    }
    // O downstream-of-A ⇒ A.downstream has O ⇒ O.upstream must have A
    if (aDown.has(o.name) ? !up.has(app.name) : up.has(app.name)) {
      aDown.has(o.name) ? up.add(app.name) : up.delete(app.name); changed = true;
    }
    if (changed) await patchApp(o.id, { upstreamSystems: [...up], downstreamSystems: [...down] });
  }
}

/* ---------- documents ---------- */
export async function insertDocument({ applicationId, filename, contentType, size, data, uploadedBy }) {
  const { rows } = await query(
    `INSERT INTO documents (application_id, filename, content_type, size, data, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, application_id, filename, content_type, size, uploaded_by, uploaded_at`,
    [applicationId, filename, contentType, size, data, uploadedBy]
  );
  return rows[0];
}
export async function getDocument(id) {
  const { rows } = await query(`SELECT * FROM documents WHERE id = $1`, [id]);
  return rows[0] || null;
}
export async function deleteDocument(id) {
  const { rowCount } = await query(`DELETE FROM documents WHERE id = $1`, [id]);
  return rowCount > 0;
}

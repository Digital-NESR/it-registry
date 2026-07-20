/* Read-only access to the shared NESR Azure AD employee directory
   (separate database `azure_emp_directory`, table azure_ad_users_staging),
   reached with the same POSTGRES_* credentials as the main app DB. */
import pg from "pg";

pg.types.setTypeParser(1082, (v) => v);

function makeEmpPool() {
  const useSsl = String(process.env.PGSSL ?? "true").toLowerCase() !== "false";
  return new pg.Pool({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT) || 5432,
    database: process.env.EMP_DIRECTORY_DB || "azure_emp_directory",
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: 3,
  });
}

const g = globalThis;
export const empPool = g.__nesrEmpPool ?? (g.__nesrEmpPool = makeEmpPool());

/** Search employees by name or email. Returns {name, email, jobTitle, department}. */
export async function searchEmployees(q, limit = 50) {
  const lim = Math.min(Number(limit) || 50, 100);
  const base = `SELECT display_name AS "name", mail AS "email", job_title AS "jobTitle", department
                  FROM azure_ad_users_staging
                 WHERE display_name IS NOT NULL AND display_name <> '' AND mail IS NOT NULL AND mail <> ''`;
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    // Broad search (any name/email match), real staff surfaced first.
    const { rows } = await empPool.query(
      `${base} AND (display_name ILIKE $1 OR mail ILIKE $1)
         ORDER BY (job_title IS NULL), display_name LIMIT ${lim}`,
      [term]
    );
    return rows;
  }
  // Default list: real staff only (have a job title), to avoid guest/noise accounts.
  const { rows } = await empPool.query(
    `${base} AND job_title IS NOT NULL AND job_title <> '' ORDER BY display_name LIMIT ${lim}`
  );
  return rows;
}

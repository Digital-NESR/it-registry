/* Import the cost-centre mapping (data/cost_centers.csv) into PostgreSQL.

   Run with:  npm run db:cost-centers
   Columns: Country, Company Name, Department, Cost Center.
   Junk rows (cost centre not matching C\d+) are skipped. */
import { readFileSync } from "node:fs";
import { pool, query, ensureSchema } from "../lib/db.js";

// Minimal CSV line parser that respects double-quoted fields (which may contain commas).
function parseLine(line) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

async function main() {
  await ensureSchema();

  const csv = readFileSync(new URL("../data/cost_centers.csv", import.meta.url), "utf8");
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  lines.shift(); // header

  const seen = new Set();
  const rows = [];
  for (const line of lines) {
    const [country, company, department, costCenter] = parseLine(line);
    if (!costCenter || !/^C\d+/i.test(costCenter)) continue; // skip junk rows
    const key = `${country}|${company}|${department}|${costCenter}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push([country, company, department, costCenter]);
  }
  console.log(`→ Parsed ${rows.length} valid cost-centre rows.`);

  await query("TRUNCATE cost_centers RESTART IDENTITY");

  // Batched multi-row insert.
  const BATCH = 400;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const values = [];
    const params = [];
    chunk.forEach((r, j) => {
      const b = j * 4;
      values.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4})`);
      params.push(r[0], r[1], r[2], r[3]);
    });
    await query(
      `INSERT INTO cost_centers (country, company, department, cost_center) VALUES ${values.join(", ")}`,
      params
    );
  }

  const { rows: countRows } = await query("SELECT COUNT(*)::int AS n FROM cost_centers");
  const { rows: meta } = await query(
    "SELECT COUNT(DISTINCT country)::int AS countries, COUNT(DISTINCT company)::int AS companies FROM cost_centers"
  );
  console.log(`✓ Imported ${countRows[0].n} cost centres · ${meta[0].countries} countries · ${meta[0].companies} companies.`);
}

main()
  .then(() => pool.end())
  .catch((e) => { console.error("✗ Import failed:", e.message); pool.end(); process.exit(1); });

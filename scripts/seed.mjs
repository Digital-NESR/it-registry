/* Seed the PostgreSQL database with the 36 demo applications.

   Run with:  npm run db:seed
   (which loads .env.local via `node --env-file=.env.local`).

   Safe to re-run: it recreates the schema's index and, if the table already
   has rows, asks you to pass --force to wipe and reseed. */
import { ensureSchema, pool, query } from "../lib/db.js";
import { buildSeedApps } from "../lib/seed-data.js";

const force = process.argv.includes("--force");

async function main() {
  console.log("→ Ensuring schema…");
  await ensureSchema();

  const { rows } = await query("SELECT COUNT(*)::int AS n FROM applications");
  const existing = rows[0].n;

  if (existing > 0 && !force) {
    console.log(`! Table already has ${existing} row(s). Skipping seed.`);
    console.log("  Re-run with --force to wipe and reseed:  npm run db:seed -- --force");
    return;
  }

  if (force) {
    console.log("→ --force: clearing existing rows…");
    await query("TRUNCATE applications RESTART IDENTITY");
  }

  const apps = buildSeedApps();
  console.log(`→ Inserting ${apps.length} applications…`);
  for (const app of apps) {
    const record = { ...app };
    delete record.id; // database owns the id
    await query("INSERT INTO applications (record) VALUES ($1)", [record]);
  }

  const { rows: after } = await query("SELECT COUNT(*)::int AS n FROM applications");
  console.log(`✓ Done. ${after[0].n} applications in the registry.`);
}

main()
  .then(() => pool.end())
  .catch((e) => {
    console.error("✗ Seed failed:", e.message);
    pool.end();
    process.exit(1);
  });

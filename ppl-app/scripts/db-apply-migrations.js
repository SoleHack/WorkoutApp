// Applies pending SQL migration files to the linked Supabase project.
// Use because `supabase db push` requires Docker, which isn't installed.
//
// Behavior:
//   - Reads supabase/migrations/*.sql in filename order.
//   - Tracks applied migrations in a `_meta_migrations` table created on first run.
//   - Each migration runs inside its own transaction. Failure rolls back that migration.
//   - Skips any migration already recorded as applied.
//
// Usage:
//   SUPABASE_DB_PASSWORD='...' node scripts/db-apply-migrations.js
//   SUPABASE_DB_PASSWORD='...' node scripts/db-apply-migrations.js --dry-run

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load .env.local if present (gitignored). Sets env vars only if not already set.
(function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, k, rawV] = m;
    if (process.env[k] !== undefined) continue;
    process.env[k] = rawV.replace(/^['"](.*)['"]$/, '$1');
  }
})();

const dryRun = process.argv.includes('--dry-run');

function clientConfig() {
  const projectRef = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', '.temp', 'project-ref'),
    'utf8'
  ).trim();
  const pw = process.env.SUPABASE_DB_PASSWORD;
  if (!pw) throw new Error('Set SUPABASE_DB_PASSWORD before running.');
  return {
    host: 'aws-0-us-west-2.pooler.supabase.com',
    port: 5432,
    user: `postgres.${projectRef}`,
    password: pw,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  };
}

async function ensureMetaTable(c) {
  await c.query(`
    CREATE TABLE IF NOT EXISTS public._meta_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now(),
      checksum text
    );
  `);
}

async function appliedSet(c) {
  const r = await c.query('SELECT filename FROM public._meta_migrations');
  return new Set(r.rows.map(x => x.filename));
}

function loadMigrations() {
  const dir = path.join(__dirname, '..', 'supabase', 'migrations');
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort()
    .map(f => ({
      filename: f,
      path: path.join(dir, f),
      sql: fs.readFileSync(path.join(dir, f), 'utf8'),
    }));
}

function checksum(sql) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(sql).digest('hex').slice(0, 16);
}

(async () => {
  const c = new Client(clientConfig());
  await c.connect();
  await ensureMetaTable(c);
  const done = await appliedSet(c);
  const migrations = loadMigrations();

  console.log(`Found ${migrations.length} migration files`);
  console.log(`Already applied: ${done.size}`);
  if (dryRun) console.log('--- DRY RUN: no migrations will execute ---');
  console.log();

  let appliedCount = 0;
  for (const m of migrations) {
    if (done.has(m.filename)) {
      console.log(`SKIP   ${m.filename} (already applied)`);
      continue;
    }

    console.log(`APPLY  ${m.filename}  (checksum ${checksum(m.sql)})`);
    if (dryRun) continue;

    // The migration file itself starts with BEGIN; ends with COMMIT.
    // We don't wrap it again — let it own its transaction so DO blocks work.
    try {
      await c.query(m.sql);
      await c.query('INSERT INTO public._meta_migrations (filename, checksum) VALUES ($1, $2)', [
        m.filename,
        checksum(m.sql),
      ]);
      console.log(`  OK`);
      appliedCount++;
    } catch (err) {
      console.error(`  FAIL: ${err.message}`);
      console.error(`  Aborting. Subsequent migrations not attempted.`);
      await c.end();
      process.exit(1);
    }
  }

  console.log();
  console.log(`Done. Applied ${appliedCount} new migration${appliedCount === 1 ? '' : 's'}.`);
  await c.end();
})().catch(err => {
  console.error('FATAL', err.message);
  process.exit(1);
});

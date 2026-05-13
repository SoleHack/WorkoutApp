// Quick lookup: which session_sets reference exercise UUIDs that exist in `exercises`
// vs ones that don't (orphans). Also report any active program coverage gaps.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

(function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^['"](.*)['"]$/, '$1');
  }
})();

(async () => {
  const projectRef = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', '.temp', 'project-ref'), 'utf8'
  ).trim();
  const c = new Client({
    host: 'aws-0-us-west-2.pooler.supabase.com',
    port: 5432,
    user: `postgres.${projectRef}`,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  // 1. Specific UUID lookup
  const target = '761afa99-428e-47c1-9d95-21293dee2ed6';
  const exact = await c.query(
    `SELECT id, slug, name, category, is_public FROM exercises WHERE id = $1`, [target]
  );
  console.log(`Target ${target}:`);
  console.log(exact.rows.length ? exact.rows[0] : '  NOT FOUND IN exercises TABLE');
  console.log();

  // 2. All distinct exercise_ids referenced by session_sets — are they all resolvable?
  const orphans = await c.query(`
    SELECT DISTINCT ss.exercise_id
    FROM session_sets ss
    LEFT JOIN exercises e ON e.id = ss.exercise_id
    WHERE e.id IS NULL
  `);
  console.log(`Orphan session_sets.exercise_id values (no matching exercises row): ${orphans.rows.length}`);
  orphans.rows.slice(0, 10).forEach(r => console.log('  -', r.exercise_id));
  if (orphans.rows.length > 10) console.log(`  ... and ${orphans.rows.length - 10} more`);
  console.log();

  // 3. How many distinct exercises does the active program cover vs how many appear in sets
  const coverage = await c.query(`
    SELECT
      (SELECT COUNT(DISTINCT exercise_id) FROM session_sets) AS distinct_in_sets,
      (SELECT COUNT(*) FROM exercises) AS total_exercises,
      (SELECT COUNT(*) FROM exercises WHERE is_public = true) AS public_exercises
  `);
  console.log('Coverage:');
  console.log(coverage.rows[0]);

  await c.end();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

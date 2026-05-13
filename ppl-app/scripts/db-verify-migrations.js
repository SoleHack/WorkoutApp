// One-shot verification that migrations 20260512190000–190400 applied correctly.
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

  console.log('## Migration verification\n');

  // 1. session_sets.exercise_id is UUID with FK
  const colType = await c.query(`
    SELECT data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='session_sets' AND column_name='exercise_id';
  `);
  console.log('session_sets.exercise_id type:', colType.rows[0]?.data_type);

  const orphans = await c.query(`
    SELECT count(*)::int AS n
    FROM public.session_sets ss
    LEFT JOIN public.exercises e ON e.id = ss.exercise_id
    WHERE e.id IS NULL;
  `);
  console.log('session_sets orphan rows:', orphans.rows[0].n);

  // 2. partner_code on user_settings + trigger present
  const pc = await c.query(`
    SELECT count(*)::int AS rows_with_code,
           count(DISTINCT partner_code)::int AS unique_codes
    FROM public.user_settings WHERE partner_code IS NOT NULL;
  `);
  console.log('user_settings rows with partner_code:', pc.rows[0].rows_with_code, '/ unique:', pc.rows[0].unique_codes);

  const rpc = await c.query(`
    SELECT proname FROM pg_proc WHERE proname='find_partner_by_code';
  `);
  console.log('find_partner_by_code RPC exists:', rpc.rows.length > 0);

  // 3. FKs to auth.users
  const userFks = await c.query(`
    SELECT conrelid::regclass::text AS tbl, conname
    FROM pg_constraint
    WHERE contype='f'
      AND confrelid = 'auth.users'::regclass
      AND connamespace = 'public'::regnamespace
    ORDER BY conrelid::regclass::text;
  `);
  console.log('FKs to auth.users:', userFks.rows.length);
  userFks.rows.forEach(r => console.log('  -', r.tbl, '·', r.conname));

  // 4. Duplicate policies cleaned up
  const policyCount = await c.query(`
    SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='public';
  `);
  console.log('Total RLS policies in public schema:', policyCount.rows[0].n);

  // 5. New indexes
  const newIndexes = await c.query(`
    SELECT indexname FROM pg_indexes
    WHERE schemaname='public'
      AND indexname IN (
        'idx_programs_user_id','idx_workouts_user_id','idx_progress_photos_user_date',
        'idx_user_settings_partner_user_id','idx_workout_sessions_user_completed',
        'idx_exercise_alternatives_alternative','idx_public_stats_partner_mode',
        'idx_workout_exercises_workout_order'
      )
    ORDER BY indexname;
  `);
  console.log('New indexes present (expect 8):', newIndexes.rows.length);
  newIndexes.rows.forEach(r => console.log('  -', r.indexname));

  await c.end();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

// Read-only DB introspection — pulls schema, RLS state, FKs, policies.
// Connects via the pooler URL cached by `supabase link`.
// Usage: node scripts/db-introspect.js > /tmp/forge-db.md

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

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

function resolveClientConfig() {
  const projectRef = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', '.temp', 'project-ref'),
    'utf8'
  ).trim();
  const pw = process.env.SUPABASE_DB_PASSWORD;
  if (!pw) {
    throw new Error('Set SUPABASE_DB_PASSWORD before running this script.');
  }
  return {
    host: 'aws-0-us-west-2.pooler.supabase.com',
    port: 5432,
    user: `postgres.${projectRef}`,
    password: pw,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  };
}

function scrub(s) {
  return String(s);
}

(async () => {
  const c = new Client(resolveClientConfig());
  await c.connect();

  console.log('# Schema introspection');
  console.log('Generated:', new Date().toISOString());
  console.log();

  // 1. Tables with column info
  const tables = await c.query(`
    SELECT
      t.table_name,
      array_agg(c.column_name || ' ' || c.data_type ||
        (CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END) ||
        (CASE WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default ELSE '' END)
        ORDER BY c.ordinal_position) AS cols
    FROM information_schema.tables t
    JOIN information_schema.columns c USING (table_schema, table_name)
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    GROUP BY t.table_name
    ORDER BY t.table_name;
  `);

  console.log('## Tables + columns\n');
  for (const r of tables.rows) {
    console.log(`### ${r.table_name}`);
    r.cols.forEach(line => console.log('  -', line));
    console.log();
  }

  // 2. RLS status per table
  const rls = await c.query(`
    SELECT n.nspname AS schema, c.relname AS table, c.relrowsecurity AS rls_enabled,
           c.relforcerowsecurity AS rls_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `);
  console.log('## RLS status\n');
  console.log('| Table | RLS Enabled | Forced |');
  console.log('|-------|-------------|--------|');
  for (const r of rls.rows) {
    const flag = r.rls_enabled ? '✅' : '❌';
    console.log(`| ${r.table} | ${flag} | ${r.rls_forced ? 'yes' : 'no'} |`);
  }
  console.log();

  // 3. Policies
  const policies = await c.query(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname;
  `);
  console.log('## RLS policies\n');
  let lastTable = '';
  for (const r of policies.rows) {
    if (r.tablename !== lastTable) {
      console.log(`### ${r.tablename}`);
      lastTable = r.tablename;
    }
    console.log(`- **${r.policyname}** (${r.cmd}, ${r.permissive ? 'permissive' : 'restrictive'}, roles=${r.roles})`);
    if (r.qual) console.log('  - USING:', '`' + r.qual + '`');
    if (r.with_check) console.log('  - WITH CHECK:', '`' + r.with_check + '`');
  }
  console.log();

  // 4. Foreign keys
  const fks = await c.query(`
    SELECT
      tc.table_name AS from_table,
      kcu.column_name AS from_col,
      ccu.table_name AS to_table,
      ccu.column_name AS to_col,
      tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public'
    ORDER BY tc.table_name;
  `);
  console.log('## Foreign keys\n');
  for (const r of fks.rows) {
    console.log(`- ${r.from_table}.${r.from_col} → ${r.to_table}.${r.to_col}`);
  }
  console.log();

  // 5. Check constraints
  const checks = await c.query(`
    SELECT conrelid::regclass AS table, conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE contype='c' AND connamespace='public'::regnamespace
    ORDER BY conrelid::regclass::text;
  `);
  console.log('## Check constraints\n');
  for (const r of checks.rows) {
    console.log(`- ${r.table}: ${r.conname} → ${r.def}`);
  }
  console.log();

  // 6. Triggers
  const triggers = await c.query(`
    SELECT event_object_table AS table, trigger_name, event_manipulation, action_timing,
           action_statement
    FROM information_schema.triggers
    WHERE trigger_schema='public'
    ORDER BY event_object_table, trigger_name;
  `);
  console.log('## Triggers\n');
  for (const r of triggers.rows) {
    console.log(`- **${r.table}**: \`${r.trigger_name}\` ${r.action_timing} ${r.event_manipulation}`);
  }
  console.log();

  // 7. Functions (user-defined)
  const fns = await c.query(`
    SELECT p.proname, pg_get_function_arguments(p.oid) AS args,
           pg_get_function_result(p.oid) AS result, l.lanname AS lang
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname='public'
    ORDER BY p.proname;
  `);
  console.log('## Functions\n');
  for (const r of fns.rows) {
    console.log(`- \`${r.proname}(${r.args})\` → ${r.result} [${r.lang}]`);
  }
  console.log();

  // 8. Real exercise_id audit — slug vs uuid drift
  console.log('## session_sets.exercise_id distribution\n');
  const idShape = await c.query(`
    SELECT
      COUNT(*) FILTER (WHERE exercise_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AS uuid_count,
      COUNT(*) FILTER (WHERE exercise_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND exercise_id IS NOT NULL) AS slug_count,
      COUNT(*) FILTER (WHERE exercise_id IS NULL) AS null_count,
      COUNT(*) AS total
    FROM public.session_sets;
  `);
  console.log('```');
  console.log(idShape.rows[0]);
  console.log('```');
  console.log();

  // 9. Indexes per table (high-level)
  const idx = await c.query(`
    SELECT schemaname, tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname='public'
    ORDER BY tablename, indexname;
  `);
  console.log('## Indexes\n');
  let lastT = '';
  for (const r of idx.rows) {
    if (r.tablename !== lastT) {
      console.log(`\n### ${r.tablename}`);
      lastT = r.tablename;
    }
    console.log(`- \`${r.indexname}\``);
    console.log(`  - \`${r.indexdef}\``);
  }

  await c.end();
})().catch(err => {
  console.error('FAIL', scrub(err.message));
  process.exit(1);
});

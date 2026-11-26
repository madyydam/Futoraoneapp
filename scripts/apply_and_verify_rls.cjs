const fs = require('fs');
const path = require('path');
const { execSql, probeAnonEndpoint } = require('./db_admin.cjs');

const TABLES_TO_CHECK = [
  'profiles',
  'native_wallets',
  'native_transactions',
  'follows',
  'projects',
  'project_likes',
  'messages',
  'conversations',
  'admin_logs',
  'user_push_tokens',
  'posts'
];

async function runAudit(label) {
  console.log(`\n================== AUDIT: ${label} ==================`);
  for (const table of TABLES_TO_CHECK) {
    const res = await probeAnonEndpoint(table);
    let statusSummary = '';
    if (res.status === 401 || res.status === 403) {
      statusSummary = `LOCKED (${res.status} Unauthorized/Forbidden)`;
    } else if (res.status === 200) {
      try {
        const parsed = JSON.parse(res.body);
        if (Array.isArray(parsed) && parsed.length > 0) {
          statusSummary = `CRITICAL LEAK! 200 OK (${parsed.length} rows exposed to anon!)`;
        } else {
          statusSummary = `EMPTY (200 OK, 0 rows returned)`;
        }
      } catch (e) {
        statusSummary = `200 OK (${res.body.slice(0, 40)})`;
      }
    } else {
      statusSummary = `STATUS ${res.status}: ${res.body?.slice(0, 60)}`;
    }
    console.log(`Table '${table.padEnd(20)}': ${statusSummary}`);
  }
}

async function main() {
  await runAudit('BEFORE MIGRATIONS');

  console.log('\n================== RUNNING MIGRATION 04 ==================');
  const mig04Path = path.join(__dirname, '..', 'supabase', 'migrations', '20261126_04_lockdown_profiles_columns.sql');
  const sql04 = fs.readFileSync(mig04Path, 'utf8');
  const res04 = await execSql(sql04);
  console.log('Migration 04 result:', res04);

  console.log('\n================== RUNNING MIGRATION 05 ==================');
  const mig05Path = path.join(__dirname, '..', 'supabase', 'migrations', '20261126_05_full_rls_audit_lockdown.sql');
  const sql05 = fs.readFileSync(mig05Path, 'utf8');
  const res05 = await execSql(sql05);
  console.log('Migration 05 result:', res05);

  await runAudit('AFTER MIGRATIONS');
}

main().catch(err => {
  console.error('Fatal error in audit/migration runner:', err);
  process.exit(1);
});

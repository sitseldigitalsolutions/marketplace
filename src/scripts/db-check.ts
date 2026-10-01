/**
 * Check the database configured in DATABASE_URL: connectivity, server, schema (tables &
 * migrations) and row counts.   Usage: `pnpm db:check`   (exit code 0 = OK, 1 = problem)
 */
import { PrismaClient } from '@prisma/client';
import { databaseStatus } from '../database/status';

const url = process.env.DATABASE_URL;
const db = new PrismaClient({ datasources: url ? { db: { url } } : undefined });

async function main() {
  const s = await databaseStatus(db, url);
  const t = s.target;
  console.log('\nDatabase check');
  console.log('──────────────');
  console.log(`Target     : ${t ? `${t.user}@${t.host}:${t.port}/${t.database}` : '(DATABASE_URL not set)'}`);
  if (!s.connected) {
    console.log(`Connection : ✖ FAILED (${s.latencyMs} ms)`);
    console.log(`Reason     : ${s.error}\n`);
    process.exitCode = 1;
    return;
  }
  console.log(`Connection : ✔ OK (${s.latencyMs} ms)`);
  console.log(`Server     : ${s.server!.version} as ${s.server!.user}`);
  const sc = s.schema!;
  console.log(`Tables     : ${sc.tables}`);
  console.log(`Migrations : ${sc.migrationsApplied} applied${sc.migrationsExpected !== null ? ` / ${sc.migrationsExpected} in project` : ''}${sc.lastMigration ? ` (latest ${sc.lastMigration})` : ''}`);
  if (sc.failedMigrations.length) console.log(`             ✖ failed: ${sc.failedMigrations.join(', ')}`);
  if (sc.pendingMigrations.length) console.log(`             ⚠ pending: ${sc.pendingMigrations.join(', ')} → run pnpm db:deploy`);
  if (sc.migrationsApplied === 0) {
    console.log('Schema     : ⚠ empty — run `pnpm db:deploy` then `pnpm db:seed`, or import exports/*.sql');
    process.exitCode = 1;
  } else {
    console.log('Data       : ' + Object.entries(s.data ?? {}).map(([k, v]) => `${k}=${v}`).join('  '));
  }
  console.log('');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { PrismaClient } from '@prisma/client';

export interface DatabaseTarget {
  host: string;
  port: number;
  database: string;
  user: string;
  /** Connection string with the password replaced — safe to log or display. */
  safeUrl: string;
}

/** Parse a mysql:// URL without ever exposing the password. */
export function describeDatabaseUrl(url: string | undefined): DatabaseTarget | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const safe = new URL(url);
    if (safe.password) safe.password = '****';
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      database: decodeURIComponent(u.pathname.replace(/^\//, '')),
      user: decodeURIComponent(u.username),
      safeUrl: safe.toString(),
    };
  } catch {
    return null;
  }
}

export interface DatabaseStatus {
  connected: boolean;
  latencyMs: number;
  target: DatabaseTarget | null;
  server?: { version: string; database: string; user: string };
  schema?: {
    tables: number;
    migrationsApplied: number;
    migrationsExpected: number | null;
    pendingMigrations: string[];
    failedMigrations: string[];
    lastMigration: string | null;
  };
  data?: Record<string, number>;
  error?: string;
}

/** Locate prisma/migrations for both `tsx src` (dev) and the bundled `dist` build. */
function expectedMigrations(): string[] | null {
  const candidates = [resolve(process.cwd(), 'prisma/migrations'), resolve(process.cwd(), 'backend/prisma/migrations')];
  for (const dir of candidates) {
    if (existsSync(dir)) {
      return readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, 'migration.sql')))
        .map((d) => d.name)
        .sort();
    }
  }
  return null;
}

const COUNTED_TABLES = ['User', 'Seller', 'Category', 'Product', 'SellerProductListing', 'Order', 'Coupon'] as const;

/** Friendly explanation for common MySQL connection failures. */
export function explainDatabaseError(message: string): string {
  if (/Access denied|Authentication failed|valid database credentials/i.test(message)) return 'The database rejected the username or password (check DATABASE_URL; encode "@" in the password as %40).';
  if (/Unknown database/i.test(message)) return 'The database name in DATABASE_URL does not exist on this server.';
  if (/Can't reach database server|ECONNREFUSED|ETIMEDOUT|timed out/i.test(message)) {
    return 'The database server is unreachable (check host/port; shared hosting databases usually only accept connections from the hosting server itself).';
  }
  return message.split('\n').filter(Boolean).slice(-1)[0]?.slice(0, 300) ?? 'Unknown database error';
}

/** Full connectivity + schema + data report for the configured database. */
export async function databaseStatus(db: PrismaClient, url: string | undefined): Promise<DatabaseStatus> {
  const target = describeDatabaseUrl(url);
  const started = Date.now();
  try {
    const [server] = await db.$queryRaw<Array<{ version: string; db: string; usr: string }>>`
      SELECT VERSION() AS version, DATABASE() AS db, CURRENT_USER() AS usr`;
    const latencyMs = Date.now() - started;
    const [tables] = await db.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE()`;

    let applied: Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }> = [];
    try {
      applied = await db.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM \`_prisma_migrations\` ORDER BY migration_name`;
    } catch {
      /* table missing → schema not created yet */
    }
    const done = applied.filter((m) => m.finished_at && !m.rolled_back_at).map((m) => m.migration_name);
    const failed = applied.filter((m) => !m.finished_at && !m.rolled_back_at).map((m) => m.migration_name);
    const expected = expectedMigrations();

    const data: Record<string, number> = {};
    if (done.length) {
      for (const t of COUNTED_TABLES) {
        try {
          const [row] = await db.$queryRawUnsafe<Array<{ c: bigint }>>(`SELECT COUNT(*) AS c FROM \`${t}\``);
          data[t] = Number(row.c);
        } catch {
          data[t] = -1;
        }
      }
    }
    return {
      connected: true,
      latencyMs,
      target,
      server: { version: server.version, database: server.db, user: server.usr },
      schema: {
        tables: Number(tables.c),
        migrationsApplied: done.length,
        migrationsExpected: expected?.length ?? null,
        pendingMigrations: expected ? expected.filter((m) => !done.includes(m)) : [],
        failedMigrations: failed,
        lastMigration: done[done.length - 1] ?? null,
      },
      data,
    };
  } catch (err) {
    return { connected: false, latencyMs: Date.now() - started, target, error: explainDatabaseError((err as Error).message) };
  }
}

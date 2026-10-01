// src/scripts/db-check.ts
import { PrismaClient } from "@prisma/client";

// src/database/status.ts
import { existsSync, readdirSync } from "fs";
import { join, resolve } from "path";
function describeDatabaseUrl(url2) {
  if (!url2) return null;
  try {
    const u = new URL(url2);
    const safe = new URL(url2);
    if (safe.password) safe.password = "****";
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      database: decodeURIComponent(u.pathname.replace(/^\//, "")),
      user: decodeURIComponent(u.username),
      safeUrl: safe.toString()
    };
  } catch {
    return null;
  }
}
function expectedMigrations() {
  const candidates = [resolve(process.cwd(), "prisma/migrations"), resolve(process.cwd(), "backend/prisma/migrations")];
  for (const dir of candidates) {
    if (existsSync(dir)) {
      return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(dir, d.name, "migration.sql"))).map((d) => d.name).sort();
    }
  }
  return null;
}
var COUNTED_TABLES = ["User", "Seller", "Category", "Product", "SellerProductListing", "Order", "Coupon"];
function explainDatabaseError(message) {
  if (/Access denied|Authentication failed|valid database credentials/i.test(message)) return 'The database rejected the username or password (check DATABASE_URL; encode "@" in the password as %40).';
  if (/Unknown database/i.test(message)) return "The database name in DATABASE_URL does not exist on this server.";
  if (/Can't reach database server|ECONNREFUSED|ETIMEDOUT|timed out/i.test(message)) {
    return "The database server is unreachable (check host/port; shared hosting databases usually only accept connections from the hosting server itself).";
  }
  return message.split("\n").filter(Boolean).slice(-1)[0]?.slice(0, 300) ?? "Unknown database error";
}
async function databaseStatus(db2, url2) {
  const target = describeDatabaseUrl(url2);
  const started = Date.now();
  try {
    const [server] = await db2.$queryRaw`
      SELECT VERSION() AS version, DATABASE() AS db, CURRENT_USER() AS usr`;
    const latencyMs = Date.now() - started;
    const [tables] = await db2.$queryRaw`
      SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE()`;
    let applied = [];
    try {
      applied = await db2.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM \`_prisma_migrations\` ORDER BY migration_name`;
    } catch {
    }
    const done = applied.filter((m) => m.finished_at && !m.rolled_back_at).map((m) => m.migration_name);
    const failed = applied.filter((m) => !m.finished_at && !m.rolled_back_at).map((m) => m.migration_name);
    const expected = expectedMigrations();
    const data = {};
    if (done.length) {
      for (const t of COUNTED_TABLES) {
        try {
          const [row] = await db2.$queryRawUnsafe(`SELECT COUNT(*) AS c FROM \`${t}\``);
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
        lastMigration: done[done.length - 1] ?? null
      },
      data
    };
  } catch (err) {
    return { connected: false, latencyMs: Date.now() - started, target, error: explainDatabaseError(err.message) };
  }
}

// src/scripts/db-check.ts
var url = process.env.DATABASE_URL;
var db = new PrismaClient({ datasources: url ? { db: { url } } : void 0 });
async function main() {
  const s = await databaseStatus(db, url);
  const t = s.target;
  console.log("\nDatabase check");
  console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  console.log(`Target     : ${t ? `${t.user}@${t.host}:${t.port}/${t.database}` : "(DATABASE_URL not set)"}`);
  if (!s.connected) {
    console.log(`Connection : \u2716 FAILED (${s.latencyMs} ms)`);
    console.log(`Reason     : ${s.error}
`);
    process.exitCode = 1;
    return;
  }
  console.log(`Connection : \u2714 OK (${s.latencyMs} ms)`);
  console.log(`Server     : ${s.server.version} as ${s.server.user}`);
  const sc = s.schema;
  console.log(`Tables     : ${sc.tables}`);
  console.log(`Migrations : ${sc.migrationsApplied} applied${sc.migrationsExpected !== null ? ` / ${sc.migrationsExpected} in project` : ""}${sc.lastMigration ? ` (latest ${sc.lastMigration})` : ""}`);
  if (sc.failedMigrations.length) console.log(`             \u2716 failed: ${sc.failedMigrations.join(", ")}`);
  if (sc.pendingMigrations.length) console.log(`             \u26A0 pending: ${sc.pendingMigrations.join(", ")} \u2192 run pnpm db:deploy`);
  if (sc.migrationsApplied === 0) {
    console.log("Schema     : \u26A0 empty \u2014 run `pnpm db:deploy` then `pnpm db:seed`, or import exports/*.sql");
    process.exitCode = 1;
  } else {
    console.log("Data       : " + Object.entries(s.data ?? {}).map(([k, v]) => `${k}=${v}`).join("  "));
  }
  console.log("");
}
main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
//# sourceMappingURL=db-check.js.map
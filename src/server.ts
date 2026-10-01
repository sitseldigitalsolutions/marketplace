import { ConfigError, loadEnv } from './config/env';
import { logger } from './shared/logger';
import { createApp } from './app';
import { databaseStatus, describeDatabaseUrl, explainDatabaseError } from './database/status';

async function main() {
  let env;
  try {
    env = loadEnv();
  } catch (err) {
    if (err instanceof ConfigError) {
      // Fail fast with a readable message; never start with an invalid configuration.
      console.error(`\n✖ ${err.message}\n`);
      process.exit(1);
    }
    throw err;
  }

  const target = describeDatabaseUrl(env.DATABASE_URL);
  let app;
  try {
    app = await createApp(env);
  } catch (err) {
    console.error(`\n✖ Could not connect to the database ${target?.safeUrl ?? ''}\n  ${explainDatabaseError((err as Error).message)}\n`);
    process.exit(1);
  }

  // Verify the schema before accepting traffic, so a missing import/migration is obvious.
  const status = await databaseStatus(app.container.db, env.DATABASE_URL);
  if (!status.connected) {
    console.error(`\n✖ Database check failed for ${target?.safeUrl}\n  ${status.error}\n`);
    process.exit(1);
  }
  const s = status.schema!;
  logger.info(
    {
      database: status.server!.database,
      host: `${target?.host}:${target?.port}`,
      server: status.server!.version,
      tables: s.tables,
      migrations: `${s.migrationsApplied}/${s.migrationsExpected ?? '?'}`,
    },
    `✔ Database connected (${status.server!.database} @ ${target?.host}, ${status.latencyMs} ms)`,
  );
  if (s.migrationsApplied === 0) {
    logger.warn('Database has no tables yet — run `pnpm db:deploy` (then `pnpm db:seed`) or import the SQL export.');
  } else if (s.pendingMigrations.length) {
    logger.warn({ pending: s.pendingMigrations }, 'Database schema is behind — run `pnpm db:deploy`.');
  }

  await app.adapter.listen(env.PORT);
  logger.info(
    { framework: app.adapter.name, db: `${env.DATABASE_TYPE}+${env.ORM_PROVIDER}`, storage: env.STORAGE_PROVIDER, redis: env.REDIS_ENABLED },
    `Vyora API listening on :${env.PORT} (${env.APP_ENV}) — docs at ${env.API_BASE_URL}/api/docs`,
  );

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    logger.info({ signal }, 'shutting down');
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandled rejection'));
}

main().catch((err) => {
  logger.fatal({ err }, 'failed to start');
  process.exit(1);
});

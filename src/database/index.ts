import type { PrismaClient } from '@prisma/client';
import type { Env } from '../config/env';
import { ConfigError } from '../config/env';
import type { DatabaseProvider } from './interfaces/database-provider';
import { PrismaMySqlProvider } from './prisma/client';

/**
 * Select the persistence provider from configuration. Only one provider is active per process —
 * MySQL and MongoDB are never used side-by-side for the same entities.
 */
export function createDatabaseProvider(env: Env): DatabaseProvider<PrismaClient> {
  const combo = `${env.DATABASE_TYPE}:${env.ORM_PROVIDER}`;
  switch (combo) {
    case 'mysql:prisma':
      return new PrismaMySqlProvider(env.DATABASE_URL);
    default:
      // loadEnv() already rejects these; this guards programmatic construction.
      throw new ConfigError(`No database provider available for ${combo}`);
  }
}

export type { DatabaseProvider } from './interfaces/database-provider';
export type { Db } from './prisma/client';

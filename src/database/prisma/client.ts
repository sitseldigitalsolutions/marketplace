import { Prisma, PrismaClient } from '@prisma/client';
import type { DatabaseProvider, HealthStatus } from '../interfaces/database-provider';
import { logger } from '../../shared/logger';

export type Db = PrismaClient | Prisma.TransactionClient;

export class PrismaMySqlProvider implements DatabaseProvider<PrismaClient> {
  readonly type = 'mysql' as const;
  readonly orm = 'prisma' as const;
  readonly client: PrismaClient;

  constructor(url?: string) {
    const client = new PrismaClient<Prisma.PrismaClientOptions, 'warn' | 'error'>({
      datasources: url ? { db: { url } } : undefined,
      // READ COMMITTED avoids InnoDB gap-lock deadlocks between unrelated writers; correctness-critical
      // paths use explicit conditional UPDATEs and SELECT … FOR UPDATE row locks instead.
      transactionOptions: { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 10_000, timeout: 20_000 },
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
    });
    client.$on('warn', (e) => logger.warn({ prisma: e.message }, 'prisma warning'));
    client.$on('error', (e) => logger.error({ prisma: e.message }, 'prisma error'));
    this.client = client as unknown as PrismaClient;
  }

  async connect() {
    await this.client.$connect();
  }

  async disconnect() {
    await this.client.$disconnect();
  }

  async healthCheck(): Promise<HealthStatus> {
    const started = Date.now();
    try {
      await this.client.$queryRaw`SELECT 1`;
      return { ok: true, latencyMs: Date.now() - started };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - started, error: (err as Error).message };
    }
  }

  transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.client.$transaction((tx) => fn(tx as unknown as PrismaClient), {
      maxWait: 10_000,
      timeout: 20_000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
  }
}

/** Run inside the given transaction client if present, otherwise open a new transaction. */
export function inTx<T>(db: Db, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  if ('$transaction' in db && typeof (db as PrismaClient).$transaction === 'function') {
    return (db as PrismaClient).$transaction(fn, {
      maxWait: 10_000,
      timeout: 20_000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
  }
  return fn(db as Prisma.TransactionClient);
}

export const isUniqueViolation = (err: unknown, field?: string) =>
  err instanceof Prisma.PrismaClientKnownRequestError &&
  err.code === 'P2002' &&
  (!field || JSON.stringify(err.meta?.target ?? '').includes(field));

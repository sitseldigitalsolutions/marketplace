/**
 * Persistence abstraction. The rest of the application talks to a `DatabaseProvider`
 * selected at startup from DATABASE_TYPE + ORM_PROVIDER (see config/env.ts for the
 * combination matrix). Each provider exposes the repositories its services need.
 */
export interface HealthStatus {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export interface DatabaseProvider<TClient = unknown> {
  readonly type: 'mysql' | 'mongodb';
  readonly orm: 'prisma' | 'drizzle' | 'mongoose';
  /** Native client, only to be used inside the provider's own repositories/services. */
  readonly client: TClient;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
  /** Run `fn` atomically. Nested calls reuse the outer transaction. */
  transaction<T>(fn: (tx: TClient) => Promise<T>): Promise<T>;
}

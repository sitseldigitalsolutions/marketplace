/**
 * Repository contracts for cross-cutting persistence concerns. A MongoDB/Mongoose provider
 * implements the same interfaces (see docs/MONGODB.md).
 */
export interface AuditEntry {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditRepository {
  record(entry: AuditEntry): Promise<void>;
}

export interface SecurityEventEntry {
  type: string;
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  details?: unknown;
}

export interface SecurityEventRepository {
  record(entry: SecurityEventEntry): Promise<void>;
}

export interface SettingsRepository {
  get<T>(key: string): Promise<T | undefined>;
  getAll(): Promise<Record<string, unknown>>;
  set(key: string, value: unknown, updatedById?: string | null): Promise<void>;
}

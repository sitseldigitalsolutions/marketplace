import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  AuditEntry,
  AuditRepository,
  SecurityEventEntry,
  SecurityEventRepository,
  SettingsRepository,
} from '../interfaces/repositories';
import type { Db } from './client';

const json = (v: unknown) => (v === undefined ? undefined : v === null ? Prisma.JsonNull : (v as Prisma.InputJsonValue));

/** Serialise Decimals/Dates so audit snapshots are plain JSON. */
const snapshot = (v: unknown) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

export class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly db: Db) {}
  async record(e: AuditEntry) {
    await this.db.auditLog.create({
      data: {
        actorId: e.actorId ?? null,
        actorRole: e.actorRole ?? null,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId ?? null,
        before: json(snapshot(e.before)),
        after: json(snapshot(e.after)),
        metadata: json(snapshot(e.metadata)),
        ip: e.ip ?? null,
        userAgent: e.userAgent?.slice(0, 300) ?? null,
      },
    });
  }
}

export class PrismaSecurityEventRepository implements SecurityEventRepository {
  constructor(private readonly db: Db) {}
  async record(e: SecurityEventEntry) {
    await this.db.securityEvent.create({
      data: {
        type: e.type,
        userId: e.userId ?? null,
        email: e.email ?? null,
        ip: e.ip ?? null,
        userAgent: e.userAgent?.slice(0, 300) ?? null,
        details: json(snapshot(e.details)),
      },
    });
  }
}

export class PrismaSettingsRepository implements SettingsRepository {
  constructor(private readonly db: PrismaClient) {}
  async get<T>(key: string) {
    const row = await this.db.systemSetting.findUnique({ where: { key } });
    return row?.value as T | undefined;
  }
  async getAll() {
    const rows = await this.db.systemSetting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }
  async set(key: string, value: unknown, updatedById?: string | null) {
    await this.db.systemSetting.upsert({
      where: { key },
      create: { key, value: value as Prisma.InputJsonValue, updatedById: updatedById ?? null },
      update: { value: value as Prisma.InputJsonValue, updatedById: updatedById ?? null },
    });
  }
}

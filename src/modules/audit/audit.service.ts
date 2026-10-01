import type { AuditEntry, AuditRepository, SecurityEventRepository } from '../../database/interfaces/repositories';
import type { Db } from '../../database/prisma/client';
import { PrismaAuditRepository } from '../../database/prisma/repositories';
import type { AuthContext, RequestContext } from '../../http/types';
import { logger } from '../../shared/logger';

export const primaryRole = (auth: AuthContext | null) =>
  auth ? (auth.roles.includes('ADMIN') ? 'ADMIN' : auth.roles.includes('SELLER') ? 'SELLER' : 'CUSTOMER') : null;

export type AuditActor = Pick<RequestContext, 'auth' | 'ip' | 'userAgent'> | null;
type AuditInput = Omit<AuditEntry, 'actorId' | 'actorRole' | 'ip' | 'userAgent'>;

/** Records audit trails (admin/seller/financial changes) and security events. */
export class AuditService {
  constructor(
    private readonly audit: AuditRepository,
    private readonly security: SecurityEventRepository,
  ) {}

  entry(actor: AuditActor, e: AuditInput): AuditEntry {
    return {
      ...e,
      actorId: actor?.auth?.userId ?? null,
      actorRole: primaryRole(actor?.auth ?? null),
      ip: actor?.ip ?? null,
      userAgent: actor?.userAgent ?? null,
    };
  }

  /** Pass `tx` to write the audit row inside the caller's transaction (all-or-nothing). */
  async record(actor: AuditActor, e: AuditInput, tx?: Db) {
    const repo = tx ? new PrismaAuditRepository(tx) : this.audit;
    await repo.record(this.entry(actor, e));
  }

  securityEvent(
    type: string,
    data: { userId?: string | null; email?: string | null; ip?: string | null; userAgent?: string | null; details?: unknown },
  ) {
    this.security.record({ type, ...data }).catch((err) => logger.error({ err }, 'failed to record security event'));
  }
}

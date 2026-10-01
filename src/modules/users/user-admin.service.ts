import type { Prisma, PrismaClient } from '@prisma/client';
import type { RoleCode } from '@vyora/shared';
import { businessRule, notFound } from '../../shared/errors';
import { pageArgs, paginated } from '../../shared/pagination';
import type { AuditActor, AuditService } from '../audit/audit.service';
import type { AuthService } from '../auth/auth.service';

type Role = 'ADMIN' | 'SELLER' | 'CUSTOMER';

/** Admin user management: listing, suspension, role & permission assignment, deletion. */
export class UserAdminService {
  constructor(
    private readonly db: PrismaClient,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  async list(q: { page: number; pageSize: number; q?: string; role?: Role; status?: string }) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(q.status ? { status: q.status as never } : {}),
      ...(q.role ? { roles: { some: { role: { code: q.role } } } } : {}),
      ...(q.q ? { OR: [{ email: { contains: q.q } }, { name: { contains: q.q } }, { phone: { contains: q.q } }] } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(q.page, q.pageSize),
        select: {
          id: true, name: true, email: true, phone: true, status: true, emailVerifiedAt: true, lastLoginAt: true, createdAt: true,
          deletionRequestedAt: true, lockedUntil: true,
          roles: { select: { role: { select: { code: true } } } },
          seller: { select: { id: true, businessName: true, status: true } },
          _count: { select: { orders: true } },
        },
      }),
      this.db.user.count({ where }),
    ]);
    return paginated(items.map((u) => ({ ...u, roles: u.roles.map((r) => r.role.code) })), total, q.page, q.pageSize);
  }

  async detail(userId: string) {
    const user = await this.db.user.findFirst({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, phone: true, status: true, emailVerifiedAt: true, phoneVerifiedAt: true, lastLoginAt: true,
        createdAt: true, deletionRequestedAt: true, failedLoginCount: true, lockedUntil: true,
        roles: { select: { role: { select: { code: true, name: true } } } },
        seller: { select: { id: true, businessName: true, status: true } },
        addresses: { where: { deletedAt: null } },
        orders: { orderBy: { placedAt: 'desc' }, take: 10, select: { id: true, orderNumber: true, status: true, grandTotal: true, placedAt: true } },
      },
    });
    if (!user) throw notFound('User');
    const security = await this.db.securityEvent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
    return { ...user, roles: user.roles.map((r) => r.role.code), orders: user.orders.map((o) => ({ ...o, grandTotal: Number(o.grandTotal) })), security };
  }

  async update(userId: string, input: { status?: 'ACTIVE' | 'SUSPENDED'; roles?: Role[] }, actor: AuditActor) {
    const user = await this.db.user.findFirst({ where: { id: userId, deletedAt: null }, include: { roles: { include: { role: true } }, seller: true } });
    if (!user) throw notFound('User');
    if (userId === actor?.auth?.userId && (input.status === 'SUSPENDED' || (input.roles && !input.roles.includes('ADMIN')))) {
      throw businessRule('You cannot suspend yourself or remove your own admin role');
    }
    const before = { status: user.status, roles: user.roles.map((r) => r.role.code) };
    if (input.roles?.includes('SELLER') && !user.seller) throw businessRule('The seller role requires a seller account — create one from the Sellers page');
    if (input.roles && !input.roles.includes('ADMIN') && before.roles.includes('ADMIN')) {
      const admins = await this.db.userRole.count({ where: { role: { code: 'ADMIN' }, user: { status: 'ACTIVE', deletedAt: null } } });
      if (admins <= 1) throw businessRule('The marketplace must keep at least one active admin');
    }
    await this.db.$transaction(async (tx) => {
      if (input.status) {
        await tx.user.update({ where: { id: userId }, data: { status: input.status, ...(input.status === 'ACTIVE' ? { lockedUntil: null, failedLoginCount: 0 } : {}) } });
      }
      if (input.roles) {
        const roles = await tx.role.findMany({ where: { code: { in: input.roles } } });
        await tx.userRole.deleteMany({ where: { userId } });
        await tx.userRole.createMany({ data: roles.map((r) => ({ userId, roleId: r.id })) });
      }
      await this.audit.record(actor, { action: 'user.update', entityType: 'User', entityId: userId, before, after: input }, tx);
    });
    if (input.status === 'SUSPENDED') await this.auth.revokeAllSessions(userId);
    this.auth.invalidatePrincipal(userId);
    return this.detail(userId);
  }

  /** Complete an account deletion: anonymise personal data, keep order/financial history. */
  async anonymize(userId: string, actor: AuditActor) {
    const user = await this.db.user.findFirst({ where: { id: userId, deletedAt: null }, include: { seller: true } });
    if (!user) throw notFound('User');
    if (user.seller && user.seller.status === 'APPROVED') throw businessRule('Deactivate the seller account first');
    const stamp = Date.now().toString(36);
    await this.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${stamp}-${userId.slice(-6)}@deleted.invalid`,
          phone: null,
          name: 'Deleted user',
          passwordHash: null,
          status: 'DELETED',
          deletedAt: new Date(),
        },
      });
      await tx.customerAddress.updateMany({ where: { userId }, data: { deletedAt: new Date() } });
      await tx.cart.deleteMany({ where: { userId } });
      await tx.wishlist.deleteMany({ where: { userId } });
      await tx.recentlyViewedProduct.deleteMany({ where: { userId } });
      await tx.searchHistory.deleteMany({ where: { userId } });
      await this.audit.record(actor, { action: 'user.anonymize', entityType: 'User', entityId: userId }, tx);
    });
    await this.auth.revokeAllSessions(userId);
  }

  async roles() {
    const roles = await this.db.role.findMany({ include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } } });
    const permissions = await this.db.permission.findMany({ orderBy: { code: 'asc' } });
    return {
      roles: roles.map((r) => ({ id: r.id, code: r.code as RoleCode, name: r.name, description: r.description, isSystem: r.isSystem, users: r._count.users, permissions: r.permissions.map((p) => p.permission.code) })),
      permissions,
    };
  }

  async setRolePermissions(roleCode: string, permissionCodes: string[], actor: AuditActor) {
    const role = await this.db.role.findUnique({ where: { code: roleCode }, include: { permissions: { include: { permission: true } } } });
    if (!role) throw notFound('Role');
    if (role.code === 'ADMIN' && !permissionCodes.includes('roles:manage')) {
      throw businessRule('The admin role must keep the roles:manage permission');
    }
    const perms = await this.db.permission.findMany({ where: { code: { in: permissionCodes } } });
    await this.db.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      await tx.rolePermission.createMany({ data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })) });
      await this.audit.record(
        actor,
        { action: 'role.permissions', entityType: 'Role', entityId: role.id, before: role.permissions.map((p) => p.permission.code), after: perms.map((p) => p.code) },
        tx,
      );
    });
    // Permissions are cached per principal for a few seconds; clear everything.
    const users = await this.db.userRole.findMany({ where: { roleId: role.id }, select: { userId: true } });
    users.forEach((u) => this.auth.invalidatePrincipal(u.userId));
    return this.roles();
  }

  async auditLogs(q: { page: number; pageSize: number; q?: string; entityType?: string; actorId?: string; action?: string }) {
    const where: Prisma.AuditLogWhereInput = {
      ...(q.entityType ? { entityType: q.entityType } : {}),
      ...(q.actorId ? { actorId: q.actorId } : {}),
      ...(q.action ? { action: { startsWith: q.action } } : {}),
      ...(q.q ? { OR: [{ entityId: q.q }, { action: { contains: q.q } }] } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(q.page, q.pageSize), include: { actor: { select: { name: true, email: true } } } }),
      this.db.auditLog.count({ where }),
    ]);
    return paginated(items, total, q.page, q.pageSize);
  }

  async securityEvents(q: { page: number; pageSize: number; type?: string; q?: string }) {
    const where: Prisma.SecurityEventWhereInput = {
      ...(q.type ? { type: q.type } : {}),
      ...(q.q ? { OR: [{ email: { contains: q.q } }, { ip: { contains: q.q } }, { userId: q.q }] } : {}),
    };
    const [items, total, types] = await Promise.all([
      this.db.securityEvent.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(q.page, q.pageSize) }),
      this.db.securityEvent.count({ where }),
      this.db.securityEvent.groupBy({ by: ['type'], _count: { _all: true }, where: { createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } } }),
    ]);
    return { ...paginated(items, total, q.page, q.pageSize), last7Days: types.map((t) => ({ type: t.type, count: t._count._all })) };
  }
}

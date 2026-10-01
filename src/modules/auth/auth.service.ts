import type { PrismaClient } from '@prisma/client';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { RoleCode, SessionUser } from '@vyora/shared';
import type { Env } from '../../config/env';
import type { AuthContext } from '../../http/types';
import { AppError, badRequest, conflict, unauthenticated } from '../../shared/errors';
import { randomToken, sha256 } from '../../shared/crypto';
import type { AuditService } from '../audit/audit.service';
import type { NotificationService } from '../notifications/notification.service';
import { DUMMY_HASH, type PasswordHasher } from './password';

interface Meta {
  ip: string;
  userAgent: string | null;
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  accessMaxAgeSeconds: number;
  refreshMaxAgeSeconds: number;
  userId: string;
}

const ISSUER = 'vyora-api';
const AUDIENCE = 'vyora';

function ttlSeconds(ttl: string): number {
  const m = /^(\d+)\s*([smhd])$/.exec(ttl.trim());
  if (!m) return 900;
  return Number(m[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[m[2] as 's' | 'm' | 'h' | 'd'];
}

/** Include set for resolving the principal (roles → permissions, seller). */
const principalInclude = {
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
  seller: { select: { id: true, status: true, businessName: true, slug: true } },
} as const;

export class AuthService {
  private principalCache = new Map<string, { ctx: AuthContext; at: number }>();
  private readonly accessTtl: number;

  constructor(
    private readonly db: PrismaClient,
    private readonly env: Env,
    private readonly hasher: PasswordHasher,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {
    this.accessTtl = ttlSeconds(env.ACCESS_TOKEN_TTL);
  }

  hashPassword(plain: string) {
    return this.hasher.hash(plain);
  }

  // ── Sessions ─────────────────────────────────────────────
  private signAccess(userId: string, sessionId: string) {
    return jwt.sign({ sid: sessionId }, this.env.JWT_ACCESS_SECRET, {
      subject: userId,
      expiresIn: this.accessTtl,
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithm: 'HS256',
    } as SignOptions);
  }

  private async createRefresh(userId: string, familyId: string, meta: Meta) {
    const token = randomToken(48);
    const row = await this.db.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: sha256(`${this.env.JWT_REFRESH_SECRET}:${token}`),
        expiresAt: new Date(Date.now() + this.env.REFRESH_TOKEN_TTL_DAYS * 86400_000),
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });
    return { token, row };
  }

  async issueSession(userId: string, meta: Meta, familyId = randomToken(16)): Promise<IssuedSession> {
    const { token } = await this.createRefresh(userId, familyId, meta);
    return {
      accessToken: this.signAccess(userId, familyId),
      refreshToken: token,
      accessMaxAgeSeconds: this.accessTtl,
      refreshMaxAgeSeconds: this.env.REFRESH_TOKEN_TTL_DAYS * 86400,
      userId,
    };
  }

  /** Rotate a refresh token. Re-use of an already-rotated token revokes the whole session family. */
  async refresh(token: string, meta: Meta): Promise<IssuedSession> {
    const tokenHash = sha256(`${this.env.JWT_REFRESH_SECRET}:${token}`);
    const existing = await this.db.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!existing) throw unauthenticated('Your session has expired. Please sign in again.');
    if (existing.revokedAt) {
      await this.db.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      this.audit.securityEvent('REFRESH_TOKEN_REUSE', { userId: existing.userId, ip: meta.ip, userAgent: meta.userAgent });
      this.invalidatePrincipal(existing.userId);
      throw unauthenticated('Your session has expired. Please sign in again.');
    }
    if (existing.expiresAt < new Date() || existing.user.status !== 'ACTIVE') {
      throw unauthenticated('Your session has expired. Please sign in again.');
    }
    const next = await this.createRefresh(existing.userId, existing.familyId, meta);
    // Conditional update guards against two concurrent refreshes with the same token.
    const rotated = await this.db.refreshToken.updateMany({
      where: { id: existing.id, revokedAt: null },
      data: { revokedAt: new Date(), replacedById: next.row.id },
    });
    if (rotated.count === 0) {
      await this.db.refreshToken.delete({ where: { id: next.row.id } });
      throw unauthenticated('Your session has expired. Please sign in again.');
    }
    return {
      accessToken: this.signAccess(existing.userId, existing.familyId),
      refreshToken: next.token,
      accessMaxAgeSeconds: this.accessTtl,
      refreshMaxAgeSeconds: this.env.REFRESH_TOKEN_TTL_DAYS * 86400,
      userId: existing.userId,
    };
  }

  async logout(refreshToken: string | undefined, auth: AuthContext | null) {
    if (refreshToken) {
      const row = await this.db.refreshToken.findUnique({
        where: { tokenHash: sha256(`${this.env.JWT_REFRESH_SECRET}:${refreshToken}`) },
      });
      if (row) {
        await this.db.refreshToken.updateMany({ where: { familyId: row.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
      }
    }
    if (auth) {
      await this.db.refreshToken.updateMany({ where: { familyId: auth.sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
      this.invalidatePrincipal(auth.userId);
    }
  }

  async revokeAllSessions(userId: string) {
    await this.db.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    this.invalidatePrincipal(userId);
  }

  // ── Principal resolution (called on every authenticated request) ─────────
  async resolveAuth(token: string): Promise<AuthContext | null> {
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, this.env.JWT_ACCESS_SECRET, {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ['HS256'],
      }) as jwt.JwtPayload;
    } catch {
      return null;
    }
    const userId = payload.sub;
    const sessionId = payload.sid as string | undefined;
    if (!userId || !sessionId) return null;

    const cacheKey = `${userId}:${sessionId}`;
    const cached = this.principalCache.get(cacheKey);
    if (cached && Date.now() - cached.at < 10_000) return cached.ctx;

    const [user, liveSession] = await Promise.all([
      this.db.user.findUnique({ where: { id: userId }, include: principalInclude }),
      this.db.refreshToken.findFirst({
        where: { familyId: sessionId, userId, revokedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true },
      }),
    ]);
    // Suspended/deleted users and logged-out sessions lose access immediately.
    if (!user || !liveSession || user.deletedAt || !['ACTIVE', 'DELETION_REQUESTED'].includes(user.status)) return null;

    const roles = user.roles.map((r) => r.role.code as RoleCode);
    const permissions = new Set<string>();
    for (const r of user.roles) for (const p of r.role.permissions) permissions.add(p.permission.code);

    const ctx: AuthContext = {
      userId: user.id,
      sessionId,
      email: user.email,
      name: user.name,
      roles,
      permissions,
      sellerId: user.seller?.id ?? null,
      sellerStatus: user.seller?.status ?? null,
    };
    if (this.principalCache.size > 10_000) this.principalCache.clear();
    this.principalCache.set(cacheKey, { ctx, at: Date.now() });
    return ctx;
  }

  invalidatePrincipal(userId: string) {
    for (const key of this.principalCache.keys()) if (key.startsWith(`${userId}:`)) this.principalCache.delete(key);
  }

  async sessionUser(userId: string): Promise<SessionUser> {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId }, include: principalInclude });
    const permissions = new Set<string>();
    for (const r of user.roles) for (const p of r.role.permissions) permissions.add(p.permission.code);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      emailVerified: Boolean(user.emailVerifiedAt),
      roles: user.roles.map((r) => r.role.code as RoleCode),
      permissions: [...permissions],
      seller: user.seller,
    };
  }

  // ── Registration & login ─────────────────────────────────
  async assertEmailAvailable(email: string, phone?: string) {
    const existing = await this.db.user.findFirst({
      where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
      select: { email: true },
    });
    if (existing) {
      throw conflict(
        existing.email === email ? 'An account with this email already exists' : 'This phone number is already registered',
      );
    }
  }

  async registerCustomer(input: { name: string; email: string; phone?: string; password: string }, meta: Meta) {
    await this.assertEmailAvailable(input.email, input.phone);
    const role = await this.db.role.findUniqueOrThrow({ where: { code: 'CUSTOMER' } });
    const user = await this.db.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        passwordHash: await this.hasher.hash(input.password),
        roles: { create: [{ roleId: role.id }] },
        customerProfile: { create: {} },
      },
    });
    await this.sendVerificationEmail(user.id);
    void this.notifications.notify({ key: 'auth.welcome', userId: user.id, link: '/' });
    this.audit.securityEvent('USER_REGISTERED', { userId: user.id, email: user.email, ip: meta.ip, userAgent: meta.userAgent });
    return this.issueSession(user.id, meta);
  }

  async login(email: string, password: string, meta: Meta): Promise<IssuedSession> {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || user.deletedAt || user.status === 'DELETED') {
      await this.hasher.verify(DUMMY_HASH, password); // equalise timing
      this.audit.securityEvent('LOGIN_FAILED', { email, ip: meta.ip, userAgent: meta.userAgent, details: { reason: 'unknown_user' } });
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      this.audit.securityEvent('LOGIN_BLOCKED_LOCKED', { userId: user.id, email, ip: meta.ip });
      throw new AppError(
        423,
        'ACCOUNT_LOCKED',
        `Too many failed attempts. Try again after ${user.lockedUntil.toLocaleTimeString('en-IN', { timeZone: this.env.DEFAULT_TIMEZONE })}.`,
      );
    }
    const valid = await this.hasher.verify(user.passwordHash, password);
    if (!valid) {
      const failed = user.failedLoginCount + 1;
      const lock = failed >= this.env.LOGIN_MAX_ATTEMPTS;
      await this.db.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: lock ? 0 : failed,
          lockedUntil: lock ? new Date(Date.now() + this.env.LOGIN_LOCK_MINUTES * 60_000) : undefined,
        },
      });
      this.audit.securityEvent(lock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED', {
        userId: user.id,
        email,
        ip: meta.ip,
        userAgent: meta.userAgent,
        details: { attempts: failed },
      });
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
    }
    if (user.status === 'SUSPENDED') {
      throw new AppError(403, 'FORBIDDEN', 'This account has been suspended. Please contact support.');
    }
    await this.db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    this.audit.securityEvent('LOGIN_SUCCESS', { userId: user.id, email, ip: meta.ip, userAgent: meta.userAgent });
    return this.issueSession(user.id, meta);
  }

  // ── One-time tokens (email verification, password reset, invites) ──────────
  async createOneTimeToken(userId: string, type: 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'SELLER_INVITE', ttlMinutes: number) {
    const token = randomToken(32);
    await this.db.verificationToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } });
    await this.db.verificationToken.create({
      data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMinutes * 60_000) },
    });
    return token;
  }

  private async consumeToken(token: string, types: Array<'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'SELLER_INVITE'>) {
    const row = await this.db.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (!row || !types.includes(row.type as never) || row.usedAt || row.expiresAt < new Date()) {
      throw badRequest('This link is invalid or has expired. Please request a new one.');
    }
    const claimed = await this.db.verificationToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) throw badRequest('This link has already been used.');
    return row;
  }

  async sendVerificationEmail(userId: string) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerifiedAt) return;
    const token = await this.createOneTimeToken(userId, 'EMAIL_VERIFY', 24 * 60);
    await this.notifications.notify({
      key: 'auth.verify_email',
      userId,
      vars: { link: `${this.notifications.frontendUrl}/verify-email?token=${token}` },
    });
  }

  async verifyEmail(token: string) {
    const row = await this.consumeToken(token, ['EMAIL_VERIFY']);
    await this.db.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } });
  }

  /** Always succeeds from the caller's perspective so account existence is not revealed. */
  async forgotPassword(email: string, meta: Meta) {
    const user = await this.db.user.findUnique({ where: { email } });
    this.audit.securityEvent('PASSWORD_RESET_REQUESTED', { userId: user?.id, email, ip: meta.ip });
    if (!user || user.status === 'DELETED' || user.deletedAt) return;
    const token = await this.createOneTimeToken(user.id, 'PASSWORD_RESET', 60);
    await this.notifications.notify({
      key: 'auth.password_reset',
      userId: user.id,
      channels: ['EMAIL'],
      vars: { link: `${this.notifications.frontendUrl}/reset-password?token=${token}` },
    });
  }

  /** Completes both password resets and seller invitations. */
  async resetPassword(token: string, password: string, meta: Meta) {
    const row = await this.consumeToken(token, ['PASSWORD_RESET', 'SELLER_INVITE']);
    await this.db.user.update({
      where: { id: row.userId },
      data: {
        passwordHash: await this.hasher.hash(password),
        failedLoginCount: 0,
        lockedUntil: null,
        // Opening an emailed link proves control of the mailbox.
        emailVerifiedAt: new Date(),
      },
    });
    await this.revokeAllSessions(row.userId);
    this.audit.securityEvent('PASSWORD_RESET', { userId: row.userId, ip: meta.ip, userAgent: meta.userAgent });
    return this.issueSession(row.userId, meta);
  }

  async changePassword(userId: string, current: string, next: string, meta: Meta, keepSessionId: string) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash || !(await this.hasher.verify(user.passwordHash, current))) {
      throw new AppError(400, 'INVALID_CREDENTIALS', 'Your current password is incorrect');
    }
    await this.db.user.update({ where: { id: userId }, data: { passwordHash: await this.hasher.hash(next) } });
    // Sign out every other device.
    await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null, NOT: { familyId: keepSessionId } },
      data: { revokedAt: new Date() },
    });
    this.invalidatePrincipal(userId);
    this.audit.securityEvent('PASSWORD_CHANGED', { userId, ip: meta.ip, userAgent: meta.userAgent });
  }
}

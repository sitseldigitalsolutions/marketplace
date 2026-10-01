import type { PrismaClient } from '@prisma/client';
import type { Env } from '../../config/env';
import type { Channels } from '../../infrastructure/messaging/channels';
import type { JobQueue } from '../../infrastructure/jobs';
import { logger } from '../../shared/logger';
import { pageArgs, paginated } from '../../shared/pagination';
import type { SettingsService } from '../settings/settings.service';
import { DEFAULT_TEMPLATES, escapeHtml, render } from './templates';

export interface NotifyInput {
  key: string;
  /** Recipient user. Email/phone default to the user's own. */
  userId?: string;
  email?: string;
  phone?: string;
  vars?: Record<string, unknown>;
  /** Deep link used by in-app notifications. */
  link?: string;
  channels?: Array<'IN_APP' | 'EMAIL' | 'SMS'>;
}

const JOB = 'notification.dispatch';

export class NotificationService {
  constructor(
    private readonly db: PrismaClient,
    private readonly env: Env,
    private readonly channels: Channels,
    private readonly jobs: JobQueue,
    private readonly settings: SettingsService,
  ) {
    jobs.register(JOB, (payload: NotifyInput) => this.dispatch(payload));
  }

  /** Queue a notification. Never throws — notification failures must not break business flows. */
  async notify(input: NotifyInput): Promise<void> {
    try {
      await this.jobs.enqueue(JOB, input);
    } catch (err) {
      logger.error({ err, key: input.key }, 'failed to enqueue notification');
    }
  }

  /** Notify every active admin (in-app). */
  async notifyAdmins(input: Omit<NotifyInput, 'userId' | 'email'>) {
    const admins = await this.db.user.findMany({
      where: { status: 'ACTIVE', roles: { some: { role: { code: 'ADMIN' } } } },
      select: { id: true },
      take: 50,
    });
    await Promise.all(admins.map((a) => this.notify({ ...input, userId: a.id })));
  }

  private async template(key: string, channel: 'IN_APP' | 'EMAIL' | 'SMS') {
    const override = await this.db.notificationTemplate.findUnique({ where: { key_channel: { key, channel } } });
    if (override) return override.isActive ? { subject: override.subject, body: override.body } : null;
    const def = DEFAULT_TEMPLATES[key];
    return def ? { subject: def.subject, body: def.body } : null;
  }

  /** Deliver a notification on each channel (runs in the job worker). */
  async dispatch(input: NotifyInput) {
    const def = DEFAULT_TEMPLATES[input.key];
    const channels = input.channels ?? def?.channels ?? ['IN_APP'];
    const branding = await this.settings.get('branding');
    const user = input.userId
      ? await this.db.user.findUnique({ where: { id: input.userId }, select: { id: true, name: true, email: true, phone: true, status: true } })
      : null;
    if (user && user.status === 'DELETED') return;
    const vars = { brand: branding.name, name: user?.name ?? '', ...input.vars };

    for (const channel of channels) {
      const tpl = await this.template(input.key, channel);
      if (!tpl) continue;
      const subject = render(tpl.subject, vars);
      const body = render(tpl.body, vars);
      try {
        if (channel === 'IN_APP' && user) {
          await this.db.notification.create({
            data: {
              userId: user.id,
              type: input.key,
              title: subject.slice(0, 200),
              body: body.slice(0, 1000),
              link: input.link?.slice(0, 500) ?? null,
            },
          });
        }
        if (channel === 'EMAIL') {
          const to = input.email ?? user?.email;
          if (!to) continue;
          const msg = await this.db.outboundMessage.create({
            data: { channel: 'EMAIL', recipient: to, subject, body, templateKey: input.key },
          });
          try {
            await this.channels.email.send({
              to,
              subject,
              text: body,
              html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#1f2330">${escapeHtml(body).replace(/\n/g, '<br>')}<p style="color:#8a8fa3;font-size:12px;margin-top:24px">${escapeHtml(branding.name)}</p></div>`,
            });
            await this.db.outboundMessage.update({ where: { id: msg.id }, data: { status: 'SENT', sentAt: new Date() } });
          } catch (err) {
            await this.db.outboundMessage.update({
              where: { id: msg.id },
              data: { status: 'FAILED', error: String((err as Error).message).slice(0, 1000) },
            });
          }
        }
        if (channel === 'SMS') {
          const to = input.phone ?? user?.phone;
          if (!to) continue;
          await this.channels.sms.send({ to, text: body.slice(0, 300) });
          await this.db.outboundMessage.create({
            data: { channel: 'SMS', recipient: to, body: body.slice(0, 300), status: 'SENT', sentAt: new Date(), templateKey: input.key },
          });
        }
      } catch (err) {
        logger.error({ err, key: input.key, channel }, 'notification delivery failed');
      }
    }
  }

  // ── In-app inbox ──────────────────────────────────────────
  async list(userId: string, page: number, pageSize: number, unreadOnly = false) {
    const where = { userId, ...(unreadOnly ? { readAt: null } : {}) };
    const [items, total, unread] = await Promise.all([
      this.db.notification.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(page, pageSize) }),
      this.db.notification.count({ where }),
      this.db.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { ...paginated(items, total, page, pageSize), unread };
  }

  async markRead(userId: string, id?: string) {
    await this.db.notification.updateMany({
      where: { userId, readAt: null, ...(id ? { id } : {}) },
      data: { readAt: new Date() },
    });
  }

  // ── Admin: templates & dev inbox ──────────────────────────
  async listTemplates() {
    const overrides = await this.db.notificationTemplate.findMany();
    return Object.entries(DEFAULT_TEMPLATES).map(([key, def]) => ({
      key,
      description: def.description,
      channels: def.channels,
      defaults: { subject: def.subject, body: def.body },
      overrides: overrides.filter((o) => o.key === key),
    }));
  }

  async upsertTemplate(key: string, channel: 'IN_APP' | 'EMAIL' | 'SMS', data: { subject: string; body: string; isActive: boolean }) {
    return this.db.notificationTemplate.upsert({
      where: { key_channel: { key, channel } },
      create: { key, channel, ...data },
      update: data,
    });
  }

  async outbox(page: number, pageSize: number, recipient?: string) {
    const where = recipient ? { recipient } : {};
    const [items, total] = await Promise.all([
      this.db.outboundMessage.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(page, pageSize) }),
      this.db.outboundMessage.count({ where }),
    ]);
    return paginated(items, total, page, pageSize);
  }

  get frontendUrl() {
    return this.env.FRONTEND_URL.replace(/\/$/, '');
  }
}

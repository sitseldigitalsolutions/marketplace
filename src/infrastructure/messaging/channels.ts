import nodemailer from 'nodemailer';
import type { Env } from '../../config/env';
import { logger } from '../../shared/logger';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailChannel {
  readonly name: string;
  send(msg: EmailMessage): Promise<void>;
}

export interface SmsMessage {
  to: string;
  text: string;
}

/** SMS provider contract (MSG91, Twilio, Gupshup …). */
export interface SmsChannel {
  readonly name: string;
  send(msg: SmsMessage): Promise<void>;
}

/** WhatsApp Business provider contract (Meta Cloud API, Gupshup, Interakt …). */
export interface WhatsAppChannel {
  readonly name: string;
  send(msg: { to: string; template: string; variables: Record<string, string> }): Promise<void>;
}

/** Development mailer: prints to the console. Messages are also kept in OutboundMessage (dev inbox). */
export class ConsoleEmailChannel implements EmailChannel {
  readonly name = 'console';
  async send(msg: EmailMessage) {
    logger.info({ to: msg.to, subject: msg.subject }, `✉️  [dev-mail] ${msg.subject}\n${msg.text}`);
  }
}

export class SmtpEmailChannel implements EmailChannel {
  readonly name = 'smtp';
  private transport;
  constructor(private readonly env: Env) {
    this.transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });
  }
  async send(msg: EmailMessage) {
    await this.transport.sendMail({ from: this.env.EMAIL_FROM, ...msg });
  }
}

export class ConsoleSmsChannel implements SmsChannel {
  readonly name = 'console';
  async send(msg: SmsMessage) {
    logger.info({ to: msg.to }, `📱 [dev-sms] ${msg.text}`);
  }
}

export class ConsoleWhatsAppChannel implements WhatsAppChannel {
  readonly name = 'console';
  async send(msg: { to: string; template: string; variables: Record<string, string> }) {
    logger.info({ to: msg.to, template: msg.template }, '💬 [dev-whatsapp] message');
  }
}

export function createChannels(env: Env) {
  return {
    email: env.EMAIL_PROVIDER === 'smtp' ? new SmtpEmailChannel(env) : new ConsoleEmailChannel(),
    sms: new ConsoleSmsChannel(),
    whatsapp: new ConsoleWhatsAppChannel(),
  };
}
export type Channels = ReturnType<typeof createChannels>;

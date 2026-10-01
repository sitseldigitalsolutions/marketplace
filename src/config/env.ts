import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['development', 'test', 'staging', 'production']).optional(),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.url().default('http://localhost:4000'),
  FRONTEND_URL: z.url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().optional().default(''),
  // Built frontend (index.html + assets) served by the API for single-origin deploys. Ignored when missing.
  WEB_DIR: z.string().default('public'),

  BACKEND_FRAMEWORK: z.enum(['express', 'hapi']).default('express'),
  DATABASE_TYPE: z.enum(['mysql', 'mongodb']).default('mysql'),
  ORM_PROVIDER: z.enum(['prisma', 'drizzle', 'mongoose']).default('prisma'),
  DATABASE_URL: z.string().optional(),
  MONGODB_URL: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  COOKIE_SECURE: bool,
  COOKIE_DOMAIN: z.string().optional().default(''),
  PASSWORD_HASHER: z.enum(['argon2id', 'bcrypt']).default('argon2id'),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).default(15),

  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  LOCAL_UPLOAD_DIR: z.string().default('uploads'),
  UPLOAD_MAX_IMAGE_MB: z.coerce.number().positive().default(5),
  UPLOAD_MAX_DOCUMENT_MB: z.coerce.number().positive().default(10),
  FILE_SIGNING_SECRET: z.string().min(16).optional(),
  AWS_REGION: z.string().optional().default(''),
  AWS_S3_BUCKET: z.string().optional().default(''),
  AWS_ACCESS_KEY_ID: z.string().optional().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(''),
  AWS_S3_ENDPOINT: z.string().optional().default(''),
  AWS_S3_PUBLIC_URL: z.string().optional().default(''),

  REDIS_ENABLED: bool,
  REDIS_URL: z.string().optional().default(''),

  PAYMENT_PROVIDER: z.enum(['cod']).default('cod'),

  EMAIL_PROVIDER: z.enum(['console', 'smtp']).default('console'),
  EMAIL_FROM: z.string().default('Vyora <no-reply@vyora.local>'),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  SMS_PROVIDER: z.enum(['console']).default('console'),
  WHATSAPP_PROVIDER: z.enum(['console']).default('console'),

  DEFAULT_CURRENCY: z.string().length(3).default('INR'),
  DEFAULT_COUNTRY: z.string().length(2).default('IN'),
  DEFAULT_TIMEZONE: z.string().default('Asia/Kolkata'),
  COMMISSION_DEFAULT_PERCENTAGE: z.coerce.number().min(0).max(100).default(10),

  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  /** Scales every per-route limit (tests use a large value; keep 1 in production). */
  RATE_LIMIT_ROUTE_MULTIPLIER: z.coerce.number().positive().default(1),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof EnvSchema> & { APP_ENV: 'development' | 'test' | 'staging' | 'production' };

/** Database/ORM combinations the architecture recognises, and which of them ship an adapter today. */
const SUPPORTED_COMBINATIONS: Record<string, { implemented: boolean; note: string }> = {
  'mysql:prisma': { implemented: true, note: 'Default configuration.' },
  'mysql:drizzle': { implemented: false, note: 'Drizzle adapter not implemented yet — see docs/DATABASE_PROVIDERS.md.' },
  'mongodb:prisma': { implemented: false, note: 'Prisma MongoDB adapter not implemented yet — see docs/MONGODB.md.' },
  'mongodb:mongoose': { implemented: false, note: 'Mongoose adapter not implemented yet — see docs/MONGODB.md.' },
};

export class ConfigError extends Error {}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new ConfigError(`Invalid environment configuration:\n${issues}`);
  }
  const env = parsed.data as Env;
  env.APP_ENV = env.APP_ENV ?? (env.NODE_ENV === 'production' ? 'production' : env.NODE_ENV);

  const combo = `${env.DATABASE_TYPE}:${env.ORM_PROVIDER}`;
  const support = SUPPORTED_COMBINATIONS[combo];
  if (!support) {
    throw new ConfigError(
      `Unsupported DATABASE_TYPE/ORM_PROVIDER combination "${combo}". ` +
        `Valid combinations: ${Object.keys(SUPPORTED_COMBINATIONS).join(', ')}.`,
    );
  }
  if (!support.implemented) {
    throw new ConfigError(`DATABASE_TYPE/ORM_PROVIDER "${combo}" is recognised but not available: ${support.note}`);
  }
  if (env.DATABASE_TYPE === 'mysql' && !env.DATABASE_URL?.startsWith('mysql://')) {
    throw new ConfigError('DATABASE_URL must be a mysql:// connection string when DATABASE_TYPE=mysql');
  }
  if (env.DATABASE_TYPE === 'mongodb' && !env.MONGODB_URL) {
    throw new ConfigError('MONGODB_URL is required when DATABASE_TYPE=mongodb');
  }
  if (env.STORAGE_PROVIDER === 's3' && (!env.AWS_S3_BUCKET || !env.AWS_REGION)) {
    throw new ConfigError('AWS_S3_BUCKET and AWS_REGION are required when STORAGE_PROVIDER=s3');
  }
  if (env.REDIS_ENABLED && !env.REDIS_URL) {
    throw new ConfigError('REDIS_URL is required when REDIS_ENABLED=true');
  }
  if (env.EMAIL_PROVIDER === 'smtp' && !env.SMTP_HOST) {
    throw new ConfigError('SMTP_HOST is required when EMAIL_PROVIDER=smtp');
  }
  if (env.APP_ENV === 'production' || env.APP_ENV === 'staging') {
    const weak = [env.JWT_ACCESS_SECRET, env.JWT_REFRESH_SECRET].some((s) => s.includes('replace_me'));
    if (weak) throw new ConfigError('JWT secrets still contain placeholder values; set strong secrets for production.');
    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      throw new ConfigError('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ.');
    }
    if (!env.COOKIE_SECURE) throw new ConfigError('COOKIE_SECURE must be true in staging/production (HTTPS).');
    if (!env.FILE_SIGNING_SECRET) throw new ConfigError('FILE_SIGNING_SECRET is required in staging/production.');
  }
  return env;
}

let cached: Env | null = null;
export function getEnv(): Env {
  if (!cached) cached = loadEnv();
  return cached;
}
/** Test helper: override configuration. */
export function setEnv(env: Env) {
  cached = env;
}

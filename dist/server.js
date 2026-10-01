// src/config/env.ts
import { z } from "zod";
var bool = z.enum(["true", "false", "1", "0", ""]).optional().transform((v) => v === "true" || v === "1");
var EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["development", "test", "staging", "production"]).optional(),
  PORT: z.coerce.number().int().positive().default(4e3),
  API_BASE_URL: z.url().default("http://localhost:4000"),
  FRONTEND_URL: z.url().default("http://localhost:5173"),
  CORS_ORIGINS: z.string().optional().default(""),
  BACKEND_FRAMEWORK: z.enum(["express", "hapi"]).default("express"),
  DATABASE_TYPE: z.enum(["mysql", "mongodb"]).default("mysql"),
  ORM_PROVIDER: z.enum(["prisma", "drizzle", "mongoose"]).default("prisma"),
  DATABASE_URL: z.string().optional(),
  MONGODB_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  COOKIE_SECURE: bool,
  COOKIE_DOMAIN: z.string().optional().default(""),
  PASSWORD_HASHER: z.enum(["argon2id", "bcrypt"]).default("argon2id"),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).default(15),
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  LOCAL_UPLOAD_DIR: z.string().default("uploads"),
  UPLOAD_MAX_IMAGE_MB: z.coerce.number().positive().default(5),
  UPLOAD_MAX_DOCUMENT_MB: z.coerce.number().positive().default(10),
  FILE_SIGNING_SECRET: z.string().min(16).optional(),
  AWS_REGION: z.string().optional().default(""),
  AWS_S3_BUCKET: z.string().optional().default(""),
  AWS_ACCESS_KEY_ID: z.string().optional().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(""),
  AWS_S3_ENDPOINT: z.string().optional().default(""),
  AWS_S3_PUBLIC_URL: z.string().optional().default(""),
  REDIS_ENABLED: bool,
  REDIS_URL: z.string().optional().default(""),
  PAYMENT_PROVIDER: z.enum(["cod"]).default("cod"),
  EMAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
  EMAIL_FROM: z.string().default("Vyora <no-reply@vyora.local>"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  SMS_PROVIDER: z.enum(["console"]).default("console"),
  WHATSAPP_PROVIDER: z.enum(["console"]).default("console"),
  DEFAULT_CURRENCY: z.string().length(3).default("INR"),
  DEFAULT_COUNTRY: z.string().length(2).default("IN"),
  DEFAULT_TIMEZONE: z.string().default("Asia/Kolkata"),
  COMMISSION_DEFAULT_PERCENTAGE: z.coerce.number().min(0).max(100).default(10),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  /** Scales every per-route limit (tests use a large value; keep 1 in production). */
  RATE_LIMIT_ROUTE_MULTIPLIER: z.coerce.number().positive().default(1),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info")
});
var SUPPORTED_COMBINATIONS = {
  "mysql:prisma": { implemented: true, note: "Default configuration." },
  "mysql:drizzle": { implemented: false, note: "Drizzle adapter not implemented yet \u2014 see docs/DATABASE_PROVIDERS.md." },
  "mongodb:prisma": { implemented: false, note: "Prisma MongoDB adapter not implemented yet \u2014 see docs/MONGODB.md." },
  "mongodb:mongoose": { implemented: false, note: "Mongoose adapter not implemented yet \u2014 see docs/MONGODB.md." }
};
var ConfigError = class extends Error {
};
function loadEnv(source = process.env) {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  \u2022 ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
    throw new ConfigError(`Invalid environment configuration:
${issues}`);
  }
  const env = parsed.data;
  env.APP_ENV = env.APP_ENV ?? (env.NODE_ENV === "production" ? "production" : env.NODE_ENV);
  const combo = `${env.DATABASE_TYPE}:${env.ORM_PROVIDER}`;
  const support = SUPPORTED_COMBINATIONS[combo];
  if (!support) {
    throw new ConfigError(
      `Unsupported DATABASE_TYPE/ORM_PROVIDER combination "${combo}". Valid combinations: ${Object.keys(SUPPORTED_COMBINATIONS).join(", ")}.`
    );
  }
  if (!support.implemented) {
    throw new ConfigError(`DATABASE_TYPE/ORM_PROVIDER "${combo}" is recognised but not available: ${support.note}`);
  }
  if (env.DATABASE_TYPE === "mysql" && !env.DATABASE_URL?.startsWith("mysql://")) {
    throw new ConfigError("DATABASE_URL must be a mysql:// connection string when DATABASE_TYPE=mysql");
  }
  if (env.DATABASE_TYPE === "mongodb" && !env.MONGODB_URL) {
    throw new ConfigError("MONGODB_URL is required when DATABASE_TYPE=mongodb");
  }
  if (env.STORAGE_PROVIDER === "s3" && (!env.AWS_S3_BUCKET || !env.AWS_REGION)) {
    throw new ConfigError("AWS_S3_BUCKET and AWS_REGION are required when STORAGE_PROVIDER=s3");
  }
  if (env.REDIS_ENABLED && !env.REDIS_URL) {
    throw new ConfigError("REDIS_URL is required when REDIS_ENABLED=true");
  }
  if (env.EMAIL_PROVIDER === "smtp" && !env.SMTP_HOST) {
    throw new ConfigError("SMTP_HOST is required when EMAIL_PROVIDER=smtp");
  }
  if (env.APP_ENV === "production" || env.APP_ENV === "staging") {
    const weak = [env.JWT_ACCESS_SECRET, env.JWT_REFRESH_SECRET].some((s) => s.includes("replace_me"));
    if (weak) throw new ConfigError("JWT secrets still contain placeholder values; set strong secrets for production.");
    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      throw new ConfigError("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ.");
    }
    if (!env.COOKIE_SECURE) throw new ConfigError("COOKIE_SECURE must be true in staging/production (HTTPS).");
    if (!env.FILE_SIGNING_SECRET) throw new ConfigError("FILE_SIGNING_SECRET is required in staging/production.");
  }
  return env;
}

// src/shared/logger.ts
import pino from "pino";
var level = process.env.LOG_LEVEL ?? "info";
var pretty = process.env.NODE_ENV === "development" && process.stdout.isTTY;
var logger = pino({
  level,
  base: { service: "vyora-api" },
  redact: {
    paths: [
      "password",
      "*.password",
      "*.passwordHash",
      "req.headers.authorization",
      "req.headers.cookie",
      "*.token",
      "*.refreshToken"
    ],
    censor: "[redacted]"
  },
  ...pretty ? { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } } } : {}
});

// src/adapters/express/index.ts
import { createServer } from "http";
import cors from "cors";
import express from "express";

// src/adapters/types.ts
var API_PREFIX = "/api/v1";
function allowedOrigins(env) {
  return [env.FRONTEND_URL, ...env.CORS_ORIGINS.split(",").map((s) => s.trim())].filter(Boolean);
}
var fullPath = (r) => r.rootLevel ? r.path : `${API_PREFIX}${r.path}`;
function flatHeaders(h) {
  const out = {};
  for (const [k, v] of Object.entries(h)) out[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : v;
  return out;
}

// src/adapters/express/index.ts
function send(res, out) {
  res.status(out.status);
  for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
  if (out.cookies.length) res.setHeader("set-cookie", out.cookies);
  switch (out.body.kind) {
    case "json":
      res.send(JSON.stringify(out.body.data));
      return;
    case "buffer":
      res.end(out.body.data);
      return;
    case "stream":
      out.body.data.on("error", () => res.destroy());
      out.body.data.pipe(res);
      return;
    default:
      res.end();
  }
}
var errorJson = (code, message) => JSON.stringify({ success: false, error: { code, details: [] }, message });
function createExpressAdapter(env) {
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.set("trust proxy", env.APP_ENV === "production" || env.APP_ENV === "staging" ? 1 : "loopback");
  app.use(
    cors({
      origin: allowedOrigins(env),
      credentials: true,
      allowedHeaders: ["content-type", "x-csrf-token", "x-request-id", "authorization", "idempotency-key", "x-skip-refresh"],
      exposedHeaders: ["x-request-id", "content-disposition"]
    })
  );
  app.use(express.json({ limit: "1mb" }));
  return {
    name: "express",
    async init(routes, pipeline) {
      for (const r of routes) {
        const method = r.method.toLowerCase();
        app[method](fullPath(r), async (req, res) => {
          const params = {};
          for (const [k, v] of Object.entries(req.params ?? {})) {
            params[k] = Array.isArray(v) ? v.join("/") : String(v);
          }
          const out = await pipeline(r, {
            method: r.method,
            path: req.path,
            params,
            query: req.query,
            headers: flatHeaders(req.headers),
            body: req.body,
            ip: req.ip ?? req.socket.remoteAddress ?? "unknown",
            rawStream: r.upload ? req : void 0
          });
          send(res, out);
        });
      }
      app.use((_req, res) => {
        res.status(404).type("application/json").send(errorJson("NOT_FOUND", "Route not found"));
      });
      app.use((err, _req, res, _next) => {
        const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
        const code = status === 413 ? "PAYLOAD_TOO_LARGE" : status < 500 ? "VALIDATION_ERROR" : "INTERNAL_ERROR";
        const message = status === 413 ? "Request body is too large" : status < 500 ? "Malformed request body" : "Something went wrong";
        res.status(status).type("application/json").send(errorJson(code, message));
      });
    },
    listen(port) {
      return new Promise((resolve3) => server.listen(port, () => resolve3()));
    },
    close() {
      return new Promise((resolve3) => server.close(() => resolve3()));
    },
    httpServer: () => server
  };
}

// src/adapters/hapi/index.ts
import Hapi from "@hapi/hapi";
function toHapiPath(path) {
  return path.replace(/:([A-Za-z0-9_]+)/g, "{$1}").replace(/\*([A-Za-z0-9_]+)$/, "{$1*}");
}
function toHapiResponse(h, out) {
  const body = out.body;
  const response = body.kind === "json" ? h.response(JSON.stringify(body.data)) : body.kind === "buffer" ? h.response(body.data) : body.kind === "stream" ? h.response(body.data) : h.response();
  response.code(out.status);
  for (const [k, v] of Object.entries(out.headers)) response.header(k, v);
  for (const c of out.cookies) response.header("set-cookie", c, { append: true });
  if (body.kind === "empty") response.header("content-length", "0");
  return response;
}
var errorBody = (code, message) => ({ success: false, error: { code, details: [] }, message });
function createHapiAdapter(env) {
  const server = Hapi.server({
    port: env.PORT,
    host: "0.0.0.0",
    routes: {
      cors: {
        origin: allowedOrigins(env),
        credentials: true,
        additionalHeaders: ["x-csrf-token", "x-request-id", "idempotency-key", "x-skip-refresh"],
        additionalExposedHeaders: ["x-request-id", "content-disposition"]
      },
      // Cookies are parsed by the shared pipeline.
      state: { parse: false, failAction: "ignore" }
    }
  });
  return {
    name: "hapi",
    async init(routes, pipeline) {
      for (const r of routes) {
        const isMutating = r.method !== "GET";
        server.route({
          method: r.method,
          path: toHapiPath(fullPath(r)),
          options: {
            ...isMutating ? {
              payload: r.upload ? { output: "stream", parse: false, maxBytes: r.upload.maxFileBytes * r.upload.maxFiles + 1e6 } : { maxBytes: 1048576, parse: true, failAction: "error" }
            } : {}
          },
          handler: async (request, h) => {
            const params = {};
            for (const [k, v] of Object.entries(request.params ?? {})) params[k] = String(v);
            const out = await pipeline(r, {
              method: r.method,
              path: request.path,
              params,
              query: request.query,
              headers: flatHeaders(request.headers),
              body: r.upload ? void 0 : request.payload ?? void 0,
              ip: request.info.remoteAddress,
              rawStream: r.upload ? request.payload : void 0
            });
            return toHapiResponse(h, out);
          }
        });
      }
      server.ext("onPreResponse", (request, h) => {
        const res = request.response;
        if (!("isBoom" in res) || !res.isBoom) return h.continue;
        const status = res.output.statusCode;
        const code = status === 404 ? "NOT_FOUND" : status === 413 ? "PAYLOAD_TOO_LARGE" : status === 415 ? "UNSUPPORTED_MEDIA" : status < 500 ? "VALIDATION_ERROR" : "INTERNAL_ERROR";
        const message = status === 404 ? "Route not found" : status < 500 ? "Malformed request" : "Something went wrong";
        return h.response(errorBody(code, message)).code(status >= 500 ? 500 : status);
      });
      await server.initialize();
    },
    async listen() {
      await server.start();
    },
    async close() {
      await server.stop({ timeout: 5e3 });
    },
    httpServer: () => server.listener
  };
}

// src/bootstrap/container.ts
import { Redis } from "ioredis";

// src/database/prisma/client.ts
import { Prisma, PrismaClient } from "@prisma/client";
var PrismaMySqlProvider = class {
  type = "mysql";
  orm = "prisma";
  client;
  constructor(url) {
    const client = new PrismaClient({
      datasources: url ? { db: { url } } : void 0,
      // READ COMMITTED avoids InnoDB gap-lock deadlocks between unrelated writers; correctness-critical
      // paths use explicit conditional UPDATEs and SELECT … FOR UPDATE row locks instead.
      transactionOptions: { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 1e4, timeout: 2e4 },
      log: [
        { level: "warn", emit: "event" },
        { level: "error", emit: "event" }
      ]
    });
    client.$on("warn", (e) => logger.warn({ prisma: e.message }, "prisma warning"));
    client.$on("error", (e) => logger.error({ prisma: e.message }, "prisma error"));
    this.client = client;
  }
  async connect() {
    await this.client.$connect();
  }
  async disconnect() {
    await this.client.$disconnect();
  }
  async healthCheck() {
    const started = Date.now();
    try {
      await this.client.$queryRaw`SELECT 1`;
      return { ok: true, latencyMs: Date.now() - started };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - started, error: err.message };
    }
  }
  transaction(fn) {
    return this.client.$transaction((tx) => fn(tx), {
      maxWait: 1e4,
      timeout: 2e4,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
    });
  }
};
var isUniqueViolation = (err, field) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && (!field || JSON.stringify(err.meta?.target ?? "").includes(field));

// src/database/index.ts
function createDatabaseProvider(env) {
  const combo = `${env.DATABASE_TYPE}:${env.ORM_PROVIDER}`;
  switch (combo) {
    case "mysql:prisma":
      return new PrismaMySqlProvider(env.DATABASE_URL);
    default:
      throw new ConfigError(`No database provider available for ${combo}`);
  }
}

// src/database/prisma/repositories.ts
import { Prisma as Prisma2 } from "@prisma/client";
var json = (v) => v === void 0 ? void 0 : v === null ? Prisma2.JsonNull : v;
var snapshot = (v) => v === void 0 ? void 0 : JSON.parse(JSON.stringify(v));
var PrismaAuditRepository = class {
  constructor(db) {
    this.db = db;
  }
  db;
  async record(e) {
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
        userAgent: e.userAgent?.slice(0, 300) ?? null
      }
    });
  }
};
var PrismaSecurityEventRepository = class {
  constructor(db) {
    this.db = db;
  }
  db;
  async record(e) {
    await this.db.securityEvent.create({
      data: {
        type: e.type,
        userId: e.userId ?? null,
        email: e.email ?? null,
        ip: e.ip ?? null,
        userAgent: e.userAgent?.slice(0, 300) ?? null,
        details: json(snapshot(e.details))
      }
    });
  }
};
var PrismaSettingsRepository = class {
  constructor(db) {
    this.db = db;
  }
  db;
  async get(key) {
    const row = await this.db.systemSetting.findUnique({ where: { key } });
    return row?.value;
  }
  async getAll() {
    const rows = await this.db.systemSetting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }
  async set(key, value, updatedById) {
    await this.db.systemSetting.upsert({
      where: { key },
      create: { key, value, updatedById: updatedById ?? null },
      update: { value, updatedById: updatedById ?? null }
    });
  }
};

// src/http/rate-limit.ts
var MemoryRateLimitStore = class {
  buckets = /* @__PURE__ */ new Map();
  timer;
  constructor() {
    this.timer = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this.buckets) if (v.resetAt <= now) this.buckets.delete(k);
    }, 6e4);
    this.timer.unref();
  }
  async hit(key, windowSeconds) {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowSeconds * 1e3 };
      this.buckets.set(key, fresh);
      return fresh;
    }
    existing.count += 1;
    return existing;
  }
  async reset(key) {
    this.buckets.delete(key);
  }
};
var RedisRateLimitStore = class {
  constructor(redis) {
    this.redis = redis;
  }
  redis;
  async hit(key, windowSeconds) {
    const k = `rl:${key}`;
    const results = await this.redis.multi().incr(k).pttl(k).exec();
    const count = Number(results?.[0]?.[1] ?? 1);
    let ttl = Number(results?.[1]?.[1] ?? -1);
    if (ttl < 0) {
      await this.redis.pexpire(k, windowSeconds * 1e3);
      ttl = windowSeconds * 1e3;
    }
    return { count, resetAt: Date.now() + ttl };
  }
  async reset(key) {
    await this.redis.del(`rl:${key}`);
  }
};

// src/infrastructure/cache.ts
var MemoryCache = class {
  store = /* @__PURE__ */ new Map();
  async get(key) {
    const hit = this.store.get(key);
    if (!hit) return void 0;
    if (hit.expires < Date.now()) {
      this.store.delete(key);
      return void 0;
    }
    return hit.value;
  }
  async set(key, value, ttlSeconds2) {
    if (this.store.size > 5e3) this.store.clear();
    this.store.set(key, { value, expires: Date.now() + ttlSeconds2 * 1e3 });
  }
  async delPrefix(prefix) {
    for (const k of this.store.keys()) if (k.startsWith(prefix)) this.store.delete(k);
  }
};
var RedisCache = class {
  constructor(redis) {
    this.redis = redis;
  }
  redis;
  async get(key) {
    const raw = await this.redis.get(`cache:${key}`);
    return raw ? JSON.parse(raw) : void 0;
  }
  async set(key, value, ttlSeconds2) {
    await this.redis.set(`cache:${key}`, JSON.stringify(value), "EX", ttlSeconds2);
  }
  async delPrefix(prefix) {
    let cursor = "0";
    do {
      const [next, keys] = await this.redis.scan(cursor, "MATCH", `cache:${prefix}*`, "COUNT", 200);
      cursor = next;
      if (keys.length) await this.redis.del(...keys);
    } while (cursor !== "0");
  }
};
var NoopCache = class {
  async get() {
    return void 0;
  }
  async set() {
  }
  async delPrefix() {
  }
};

// src/infrastructure/jobs.ts
import { Queue, Worker } from "bullmq";
var InlineJobQueue = class {
  handlers = /* @__PURE__ */ new Map();
  inflight = /* @__PURE__ */ new Set();
  register(name, handler) {
    this.handlers.set(name, handler);
  }
  async enqueue(name, payload) {
    const handler = this.handlers.get(name);
    if (!handler) {
      logger.warn({ job: name }, "no handler registered for job");
      return;
    }
    const p = new Promise((resolve3) => setImmediate(resolve3)).then(() => handler(payload)).catch((err) => logger.error({ err, job: name }, "inline job failed")).finally(() => this.inflight.delete(p));
    this.inflight.add(p);
  }
  async drain() {
    while (this.inflight.size) await Promise.all([...this.inflight]);
  }
  async close() {
    await this.drain();
  }
};
var BullJobQueue = class {
  queue;
  worker = null;
  handlers = /* @__PURE__ */ new Map();
  constructor(connection, runWorker = true) {
    this.queue = new Queue("vyora", { connection });
    if (runWorker) {
      this.worker = new Worker(
        "vyora",
        async (job) => {
          const handler = this.handlers.get(job.name);
          if (handler) await handler(job.data);
        },
        { connection: connection.duplicate({ maxRetriesPerRequest: null }), concurrency: 5 }
      );
      this.worker.on("failed", (job, err) => logger.error({ err, job: job?.name }, "job failed"));
    }
  }
  register(name, handler) {
    this.handlers.set(name, handler);
  }
  async enqueue(name, payload) {
    await this.queue.add(name, payload, { attempts: 5, backoff: { type: "exponential", delay: 2e3 }, removeOnComplete: 1e3 });
  }
  async drain() {
  }
  async close() {
    await this.worker?.close();
    await this.queue.close();
  }
};

// src/infrastructure/messaging/channels.ts
import nodemailer from "nodemailer";
var ConsoleEmailChannel = class {
  name = "console";
  async send(msg) {
    logger.info({ to: msg.to, subject: msg.subject }, `\u2709\uFE0F  [dev-mail] ${msg.subject}
${msg.text}`);
  }
};
var SmtpEmailChannel = class {
  constructor(env) {
    this.env = env;
    this.transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : void 0
    });
  }
  env;
  name = "smtp";
  transport;
  async send(msg) {
    await this.transport.sendMail({ from: this.env.EMAIL_FROM, ...msg });
  }
};
var ConsoleSmsChannel = class {
  name = "console";
  async send(msg) {
    logger.info({ to: msg.to }, `\u{1F4F1} [dev-sms] ${msg.text}`);
  }
};
var ConsoleWhatsAppChannel = class {
  name = "console";
  async send(msg) {
    logger.info({ to: msg.to, template: msg.template }, "\u{1F4AC} [dev-whatsapp] message");
  }
};
function createChannels(env) {
  return {
    email: env.EMAIL_PROVIDER === "smtp" ? new SmtpEmailChannel(env) : new ConsoleEmailChannel(),
    sms: new ConsoleSmsChannel(),
    whatsapp: new ConsoleWhatsAppChannel()
  };
}

// src/infrastructure/storage/local.ts
import { createReadStream } from "fs";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import { dirname, extname, isAbsolute, join, resolve } from "path";

// src/shared/crypto.ts
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
var sha256 = (value) => createHash("sha256").update(value).digest("hex");
var randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
var hmac = (secret, value) => createHmac("sha256", secret).update(value).digest("base64url");
function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
var ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function randomCode(length) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
function referenceNumber(prefix, date = /* @__PURE__ */ new Date()) {
  const y = String(date.getUTCFullYear()).slice(2);
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${prefix}${y}${m}${d}-${randomCode(6)}`;
}

// src/infrastructure/storage/storage.ts
var CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".csv": "text/csv",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};
var EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "text/csv": ".csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx"
};
function assertSafeKey(key) {
  if (!/^[A-Za-z0-9][A-Za-z0-9/_.-]{0,400}$/.test(key) || key.includes("..") || key.includes("//")) {
    throw new Error("Invalid storage key");
  }
}

// src/infrastructure/storage/local.ts
var LocalStorageProvider = class {
  constructor(uploadDir, signingSecret) {
    this.signingSecret = signingSecret;
    this.root = isAbsolute(uploadDir) ? uploadDir : resolve(process.cwd(), uploadDir);
  }
  signingSecret;
  name = "local";
  root;
  pathFor(key, visibility) {
    assertSafeKey(key);
    return join(this.root, visibility, key);
  }
  async put(key, data, _contentType, visibility) {
    const p = this.pathFor(key, visibility);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, data);
    return { key, url: visibility === "public" ? this.publicUrl(key) : `/files/private/${key}` };
  }
  async get(key, visibility) {
    const p = this.pathFor(key, visibility);
    try {
      const s = await stat(p);
      if (!s.isFile()) return null;
    } catch {
      return null;
    }
    return {
      stream: createReadStream(p),
      contentType: CONTENT_TYPES[extname(p).toLowerCase()] ?? "application/octet-stream"
    };
  }
  async delete(key, visibility) {
    try {
      await unlink(this.pathFor(key, visibility));
    } catch {
    }
  }
  publicUrl(key) {
    return `/uploads/${key}`;
  }
  async signedUrl(key, ttlSeconds2) {
    const exp = Math.floor(Date.now() / 1e3) + ttlSeconds2;
    const sig = hmac(this.signingSecret, `${key}:${exp}`);
    return `/files/private/${key}?exp=${exp}&sig=${sig}`;
  }
  verifySignature(key, exp, sig) {
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1e3)) return false;
    return hmac(this.signingSecret, `${key}:${exp}`) === sig;
  }
};

// src/infrastructure/storage/s3.ts
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
var S3StorageProvider = class {
  constructor(env) {
    this.env = env;
    this.bucket = env.AWS_S3_BUCKET;
    this.client = new S3Client({
      region: env.AWS_REGION,
      endpoint: env.AWS_S3_ENDPOINT || void 0,
      forcePathStyle: Boolean(env.AWS_S3_ENDPOINT),
      credentials: env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY } : void 0
    });
  }
  env;
  name = "s3";
  client;
  bucket;
  objectKey(key, visibility) {
    assertSafeKey(key);
    return `${visibility}/${key}`;
  }
  async put(key, data, contentType, visibility) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.objectKey(key, visibility),
        Body: data,
        ContentType: contentType,
        CacheControl: visibility === "public" ? "public, max-age=31536000, immutable" : "private, no-store"
      })
    );
    return { key, url: visibility === "public" ? this.publicUrl(key) : `/files/private/${key}` };
  }
  async get(key, visibility) {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.objectKey(key, visibility) }));
      return { stream: res.Body, contentType: res.ContentType ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }
  async delete(key, visibility) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.objectKey(key, visibility) }));
  }
  publicUrl(key) {
    const base = this.env.AWS_S3_PUBLIC_URL || `https://${this.bucket}.s3.${this.env.AWS_REGION}.amazonaws.com`;
    return `${base.replace(/\/$/, "")}/public/${key}`;
  }
  signedUrl(key, ttlSeconds2) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: this.objectKey(key, "private") }), {
      expiresIn: ttlSeconds2
    });
  }
};

// src/infrastructure/storage/images.ts
import { randomUUID } from "crypto";
import sharp from "sharp";
async function storeOptimizedImage(storage, folder, buffer, mimeType) {
  const base = `${folder}/${(/* @__PURE__ */ new Date()).toISOString().slice(0, 7)}/${randomUUID()}`;
  if (mimeType === "image/gif") {
    const key2 = `${base}${EXTENSIONS["image/gif"]}`;
    const obj2 = await storage.put(key2, buffer, mimeType, "public");
    return { key: key2, url: obj2.url, thumbUrl: obj2.url };
  }
  const img = sharp(buffer, { failOn: "error" }).rotate();
  const [large, small] = await Promise.all([
    img.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    img.clone().resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer()
  ]);
  const key = `${base}.webp`;
  const [obj, thumb] = await Promise.all([
    storage.put(key, large, "image/webp", "public"),
    storage.put(`${base}-sm.webp`, small, "image/webp", "public")
  ]);
  return { key, url: obj.url, thumbUrl: thumb.url };
}

// src/infrastructure/storage/index.ts
function createStorage(env) {
  if (env.STORAGE_PROVIDER === "s3") return new S3StorageProvider(env);
  return new LocalStorageProvider(env.LOCAL_UPLOAD_DIR, env.FILE_SIGNING_SECRET ?? env.JWT_ACCESS_SECRET);
}

// src/modules/analytics/analytics.service.ts
import ExcelJS from "exceljs";
import { stringify } from "csv-stringify/sync";
var n = (v) => v === null || v === void 0 ? 0 : Number(v);
var r2 = (v) => Math.round(v * 100) / 100;
function tzOffsetMinutes(timeZone, at = /* @__PURE__ */ new Date()) {
  const local = new Date(at.toLocaleString("en-US", { timeZone }));
  const utc = new Date(at.toLocaleString("en-US", { timeZone: "UTC" }));
  return Math.round((local.getTime() - utc.getTime()) / 6e4);
}
function defaultRange(from, to) {
  const end = to ?? /* @__PURE__ */ new Date();
  const start = from ?? new Date(end.getTime() - 30 * 864e5);
  return { from: start, to: end };
}
var AnalyticsService = class {
  constructor(db, finance, products, timeZone = "Asia/Kolkata") {
    this.db = db;
    this.finance = finance;
    this.products = products;
    this.timeZone = timeZone;
  }
  db;
  finance;
  products;
  timeZone;
  /** Calendar day (YYYY-MM-DD) in the marketplace timezone. */
  localDay(d, offset) {
    return new Date(d.getTime() + offset * 6e4).toISOString().slice(0, 10);
  }
  async adminDashboard(range) {
    const { from, to } = range;
    const [orderAgg] = await this.db.$queryRaw`
      SELECT COUNT(*) AS orders,
             COALESCE(SUM(grandTotal), 0) AS gmv,
             SUM(status = 'CANCELLED') AS cancelled,
             COUNT(DISTINCT customerId) AS buyers
      FROM \`Order\` WHERE placedAt BETWEEN ${from} AND ${to}`;
    const [itemAgg] = await this.db.$queryRaw`
      SELECT COALESCE(SUM(oi.lineTotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity), 0) AS netValue,
             COALESCE(SUM(CASE WHEN so.status = 'DELIVERED' THEN oi.lineTotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity ELSE 0 END), 0) AS deliveredValue,
             COALESCE(SUM(oi.commissionAmount * (oi.quantity - oi.cancelledQuantity) / oi.quantity), 0) AS commissionAccrued,
             COALESCE(SUM(CASE WHEN so.status = 'DELIVERED' THEN oi.quantity - oi.cancelledQuantity ELSE 0 END), 0) AS deliveredUnits,
             COALESCE(SUM(oi.returnedQuantity), 0) AS returnedUnits
      FROM \`OrderItem\` oi JOIN \`SellerOrder\` so ON so.id = oi.sellerOrderId
      JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.placedAt BETWEEN ${from} AND ${to}`;
    const [payAgg] = await this.db.$queryRaw`
      SELECT COALESCE(SUM(p.collected), 0) AS collected,
             COALESCE(SUM(CASE WHEN p.status = 'COD_PENDING' THEN p.amount - p.collected ELSE 0 END), 0) AS codOutstanding
      FROM \`Payment\` p JOIN \`Order\` o ON o.id = p.orderId WHERE o.placedAt BETWEEN ${from} AND ${to}`;
    const [refundAgg] = await this.db.$queryRaw`
      SELECT COALESCE(SUM(CASE WHEN status = 'PROCESSED' THEN amount ELSE 0 END), 0) AS refunded,
             COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) AS refundPending
      FROM \`Refund\` WHERE createdAt BETWEEN ${from} AND ${to}`;
    const [ledgerAgg] = await this.db.$queryRaw`
      SELECT COALESCE(-SUM(CASE WHEN type = 'COMMISSION_DEBIT' THEN amount ELSE 0 END), 0) AS commissionEarned,
             COALESCE(SUM(CASE WHEN type = 'COMMISSION_REVERSAL_CREDIT' THEN amount ELSE 0 END), 0) AS commissionReversed
      FROM \`SellerLedger\` WHERE createdAt BETWEEN ${from} AND ${to}`;
    const [customers, newCustomers, activeSellers, pendingSellers, pendingProducts, lowStock, outstanding] = await Promise.all([
      this.db.user.count({ where: { deletedAt: null, roles: { some: { role: { code: "CUSTOMER" } } }, seller: null } }),
      this.db.user.count({ where: { createdAt: { gte: from, lte: to }, seller: null } }),
      this.db.seller.count({ where: { status: "APPROVED", deletedAt: null } }),
      this.db.seller.count({ where: { status: "PENDING_APPROVAL", deletedAt: null } }),
      this.db.product.count({ where: { status: "PENDING_REVIEW", deletedAt: null } }),
      this.db.$queryRaw`SELECT COUNT(*) AS c FROM \`Inventory\` WHERE quantity - reserved <= lowStockThreshold`,
      this.finance.outstanding()
    ]);
    const orders = n(orderAgg.orders);
    const cancelled = n(orderAgg.cancelled);
    const nonCancelled = orders - cancelled;
    const deliveredUnits = n(itemAgg.deliveredUnits);
    return {
      range,
      kpis: {
        gmv: r2(n(orderAgg.gmv)),
        netOrderValue: r2(n(itemAgg.netValue)),
        deliveredValue: r2(n(itemAgg.deliveredValue)),
        collectedRevenue: r2(n(payAgg.collected)),
        codOutstanding: r2(n(payAgg.codOutstanding)),
        refunds: r2(n(refundAgg.refunded)),
        refundsPending: r2(n(refundAgg.refundPending)),
        commissionAccrued: r2(n(itemAgg.commissionAccrued)),
        commissionEarned: r2(n(ledgerAgg.commissionEarned)),
        orders,
        cancelledOrders: cancelled,
        averageOrderValue: nonCancelled ? r2(n(itemAgg.netValue) / nonCancelled) : 0,
        cancellationRate: orders ? r2(cancelled / orders * 100) : 0,
        returnRate: deliveredUnits ? r2(n(itemAgg.returnedUnits) / deliveredUnits * 100) : 0,
        buyers: n(orderAgg.buyers),
        totalCustomers: customers,
        newCustomers,
        activeSellers,
        pendingSellerApprovals: pendingSellers,
        pendingProductApprovals: pendingProducts,
        lowStockListings: n(lowStock[0]?.c),
        outstandingSettlements: r2(outstanding.reduce((s, o) => s + o.available, 0))
      },
      salesByDay: await this.salesByDay(range),
      topProducts: await this.topProducts(range, null, 8),
      topSellers: await this.topSellers(range, 8),
      categorySales: await this.categorySales(range),
      orderStatus: await this.db.order.groupBy({ by: ["status"], where: { placedAt: { gte: from, lte: to } }, _count: { _all: true } }).then((rows) => rows.map((r) => ({ status: r.status, count: r._count._all }))),
      paymentStatus: await this.db.order.groupBy({ by: ["paymentStatus"], where: { placedAt: { gte: from, lte: to } }, _count: { _all: true }, _sum: { grandTotal: true } }).then((rows) => rows.map((r) => ({ status: r.paymentStatus, count: r._count._all, amount: n(r._sum.grandTotal) })))
    };
  }
  /** Daily series bucketed by the marketplace's local calendar day (not UTC). */
  async salesByDay(range, sellerId = null) {
    const offset = tzOffsetMinutes(this.timeZone, range.to);
    const rows = await this.db.$queryRaw`
      SELECT DATE_FORMAT(DATE_ADD(o.placedAt, INTERVAL ${offset} MINUTE), '%Y-%m-%d') AS day,
             COUNT(DISTINCT oi.sellerOrderId) AS orders,
             COALESCE(SUM(oi.lineTotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity), 0) AS value,
             COALESCE(SUM(oi.quantity - oi.cancelledQuantity), 0) AS units
      FROM \`OrderItem\` oi JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.placedAt BETWEEN ${range.from} AND ${range.to} AND (${sellerId} IS NULL OR oi.sellerId = ${sellerId})
      GROUP BY day ORDER BY day`;
    const map = new Map(rows.map((r) => [r.day, r]));
    const out = [];
    const last = this.localDay(range.to, offset);
    for (let key = this.localDay(range.from, offset); key <= last; key = new Date(Date.parse(`${key}T00:00:00Z`) + 864e5).toISOString().slice(0, 10)) {
      const row = map.get(key);
      out.push({ day: key, orders: n(row?.orders), value: r2(n(row?.value)), units: n(row?.units) });
    }
    return out;
  }
  async topProducts(range, sellerId, limit) {
    const rows = await this.db.$queryRaw`
      SELECT oi.productId AS productId, MAX(oi.productName) AS name,
             SUM(oi.quantity - oi.cancelledQuantity) AS units,
             SUM(oi.lineTotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity) AS value
      FROM \`OrderItem\` oi JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.placedAt BETWEEN ${range.from} AND ${range.to} AND (${sellerId} IS NULL OR oi.sellerId = ${sellerId})
      GROUP BY oi.productId HAVING units > 0 ORDER BY units DESC LIMIT ${limit}`;
    return rows.map((r) => ({ productId: r.productId, name: r.name, units: n(r.units), value: r2(n(r.value)) }));
  }
  async topSellers(range, limit) {
    const rows = await this.db.$queryRaw`
      SELECT oi.sellerId AS sellerId, MAX(oi.sellerName) AS name, COUNT(DISTINCT oi.sellerOrderId) AS orders,
             SUM(oi.lineTotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity) AS value,
             SUM(oi.commissionAmount * (oi.quantity - oi.cancelledQuantity) / oi.quantity) AS commission
      FROM \`OrderItem\` oi JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.placedAt BETWEEN ${range.from} AND ${range.to}
      GROUP BY oi.sellerId ORDER BY value DESC LIMIT ${limit}`;
    return rows.map((r) => ({ sellerId: r.sellerId, name: r.name, orders: n(r.orders), value: r2(n(r.value)), commission: r2(n(r.commission)) }));
  }
  async categorySales(range) {
    const rows = await this.db.$queryRaw`
      SELECT c.id AS categoryId, c.name AS name, SUM(oi.quantity - oi.cancelledQuantity) AS units,
             SUM(oi.lineTotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity) AS value
      FROM \`OrderItem\` oi JOIN \`Order\` o ON o.id = oi.orderId JOIN \`Category\` c ON c.id = oi.categoryId
      WHERE o.placedAt BETWEEN ${range.from} AND ${range.to}
      GROUP BY c.id, c.name ORDER BY value DESC LIMIT 12`;
    return rows.map((r) => ({ categoryId: r.categoryId, name: r.name, units: n(r.units), value: r2(n(r.value)) }));
  }
  /** Seller dashboard — every figure is filtered by the authenticated seller's id. */
  async sellerDashboard(sellerId, range) {
    const [productCounts, activeListings, outOfStock2, orderCounts, balances, recent] = await Promise.all([
      this.products.statusCounts({ kind: "seller", sellerId }),
      this.db.sellerProductListing.count({ where: { sellerId, status: "APPROVED", isActive: true, deletedAt: null } }),
      this.db.$queryRaw`
        SELECT COUNT(*) AS c FROM \`Inventory\` i JOIN \`SellerProductListing\` l ON l.id = i.listingId
        WHERE i.sellerId = ${sellerId} AND l.deletedAt IS NULL AND i.quantity - i.reserved <= 0`,
      this.db.sellerOrder.groupBy({ by: ["status"], where: { sellerId }, _count: { _all: true } }),
      this.finance.balances(sellerId),
      this.db.sellerOrder.findMany({
        where: { sellerId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, subOrderNumber: true, status: true, grandTotal: true, createdAt: true, order: { select: { shipName: true, shipCity: true } }, _count: { select: { items: true } } }
      })
    ]);
    const [rev] = await this.db.$queryRaw`
      SELECT COALESCE(SUM(CASE WHEN so.status = 'DELIVERED' THEN oi.lineSubtotal * (oi.quantity - oi.cancelledQuantity - oi.returnedQuantity) / oi.quantity ELSE 0 END), 0) AS deliveredRevenue,
             COALESCE(SUM(CASE WHEN so.status <> 'CANCELLED' THEN oi.lineSubtotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity ELSE 0 END), 0) AS orderedRevenue,
             COALESCE(SUM(CASE WHEN so.status <> 'CANCELLED' THEN oi.commissionAmount * (oi.quantity - oi.cancelledQuantity) / oi.quantity ELSE 0 END), 0) AS commission
      FROM \`OrderItem\` oi JOIN \`SellerOrder\` so ON so.id = oi.sellerOrderId
      WHERE oi.sellerId = ${sellerId} AND so.createdAt BETWEEN ${range.from} AND ${range.to}`;
    const oc = Object.fromEntries(orderCounts.map((o) => [o.status, o._count._all]));
    const totalProducts = Object.values(productCounts).reduce((s, v) => s + (v ?? 0), 0);
    return {
      range,
      products: {
        total: totalProducts,
        active: activeListings,
        pending: productCounts.PENDING_REVIEW ?? 0,
        draft: productCounts.DRAFT ?? 0,
        rejected: productCounts.REJECTED ?? 0,
        outOfStock: n(outOfStock2[0]?.c)
      },
      orders: {
        total: Object.values(oc).reduce((s, v) => s + v, 0),
        pending: (oc.PENDING_CONFIRMATION ?? 0) + (oc.CONFIRMED ?? 0) + (oc.PROCESSING ?? 0),
        awaitingConfirmation: oc.PENDING_CONFIRMATION ?? 0,
        shipped: (oc.SHIPPED ?? 0) + (oc.OUT_FOR_DELIVERY ?? 0),
        delivered: oc.DELIVERED ?? 0,
        cancelled: oc.CANCELLED ?? 0
      },
      revenue: {
        ordered: r2(n(rev.orderedRevenue)),
        delivered: r2(n(rev.deliveredRevenue)),
        commissionAccrued: r2(n(rev.commission)),
        commissionDeducted: r2(balances.totals.commission + balances.totals.commissionTax - balances.totals.commissionReversals),
        netPayable: balances.availableForSettlement,
        balance: balances.balance,
        paidOut: balances.totals.paidOut
      },
      recentOrders: recent.map((r) => ({ ...r, grandTotal: n(r.grandTotal) })),
      salesByDay: await this.salesByDay(range, sellerId),
      topProducts: await this.topProducts(range, sellerId, 5)
    };
  }
  // ── Exports ────────────────────────────────────────────────
  async report(kind, range, sellerId) {
    switch (kind) {
      case "sales": {
        const days = await this.salesByDay(range, sellerId);
        return { columns: ["Date", "Orders", "Units", "Value (INR)"], rows: days.map((d) => [d.day, d.orders, d.units, d.value]) };
      }
      case "orders": {
        const items = await this.db.orderItem.findMany({
          where: { order: { placedAt: { gte: range.from, lte: range.to } }, ...sellerId ? { sellerId } : {} },
          include: { order: { select: { orderNumber: true, placedAt: true, paymentStatus: true, shipCity: true, shipState: true } }, sellerOrder: { select: { subOrderNumber: true, status: true } } },
          orderBy: { createdAt: "asc" },
          take: 5e4
        });
        return {
          columns: ["Order", "Sub-order", "Placed at (UTC)", "Seller", "SKU", "Product", "Qty", "Cancelled", "Returned", "Unit price", "Discount", "Shipping", "Tax", "Line total", "Commission", "Status", "Payment", "City", "State"],
          rows: items.map((i) => [
            i.order.orderNumber,
            i.sellerOrder.subOrderNumber,
            i.order.placedAt.toISOString(),
            i.sellerName,
            i.sku,
            i.productName,
            i.quantity,
            i.cancelledQuantity,
            i.returnedQuantity,
            n(i.unitPrice),
            n(i.discountAmount),
            n(i.shippingAmount),
            n(i.taxAmount),
            n(i.lineTotal),
            n(i.commissionAmount),
            i.sellerOrder.status,
            i.order.paymentStatus,
            i.order.shipCity,
            i.order.shipState
          ])
        };
      }
      case "products": {
        const top = await this.topProducts(range, sellerId, 1e3);
        return { columns: ["Product ID", "Product", "Units", "Value (INR)"], rows: top.map((t) => [t.productId, t.name, t.units, t.value]) };
      }
      case "sellers": {
        const top = await this.topSellers(range, 1e3);
        return { columns: ["Seller ID", "Seller", "Orders", "Value (INR)", "Commission (INR)"], rows: top.map((t) => [t.sellerId, t.name, t.orders, t.value, t.commission]) };
      }
      case "categories": {
        const rows = await this.categorySales(range);
        return { columns: ["Category", "Units", "Value (INR)"], rows: rows.map((r) => [r.name, r.units, r.value]) };
      }
      case "settlements": {
        const rows = await this.db.settlement.findMany({
          where: { createdAt: { gte: range.from, lte: range.to }, ...sellerId ? { sellerId } : {} },
          include: { seller: { select: { displayName: true, code: true } } },
          orderBy: { createdAt: "asc" }
        });
        return {
          columns: ["Settlement", "Seller", "Seller code", "Amount", "Status", "Reference", "Created (UTC)", "Paid (UTC)"],
          rows: rows.map((s) => [s.settlementNumber, s.seller.displayName, s.seller.code, n(s.amount), s.status, s.reference ?? "", s.createdAt.toISOString(), s.paidAt?.toISOString() ?? ""])
        };
      }
      case "ledger": {
        const rows = await this.db.sellerLedger.findMany({
          where: { createdAt: { gte: range.from, lte: range.to }, ...sellerId ? { sellerId } : {} },
          include: { seller: { select: { displayName: true } } },
          orderBy: { createdAt: "asc" },
          take: 5e4
        });
        return {
          columns: ["Date (UTC)", "Seller", "Type", "Description", "Amount", "Balance after"],
          rows: rows.map((l) => [l.createdAt.toISOString(), l.seller.displayName, l.type, l.description, n(l.amount), n(l.balanceAfter)])
        };
      }
      default:
        throw new Error(`Unknown report: ${kind}`);
    }
  }
  async export(kind, range, sellerId, format) {
    const { columns, rows } = await this.report(kind, range, sellerId);
    const filename = `${kind}-${range.from.toISOString().slice(0, 10)}-to-${range.to.toISOString().slice(0, 10)}.${format}`;
    if (format === "csv") {
      const safe = rows.map((r) => r.map((c) => typeof c === "string" && /^[=+\-@]/.test(c) ? `'${c}` : c));
      return { filename, contentType: "text/csv; charset=utf-8", data: Buffer.from(stringify([columns, ...safe])) };
    }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(kind);
    ws.addRow(columns).font = { bold: true };
    rows.forEach((r) => ws.addRow(r));
    ws.columns.forEach((c) => c.width = 18);
    const data = Buffer.from(await wb.xlsx.writeBuffer());
    return { filename, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", data };
  }
};

// src/modules/audit/audit.service.ts
var primaryRole = (auth) => auth ? auth.roles.includes("ADMIN") ? "ADMIN" : auth.roles.includes("SELLER") ? "SELLER" : "CUSTOMER" : null;
var AuditService = class {
  constructor(audit, security) {
    this.audit = audit;
    this.security = security;
  }
  audit;
  security;
  entry(actor, e) {
    return {
      ...e,
      actorId: actor?.auth?.userId ?? null,
      actorRole: primaryRole(actor?.auth ?? null),
      ip: actor?.ip ?? null,
      userAgent: actor?.userAgent ?? null
    };
  }
  /** Pass `tx` to write the audit row inside the caller's transaction (all-or-nothing). */
  async record(actor, e, tx) {
    const repo = tx ? new PrismaAuditRepository(tx) : this.audit;
    await repo.record(this.entry(actor, e));
  }
  securityEvent(type, data) {
    this.security.record({ type, ...data }).catch((err) => logger.error({ err }, "failed to record security event"));
  }
};

// src/modules/auth/auth.service.ts
import jwt from "jsonwebtoken";

// src/shared/errors.ts
var AppError = class extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
  status;
  code;
  details;
};
var badRequest = (message, details) => new AppError(400, "VALIDATION_ERROR", message, details);
var unauthenticated = (message = "Please sign in to continue") => new AppError(401, "UNAUTHENTICATED", message);
var forbidden = (message = "You do not have permission to perform this action") => new AppError(403, "FORBIDDEN", message);
var notFound = (what = "Resource") => new AppError(404, "NOT_FOUND", `${what} not found`);
var conflict = (message, details) => new AppError(409, "CONFLICT", message, details);
var businessRule = (message, details) => new AppError(422, "BUSINESS_RULE", message, details);
var outOfStock = (message, details) => new AppError(409, "OUT_OF_STOCK", message, details);

// src/modules/auth/password.ts
import argon2 from "argon2";
import bcrypt from "bcryptjs";
function createPasswordHasher(kind, fast = false) {
  return {
    async hash(plain) {
      if (kind === "bcrypt") return bcrypt.hash(plain, fast ? 4 : 12);
      return argon2.hash(plain, {
        type: argon2.argon2id,
        memoryCost: fast ? 1024 : 19456,
        timeCost: fast ? 1 : 2,
        parallelism: 1
      });
    },
    async verify(hash, plain) {
      try {
        if (hash.startsWith("$argon2")) return await argon2.verify(hash, plain);
        if (hash.startsWith("$2")) return await bcrypt.compare(plain, hash);
        return false;
      } catch {
        return false;
      }
    }
  };
}
var DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8.m7qT9ZcU6W2yYtVlm9vP0p6uYl2e";

// src/modules/auth/auth.service.ts
var ISSUER = "vyora-api";
var AUDIENCE = "vyora";
function ttlSeconds(ttl) {
  const m = /^(\d+)\s*([smhd])$/.exec(ttl.trim());
  if (!m) return 900;
  return Number(m[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[m[2]];
}
var principalInclude = {
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
  seller: { select: { id: true, status: true, businessName: true, slug: true } }
};
var AuthService = class {
  constructor(db, env, hasher, audit, notifications) {
    this.db = db;
    this.env = env;
    this.hasher = hasher;
    this.audit = audit;
    this.notifications = notifications;
    this.accessTtl = ttlSeconds(env.ACCESS_TOKEN_TTL);
  }
  db;
  env;
  hasher;
  audit;
  notifications;
  principalCache = /* @__PURE__ */ new Map();
  accessTtl;
  hashPassword(plain) {
    return this.hasher.hash(plain);
  }
  // ── Sessions ─────────────────────────────────────────────
  signAccess(userId, sessionId) {
    return jwt.sign({ sid: sessionId }, this.env.JWT_ACCESS_SECRET, {
      subject: userId,
      expiresIn: this.accessTtl,
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithm: "HS256"
    });
  }
  async createRefresh(userId, familyId, meta) {
    const token = randomToken(48);
    const row = await this.db.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: sha256(`${this.env.JWT_REFRESH_SECRET}:${token}`),
        expiresAt: new Date(Date.now() + this.env.REFRESH_TOKEN_TTL_DAYS * 864e5),
        ip: meta.ip,
        userAgent: meta.userAgent
      }
    });
    return { token, row };
  }
  async issueSession(userId, meta, familyId = randomToken(16)) {
    const { token } = await this.createRefresh(userId, familyId, meta);
    return {
      accessToken: this.signAccess(userId, familyId),
      refreshToken: token,
      accessMaxAgeSeconds: this.accessTtl,
      refreshMaxAgeSeconds: this.env.REFRESH_TOKEN_TTL_DAYS * 86400,
      userId
    };
  }
  /** Rotate a refresh token. Re-use of an already-rotated token revokes the whole session family. */
  async refresh(token, meta) {
    const tokenHash = sha256(`${this.env.JWT_REFRESH_SECRET}:${token}`);
    const existing = await this.db.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!existing) throw unauthenticated("Your session has expired. Please sign in again.");
    if (existing.revokedAt) {
      await this.db.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: /* @__PURE__ */ new Date() }
      });
      this.audit.securityEvent("REFRESH_TOKEN_REUSE", { userId: existing.userId, ip: meta.ip, userAgent: meta.userAgent });
      this.invalidatePrincipal(existing.userId);
      throw unauthenticated("Your session has expired. Please sign in again.");
    }
    if (existing.expiresAt < /* @__PURE__ */ new Date() || existing.user.status !== "ACTIVE") {
      throw unauthenticated("Your session has expired. Please sign in again.");
    }
    const next = await this.createRefresh(existing.userId, existing.familyId, meta);
    const rotated = await this.db.refreshToken.updateMany({
      where: { id: existing.id, revokedAt: null },
      data: { revokedAt: /* @__PURE__ */ new Date(), replacedById: next.row.id }
    });
    if (rotated.count === 0) {
      await this.db.refreshToken.delete({ where: { id: next.row.id } });
      throw unauthenticated("Your session has expired. Please sign in again.");
    }
    return {
      accessToken: this.signAccess(existing.userId, existing.familyId),
      refreshToken: next.token,
      accessMaxAgeSeconds: this.accessTtl,
      refreshMaxAgeSeconds: this.env.REFRESH_TOKEN_TTL_DAYS * 86400,
      userId: existing.userId
    };
  }
  async logout(refreshToken, auth) {
    if (refreshToken) {
      const row = await this.db.refreshToken.findUnique({
        where: { tokenHash: sha256(`${this.env.JWT_REFRESH_SECRET}:${refreshToken}`) }
      });
      if (row) {
        await this.db.refreshToken.updateMany({ where: { familyId: row.familyId, revokedAt: null }, data: { revokedAt: /* @__PURE__ */ new Date() } });
      }
    }
    if (auth) {
      await this.db.refreshToken.updateMany({ where: { familyId: auth.sessionId, revokedAt: null }, data: { revokedAt: /* @__PURE__ */ new Date() } });
      this.invalidatePrincipal(auth.userId);
    }
  }
  async revokeAllSessions(userId) {
    await this.db.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: /* @__PURE__ */ new Date() } });
    this.invalidatePrincipal(userId);
  }
  // ── Principal resolution (called on every authenticated request) ─────────
  async resolveAuth(token) {
    let payload;
    try {
      payload = jwt.verify(token, this.env.JWT_ACCESS_SECRET, {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ["HS256"]
      });
    } catch {
      return null;
    }
    const userId = payload.sub;
    const sessionId = payload.sid;
    if (!userId || !sessionId) return null;
    const cacheKey = `${userId}:${sessionId}`;
    const cached = this.principalCache.get(cacheKey);
    if (cached && Date.now() - cached.at < 1e4) return cached.ctx;
    const [user, liveSession] = await Promise.all([
      this.db.user.findUnique({ where: { id: userId }, include: principalInclude }),
      this.db.refreshToken.findFirst({
        where: { familyId: sessionId, userId, revokedAt: null, expiresAt: { gt: /* @__PURE__ */ new Date() } },
        select: { id: true }
      })
    ]);
    if (!user || !liveSession || user.deletedAt || !["ACTIVE", "DELETION_REQUESTED"].includes(user.status)) return null;
    const roles = user.roles.map((r) => r.role.code);
    const permissions = /* @__PURE__ */ new Set();
    for (const r of user.roles) for (const p of r.role.permissions) permissions.add(p.permission.code);
    const ctx = {
      userId: user.id,
      sessionId,
      email: user.email,
      name: user.name,
      roles,
      permissions,
      sellerId: user.seller?.id ?? null,
      sellerStatus: user.seller?.status ?? null
    };
    if (this.principalCache.size > 1e4) this.principalCache.clear();
    this.principalCache.set(cacheKey, { ctx, at: Date.now() });
    return ctx;
  }
  invalidatePrincipal(userId) {
    for (const key of this.principalCache.keys()) if (key.startsWith(`${userId}:`)) this.principalCache.delete(key);
  }
  async sessionUser(userId) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId }, include: principalInclude });
    const permissions = /* @__PURE__ */ new Set();
    for (const r of user.roles) for (const p of r.role.permissions) permissions.add(p.permission.code);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      emailVerified: Boolean(user.emailVerifiedAt),
      roles: user.roles.map((r) => r.role.code),
      permissions: [...permissions],
      seller: user.seller
    };
  }
  // ── Registration & login ─────────────────────────────────
  async assertEmailAvailable(email, phone) {
    const existing = await this.db.user.findFirst({
      where: { OR: [{ email }, ...phone ? [{ phone }] : []] },
      select: { email: true }
    });
    if (existing) {
      throw conflict(
        existing.email === email ? "An account with this email already exists" : "This phone number is already registered"
      );
    }
  }
  async registerCustomer(input, meta) {
    await this.assertEmailAvailable(input.email, input.phone);
    const role = await this.db.role.findUniqueOrThrow({ where: { code: "CUSTOMER" } });
    const user = await this.db.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        passwordHash: await this.hasher.hash(input.password),
        roles: { create: [{ roleId: role.id }] },
        customerProfile: { create: {} }
      }
    });
    await this.sendVerificationEmail(user.id);
    void this.notifications.notify({ key: "auth.welcome", userId: user.id, link: "/" });
    this.audit.securityEvent("USER_REGISTERED", { userId: user.id, email: user.email, ip: meta.ip, userAgent: meta.userAgent });
    return this.issueSession(user.id, meta);
  }
  async login(email, password, meta) {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || user.deletedAt || user.status === "DELETED") {
      await this.hasher.verify(DUMMY_HASH, password);
      this.audit.securityEvent("LOGIN_FAILED", { email, ip: meta.ip, userAgent: meta.userAgent, details: { reason: "unknown_user" } });
      throw new AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password");
    }
    if (user.lockedUntil && user.lockedUntil > /* @__PURE__ */ new Date()) {
      this.audit.securityEvent("LOGIN_BLOCKED_LOCKED", { userId: user.id, email, ip: meta.ip });
      throw new AppError(
        423,
        "ACCOUNT_LOCKED",
        `Too many failed attempts. Try again after ${user.lockedUntil.toLocaleTimeString("en-IN", { timeZone: this.env.DEFAULT_TIMEZONE })}.`
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
          lockedUntil: lock ? new Date(Date.now() + this.env.LOGIN_LOCK_MINUTES * 6e4) : void 0
        }
      });
      this.audit.securityEvent(lock ? "ACCOUNT_LOCKED" : "LOGIN_FAILED", {
        userId: user.id,
        email,
        ip: meta.ip,
        userAgent: meta.userAgent,
        details: { attempts: failed }
      });
      throw new AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password");
    }
    if (user.status === "SUSPENDED") {
      throw new AppError(403, "FORBIDDEN", "This account has been suspended. Please contact support.");
    }
    await this.db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: /* @__PURE__ */ new Date() }
    });
    this.audit.securityEvent("LOGIN_SUCCESS", { userId: user.id, email, ip: meta.ip, userAgent: meta.userAgent });
    return this.issueSession(user.id, meta);
  }
  // ── One-time tokens (email verification, password reset, invites) ──────────
  async createOneTimeToken(userId, type, ttlMinutes) {
    const token = randomToken(32);
    await this.db.verificationToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: /* @__PURE__ */ new Date() } });
    await this.db.verificationToken.create({
      data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMinutes * 6e4) }
    });
    return token;
  }
  async consumeToken(token, types) {
    const row = await this.db.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (!row || !types.includes(row.type) || row.usedAt || row.expiresAt < /* @__PURE__ */ new Date()) {
      throw badRequest("This link is invalid or has expired. Please request a new one.");
    }
    const claimed = await this.db.verificationToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: /* @__PURE__ */ new Date() }
    });
    if (claimed.count === 0) throw badRequest("This link has already been used.");
    return row;
  }
  async sendVerificationEmail(userId) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerifiedAt) return;
    const token = await this.createOneTimeToken(userId, "EMAIL_VERIFY", 24 * 60);
    await this.notifications.notify({
      key: "auth.verify_email",
      userId,
      vars: { link: `${this.notifications.frontendUrl}/verify-email?token=${token}` }
    });
  }
  async verifyEmail(token) {
    const row = await this.consumeToken(token, ["EMAIL_VERIFY"]);
    await this.db.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: /* @__PURE__ */ new Date() } });
  }
  /** Always succeeds from the caller's perspective so account existence is not revealed. */
  async forgotPassword(email, meta) {
    const user = await this.db.user.findUnique({ where: { email } });
    this.audit.securityEvent("PASSWORD_RESET_REQUESTED", { userId: user?.id, email, ip: meta.ip });
    if (!user || user.status === "DELETED" || user.deletedAt) return;
    const token = await this.createOneTimeToken(user.id, "PASSWORD_RESET", 60);
    await this.notifications.notify({
      key: "auth.password_reset",
      userId: user.id,
      channels: ["EMAIL"],
      vars: { link: `${this.notifications.frontendUrl}/reset-password?token=${token}` }
    });
  }
  /** Completes both password resets and seller invitations. */
  async resetPassword(token, password, meta) {
    const row = await this.consumeToken(token, ["PASSWORD_RESET", "SELLER_INVITE"]);
    await this.db.user.update({
      where: { id: row.userId },
      data: {
        passwordHash: await this.hasher.hash(password),
        failedLoginCount: 0,
        lockedUntil: null,
        // Opening an emailed link proves control of the mailbox.
        emailVerifiedAt: /* @__PURE__ */ new Date()
      }
    });
    await this.revokeAllSessions(row.userId);
    this.audit.securityEvent("PASSWORD_RESET", { userId: row.userId, ip: meta.ip, userAgent: meta.userAgent });
    return this.issueSession(row.userId, meta);
  }
  async changePassword(userId, current, next, meta, keepSessionId) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash || !await this.hasher.verify(user.passwordHash, current)) {
      throw new AppError(400, "INVALID_CREDENTIALS", "Your current password is incorrect");
    }
    await this.db.user.update({ where: { id: userId }, data: { passwordHash: await this.hasher.hash(next) } });
    await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null, NOT: { familyId: keepSessionId } },
      data: { revokedAt: /* @__PURE__ */ new Date() }
    });
    this.invalidatePrincipal(userId);
    this.audit.securityEvent("PASSWORD_CHANGED", { userId, ip: meta.ip, userAgent: meta.userAgent });
  }
};

// src/shared/money.ts
import { Prisma as Prisma3 } from "@prisma/client";
var toPaise = (v) => {
  if (v === null || v === void 0) return 0;
  const n2 = typeof v === "object" ? Number(v.toString()) : Number(v);
  return Math.round(n2 * 100);
};
var fromPaise = (p) => Math.round(p) / 100;
var decimal = (p) => new Prisma3.Decimal(fromPaise(p).toFixed(2));
var num = (v) => v === null || v === void 0 ? 0 : fromPaise(toPaise(v));
var pct = (amount, percent) => Math.round(amount * percent / 100);
var inclusiveTax = (amount, rate) => rate > 0 ? Math.round(amount * rate / (100 + rate)) : 0;
function allocate(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total === 0 || sum === 0) return weights.map(() => 0);
  const raw = weights.map((w) => total * w / sum);
  const floored = raw.map(Math.floor);
  let remainder = total - floored.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floored[i] += 1;
    remainder -= 1;
  }
  return floored;
}

// src/modules/catalog/product-indexer.ts
var purchasableListingWhere = {
  status: "APPROVED",
  isActive: true,
  deletedAt: null,
  seller: { status: "APPROVED", deletedAt: null },
  product: { status: "APPROVED", deletedAt: null },
  variant: { deletedAt: null }
};
var ProductIndexer = class {
  constructor(db, cache) {
    this.db = db;
    this.cache = cache;
  }
  db;
  cache;
  async refresh(productIds, db = this.db) {
    const ids = [...new Set(productIds)].filter(Boolean);
    for (const productId of ids) {
      const listings = await db.sellerProductListing.findMany({
        where: { productId, ...purchasableListingWhere },
        select: { price: true, mrp: true, inventory: { select: { quantity: true, reserved: true } } }
      });
      let minPrice = null;
      let maxMrp = null;
      let maxDiscount = 0;
      let inStock = false;
      let minInStockPrice = null;
      for (const l of listings) {
        const price2 = Number(l.price);
        const mrp = Number(l.mrp);
        const available = (l.inventory?.quantity ?? 0) - (l.inventory?.reserved ?? 0);
        if (available > 0) {
          inStock = true;
          minInStockPrice = minInStockPrice === null ? price2 : Math.min(minInStockPrice, price2);
        }
        minPrice = minPrice === null ? price2 : Math.min(minPrice, price2);
        maxMrp = maxMrp === null ? mrp : Math.max(maxMrp, mrp);
        if (mrp > price2) maxDiscount = Math.max(maxDiscount, Math.round((mrp - price2) / mrp * 100));
      }
      await db.product.update({
        where: { id: productId },
        data: {
          minPrice: minInStockPrice ?? minPrice,
          maxMrp,
          maxDiscountPct: maxDiscount,
          inStock
        }
      });
    }
    if (ids.length) await this.cache.delPrefix("home:");
  }
  async refreshForSeller(sellerId) {
    const rows = await this.db.sellerProductListing.findMany({
      where: { sellerId },
      select: { productId: true },
      distinct: ["productId"]
    });
    await this.refresh(rows.map((r) => r.productId));
  }
  /** Rebuild the full-text search document for a product. */
  async reindexSearch(productId, db = this.db) {
    const p = await db.product.findUnique({
      where: { id: productId },
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
        listings: { where: { deletedAt: null }, select: { sku: true, barcode: true } },
        attributeValues: { select: { value: true } },
        variants: { where: { deletedAt: null }, select: { name: true } }
      }
    });
    if (!p) return;
    const tags4 = Array.isArray(p.tags) ? p.tags : [];
    const parts = [
      p.title,
      p.brand?.name,
      p.category.name,
      ...tags4,
      ...p.listings.flatMap((l) => [l.sku, l.barcode]),
      ...p.attributeValues.map((a) => a.value),
      ...p.variants.map((v) => v.name)
    ].filter(Boolean);
    await db.product.update({ where: { id: productId }, data: { searchText: [...new Set(parts)].join(" ").slice(0, 6e4) } });
  }
};

// src/shared/pagination.ts
var pageArgs = (page, pageSize) => ({ skip: (page - 1) * pageSize, take: pageSize });
function paginated(items, total, page, pageSize) {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

// src/shared/text.ts
function slugify(input) {
  return input.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 150);
}
function plainText(input) {
  if (input === null || input === void 0) return null;
  return input.replace(/<[^>]*>/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}
var normalizeQuery = (q) => q.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 120);

// src/modules/catalog/storefront.service.ts
var cardSelect = {
  id: true,
  slug: true,
  title: true,
  minPrice: true,
  maxMrp: true,
  maxDiscountPct: true,
  inStock: true,
  ratingAvg: true,
  ratingCount: true,
  soldCount: true,
  isFeatured: true,
  publishedAt: true,
  codAvailable: true,
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 2, select: { url: true, storageKey: true, alt: true } }
};
var thumbOf = (img) => img ? img.storageKey && img.url.endsWith(".webp") ? img.url.replace(/\.webp$/, "-sm.webp") : img.url : null;
var STOPWORDS = /* @__PURE__ */ new Set(["the", "and", "for", "with", "from", "into", "you", "are", "was", "this", "that"]);
function booleanQuery(q) {
  const tokens = normalizeQuery(q).replace(/[+\-><()~*"@]/g, " ").split(" ").filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  return tokens.length ? tokens.map((t) => `+${t}*`).join(" ") : null;
}
var StorefrontService = class {
  constructor(db, catalog, cache) {
    this.db = db;
    this.catalog = catalog;
    this.cache = cache;
  }
  db;
  catalog;
  cache;
  /** Base filter: approved, live products with at least one purchasable offer. */
  liveWhere() {
    return { status: "APPROVED", deletedAt: null, minPrice: { not: null } };
  }
  async toCards(rows) {
    if (!rows.length) return [];
    const listings = await this.db.sellerProductListing.findMany({
      where: { productId: { in: rows.map((r) => r.id) }, ...purchasableListingWhere },
      select: { id: true, productId: true, price: true, variant: { select: { isDefault: true } }, inventory: { select: { quantity: true, reserved: true } } },
      orderBy: { price: "asc" }
    });
    const quick = /* @__PURE__ */ new Map();
    const variantCount = /* @__PURE__ */ new Map();
    for (const l of listings) {
      const avail = (l.inventory?.quantity ?? 0) - (l.inventory?.reserved ?? 0);
      if (!variantCount.has(l.productId)) variantCount.set(l.productId, /* @__PURE__ */ new Set());
      variantCount.get(l.productId).add(l.variant.isDefault);
      if (avail > 0 && !quick.has(l.productId)) quick.set(l.productId, { id: l.id, variants: 0 });
    }
    const weekAgo = Date.now() - 14 * 864e5;
    return rows.map((r) => {
      const price2 = num(r.minPrice);
      const mrp = Math.max(num(r.maxMrp), price2);
      const badges = [];
      if (r.isFeatured) badges.push("Featured");
      if (r.publishedAt && r.publishedAt.getTime() > weekAgo) badges.push("New");
      if (r.soldCount >= 20) badges.push("Bestseller");
      if (r.maxDiscountPct >= 30) badges.push("Hot deal");
      return {
        id: r.id,
        slug: r.slug,
        title: r.title,
        brand: r.brand?.name ?? null,
        category: r.category.name,
        imageUrl: r.images[0]?.url ?? null,
        thumbUrl: thumbOf(r.images[0]),
        hoverImageUrl: r.images[1]?.url ?? null,
        price: price2,
        mrp,
        discountPct: mrp > price2 ? Math.round((mrp - price2) / mrp * 100) : 0,
        rating: num(r.ratingAvg),
        ratingCount: r.ratingCount,
        inStock: r.inStock,
        codAvailable: r.codAvailable,
        badges,
        quickAddListingId: quick.get(r.id)?.id ?? null
      };
    });
  }
  async fulltextIds(q) {
    const bq = booleanQuery(q);
    const ranks = /* @__PURE__ */ new Map();
    if (bq) {
      const rows = await this.db.$queryRaw`
        SELECT id, MATCH(title, searchText) AGAINST (${bq} IN BOOLEAN MODE) AS score
        FROM \`Product\`
        WHERE status = 'APPROVED' AND deletedAt IS NULL AND minPrice IS NOT NULL
          AND MATCH(title, searchText) AGAINST (${bq} IN BOOLEAN MODE)
        ORDER BY score DESC LIMIT 2000`;
      rows.forEach((r, i) => ranks.set(r.id, 1e5 - i));
    }
    if (ranks.size === 0) {
      const like = `%${normalizeQuery(q).replace(/[%_\\]/g, "")}%`;
      const rows = await this.db.$queryRaw`
        SELECT id, (title LIKE ${like}) AS titleHit FROM \`Product\`
        WHERE status = 'APPROVED' AND deletedAt IS NULL AND minPrice IS NOT NULL
          AND (title LIKE ${like} OR searchText LIKE ${like})
        ORDER BY titleHit DESC, soldCount DESC LIMIT 2000`;
      rows.forEach((r, i) => ranks.set(r.id, 1e5 - i));
    }
    return ranks;
  }
  /** Product listing / search with filters, sorting, pagination and facets. */
  async list(query, opts = {}) {
    const where = this.liveWhere();
    const and = [];
    let category = null;
    if (query.category) {
      category = await this.catalog.bySlug(query.category);
      and.push({ categoryId: { in: await this.catalog.subtreeIds(category.id) } });
    }
    let ranks = null;
    if (query.q) {
      ranks = await this.fulltextIds(query.q);
      and.push({ id: { in: [...ranks.keys()] } });
    }
    const baseWhere = { ...where, AND: [...and] };
    if (query.brand) and.push({ brand: { slug: { in: query.brand.split(",").map((s) => s.trim()).filter(Boolean) } } });
    if (query.seller) and.push({ listings: { some: { ...purchasableListingWhere, seller: { slug: query.seller, status: "APPROVED" } } } });
    if (query.minPrice !== void 0) and.push({ minPrice: { gte: query.minPrice } });
    if (query.maxPrice !== void 0) and.push({ minPrice: { lte: query.maxPrice } });
    if (query.rating) and.push({ ratingAvg: { gte: query.rating } });
    if (query.inStock) and.push({ inStock: true });
    if (query.onSale) and.push({ maxDiscountPct: { gte: 10 } });
    if (query.attrs) {
      for (const part of query.attrs.split(";")) {
        const [code, raw] = part.split(":");
        const values2 = (raw ?? "").split("|").map((v) => v.trim()).filter(Boolean);
        if (code && values2.length) {
          and.push({ attributeValues: { some: { attribute: { code: code.trim() }, value: { in: values2 } } } });
        }
      }
    }
    const fullWhere = { ...where, AND: and };
    const sort = query.sort ?? (query.q ? "relevance" : "popular");
    const orderBy = sort === "newest" ? [{ publishedAt: "desc" }] : sort === "price_asc" ? [{ minPrice: "asc" }] : sort === "price_desc" ? [{ minPrice: "desc" }] : sort === "rating" ? [{ ratingAvg: "desc" }, { ratingCount: "desc" }] : sort === "discount" ? [{ maxDiscountPct: "desc" }] : [{ inStock: "desc" }, { soldCount: "desc" }, { ratingCount: "desc" }, { publishedAt: "desc" }];
    let rows;
    let total;
    if (sort === "relevance" && ranks) {
      const matching = await this.db.product.findMany({ where: fullWhere, select: { id: true, inStock: true } });
      matching.sort((a, b) => Number(b.inStock) - Number(a.inStock) || (ranks.get(b.id) ?? 0) - (ranks.get(a.id) ?? 0));
      total = matching.length;
      const pageIds = matching.slice((query.page - 1) * query.pageSize, query.page * query.pageSize).map((m) => m.id);
      const found = await this.db.product.findMany({ where: { id: { in: pageIds } }, select: cardSelect });
      rows = pageIds.map((id) => found.find((f) => f.id === id)).filter(Boolean);
    } else {
      [rows, total] = await Promise.all([
        this.db.product.findMany({
          where: fullWhere,
          select: cardSelect,
          orderBy,
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize
        }),
        this.db.product.count({ where: fullWhere })
      ]);
    }
    const result = paginated(await this.toCards(rows), total, query.page, query.pageSize);
    return {
      ...result,
      category: category ? { id: category.id, name: category.name, slug: category.slug, description: category.description, breadcrumbs: category.breadcrumbs, children: category.children } : null,
      facets: opts.facets ? await this.facets(baseWhere, category?.id ?? null) : void 0
    };
  }
  async facets(baseWhere, categoryId) {
    const base = await this.db.product.findMany({ where: baseWhere, select: { id: true, brandId: true }, take: 5e3 });
    const ids = base.map((b) => b.id);
    if (!ids.length) return { brands: [], price: { min: 0, max: 0 }, attributes: [] };
    const [brandCounts, priceAgg, attrValues, attrs] = await Promise.all([
      this.db.product.groupBy({ by: ["brandId"], where: { id: { in: ids }, brandId: { not: null } }, _count: { _all: true } }),
      this.db.product.aggregate({ where: { id: { in: ids } }, _min: { minPrice: true }, _max: { minPrice: true } }),
      this.db.productAttributeValue.groupBy({
        by: ["attributeId", "value"],
        where: { productId: { in: ids } },
        _count: { productId: true }
      }),
      categoryId ? this.catalog.filterableAttributes(categoryId) : this.db.productAttribute.findMany({ where: { isFilterable: true } })
    ]);
    const brands = await this.db.brand.findMany({
      where: { id: { in: brandCounts.map((b) => b.brandId).filter(Boolean) } },
      select: { id: true, name: true, slug: true }
    });
    return {
      brands: brandCounts.map((b) => ({ ...brands.find((x) => x.id === b.brandId), count: b._count._all })).filter((b) => b.slug).sort((a, b) => b.count - a.count).slice(0, 30),
      price: { min: Math.floor(num(priceAgg._min.minPrice)), max: Math.ceil(num(priceAgg._max.minPrice)) },
      attributes: attrs.filter((a) => a.isFilterable).map((a) => ({
        code: a.code,
        name: a.name,
        values: attrValues.filter((v) => v.attributeId === a.id).map((v) => ({ value: v.value, count: v._count.productId })).sort((x, y) => y.count - x.count).slice(0, 20)
      })).filter((a) => a.values.length > 0)
    };
  }
  /** Full product page: variants, offers from every seller, specs, breadcrumbs, related items. */
  async detail(slug) {
    const product = await this.db.product.findFirst({
      where: { slug, deletedAt: null, status: "APPROVED" },
      include: {
        brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
        category: { select: { id: true, name: true, slug: true, path: true } },
        images: { orderBy: { sortOrder: "asc" } },
        variants: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
        attributeValues: { where: { variantId: null }, include: { attribute: { select: { name: true, code: true } } } }
      }
    });
    if (!product) throw notFound("Product");
    const [offers, ancestors, ratingBreakdown] = await Promise.all([
      this.db.sellerProductListing.findMany({
        where: { productId: product.id, ...purchasableListingWhere },
        include: {
          inventory: { select: { quantity: true, reserved: true } },
          seller: { select: { id: true, displayName: true, slug: true, ratingAvg: true, ratingCount: true, fulfillmentMode: true, createdAt: true } }
        },
        orderBy: { price: "asc" }
      }),
      this.db.category.findMany({
        where: { id: { in: product.category.path.split("/").filter(Boolean) } },
        select: { id: true, name: true, slug: true, depth: true },
        orderBy: { depth: "asc" }
      }),
      this.db.review.groupBy({
        by: ["rating"],
        where: { productId: product.id, status: "APPROVED", deletedAt: null },
        _count: { _all: true }
      })
    ]);
    const axes = /* @__PURE__ */ new Map();
    for (const v of product.variants) {
      for (const [k, val] of Object.entries(v.options ?? {})) {
        if (!axes.has(k)) axes.set(k, /* @__PURE__ */ new Set());
        axes.get(k).add(val);
      }
    }
    void this.db.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => void 0);
    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      description: product.description,
      highlights: product.highlights ?? [],
      specifications: product.specifications ?? [],
      attributes: product.attributeValues.map((a) => ({ name: a.attribute.name, code: a.attribute.code, value: a.value })),
      brand: product.brand,
      category: { id: product.category.id, name: product.category.name, slug: product.category.slug },
      breadcrumbs: ancestors,
      images: product.images.map((i) => ({ id: i.id, url: i.url, thumbUrl: thumbOf(i), alt: i.alt, variantId: i.variantId })),
      videoUrl: product.videoUrl,
      rating: num(product.ratingAvg),
      ratingCount: product.ratingCount,
      ratingBreakdown: [5, 4, 3, 2, 1].map((star) => ({ star, count: ratingBreakdown.find((r) => r.rating === star)?._count._all ?? 0 })),
      soldCount: product.soldCount,
      isReturnable: product.isReturnable,
      returnWindowDays: product.returnWindowDays,
      codAvailable: product.codAvailable,
      price: num(product.minPrice),
      mrp: num(product.maxMrp),
      inStock: product.inStock,
      axes: [...axes.entries()].map(([code, values2]) => ({ code, values: [...values2] })),
      variants: product.variants.map((v) => ({ id: v.id, name: v.name, options: v.options, isDefault: v.isDefault })),
      offers: offers.map((o) => {
        const available = (o.inventory?.quantity ?? 0) - (o.inventory?.reserved ?? 0);
        return {
          listingId: o.id,
          variantId: o.variantId,
          sku: o.sku,
          price: num(o.price),
          mrp: num(o.mrp),
          discountPct: num(o.mrp) > num(o.price) ? Math.round((num(o.mrp) - num(o.price)) / num(o.mrp) * 100) : 0,
          available: Math.max(0, available),
          inStock: available > 0,
          lowStock: available > 0 && available <= 5,
          seller: {
            id: o.seller.id,
            name: o.seller.displayName,
            slug: o.seller.slug,
            rating: num(o.seller.ratingAvg),
            ratingCount: o.seller.ratingCount,
            fulfilledBy: o.seller.fulfillmentMode,
            since: o.seller.createdAt
          }
        };
      }),
      seo: {
        title: `${product.title}${product.brand ? ` | ${product.brand.name}` : ""}`,
        description: product.description.slice(0, 160)
      }
    };
  }
  async related(productId, limit = 12) {
    const p = await this.db.product.findUnique({ where: { id: productId }, select: { categoryId: true, brandId: true } });
    if (!p) return [];
    const rows = await this.db.product.findMany({
      where: { ...this.liveWhere(), categoryId: p.categoryId, NOT: { id: productId } },
      select: cardSelect,
      orderBy: [{ soldCount: "desc" }, { ratingAvg: "desc" }],
      take: limit
    });
    return this.toCards(rows);
  }
  /** Products most often bought in the same order; falls back to same-category bestsellers. */
  async frequentlyBoughtTogether(productId, limit = 4) {
    const rows = await this.db.$queryRaw`
      SELECT oi2.productId AS productId, COUNT(*) AS c
      FROM \`OrderItem\` oi1 JOIN \`OrderItem\` oi2 ON oi1.orderId = oi2.orderId AND oi2.productId <> oi1.productId
      WHERE oi1.productId = ${productId} AND oi2.productId IS NOT NULL
      GROUP BY oi2.productId ORDER BY c DESC LIMIT 20`;
    const ids = rows.map((r) => r.productId);
    let products = ids.length ? await this.db.product.findMany({ where: { ...this.liveWhere(), id: { in: ids }, inStock: true }, select: cardSelect }) : [];
    products.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    if (products.length < limit) {
      const more = await this.related(productId, limit * 2);
      const have = new Set(products.map((p) => p.id));
      const cards = await this.toCards(products);
      return [...cards, ...more.filter((m) => !have.has(m.id) && m.inStock)].slice(0, limit);
    }
    return this.toCards(products.slice(0, limit));
  }
  // ── Search helpers ─────────────────────────────────────────
  async suggestions(q) {
    const term = normalizeQuery(q);
    if (term.length < 2) return { products: [], categories: [], brands: [], queries: [] };
    const [products, categories, brands, queries] = await Promise.all([
      this.db.product.findMany({
        where: { ...this.liveWhere(), OR: [{ title: { contains: term } }, { searchText: { contains: term } }] },
        select: { id: true, slug: true, title: true, minPrice: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, storageKey: true } } },
        orderBy: [{ soldCount: "desc" }],
        take: 6
      }),
      this.db.category.findMany({
        where: { isActive: true, deletedAt: null, name: { contains: term } },
        select: { id: true, name: true, slug: true },
        take: 4
      }),
      this.db.brand.findMany({ where: { isActive: true, deletedAt: null, name: { contains: term } }, select: { id: true, name: true, slug: true }, take: 4 }),
      this.db.searchHistory.groupBy({
        by: ["normalized"],
        where: { normalized: { startsWith: term }, resultsCount: { gt: 0 }, createdAt: { gte: new Date(Date.now() - 60 * 864e5) } },
        _count: { _all: true },
        orderBy: { _count: { normalized: "desc" } },
        take: 5
      })
    ]);
    return {
      products: products.map((p) => ({ id: p.id, slug: p.slug, title: p.title, price: num(p.minPrice), thumbUrl: thumbOf(p.images[0]) })),
      categories,
      brands,
      queries: queries.map((qq) => qq.normalized)
    };
  }
  async recordSearch(userId, query, resultsCount) {
    const normalized = normalizeQuery(query);
    if (normalized.length < 2) return;
    await this.db.searchHistory.create({ data: { userId, query: query.slice(0, 120), normalized, resultsCount } });
  }
  async popularSearches(limit = 10) {
    const key = "search:popular";
    const cached = await this.cache.get(key);
    if (cached) return cached;
    const rows = await this.db.searchHistory.groupBy({
      by: ["normalized"],
      where: { resultsCount: { gt: 0 }, createdAt: { gte: new Date(Date.now() - 30 * 864e5) } },
      _count: { _all: true },
      orderBy: { _count: { normalized: "desc" } },
      take: limit
    });
    const result = rows.map((r) => r.normalized);
    await this.cache.set(key, result, 600);
    return result;
  }
  async recentSearches(userId, limit = 10) {
    const rows = await this.db.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { query: true, normalized: true }
    });
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (const r of rows) {
      if (seen.has(r.normalized)) continue;
      seen.add(r.normalized);
      out.push(r.query);
      if (out.length >= limit) break;
    }
    return out;
  }
  clearSearchHistory(userId) {
    return this.db.searchHistory.deleteMany({ where: { userId } });
  }
  // ── Merchandising blocks (homepage sections) ───────────────
  async productsBy(kind, limit, categoryId) {
    const where = { ...this.liveWhere(), inStock: true };
    if (categoryId) where.categoryId = { in: await this.catalog.subtreeIds(categoryId) };
    let orderBy = [{ soldCount: "desc" }];
    switch (kind) {
      case "TRENDING":
        orderBy = [{ viewCount: "desc" }, { soldCount: "desc" }];
        break;
      case "NEW_ARRIVALS":
        orderBy = [{ publishedAt: "desc" }];
        break;
      case "ON_SALE":
        where.maxDiscountPct = { gte: 15 };
        orderBy = [{ maxDiscountPct: "desc" }];
        break;
      case "FEATURED_PRODUCTS":
        where.isFeatured = true;
        orderBy = [{ updatedAt: "desc" }];
        break;
      case "RECOMMENDED":
        orderBy = [{ ratingAvg: "desc" }, { ratingCount: "desc" }];
        break;
    }
    const rows = await this.db.product.findMany({ where, select: cardSelect, orderBy, take: limit });
    return this.toCards(rows);
  }
  /** Personalised picks from the categories the user viewed recently. */
  async recommendedFor(userId, limit = 12) {
    const recent = await this.db.recentlyViewedProduct.findMany({
      where: { userId },
      orderBy: { viewedAt: "desc" },
      take: 20,
      select: { productId: true, product: { select: { categoryId: true } } }
    });
    if (!recent.length) return this.productsBy("RECOMMENDED", limit);
    const categoryIds = [...new Set(recent.map((r) => r.product.categoryId))];
    const rows = await this.db.product.findMany({
      where: { ...this.liveWhere(), inStock: true, categoryId: { in: categoryIds }, id: { notIn: recent.map((r) => r.productId) } },
      select: cardSelect,
      orderBy: [{ ratingAvg: "desc" }, { soldCount: "desc" }],
      take: limit
    });
    return this.toCards(rows);
  }
  async featuredSellers(limit = 8) {
    const sellers = await this.db.seller.findMany({
      where: { status: "APPROVED", deletedAt: null, isFeatured: true },
      select: { id: true, displayName: true, slug: true, logoUrl: true, description: true, ratingAvg: true, ratingCount: true, _count: { select: { listings: { where: purchasableListingWhere } } } },
      take: limit
    });
    return sellers.map((s) => ({
      id: s.id,
      name: s.displayName,
      slug: s.slug,
      logoUrl: s.logoUrl,
      description: s.description,
      rating: num(s.ratingAvg),
      ratingCount: s.ratingCount,
      productCount: s._count.listings
    }));
  }
  async sellerStore(slug) {
    const seller = await this.db.seller.findFirst({
      where: { slug, status: "APPROVED", deletedAt: null },
      select: { id: true, displayName: true, slug: true, logoUrl: true, description: true, ratingAvg: true, ratingCount: true, createdAt: true, fulfillmentMode: true }
    });
    if (!seller) throw notFound("Seller");
    return { ...seller, ratingAvg: num(seller.ratingAvg) };
  }
  /** Data for sitemap.xml */
  async sitemapEntries() {
    const [products, categories, sellers] = await Promise.all([
      this.db.product.findMany({ where: this.liveWhere(), select: { slug: true, updatedAt: true }, take: 45e3 }),
      this.db.category.findMany({ where: { isActive: true, deletedAt: null }, select: { slug: true, updatedAt: true } }),
      this.db.seller.findMany({ where: { status: "APPROVED", deletedAt: null }, select: { slug: true, updatedAt: true } })
    ]);
    return { products, categories, sellers };
  }
};

// src/modules/orders/pricing.ts
function eligible(line, coupon) {
  switch (coupon.scope) {
    case "ALL":
      return true;
    case "CATEGORY":
      return line.categoryIds.some((c) => coupon.scopeIds.includes(c));
    case "PRODUCT":
      return coupon.scopeIds.includes(line.productId);
    case "SELLER":
      return coupon.scopeIds.includes(line.sellerId);
  }
}
function price(input) {
  const lines = input.lines.map((l) => ({
    ...l,
    lineSubtotal: l.unitPrice * l.quantity,
    lineMrp: Math.max(l.unitMrp, l.unitPrice) * l.quantity,
    discount: 0,
    sellerFundedDiscount: 0,
    shipping: 0,
    tax: 0,
    total: 0
  }));
  const itemsSubtotal = lines.reduce((s, l) => s + l.lineSubtotal, 0);
  let couponOutcome = null;
  let freeShippingSellers = /* @__PURE__ */ new Set();
  const c = input.coupon;
  if (c) {
    const eligibleLines = lines.filter((l) => eligible(l, c));
    const eligibleSubtotal = eligibleLines.reduce((s, l) => s + l.lineSubtotal, 0);
    if (eligibleLines.length === 0) {
      couponOutcome = { code: c.code, applied: false, discount: 0, shippingWaived: 0, message: "This coupon does not apply to the items in your cart" };
    } else if (eligibleSubtotal < c.minOrderAmount) {
      couponOutcome = {
        code: c.code,
        applied: false,
        discount: 0,
        shippingWaived: 0,
        message: `Add items worth \u20B9${((c.minOrderAmount - eligibleSubtotal) / 100).toFixed(0)} more to use this coupon`
      };
    } else if (c.type === "FREE_SHIPPING") {
      freeShippingSellers = new Set(eligibleLines.map((l) => l.sellerId));
      couponOutcome = { code: c.code, applied: true, discount: 0, shippingWaived: 0, message: "Free shipping applied" };
    } else {
      let discount = c.type === "PERCENTAGE" ? pct(eligibleSubtotal, c.value) : Math.round(c.value * 100);
      if (c.maxDiscount !== null) discount = Math.min(discount, c.maxDiscount);
      discount = Math.min(discount, eligibleSubtotal);
      const parts = allocate(discount, eligibleLines.map((l) => l.lineSubtotal));
      eligibleLines.forEach((l, i) => {
        l.discount = parts[i];
        if (c.fundedBy === "SELLER") l.sellerFundedDiscount = parts[i];
      });
      couponOutcome = { code: c.code, applied: true, discount, shippingWaived: 0, message: `You saved \u20B9${(discount / 100).toFixed(2).replace(/\.00$/, "")}` };
    }
  }
  const bySeller = /* @__PURE__ */ new Map();
  for (const l of lines) {
    if (!bySeller.has(l.sellerId)) bySeller.set(l.sellerId, []);
    bySeller.get(l.sellerId).push(l);
  }
  const groups = [];
  let shippingWaivedTotal = 0;
  for (const [sellerId, gl] of bySeller) {
    const groupSubtotal = gl.reduce((s, l) => s + l.lineSubtotal, 0);
    const qualifiesFree = input.shipping.freeAbove !== null && groupSubtotal >= input.shipping.freeAbove;
    let shipping = qualifiesFree ? 0 : input.shipping.baseFee;
    const waived = shipping > 0 && freeShippingSellers.has(sellerId);
    if (waived) {
      shippingWaivedTotal += shipping;
      shipping = 0;
    }
    const shipParts = allocate(shipping, gl.map((l) => l.lineSubtotal || 1));
    gl.forEach((l, i) => {
      l.shipping = shipParts[i];
      const taxable = l.lineSubtotal - l.discount;
      l.tax = input.taxInclusive ? inclusiveTax(taxable, l.taxRate) : pct(taxable, l.taxRate);
      l.total = taxable + (input.taxInclusive ? 0 : l.tax) + l.shipping;
    });
    groups.push({
      sellerId,
      lines: gl,
      itemsSubtotal: groupSubtotal,
      discount: gl.reduce((s, l) => s + l.discount, 0),
      shipping,
      shippingWaived: waived,
      tax: gl.reduce((s, l) => s + l.tax, 0),
      total: gl.reduce((s, l) => s + l.total, 0)
    });
  }
  if (couponOutcome?.applied && input.coupon?.type === "FREE_SHIPPING") {
    couponOutcome.shippingWaived = shippingWaivedTotal;
    couponOutcome.message = shippingWaivedTotal > 0 ? `Free shipping applied \u2014 you saved \u20B9${(shippingWaivedTotal / 100).toFixed(0)}` : "Your order already ships free";
  }
  const discountTotal = lines.reduce((s, l) => s + l.discount, 0);
  const shippingTotal = groups.reduce((s, g) => s + g.shipping, 0);
  const taxTotal = lines.reduce((s, l) => s + l.tax, 0);
  const mrpTotal = lines.reduce((s, l) => s + l.lineMrp, 0);
  const linesTotal = lines.reduce((s, l) => s + l.total, 0);
  return {
    groups,
    mrpTotal,
    itemsSubtotal,
    savingsOnMrp: mrpTotal - itemsSubtotal,
    discountTotal,
    shippingTotal,
    codFee: lines.length ? input.codFee : 0,
    taxTotal,
    grandTotal: linesTotal + (lines.length ? input.codFee : 0),
    coupon: couponOutcome
  };
}
function resolveCommission(rules, ctx, defaultPercent) {
  const pick = (r) => r ? { ruleId: r.id, scope: r.scope, percentage: r.percentage, fixedPerUnit: r.fixedAmount } : null;
  const product = rules.find((r) => r.scope === "PRODUCT" && r.productId === ctx.productId);
  if (product) return pick(product);
  for (const cat of ctx.categoryLineage) {
    const sc = rules.find((r) => r.scope === "SELLER_CATEGORY" && r.sellerId === ctx.sellerId && r.categoryId === cat);
    if (sc) return pick(sc);
  }
  const seller = rules.find((r) => r.scope === "SELLER" && r.sellerId === ctx.sellerId);
  if (seller) return pick(seller);
  for (const cat of ctx.categoryLineage) {
    const cr = rules.find((r) => r.scope === "CATEGORY" && r.categoryId === cat);
    if (cr) return pick(cr);
  }
  const global = rules.find((r) => r.scope === "GLOBAL");
  if (global) return pick(global);
  return { ruleId: null, scope: "GLOBAL", percentage: defaultPercent, fixedPerUnit: 0 };
}
function commissionFor(line, rule, commissionTaxRate) {
  const base = line.lineSubtotal - line.sellerFundedDiscount;
  const commission = Math.min(base, pct(base, rule.percentage) + rule.fixedPerUnit * line.quantity);
  const commissionTax = pct(commission, commissionTaxRate);
  return { base, commission, commissionTax, sellerNet: base - commission - commissionTax };
}
function prorate(amount, part, whole) {
  if (whole <= 0) return 0;
  return Math.round(amount * part / whole);
}

// src/modules/cart/cart.service.ts
var GUEST_CART_COOKIE = "vy_cart";
var MAX_QTY_PER_LINE = 10;
var cartItemInclude = {
  listing: {
    include: {
      inventory: { select: { quantity: true, reserved: true } },
      seller: { select: { id: true, displayName: true, slug: true, status: true, deletedAt: true, fulfillmentMode: true } },
      variant: { select: { id: true, name: true, options: true, deletedAt: true } },
      product: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          deletedAt: true,
          categoryId: true,
          codAvailable: true,
          isReturnable: true,
          returnWindowDays: true,
          hsnCode: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, storageKey: true } }
        }
      }
    }
  }
};
function lineIssue(item) {
  const l = item.listing;
  const available = Math.max(0, (l.inventory?.quantity ?? 0) - (l.inventory?.reserved ?? 0));
  const live = l.status === "APPROVED" && l.isActive && !l.deletedAt && l.product.status === "APPROVED" && !l.product.deletedAt && l.seller.status === "APPROVED" && !l.seller.deletedAt && !l.variant.deletedAt;
  if (!live) return { purchasable: false, available, issue: "This item is no longer available" };
  if (available <= 0) return { purchasable: false, available, issue: "Out of stock" };
  if (item.quantity > available) return { purchasable: false, available, issue: `Only ${available} left in stock` };
  return { purchasable: true, available, issue: null };
}
var CartService = class {
  constructor(db, coupons, shipping, tax, settings) {
    this.db = db;
    this.coupons = coupons;
    this.shipping = shipping;
    this.tax = tax;
    this.settings = settings;
  }
  db;
  coupons;
  shipping;
  tax;
  settings;
  newGuestToken() {
    return randomToken(48).slice(0, 64);
  }
  whereOwner(owner) {
    return "userId" in owner ? { userId: owner.userId } : { guestToken: owner.guestToken };
  }
  async findCart(owner) {
    return this.db.cart.findFirst({ where: this.whereOwner(owner) });
  }
  async ensureCart(owner) {
    const existing = await this.findCart(owner);
    if (existing) return existing;
    return this.db.cart.create({ data: this.whereOwner(owner) });
  }
  async items(cartId, db = this.db) {
    return db.cartItem.findMany({ where: { cartId }, include: cartItemInclude, orderBy: { createdAt: "asc" } });
  }
  /** Build pricing lines (with tax rates and category lineage) for purchasable items. */
  async pricingLines(items) {
    const { rates, inclusive } = await this.tax.resolve(items.map((i) => i.listing.product.categoryId));
    return {
      taxInclusive: inclusive,
      lines: items.map((i) => {
        const t = rates.get(i.listing.product.categoryId);
        return {
          key: i.listingId,
          sellerId: i.listing.sellerId,
          productId: i.listing.productId,
          categoryIds: t.lineage,
          unitPrice: toPaise(i.listing.price),
          unitMrp: toPaise(i.listing.mrp),
          quantity: i.quantity,
          taxRate: t.rate
        };
      })
    };
  }
  /**
   * Price the purchasable part of the cart. Coupon problems are reported, not thrown, so the
   * cart always renders.
   */
  async quote(items, opts) {
    const evaluated = items.map((item) => {
      const r = lineIssue(item);
      return { item, ...r, priceChanged: toPaise(item.priceAtAdd) !== toPaise(item.listing.price) };
    });
    const buyable = evaluated.filter((e) => e.purchasable).map((e) => e.item);
    const [{ lines, taxInclusive }, shippingRule, cod] = await Promise.all([
      this.pricingLines(buyable),
      this.shipping.rule(opts.shippingMethod ?? "STANDARD"),
      this.settings.get("cod")
    ]);
    let coupon = null;
    let couponError = null;
    if (opts.couponCode) {
      try {
        coupon = this.coupons.toPricing(await this.coupons.validate(opts.couponCode, opts.userId));
      } catch (err) {
        couponError = err instanceof AppError ? err.message : "Coupon could not be applied";
      }
    }
    const pricing = price({ lines, coupon, shipping: shippingRule, taxInclusive, codFee: toPaise(cod.fee) });
    if (pricing.coupon && !pricing.coupon.applied) couponError = pricing.coupon.message;
    return { pricing, couponError, evaluated };
  }
  /** Cart view model for the storefront. */
  async view(owner) {
    const cart = owner ? await this.findCart(owner) : null;
    const items = cart ? await this.items(cart.id) : [];
    const userId = owner && "userId" in owner ? owner.userId : null;
    const { pricing, couponError, evaluated } = await this.quote(items, { userId, couponCode: cart?.couponCode });
    return {
      id: cart?.id ?? null,
      couponCode: cart?.couponCode ?? null,
      couponError,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
      items: evaluated.map((e) => this.itemView(e)),
      summary: summaryView(pricing),
      hasIssues: evaluated.some((e) => !e.purchasable)
    };
  }
  itemView(e) {
    const l = e.item.listing;
    return {
      id: e.item.id,
      listingId: l.id,
      quantity: e.item.quantity,
      maxQuantity: Math.min(MAX_QTY_PER_LINE, e.available),
      product: {
        id: l.product.id,
        slug: l.product.slug,
        title: l.product.title,
        imageUrl: thumbOf(l.product.images[0]),
        codAvailable: l.product.codAvailable,
        isReturnable: l.product.isReturnable,
        returnWindowDays: l.product.returnWindowDays
      },
      variant: { id: l.variant.id, name: l.variant.name, options: l.variant.options },
      seller: { id: l.seller.id, name: l.seller.displayName, slug: l.seller.slug },
      price: fromPaise(toPaise(l.price)),
      mrp: fromPaise(toPaise(l.mrp)),
      priceAtAdd: fromPaise(toPaise(e.item.priceAtAdd)),
      priceChanged: e.priceChanged,
      available: e.available,
      purchasable: e.purchasable,
      issue: e.issue,
      lineTotal: fromPaise(toPaise(l.price) * e.item.quantity)
    };
  }
  async add(owner, listingId, quantity) {
    const listing = await this.db.sellerProductListing.findFirst({
      where: { id: listingId, ...purchasableListingWhere },
      include: { inventory: true }
    });
    if (!listing) throw notFound("Product");
    const available = (listing.inventory?.quantity ?? 0) - (listing.inventory?.reserved ?? 0);
    if (available <= 0) throw new AppError(409, "OUT_OF_STOCK", "This item is out of stock");
    const cart = await this.ensureCart(owner);
    const existing = await this.db.cartItem.findUnique({ where: { cartId_listingId: { cartId: cart.id, listingId } } });
    const next = (existing?.quantity ?? 0) + quantity;
    if (next > MAX_QTY_PER_LINE) throw businessRule(`You can buy at most ${MAX_QTY_PER_LINE} units of an item`);
    if (next > available) throw new AppError(409, "OUT_OF_STOCK", `Only ${available} unit(s) available`);
    await this.db.cartItem.upsert({
      where: { cartId_listingId: { cartId: cart.id, listingId } },
      create: { cartId: cart.id, listingId, quantity: next, priceAtAdd: listing.price },
      update: { quantity: next }
    });
    await this.db.cart.update({ where: { id: cart.id }, data: { updatedAt: /* @__PURE__ */ new Date() } });
  }
  /** Items are always looked up through the owner's own cart — never by bare ID (anti-IDOR). */
  async ownItem(owner, itemId) {
    const cart = await this.findCart(owner);
    if (!cart) throw notFound("Cart item");
    const item = await this.db.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: cartItemInclude });
    if (!item) throw notFound("Cart item");
    return item;
  }
  async update(owner, itemId, quantity) {
    const item = await this.ownItem(owner, itemId);
    const { available } = lineIssue(item);
    if (quantity > MAX_QTY_PER_LINE) throw businessRule(`You can buy at most ${MAX_QTY_PER_LINE} units of an item`);
    if (quantity > available) throw new AppError(409, "OUT_OF_STOCK", `Only ${available} unit(s) available`);
    await this.db.cartItem.update({ where: { id: item.id }, data: { quantity, priceAtAdd: item.listing.price } });
  }
  async remove(owner, itemId) {
    const item = await this.ownItem(owner, itemId);
    await this.db.cartItem.delete({ where: { id: item.id } });
  }
  async acknowledgePrices(owner) {
    const cart = await this.findCart(owner);
    if (!cart) return;
    const items = await this.items(cart.id);
    for (const i of items) {
      if (toPaise(i.priceAtAdd) !== toPaise(i.listing.price)) {
        await this.db.cartItem.update({ where: { id: i.id }, data: { priceAtAdd: i.listing.price } });
      }
    }
  }
  async clear(owner) {
    const cart = await this.findCart(owner);
    if (cart) await this.db.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
  async applyCoupon(owner, code) {
    const userId = "userId" in owner ? owner.userId : null;
    await this.coupons.validate(code, userId);
    const cart = await this.ensureCart(owner);
    await this.db.cart.update({ where: { id: cart.id }, data: { couponCode: code.toUpperCase() } });
    const view = await this.view(owner);
    if (view.couponError) {
      await this.db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
      throw businessRule(view.couponError);
    }
    return view;
  }
  async removeCoupon(owner) {
    const cart = await this.findCart(owner);
    if (cart) await this.db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  }
  /** Merge a guest cart into the user's cart on sign-in (quantities add up, capped). */
  async mergeGuestCart(guestToken, userId) {
    const guest = await this.db.cart.findUnique({ where: { guestToken }, include: { items: true } });
    if (!guest) return;
    const userCart = await this.ensureCart({ userId });
    for (const gi of guest.items) {
      const existing = await this.db.cartItem.findUnique({ where: { cartId_listingId: { cartId: userCart.id, listingId: gi.listingId } } });
      const quantity = Math.min(MAX_QTY_PER_LINE, (existing?.quantity ?? 0) + gi.quantity);
      await this.db.cartItem.upsert({
        where: { cartId_listingId: { cartId: userCart.id, listingId: gi.listingId } },
        create: { cartId: userCart.id, listingId: gi.listingId, quantity, priceAtAdd: gi.priceAtAdd },
        update: { quantity }
      });
    }
    if (guest.couponCode && !userCart.couponCode) {
      await this.db.cart.update({ where: { id: userCart.id }, data: { couponCode: guest.couponCode } });
    }
    await this.db.cart.delete({ where: { id: guest.id } });
  }
};
function summaryView(p) {
  return {
    mrpTotal: fromPaise(p.mrpTotal),
    itemsSubtotal: fromPaise(p.itemsSubtotal),
    savingsOnMrp: fromPaise(p.savingsOnMrp),
    couponDiscount: fromPaise(p.discountTotal),
    shippingTotal: fromPaise(p.shippingTotal),
    codFee: fromPaise(p.codFee),
    taxTotal: fromPaise(p.taxTotal),
    grandTotal: fromPaise(p.grandTotal),
    totalSavings: fromPaise(p.savingsOnMrp + p.discountTotal + (p.coupon?.shippingWaived ?? 0)),
    coupon: p.coupon ? { ...p.coupon, discount: fromPaise(p.coupon.discount), shippingWaived: fromPaise(p.coupon.shippingWaived) } : null,
    groups: p.groups.map((g) => ({
      sellerId: g.sellerId,
      itemsSubtotal: fromPaise(g.itemsSubtotal),
      discount: fromPaise(g.discount),
      shipping: fromPaise(g.shipping),
      shippingWaived: g.shippingWaived,
      tax: fromPaise(g.tax),
      total: fromPaise(g.total)
    }))
  };
}

// src/modules/catalog/category.service.ts
var CatalogService = class {
  constructor(db, cache, audit) {
    this.db = db;
    this.cache = cache;
    this.audit = audit;
  }
  db;
  cache;
  audit;
  async uniqueSlug(model, base, excludeId) {
    const root = slugify(base) || "item";
    for (let i = 0; i < 50; i++) {
      const slug = i === 0 ? root : `${root}-${i + 1}`;
      const existing = model === "category" ? await this.db.category.findUnique({ where: { slug }, select: { id: true } }) : await this.db.brand.findUnique({ where: { slug }, select: { id: true } });
      if (!existing || existing.id === excludeId) return slug;
    }
    return `${root}-${Date.now().toString(36)}`;
  }
  // ── Categories ─────────────────────────────────────────────
  async tree(opts = {}) {
    const key = `categories:tree:${opts.includeInactive ? "all" : "active"}`;
    const cached = await this.cache.get(key);
    if (cached) return cached;
    const rows = await this.db.category.findMany({
      where: { deletedAt: null, ...opts.includeInactive ? {} : { isActive: true } },
      orderBy: [{ depth: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
    });
    const counts = await this.db.product.groupBy({
      by: ["categoryId"],
      where: { status: "APPROVED", deletedAt: null, minPrice: { not: null } },
      _count: { _all: true }
    });
    const countMap = new Map(counts.map((c) => [c.categoryId, c._count._all]));
    const nodes = /* @__PURE__ */ new Map();
    const roots = [];
    for (const r of rows) {
      nodes.set(r.id, {
        id: r.id,
        name: r.name,
        slug: r.slug,
        icon: r.icon,
        imageUrl: r.imageUrl,
        description: r.description,
        sortOrder: r.sortOrder,
        isActive: r.isActive,
        depth: r.depth,
        parentId: r.parentId,
        productCount: countMap.get(r.id) ?? 0,
        children: []
      });
    }
    for (const n2 of nodes.values()) {
      if (n2.parentId && nodes.has(n2.parentId)) nodes.get(n2.parentId).children.push(n2);
      else if (!n2.parentId) roots.push(n2);
    }
    const roll = (n2) => {
      n2.productCount = (n2.productCount ?? 0) + n2.children.reduce((s, c) => s + roll(c), 0);
      return n2.productCount;
    };
    roots.forEach(roll);
    await this.cache.set(key, roots, 300);
    return roots;
  }
  async bySlug(slug) {
    const cat = await this.db.category.findFirst({ where: { slug, deletedAt: null, isActive: true } });
    if (!cat) throw notFound("Category");
    const ancestorIds = cat.path.split("/").filter((id) => id && id !== cat.id);
    const [ancestors, children, attributes] = await Promise.all([
      this.db.category.findMany({ where: { id: { in: ancestorIds } }, select: { id: true, name: true, slug: true, depth: true } }),
      this.db.category.findMany({
        where: { parentId: cat.id, deletedAt: null, isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true, icon: true, imageUrl: true }
      }),
      this.filterableAttributes(cat.id)
    ]);
    return {
      ...cat,
      breadcrumbs: [...ancestors.sort((a, b) => a.depth - b.depth), { id: cat.id, name: cat.name, slug: cat.slug, depth: cat.depth }],
      children,
      attributes
    };
  }
  /** Category IDs of the category and all its descendants. */
  async subtreeIds(categoryId) {
    const cat = await this.db.category.findUnique({ where: { id: categoryId }, select: { path: true } });
    if (!cat) return [];
    const rows = await this.db.category.findMany({
      where: { path: { startsWith: cat.path }, deletedAt: null },
      select: { id: true }
    });
    return rows.map((r) => r.id);
  }
  /** Attributes applicable to a category: global ones plus those defined on the category or its ancestors. */
  async filterableAttributes(categoryId) {
    const cat = await this.db.category.findUnique({ where: { id: categoryId }, select: { path: true } });
    const lineage = cat ? cat.path.split("/").filter(Boolean) : [];
    return this.db.productAttribute.findMany({
      where: { OR: [{ categoryId: null }, { categoryId: { in: lineage } }] },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
  }
  async createCategory(input, actor) {
    const parent = input.parentId ? await this.db.category.findFirst({ where: { id: input.parentId, deletedAt: null } }) : null;
    if (input.parentId && !parent) throw notFound("Parent category");
    const slug = input.slug ?? await this.uniqueSlug("category", input.name);
    if (input.slug && await this.db.category.findUnique({ where: { slug } })) throw conflict("Slug is already in use");
    const created = await this.db.$transaction(async (tx) => {
      const c = await tx.category.create({
        data: {
          name: input.name,
          slug,
          parentId: parent?.id ?? null,
          depth: parent ? parent.depth + 1 : 0,
          path: "/",
          description: input.description ?? null,
          imageUrl: input.imageUrl ?? null,
          icon: input.icon ?? null,
          sortOrder: input.sortOrder,
          isActive: input.isActive
        }
      });
      const updated = await tx.category.update({ where: { id: c.id }, data: { path: `${parent?.path ?? "/"}${c.id}/` } });
      await this.applyCategoryConfig(tx, c.id, input);
      await this.audit.record(actor, { action: "category.create", entityType: "Category", entityId: c.id, after: updated }, tx);
      return updated;
    });
    await this.cache.delPrefix("categories:");
    await this.cache.delPrefix("home:");
    return created;
  }
  /** Category-level commission and tax overrides are stored in their own tables. */
  async applyCategoryConfig(tx, categoryId, input) {
    if (input.commissionPercent !== void 0) {
      await tx.commissionRule.deleteMany({ where: { scope: "CATEGORY", categoryId } });
      if (input.commissionPercent !== null) {
        await tx.commissionRule.create({ data: { scope: "CATEGORY", categoryId, percentage: input.commissionPercent } });
      }
    }
    if (input.taxRate !== void 0) {
      await tx.taxConfiguration.deleteMany({ where: { categoryId } });
      if (input.taxRate !== null) {
        await tx.taxConfiguration.create({ data: { name: `GST ${input.taxRate}%`, categoryId, rate: input.taxRate } });
      }
    }
  }
  async updateCategory(id, input, actor) {
    const before = await this.db.category.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw notFound("Category");
    if (input.slug && input.slug !== before.slug && await this.db.category.findUnique({ where: { slug: input.slug } })) {
      throw conflict("Slug is already in use");
    }
    let parentChange = null;
    if (input.parentId !== void 0 && input.parentId !== before.parentId) {
      const parent = input.parentId ? await this.db.category.findFirst({ where: { id: input.parentId, deletedAt: null } }) : null;
      if (input.parentId && !parent) throw notFound("Parent category");
      if (parent && parent.path.startsWith(before.path)) throw businessRule("A category cannot be moved under its own subtree");
      parentChange = {
        parentId: parent?.id ?? null,
        path: `${parent?.path ?? "/"}${before.id}/`,
        depth: parent ? parent.depth + 1 : 0
      };
    }
    const updated = await this.db.$transaction(async (tx) => {
      const u = await tx.category.update({
        where: { id },
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          imageUrl: input.imageUrl,
          icon: input.icon,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
          ...parentChange ?? {}
        }
      });
      if (parentChange) {
        const descendants = await tx.category.findMany({ where: { path: { startsWith: before.path }, NOT: { id } } });
        const depthDelta = parentChange.depth - before.depth;
        for (const d of descendants) {
          await tx.category.update({
            where: { id: d.id },
            data: { path: parentChange.path + d.path.slice(before.path.length), depth: d.depth + depthDelta }
          });
        }
      }
      await this.applyCategoryConfig(tx, id, input);
      await this.audit.record(actor, { action: "category.update", entityType: "Category", entityId: id, before, after: u }, tx);
      return u;
    });
    await this.cache.delPrefix("categories:");
    await this.cache.delPrefix("home:");
    return updated;
  }
  async deleteCategory(id, actor) {
    const cat = await this.db.category.findFirst({ where: { id, deletedAt: null } });
    if (!cat) throw notFound("Category");
    const [children, products] = await Promise.all([
      this.db.category.count({ where: { parentId: id, deletedAt: null } }),
      this.db.product.count({ where: { categoryId: id, deletedAt: null } })
    ]);
    if (children > 0) throw businessRule("Move or delete the sub-categories first");
    if (products > 0) throw businessRule(`This category still has ${products} product(s). Move them before deleting.`);
    await this.db.category.update({
      where: { id },
      data: { deletedAt: /* @__PURE__ */ new Date(), isActive: false, slug: `${cat.slug}-deleted-${Date.now().toString(36)}` }
    });
    await this.audit.record(actor, { action: "category.delete", entityType: "Category", entityId: id, before: cat });
    await this.cache.delPrefix("categories:");
  }
  async reorderCategories(items, actor) {
    await this.db.$transaction(items.map((i) => this.db.category.update({ where: { id: i.id }, data: { sortOrder: i.sortOrder } })));
    await this.audit.record(actor, { action: "category.reorder", entityType: "Category", metadata: items });
    await this.cache.delPrefix("categories:");
  }
  async categoryAdminDetail(id) {
    const cat = await this.db.category.findFirst({ where: { id, deletedAt: null } });
    if (!cat) throw notFound("Category");
    const [commission, tax] = await Promise.all([
      this.db.commissionRule.findFirst({ where: { scope: "CATEGORY", categoryId: id, isActive: true } }),
      this.db.taxConfiguration.findFirst({ where: { categoryId: id, isActive: true } })
    ]);
    return { ...cat, commissionPercent: commission ? Number(commission.percentage) : null, taxRate: tax ? Number(tax.rate) : null };
  }
  // ── Brands ─────────────────────────────────────────────────
  async listBrands(opts = {}) {
    return this.db.brand.findMany({
      where: {
        deletedAt: null,
        ...opts.includeInactive ? {} : { isActive: true },
        ...opts.q ? { name: { contains: opts.q } } : {},
        ...opts.categoryId ? { products: { some: { categoryId: { in: await this.subtreeIds(opts.categoryId) }, status: "APPROVED", deletedAt: null } } } : {}
      },
      orderBy: { name: "asc" },
      take: 500
    });
  }
  async createBrand(input, actor) {
    const slug = input.slug ?? await this.uniqueSlug("brand", input.name);
    const brand = await this.db.brand.create({
      data: { name: input.name, slug, logoUrl: input.logoUrl ?? null, description: input.description ?? null, isActive: input.isActive }
    });
    await this.audit.record(actor, { action: "brand.create", entityType: "Brand", entityId: brand.id, after: brand });
    return brand;
  }
  async updateBrand(id, input, actor) {
    const before = await this.db.brand.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw notFound("Brand");
    const brand = await this.db.brand.update({ where: { id }, data: input });
    await this.audit.record(actor, { action: "brand.update", entityType: "Brand", entityId: id, before, after: brand });
    return brand;
  }
  async deleteBrand(id, actor) {
    const brand = await this.db.brand.findFirst({ where: { id, deletedAt: null } });
    if (!brand) throw notFound("Brand");
    const inUse = await this.db.product.count({ where: { brandId: id, deletedAt: null } });
    if (inUse) throw businessRule(`This brand is used by ${inUse} product(s)`);
    await this.db.brand.update({ where: { id }, data: { deletedAt: /* @__PURE__ */ new Date(), isActive: false, slug: `${brand.slug}-deleted-${Date.now().toString(36)}` } });
    await this.audit.record(actor, { action: "brand.delete", entityType: "Brand", entityId: id, before: brand });
  }
  // ── Attributes ─────────────────────────────────────────────
  listAttributes(categoryId) {
    return this.db.productAttribute.findMany({
      where: categoryId ? { OR: [{ categoryId }, { categoryId: null }] } : {},
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
  }
  async createAttribute(input, actor) {
    const attr = await this.db.productAttribute.create({
      data: {
        name: input.name,
        code: input.code,
        type: input.type,
        categoryId: input.categoryId ?? null,
        options: input.options,
        isFilterable: input.isFilterable,
        isVariantAxis: input.isVariantAxis,
        isRequired: input.isRequired
      }
    });
    await this.audit.record(actor, { action: "attribute.create", entityType: "ProductAttribute", entityId: attr.id, after: attr });
    return attr;
  }
  async updateAttribute(id, input, actor) {
    const before = await this.db.productAttribute.findUnique({ where: { id } });
    if (!before) throw notFound("Attribute");
    const attr = await this.db.productAttribute.update({
      where: { id },
      data: { ...input, options: input.options ?? void 0 }
    });
    await this.audit.record(actor, { action: "attribute.update", entityType: "ProductAttribute", entityId: id, before, after: attr });
    return attr;
  }
  async deleteAttribute(id, actor) {
    const before = await this.db.productAttribute.findUnique({ where: { id } });
    if (!before) throw notFound("Attribute");
    await this.db.productAttribute.delete({ where: { id } });
    await this.audit.record(actor, { action: "attribute.delete", entityType: "ProductAttribute", entityId: id, before });
  }
};

// src/modules/catalog/product-io.service.ts
import ExcelJS2 from "exceljs";
import { parse } from "csv-parse/sync";
import { stringify as stringify2 } from "csv-stringify/sync";

// ../shared/src/enums.ts
var values = (o) => Object.values(o);
var RoleCode = { ADMIN: "ADMIN", SELLER: "SELLER", CUSTOMER: "CUSTOMER" };
var ROLE_CODES = values(RoleCode);
var SellerStatus = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
  INACTIVE: "INACTIVE"
};
var SELLER_STATUSES = values(SellerStatus);
var BusinessType = {
  INDIVIDUAL: "INDIVIDUAL",
  PROPRIETORSHIP: "PROPRIETORSHIP",
  PARTNERSHIP: "PARTNERSHIP",
  LLP: "LLP",
  PRIVATE_LIMITED: "PRIVATE_LIMITED",
  PUBLIC_LIMITED: "PUBLIC_LIMITED",
  OTHER: "OTHER"
};
var BUSINESS_TYPES = values(BusinessType);
var ProductStatus = {
  DRAFT: "DRAFT",
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
  ARCHIVED: "ARCHIVED"
};
var PRODUCT_STATUSES = values(ProductStatus);
var OrderStatus = {
  PENDING_CONFIRMATION: "PENDING_CONFIRMATION",
  CONFIRMED: "CONFIRMED",
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  RETURN_REQUESTED: "RETURN_REQUESTED",
  RETURN_APPROVED: "RETURN_APPROVED",
  RETURN_REJECTED: "RETURN_REJECTED",
  RETURNED: "RETURNED",
  REFUND_PENDING: "REFUND_PENDING",
  REFUNDED: "REFUNDED"
};
var ORDER_STATUSES = values(OrderStatus);
var ShippingMethod = { STANDARD: "STANDARD", EXPRESS: "EXPRESS" };
var SHIPPING_METHODS = values(ShippingMethod);
var SettlementStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  PROCESSING: "PROCESSING",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED"
};
var SETTLEMENT_STATUSES = values(SettlementStatus);
var CommissionScope = {
  GLOBAL: "GLOBAL",
  CATEGORY: "CATEGORY",
  SELLER: "SELLER",
  SELLER_CATEGORY: "SELLER_CATEGORY",
  PRODUCT: "PRODUCT"
};
var COMMISSION_SCOPES = values(CommissionScope);
var CouponType = { PERCENTAGE: "PERCENTAGE", FIXED: "FIXED", FREE_SHIPPING: "FREE_SHIPPING" };
var COUPON_TYPES = values(CouponType);
var CouponScope = { ALL: "ALL", CATEGORY: "CATEGORY", PRODUCT: "PRODUCT", SELLER: "SELLER" };
var COUPON_SCOPES = values(CouponScope);
var BannerPlacement = { HERO: "HERO", STRIP: "STRIP", CATEGORY: "CATEGORY" };
var BANNER_PLACEMENTS = values(BannerPlacement);
var HomeSectionType = {
  CATEGORY_GRID: "CATEGORY_GRID",
  TRENDING: "TRENDING",
  BEST_SELLERS: "BEST_SELLERS",
  NEW_ARRIVALS: "NEW_ARRIVALS",
  ON_SALE: "ON_SALE",
  FEATURED_PRODUCTS: "FEATURED_PRODUCTS",
  CATEGORY_PRODUCTS: "CATEGORY_PRODUCTS",
  FEATURED_SELLERS: "FEATURED_SELLERS",
  RECOMMENDED: "RECOMMENDED",
  RECENTLY_VIEWED: "RECENTLY_VIEWED"
};
var HOME_SECTION_TYPES = values(HomeSectionType);
var AttributeType = { TEXT: "TEXT", NUMBER: "NUMBER", SELECT: "SELECT", BOOLEAN: "BOOLEAN" };
var ATTRIBUTE_TYPES = values(AttributeType);
var SellerDocumentType = {
  GST_CERTIFICATE: "GST_CERTIFICATE",
  PAN_CARD: "PAN_CARD",
  ADDRESS_PROOF: "ADDRESS_PROOF",
  CANCELLED_CHEQUE: "CANCELLED_CHEQUE",
  OTHER: "OTHER"
};
var SELLER_DOCUMENT_TYPES = values(SellerDocumentType);
var AddressType = { HOME: "HOME", WORK: "WORK", OTHER: "OTHER" };
var ADDRESS_TYPES = values(AddressType);

// ../shared/src/permissions.ts
var Permissions = {
  // Admin — users & access
  USERS_READ: "users:read",
  USERS_MANAGE: "users:manage",
  ROLES_MANAGE: "roles:manage",
  // Admin — sellers
  SELLERS_READ: "sellers:read",
  SELLERS_MANAGE: "sellers:manage",
  SELLERS_APPROVE: "sellers:approve",
  // Admin — catalog
  CATALOG_MANAGE: "catalog:manage",
  PRODUCTS_READ_ALL: "products:read_all",
  PRODUCTS_MANAGE_ALL: "products:manage_all",
  PRODUCTS_APPROVE: "products:approve",
  INVENTORY_MANAGE_ALL: "inventory:manage_all",
  // Admin — orders & finance
  ORDERS_READ_ALL: "orders:read_all",
  ORDERS_MANAGE_ALL: "orders:manage_all",
  COMMISSIONS_MANAGE: "commissions:manage",
  SETTLEMENTS_MANAGE: "settlements:manage",
  // Admin — marketing & config
  COUPONS_MANAGE: "coupons:manage",
  CONTENT_MANAGE: "content:manage",
  REVIEWS_MODERATE: "reviews:moderate",
  SETTINGS_MANAGE: "settings:manage",
  REPORTS_READ: "reports:read",
  AUDIT_READ: "audit:read",
  NOTIFICATIONS_MANAGE: "notifications:manage",
  // Seller (always scoped to the authenticated seller)
  SELLER_DASHBOARD: "seller:dashboard",
  SELLER_PRODUCTS: "seller:products",
  SELLER_INVENTORY: "seller:inventory",
  SELLER_ORDERS: "seller:orders",
  SELLER_SETTLEMENTS: "seller:settlements",
  SELLER_PROFILE: "seller:profile",
  // Customer
  CUSTOMER_ORDERS: "customer:orders",
  CUSTOMER_PROFILE: "customer:profile",
  CUSTOMER_REVIEWS: "customer:reviews"
};
var ALL_PERMISSIONS = Object.values(Permissions);
var ADMIN_PERMISSIONS = ALL_PERMISSIONS.filter((p) => !p.startsWith("seller:"));
var SELLER_PERMISSIONS = [
  Permissions.SELLER_DASHBOARD,
  Permissions.SELLER_PRODUCTS,
  Permissions.SELLER_INVENTORY,
  Permissions.SELLER_ORDERS,
  Permissions.SELLER_SETTLEMENTS,
  Permissions.SELLER_PROFILE
];
var CUSTOMER_PERMISSIONS = [
  Permissions.CUSTOMER_ORDERS,
  Permissions.CUSTOMER_PROFILE,
  Permissions.CUSTOMER_REVIEWS
];
var DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: ADMIN_PERMISSIONS,
  SELLER: [...SELLER_PERMISSIONS, ...CUSTOMER_PERMISSIONS],
  CUSTOMER: CUSTOMER_PERMISSIONS
};

// ../shared/src/order-flow.ts
var SELLER_ORDER_TRANSITIONS = {
  PENDING_CONFIRMATION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  RETURN_REQUESTED: [],
  RETURN_APPROVED: [],
  RETURN_REJECTED: [],
  RETURNED: [],
  REFUND_PENDING: [],
  REFUNDED: []
};
function canTransition(from, to) {
  return SELLER_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}
var CUSTOMER_CANCELLABLE = ["PENDING_CONFIRMATION", "CONFIRMED", "PROCESSING"];
var PROGRESS_RANK = {
  PENDING_CONFIRMATION: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5
};
function deriveParentStatus(subStatuses) {
  const active = subStatuses.filter((s) => s !== "CANCELLED");
  if (active.length === 0) return OrderStatus.CANCELLED;
  let best = active[0];
  for (const s of active) {
    const r = PROGRESS_RANK[s] ?? 5;
    if (r < (PROGRESS_RANK[best] ?? 5)) best = s;
  }
  return best;
}
var ORDER_STATUS_LABELS = {
  PENDING_CONFIRMATION: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "Return requested",
  RETURN_APPROVED: "Return approved",
  RETURN_REJECTED: "Return rejected",
  RETURNED: "Returned",
  REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded"
};

// ../shared/src/validation.ts
import { z as z2 } from "zod";
var idSchema = z2.string().min(1).max(64);
var phoneSchema = z2.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");
var pincodeSchema = z2.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit PIN code");
var gstinSchema = z2.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN");
var panSchema = z2.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid 10-character PAN");
var passwordSchema = z2.string().min(8, "Use at least 8 characters").max(128).regex(/[a-z]/, "Include a lowercase letter").regex(/[A-Z]/, "Include an uppercase letter").regex(/[0-9]/, "Include a number");
var emailSchema = z2.email("Enter a valid email address").trim().toLowerCase().max(191);
var moneySchema = z2.coerce.number().min(0).max(1e7).multipleOf(0.01);
var slugSchema = z2.string().trim().min(2).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");
var optionalText = (max) => z2.string().trim().max(max).optional().or(z2.literal("").transform(() => void 0));
var queryBoolean = z2.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1");
var paginationQuerySchema = z2.object({
  page: z2.coerce.number().int().min(1).default(1),
  pageSize: z2.coerce.number().int().min(1).max(100).default(20),
  q: z2.string().trim().max(120).optional(),
  sort: z2.string().trim().max(40).optional()
});
var registerSchema = z2.object({
  name: z2.string().trim().min(2, "Enter your name").max(120),
  email: emailSchema,
  phone: phoneSchema.optional().or(z2.literal("").transform(() => void 0)),
  password: passwordSchema
});
var loginSchema = z2.object({
  email: emailSchema,
  password: z2.string().min(1, "Enter your password").max(128)
});
var forgotPasswordSchema = z2.object({ email: emailSchema });
var resetPasswordSchema = z2.object({
  token: z2.string().min(20).max(200),
  password: passwordSchema
});
var changePasswordSchema = z2.object({
  currentPassword: z2.string().min(1).max(128),
  newPassword: passwordSchema
});
var verifyEmailSchema = z2.object({ token: z2.string().min(20).max(200) });
var sellerPersonalSchema = z2.object({
  name: z2.string().trim().min(2).max(120),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema
});
var sellerBusinessSchema = z2.object({
  businessName: z2.string().trim().min(2).max(160),
  businessType: z2.enum(BUSINESS_TYPES),
  addressLine1: z2.string().trim().min(3).max(200),
  addressLine2: optionalText(200),
  city: z2.string().trim().min(2).max(80),
  state: z2.string().trim().min(2).max(80),
  pincode: pincodeSchema,
  gstin: gstinSchema.optional().or(z2.literal("").transform(() => void 0)),
  pan: panSchema
});
var sellerAgreementSchema = z2.object({
  acceptTerms: z2.literal(true, { error: "You must accept the marketplace terms" }),
  acceptCommissionPolicy: z2.literal(true, { error: "You must accept the commission policy" })
});
var sellerRegistrationSchema = sellerPersonalSchema.extend(sellerBusinessSchema.shape).extend(sellerAgreementSchema.shape);
var adminCreateSellerSchema = sellerBusinessSchema.extend({
  name: z2.string().trim().min(2).max(120),
  email: emailSchema,
  phone: phoneSchema,
  autoApprove: z2.boolean().default(true)
});
var sellerProfileUpdateSchema = z2.object({
  displayName: z2.string().trim().min(2).max(160).optional(),
  description: optionalText(2e3),
  supportEmail: emailSchema.optional().or(z2.literal("").transform(() => void 0)),
  supportPhone: phoneSchema.optional().or(z2.literal("").transform(() => void 0)),
  fulfillmentMode: z2.enum(["SELLER", "PLATFORM"]).optional()
});
var sellerDecisionSchema = z2.object({ reason: optionalText(1e3) });
var sellerStatusQuerySchema = paginationQuerySchema.extend({
  status: z2.enum(SELLER_STATUSES).optional()
});
var sellerDocumentTypeSchema = z2.enum(SELLER_DOCUMENT_TYPES);
var addressSchema = z2.object({
  fullName: z2.string().trim().min(2).max(120),
  phone: phoneSchema,
  line1: z2.string().trim().min(3).max(200),
  line2: optionalText(200),
  landmark: optionalText(120),
  city: z2.string().trim().min(2).max(80),
  state: z2.string().trim().min(2).max(80),
  pincode: pincodeSchema,
  type: z2.enum(ADDRESS_TYPES).default("HOME"),
  isDefault: z2.boolean().default(false)
});
var categorySchema = z2.object({
  name: z2.string().trim().min(2).max(120),
  slug: slugSchema.optional(),
  parentId: idSchema.nullable().optional(),
  description: optionalText(1e3),
  imageUrl: optionalText(500),
  icon: optionalText(60),
  sortOrder: z2.coerce.number().int().min(0).max(1e5).default(0),
  isActive: z2.boolean().default(true),
  commissionPercent: z2.coerce.number().min(0).max(100).nullable().optional(),
  taxRate: z2.coerce.number().min(0).max(100).nullable().optional()
});
var brandSchema = z2.object({
  name: z2.string().trim().min(1).max(120),
  slug: slugSchema.optional(),
  logoUrl: optionalText(500),
  description: optionalText(1e3),
  isActive: z2.boolean().default(true)
});
var attributeSchema = z2.object({
  name: z2.string().trim().min(1).max(80),
  code: z2.string().trim().min(1).max(60).regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, digits and underscores"),
  type: z2.enum(ATTRIBUTE_TYPES),
  categoryId: idSchema.nullable().optional(),
  options: z2.array(z2.string().trim().min(1).max(80)).max(200).default([]),
  isFilterable: z2.boolean().default(true),
  isVariantAxis: z2.boolean().default(false),
  isRequired: z2.boolean().default(false)
});
var variantInputSchema = z2.object({
  id: idSchema.optional(),
  options: z2.record(z2.string().max(60), z2.string().trim().min(1).max(80)).default({}),
  sku: z2.string().trim().min(2).max(64).regex(/^[A-Za-z0-9._-]+$/, "SKU may contain letters, digits, dot, dash and underscore"),
  barcode: optionalText(64),
  price: moneySchema.refine((v) => v > 0, "Price must be greater than 0"),
  mrp: moneySchema.refine((v) => v > 0, "MRP must be greater than 0"),
  stock: z2.coerce.number().int().min(0).max(1e6).default(0),
  lowStockThreshold: z2.coerce.number().int().min(0).max(1e5).default(5),
  weightGrams: z2.coerce.number().int().min(0).max(1e6).optional(),
  lengthCm: z2.coerce.number().min(0).max(1e4).optional(),
  widthCm: z2.coerce.number().min(0).max(1e4).optional(),
  heightCm: z2.coerce.number().min(0).max(1e4).optional(),
  isActive: z2.boolean().default(true)
}).refine((v) => v.price <= v.mrp, { message: "Selling price cannot exceed MRP", path: ["price"] });
var productUpsertSchema = z2.object({
  title: z2.string().trim().min(3).max(200),
  description: z2.string().trim().min(10, "Add a description of at least 10 characters").max(2e4),
  highlights: z2.array(z2.string().trim().min(1).max(200)).max(12).default([]),
  categoryId: idSchema,
  brandId: idSchema.nullable().optional(),
  hsnCode: optionalText(16),
  specifications: z2.array(z2.object({ key: z2.string().trim().min(1).max(80), value: z2.string().trim().min(1).max(400) })).max(60).default([]),
  attributes: z2.array(z2.object({ attributeId: idSchema, value: z2.string().trim().min(1).max(200) })).max(60).default([]),
  tags: z2.array(z2.string().trim().min(1).max(40)).max(20).default([]),
  isReturnable: z2.boolean().default(true),
  returnWindowDays: z2.coerce.number().int().min(0).max(90).default(7),
  codAvailable: z2.boolean().default(true),
  videoUrl: optionalText(500),
  variants: z2.array(variantInputSchema).min(1, "Add at least one variant").max(100),
  /** When true the product is submitted for review, otherwise it is saved as a draft. */
  submit: z2.boolean().default(false)
});
var productDecisionSchema = z2.object({ reason: optionalText(1e3) });
var productRejectSchema = z2.object({ reason: z2.string().trim().min(3).max(1e3) });
var productListQuerySchema = paginationQuerySchema.extend({
  category: z2.string().trim().max(160).optional(),
  brand: z2.string().trim().max(400).optional(),
  // comma-separated slugs
  seller: z2.string().trim().max(160).optional(),
  minPrice: z2.coerce.number().min(0).optional(),
  maxPrice: z2.coerce.number().min(0).optional(),
  rating: z2.coerce.number().min(0).max(5).optional(),
  inStock: queryBoolean.optional(),
  onSale: queryBoolean.optional(),
  attrs: z2.string().trim().max(1e3).optional(),
  // code:value|value;code:value
  sort: z2.enum(["relevance", "newest", "price_asc", "price_desc", "rating", "popular", "discount"]).optional()
});
var managedProductQuerySchema = paginationQuerySchema.extend({
  status: z2.enum(PRODUCT_STATUSES).optional(),
  categoryId: idSchema.optional(),
  sellerId: idSchema.optional()
});
var inventoryAdjustSchema = z2.object({
  delta: z2.coerce.number().int().min(-1e6).max(1e6).optional(),
  setTo: z2.coerce.number().int().min(0).max(1e6).optional(),
  reason: z2.string().trim().min(2).max(300),
  lowStockThreshold: z2.coerce.number().int().min(0).max(1e5).optional()
});
var bulkInventorySchema = z2.object({
  items: z2.array(
    z2.object({
      sku: z2.string().trim().min(1).max(64),
      quantity: z2.coerce.number().int().min(0).max(1e6)
    })
  ).min(1).max(1e3),
  reason: z2.string().trim().min(2).max(300).default("Bulk update")
});
var addCartItemSchema = z2.object({
  listingId: idSchema,
  quantity: z2.coerce.number().int().min(1).max(10).default(1)
});
var updateCartItemSchema = z2.object({ quantity: z2.coerce.number().int().min(1).max(10) });
var applyCouponSchema = z2.object({ code: z2.string().trim().toUpperCase().min(3).max(40) });
var checkoutQuoteSchema = z2.object({
  addressId: idSchema.optional(),
  pincode: pincodeSchema.optional(),
  shippingMethod: z2.enum(SHIPPING_METHODS).default("STANDARD"),
  couponCode: z2.string().trim().toUpperCase().max(40).optional().or(z2.literal("").transform(() => void 0))
});
var placeOrderSchema = z2.object({
  addressId: idSchema,
  shippingMethod: z2.enum(SHIPPING_METHODS).default("STANDARD"),
  paymentMethod: z2.literal("COD"),
  couponCode: z2.string().trim().toUpperCase().max(40).optional().or(z2.literal("").transform(() => void 0)),
  /** Client-generated UUID; the same key always returns the same order. */
  idempotencyKey: z2.string().trim().min(8).max(64),
  /** Totals the customer saw — used only to detect price changes, never to charge. */
  expectedGrandTotal: z2.coerce.number().min(0).optional(),
  notes: optionalText(500)
});
var cancelOrderSchema = z2.object({
  reason: z2.string().trim().min(3).max(500),
  orderItemIds: z2.array(idSchema).max(100).optional()
});
var returnRequestSchema = z2.object({
  reason: z2.string().trim().min(3).max(120),
  comments: optionalText(1e3),
  items: z2.array(z2.object({ orderItemId: idSchema, quantity: z2.coerce.number().int().min(1).max(100) })).min(1).max(100)
});
var orderListQuerySchema = paginationQuerySchema.extend({
  status: z2.enum(ORDER_STATUSES).optional(),
  from: z2.coerce.date().optional(),
  to: z2.coerce.date().optional(),
  sellerId: idSchema.optional()
});
var sellerOrderStatusSchema = z2.object({
  status: z2.enum(["CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]),
  note: optionalText(500),
  carrier: optionalText(80),
  trackingNumber: optionalText(80),
  trackingUrl: optionalText(500)
});
var returnDecisionSchema = z2.object({
  decision: z2.enum(["APPROVE", "REJECT", "MARK_RECEIVED"]),
  note: optionalText(500),
  restock: z2.boolean().default(true)
});
var reviewSchema = z2.object({
  productId: idSchema,
  orderItemId: idSchema.optional(),
  rating: z2.coerce.number().int().min(1).max(5),
  title: optionalText(120),
  body: optionalText(4e3)
});
var reviewReportSchema = z2.object({ reason: z2.string().trim().min(3).max(300) });
var couponSchema = z2.object({
  code: z2.string().trim().toUpperCase().min(3).max(40).regex(/^[A-Z0-9_-]+$/),
  description: optionalText(300),
  type: z2.enum(COUPON_TYPES),
  value: z2.coerce.number().min(0).max(1e6).default(0),
  maxDiscount: z2.coerce.number().min(0).nullable().optional(),
  minOrderAmount: z2.coerce.number().min(0).default(0),
  scope: z2.enum(COUPON_SCOPES).default("ALL"),
  scopeIds: z2.array(idSchema).max(200).default([]),
  fundedBy: z2.enum(["PLATFORM", "SELLER"]).default("PLATFORM"),
  startsAt: z2.coerce.date(),
  endsAt: z2.coerce.date(),
  usageLimit: z2.coerce.number().int().min(1).nullable().optional(),
  perCustomerLimit: z2.coerce.number().int().min(1).default(1),
  firstOrderOnly: z2.boolean().default(false),
  isActive: z2.boolean().default(true)
}).refine((c) => c.endsAt > c.startsAt, { message: "End date must be after start date", path: ["endsAt"] }).refine((c) => c.type !== "PERCENTAGE" || c.value <= 100, { message: "Percentage cannot exceed 100", path: ["value"] });
var bannerSchema = z2.object({
  title: z2.string().trim().min(1).max(160),
  subtitle: optionalText(300),
  ctaLabel: optionalText(40),
  linkUrl: optionalText(500),
  imageUrl: optionalText(500),
  theme: optionalText(200),
  placement: z2.enum(BANNER_PLACEMENTS).default("HERO"),
  sortOrder: z2.coerce.number().int().min(0).default(0),
  isActive: z2.boolean().default(true),
  startsAt: z2.coerce.date().nullable().optional(),
  endsAt: z2.coerce.date().nullable().optional()
});
var homeSectionSchema = z2.object({
  type: z2.enum(HOME_SECTION_TYPES),
  title: z2.string().trim().min(1).max(120),
  subtitle: optionalText(200),
  categoryId: idSchema.nullable().optional(),
  limit: z2.coerce.number().int().min(1).max(48).default(12),
  sortOrder: z2.coerce.number().int().min(0).default(0),
  isActive: z2.boolean().default(true)
});
var promotionSchema = z2.object({
  name: z2.string().trim().min(2).max(120),
  description: optionalText(500),
  discountPercent: z2.coerce.number().min(1).max(90),
  categoryId: idSchema.nullable().optional(),
  startsAt: z2.coerce.date(),
  endsAt: z2.coerce.date(),
  isActive: z2.boolean().default(true)
});
var commissionRuleSchema = z2.object({
  scope: z2.enum(COMMISSION_SCOPES),
  categoryId: idSchema.nullable().optional(),
  sellerId: idSchema.nullable().optional(),
  productId: idSchema.nullable().optional(),
  percentage: z2.coerce.number().min(0).max(100),
  fixedAmount: z2.coerce.number().min(0).max(1e5).default(0),
  isActive: z2.boolean().default(true)
}).refine((r) => r.scope !== "CATEGORY" || !!r.categoryId, { message: "Category is required", path: ["categoryId"] }).refine((r) => r.scope !== "SELLER" || !!r.sellerId, { message: "Seller is required", path: ["sellerId"] }).refine((r) => r.scope !== "SELLER_CATEGORY" || !!r.sellerId && !!r.categoryId, {
  message: "Seller and category are required",
  path: ["sellerId"]
}).refine((r) => r.scope !== "PRODUCT" || !!r.productId, { message: "Product is required", path: ["productId"] });
var createSettlementSchema = z2.object({
  sellerId: idSchema,
  amount: z2.coerce.number().positive().max(1e8),
  periodStart: z2.coerce.date().optional(),
  periodEnd: z2.coerce.date().optional(),
  notes: optionalText(1e3)
});
var settlementStatusSchema = z2.object({
  status: z2.enum(SETTLEMENT_STATUSES),
  reference: optionalText(120),
  notes: optionalText(1e3)
});
var ledgerAdjustmentSchema = z2.object({
  sellerId: idSchema,
  amount: z2.coerce.number().refine((v) => v !== 0, "Amount cannot be zero"),
  reason: z2.string().trim().min(3).max(500)
});
var shippingConfigSchema = z2.object({
  method: z2.enum(SHIPPING_METHODS),
  label: z2.string().trim().min(2).max(80),
  baseFee: z2.coerce.number().min(0).max(1e5),
  freeAbove: z2.coerce.number().min(0).nullable().optional(),
  minDays: z2.coerce.number().int().min(0).max(60),
  maxDays: z2.coerce.number().int().min(0).max(90),
  isActive: z2.boolean().default(true)
});
var taxConfigSchema = z2.object({
  name: z2.string().trim().min(2).max(80),
  categoryId: idSchema.nullable().optional(),
  rate: z2.coerce.number().min(0).max(100),
  isInclusive: z2.boolean().default(true),
  isActive: z2.boolean().default(true)
});
var pincodeSchemaInput = z2.object({
  pincode: pincodeSchema,
  city: optionalText(80),
  state: optionalText(80),
  isServiceable: z2.boolean().default(true),
  codAvailable: z2.boolean().default(true),
  extraDays: z2.coerce.number().int().min(0).max(30).default(0)
});
var settingUpdateSchema = z2.object({ value: z2.unknown() });
var notificationTemplateSchema = z2.object({
  subject: z2.string().trim().min(1).max(200),
  body: z2.string().trim().min(1).max(1e4),
  isActive: z2.boolean().default(true)
});
var userAdminUpdateSchema = z2.object({
  status: z2.enum(["ACTIVE", "SUSPENDED"]).optional(),
  roles: z2.array(z2.enum(["ADMIN", "SELLER", "CUSTOMER"])).min(1).optional()
});
var profileUpdateSchema = z2.object({
  name: z2.string().trim().min(2).max(120).optional(),
  phone: phoneSchema.optional().or(z2.literal("").transform(() => void 0)),
  gender: z2.enum(["MALE", "FEMALE", "OTHER", "UNDISCLOSED"]).optional(),
  dateOfBirth: z2.coerce.date().optional().nullable()
});

// src/modules/catalog/product-io.service.ts
var IMPORT_COLUMNS = [
  "handle",
  "title",
  "description",
  "category_slug",
  "brand_slug",
  "sku",
  "option1_name",
  "option1_value",
  "option2_name",
  "option2_value",
  "price",
  "mrp",
  "stock",
  "hsn_code",
  "returnable",
  "return_window_days"
];
var MAX_ROWS = 2e3;
var ProductIoService = class {
  constructor(db, products, inventory, indexer) {
    this.db = db;
    this.products = products;
    this.inventory = inventory;
    this.indexer = indexer;
  }
  db;
  products;
  inventory;
  indexer;
  async readRows(file) {
    if (file.mimeType === "text/csv") {
      const rows2 = parse(file.buffer, { columns: (h) => h.map((c) => c.trim().toLowerCase()), skip_empty_lines: true, trim: true, bom: true });
      return rows2;
    }
    const wb = new ExcelJS2.Workbook();
    await wb.xlsx.load(file.buffer);
    const ws = wb.worksheets[0];
    if (!ws) return [];
    const header = ws.getRow(1).values.slice(1).map((v) => String(v ?? "").trim().toLowerCase());
    const rows = [];
    ws.eachRow((row, idx) => {
      if (idx === 1) return;
      const values2 = row.values.slice(1);
      const obj = {};
      header.forEach((h, i) => {
        const v = values2[i];
        obj[h] = v === null || v === void 0 ? "" : typeof v === "object" && "text" in v ? String(v.text) : String(v);
      });
      rows.push(obj);
    });
    return rows;
  }
  template() {
    const sample = [
      ["cotton-kurta", "Men Cotton Kurta", "Breathable pure cotton kurta for daily wear.", "mens-clothing", "ethnica", "KURTA-BLU-M", "size", "M", "color", "Blue", "799", "1299", "25", "6205", "yes", "7"],
      ["cotton-kurta", "", "", "", "", "KURTA-BLU-L", "size", "L", "color", "Blue", "799", "1299", "18", "", "", ""]
    ];
    return Buffer.from(stringify2([IMPORT_COLUMNS, ...sample]));
  }
  async import(sellerId, file, actor) {
    const rows = await this.readRows(file);
    if (!rows.length) throw badRequest("The file has no data rows");
    if (rows.length > MAX_ROWS) throw badRequest(`At most ${MAX_ROWS} rows can be imported at once`);
    const results = [];
    const existing = await this.db.sellerProductListing.findMany({
      where: { sellerId, sku: { in: rows.map((r) => r.sku ?? "").filter(Boolean) }, deletedAt: null },
      include: { inventory: true }
    });
    const bySku = new Map(existing.map((l) => [l.sku, l]));
    const creations = /* @__PURE__ */ new Map();
    for (const [i, row] of rows.entries()) {
      const rowNo = i + 2;
      const sku = (row.sku ?? "").trim();
      if (!sku) {
        results.push({ row: rowNo, sku: "", action: "error", message: "SKU is required" });
        continue;
      }
      const listing = bySku.get(sku);
      if (listing) {
        try {
          const price2 = row.price ? Number(row.price) : num(listing.price);
          const mrp = row.mrp ? Number(row.mrp) : num(listing.mrp);
          if (!(price2 > 0) || !(mrp > 0) || price2 > mrp) throw new Error("Price must be > 0 and not exceed MRP");
          await this.db.sellerProductListing.update({ where: { id: listing.id }, data: { price: decimal(toPaise(price2)), mrp: decimal(toPaise(mrp)) } });
          if (row.stock !== void 0 && row.stock !== "" && Number(row.stock) !== listing.inventory?.quantity) {
            await this.inventory.adjust(listing.id, { setTo: Number(row.stock), reason: "Bulk import" }, actor, { sellerId }, "IMPORT");
          }
          await this.indexer.refresh([listing.productId]);
          results.push({ row: rowNo, sku, action: "updated" });
        } catch (err) {
          results.push({ row: rowNo, sku, action: "error", message: err.message });
        }
        continue;
      }
      const handle = (row.handle || sku).trim().toLowerCase();
      if (!creations.has(handle)) creations.set(handle, []);
      creations.get(handle).push({ row, index: rowNo });
    }
    const categories = new Map((await this.db.category.findMany({ where: { deletedAt: null }, select: { id: true, slug: true } })).map((c) => [c.slug, c.id]));
    const brands = new Map((await this.db.brand.findMany({ where: { deletedAt: null }, select: { id: true, slug: true } })).map((b) => [b.slug, b.id]));
    for (const [handle, group] of creations) {
      const head = group[0].row;
      const variants = group.map(({ row }) => {
        const options = {};
        if (row.option1_name && row.option1_value) options[row.option1_name.trim().toLowerCase()] = row.option1_value.trim();
        if (row.option2_name && row.option2_value) options[row.option2_name.trim().toLowerCase()] = row.option2_value.trim();
        return { options, sku: row.sku.trim(), price: row.price, mrp: row.mrp, stock: row.stock || "0" };
      });
      const parsed = productUpsertSchema.safeParse({
        title: head.title,
        description: head.description,
        categoryId: categories.get((head.category_slug ?? "").trim()) ?? "",
        brandId: head.brand_slug ? brands.get(head.brand_slug.trim()) ?? null : null,
        hsnCode: head.hsn_code || void 0,
        isReturnable: !/^(no|false|0)$/i.test(head.returnable ?? "yes"),
        returnWindowDays: head.return_window_days ? Number(head.return_window_days) : 7,
        variants,
        submit: false
      });
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        for (const g of group) results.push({ row: g.index, sku: g.row.sku ?? "", action: "error", message: `${handle}: ${msg}` });
        continue;
      }
      try {
        await this.products.create(sellerId, parsed.data, actor);
        for (const g of group) results.push({ row: g.index, sku: g.row.sku ?? "", action: "created" });
      } catch (err) {
        for (const g of group) results.push({ row: g.index, sku: g.row.sku ?? "", action: "error", message: err.message });
      }
    }
    results.sort((a, b) => a.row - b.row);
    return {
      total: rows.length,
      created: results.filter((r) => r.action === "created").length,
      updated: results.filter((r) => r.action === "updated").length,
      errors: results.filter((r) => r.action === "error")
    };
  }
  async export(scope, format) {
    const listings = await this.db.sellerProductListing.findMany({
      where: { deletedAt: null, ...scope.sellerId ? { sellerId: scope.sellerId } : {} },
      include: {
        inventory: true,
        variant: true,
        seller: { select: { displayName: true, code: true } },
        product: { include: { category: { select: { slug: true } }, brand: { select: { slug: true } } } }
      },
      orderBy: [{ productId: "asc" }, { createdAt: "asc" }],
      take: 5e4
    });
    const header = [...IMPORT_COLUMNS, "reserved", "status", "active", "product_id", ...scope.sellerId ? [] : ["seller", "seller_code"]];
    const rows = listings.map((l) => {
      const opts = Object.entries(l.variant.options ?? {});
      return [
        l.product.slug,
        l.product.title,
        l.product.description,
        l.product.category.slug,
        l.product.brand?.slug ?? "",
        l.sku,
        opts[0]?.[0] ?? "",
        opts[0]?.[1] ?? "",
        opts[1]?.[0] ?? "",
        opts[1]?.[1] ?? "",
        num(l.price),
        num(l.mrp),
        l.inventory?.quantity ?? 0,
        l.product.hsnCode ?? "",
        l.product.isReturnable ? "yes" : "no",
        l.product.returnWindowDays,
        l.inventory?.reserved ?? 0,
        l.status,
        l.isActive ? "yes" : "no",
        l.productId,
        ...scope.sellerId ? [] : [l.seller.displayName, l.seller.code]
      ];
    });
    const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    if (format === "csv") {
      const safe = rows.map((r) => r.map((c) => typeof c === "string" && /^[=+\-@]/.test(c) ? `'${c}` : c));
      return { filename: `products-${stamp}.csv`, contentType: "text/csv; charset=utf-8", data: Buffer.from(stringify2([header, ...safe])) };
    }
    const wb = new ExcelJS2.Workbook();
    const ws = wb.addWorksheet("Products");
    ws.addRow(header).font = { bold: true };
    rows.forEach((r) => ws.addRow(r));
    return {
      filename: `products-${stamp}.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      data: Buffer.from(await wb.xlsx.writeBuffer())
    };
  }
};

// src/modules/catalog/product.service.ts
import { Prisma as Prisma4 } from "@prisma/client";
var MAX_IMAGES = 10;
var managedInclude = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  ownerSeller: { select: { id: true, displayName: true, slug: true, status: true } },
  images: { orderBy: { sortOrder: "asc" } },
  attributeValues: { include: { attribute: { select: { id: true, name: true, code: true } } } },
  variants: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }
};
var variantName = (options) => {
  const values2 = Object.values(options).filter(Boolean);
  return values2.length ? values2.join(" / ").slice(0, 160) : "Default";
};
var ProductService = class {
  constructor(db, storage, inventory, indexer, settings, audit, notifications) {
    this.db = db;
    this.storage = storage;
    this.inventory = inventory;
    this.indexer = indexer;
    this.settings = settings;
    this.audit = audit;
    this.notifications = notifications;
  }
  db;
  storage;
  inventory;
  indexer;
  settings;
  audit;
  notifications;
  // ── Helpers ───────────────────────────────────────────────
  async uniqueSlug(title) {
    const base = slugify(title) || "product";
    for (let i = 0; i < 5; i++) {
      const slug = `${base}-${randomCode(5).toLowerCase()}`;
      if (!await this.db.product.findUnique({ where: { slug }, select: { id: true } })) return slug;
    }
    return `${base}-${Date.now().toString(36)}`;
  }
  /**
   * Load a product the caller may manage. Sellers only see products they own — any other ID
   * yields 404 (not 403) so the existence of other sellers' products is never revealed.
   */
  async loadManaged(productId, scope) {
    const product = await this.db.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
        ...scope.kind === "seller" ? { ownerSellerId: scope.sellerId } : {}
      },
      include: managedInclude
    });
    if (!product) throw notFound("Product");
    return product;
  }
  async assertSellerCanList(sellerId, submitting) {
    const seller = await this.db.seller.findUnique({ where: { id: sellerId }, select: { status: true, deletedAt: true } });
    if (!seller || seller.deletedAt) throw notFound("Seller");
    if (["SUSPENDED", "REJECTED", "INACTIVE"].includes(seller.status)) {
      throw forbidden(`Your seller account is ${seller.status.toLowerCase().replace("_", " ")} and cannot create or change listings`);
    }
    if (submitting && seller.status !== "APPROVED") {
      throw forbidden("Your seller account must be approved before products can be submitted for sale");
    }
  }
  async validateRefs(input) {
    const category = await this.db.category.findFirst({ where: { id: input.categoryId, deletedAt: null, isActive: true } });
    if (!category) throw badRequest("Choose a valid category", [{ path: "categoryId", message: "Unknown category" }]);
    if (input.brandId) {
      const brand = await this.db.brand.findFirst({ where: { id: input.brandId, deletedAt: null } });
      if (!brand) throw badRequest("Choose a valid brand", [{ path: "brandId", message: "Unknown brand" }]);
    }
    if (input.attributes.length) {
      const ids = [...new Set(input.attributes.map((a) => a.attributeId))];
      const found = await this.db.productAttribute.count({ where: { id: { in: ids } } });
      if (found !== ids.length) throw badRequest("Unknown product attribute");
    }
    const skus = input.variants.map((v) => v.sku.toUpperCase());
    if (new Set(skus).size !== skus.length) throw badRequest("Each variant needs a unique SKU");
    return category;
  }
  async assertSkusFree(sellerId, variants, productId) {
    const clash = await this.db.sellerProductListing.findFirst({
      where: {
        sellerId,
        sku: { in: variants.map((v) => v.sku) },
        ...productId ? { NOT: { productId } } : {}
      },
      select: { sku: true }
    });
    if (clash) throw conflict(`SKU "${clash.sku}" is already used by another of your products`);
  }
  contentData(input) {
    return {
      title: plainText(input.title),
      description: plainText(input.description),
      highlights: input.highlights.map((h) => plainText(h)),
      specifications: input.specifications.map((s) => ({ key: plainText(s.key), value: plainText(s.value) })),
      tags: input.tags.map((t) => t.toLowerCase()),
      categoryId: input.categoryId,
      brandId: input.brandId ?? null,
      hsnCode: input.hsnCode ?? null,
      isReturnable: input.isReturnable,
      returnWindowDays: input.isReturnable ? input.returnWindowDays : 0,
      codAvailable: input.codAvailable,
      videoUrl: input.videoUrl ?? null
    };
  }
  // ── Create ────────────────────────────────────────────────
  async create(sellerId, input, actor, byAdmin = false) {
    if (!byAdmin) await this.assertSellerCanList(sellerId, input.submit);
    if (input.submit && !byAdmin) {
      throw businessRule("Save the product as a draft, add images, then submit it for review");
    }
    await this.validateRefs(input);
    await this.assertSkusFree(sellerId, input.variants);
    const status = input.submit ? "PENDING_REVIEW" : "DRAFT";
    const slug = await this.uniqueSlug(input.title);
    const product = await this.db.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          ...this.contentData(input),
          slug,
          searchText: input.title,
          ownerSellerId: sellerId,
          status,
          submittedAt: input.submit ? /* @__PURE__ */ new Date() : null
        }
      });
      await this.writeAttributes(tx, p.id, input);
      for (const [i, v] of input.variants.entries()) {
        await this.createVariant(tx, p.id, sellerId, v, i, status, actor);
      }
      if (input.submit) {
        await tx.productApproval.create({
          data: { productId: p.id, fromStatus: null, toStatus: "PENDING_REVIEW", actorId: actor?.auth?.userId ?? null }
        });
      }
      await this.audit.record(
        actor,
        { action: byAdmin ? "product.create_on_behalf" : "product.create", entityType: "Product", entityId: p.id, after: { ...input, sellerId } },
        tx
      );
      await this.indexer.reindexSearch(p.id, tx);
      return p;
    });
    return this.getManaged(product.id, byAdmin ? { kind: "admin" } : { kind: "seller", sellerId });
  }
  async writeAttributes(tx, productId, input) {
    await tx.productAttributeValue.deleteMany({ where: { productId, variantId: null } });
    if (input.attributes.length) {
      await tx.productAttributeValue.createMany({
        data: input.attributes.map((a) => ({ productId, attributeId: a.attributeId, value: plainText(a.value) }))
      });
    }
  }
  async createVariant(tx, productId, sellerId, v, index, status, actor) {
    const variant = await tx.productVariant.create({
      data: {
        productId,
        name: variantName(v.options),
        options: v.options,
        isDefault: index === 0,
        sortOrder: index,
        weightGrams: v.weightGrams ?? null,
        lengthCm: v.lengthCm ?? null,
        widthCm: v.widthCm ?? null,
        heightCm: v.heightCm ?? null
      }
    });
    const listing = await tx.sellerProductListing.create({
      data: {
        sellerId,
        productId,
        variantId: variant.id,
        sku: v.sku,
        barcode: v.barcode ?? null,
        price: decimal(toPaise(v.price)),
        mrp: decimal(toPaise(v.mrp)),
        status,
        isActive: v.isActive
      }
    });
    await this.inventory.initialize(tx, listing.id, sellerId, v.stock, v.lowStockThreshold, {
      reason: "Initial stock",
      actorId: actor?.auth?.userId,
      referenceType: "PRODUCT",
      referenceId: productId
    });
    await this.writeVariantAxes(tx, productId, variant.id, v.options);
    return { variant, listing };
  }
  /** Variant option values are also stored as attribute values so they are filterable. */
  async writeVariantAxes(tx, productId, variantId, options) {
    await tx.productAttributeValue.deleteMany({ where: { variantId } });
    const codes = Object.keys(options);
    if (!codes.length) return;
    const attrs = await tx.productAttribute.findMany({ where: { code: { in: codes }, isVariantAxis: true } });
    const rows = attrs.filter((a) => options[a.code]).map((a) => ({ productId, variantId, attributeId: a.id, value: options[a.code] }));
    if (rows.length) await tx.productAttributeValue.createMany({ data: rows });
  }
  // ── Update ────────────────────────────────────────────────
  async update(productId, input, scope, actor) {
    const before = await this.loadManaged(productId, scope);
    if (before.status === "ARCHIVED") throw businessRule("Archived products cannot be edited");
    const sellerId = before.ownerSellerId;
    if (!sellerId) throw businessRule("Product has no owning seller");
    if (scope.kind === "seller") await this.assertSellerCanList(sellerId, input.submit);
    await this.validateRefs(input);
    await this.assertSkusFree(sellerId, input.variants, productId);
    const listings = await this.db.sellerProductListing.findMany({
      where: { productId, sellerId, deletedAt: null },
      include: { inventory: true }
    });
    const byVariant = new Map(listings.map((l) => [l.variantId, l]));
    const inputIds = new Set(input.variants.filter((v) => v.id).map((v) => v.id));
    for (const id of inputIds) {
      if (!before.variants.some((v) => v.id === id)) throw badRequest("Unknown variant for this product");
    }
    const content = this.contentData(input);
    const contentChanged = content.title !== before.title || content.description !== before.description || content.categoryId !== before.categoryId || content.brandId !== before.brandId || JSON.stringify(content.specifications) !== JSON.stringify(before.specifications ?? []) || JSON.stringify(content.highlights) !== JSON.stringify(before.highlights ?? []) || input.variants.some((v) => !v.id) || before.variants.some((v) => !inputIds.has(v.id));
    const settings = await this.settings.get("catalog");
    let nextStatus = before.status;
    if (input.submit && ["DRAFT", "REJECTED"].includes(before.status)) nextStatus = "PENDING_REVIEW";
    else if (scope.kind === "seller" && before.status === "APPROVED" && contentChanged && settings.productChangesRequireReapproval) {
      nextStatus = "PENDING_REVIEW";
    }
    if (nextStatus === "PENDING_REVIEW" && before.status !== "PENDING_REVIEW" && before.images.length === 0) {
      throw businessRule("Add at least one product image before submitting for review");
    }
    await this.db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          ...content,
          status: nextStatus,
          rejectionReason: nextStatus === "PENDING_REVIEW" ? null : void 0,
          submittedAt: nextStatus === "PENDING_REVIEW" && before.status !== "PENDING_REVIEW" ? /* @__PURE__ */ new Date() : void 0
        }
      });
      await this.writeAttributes(tx, productId, input);
      for (const [i, v] of input.variants.entries()) {
        if (!v.id) {
          await this.createVariant(tx, productId, sellerId, v, before.variants.length + i, nextStatus, actor);
          continue;
        }
        await tx.productVariant.update({
          where: { id: v.id },
          data: {
            name: variantName(v.options),
            options: v.options,
            sortOrder: i,
            weightGrams: v.weightGrams ?? null,
            lengthCm: v.lengthCm ?? null,
            widthCm: v.widthCm ?? null,
            heightCm: v.heightCm ?? null
          }
        });
        await this.writeVariantAxes(tx, productId, v.id, v.options);
        const listing = byVariant.get(v.id);
        if (!listing) continue;
        await tx.sellerProductListing.update({
          where: { id: listing.id },
          data: {
            sku: v.sku,
            barcode: v.barcode ?? null,
            price: decimal(toPaise(v.price)),
            mrp: decimal(toPaise(v.mrp)),
            isActive: v.isActive,
            ...nextStatus !== before.status && listing.status !== "ARCHIVED" ? { status: nextStatus } : {}
          }
        });
        if (listing.inventory && listing.inventory.quantity !== v.stock) {
          await this.inventory.adjust(
            listing.id,
            { setTo: v.stock, reason: "Updated from product editor", lowStockThreshold: v.lowStockThreshold },
            actor,
            { sellerId: scope.kind === "seller" ? sellerId : null },
            "ADJUSTMENT",
            tx
          );
        } else if (listing.inventory && listing.inventory.lowStockThreshold !== v.lowStockThreshold) {
          await tx.inventory.update({ where: { id: listing.inventory.id }, data: { lowStockThreshold: v.lowStockThreshold } });
        }
      }
      const removed = before.variants.filter((v) => !inputIds.has(v.id));
      for (const v of removed) {
        await tx.productVariant.update({ where: { id: v.id }, data: { deletedAt: /* @__PURE__ */ new Date() } });
        const listing = byVariant.get(v.id);
        if (listing) {
          await tx.sellerProductListing.update({ where: { id: listing.id }, data: { status: "ARCHIVED", deletedAt: /* @__PURE__ */ new Date(), isActive: false } });
          await tx.cartItem.deleteMany({ where: { listingId: listing.id } });
        }
      }
      if (nextStatus !== before.status) {
        await tx.productApproval.create({
          data: {
            productId,
            fromStatus: before.status,
            toStatus: nextStatus,
            actorId: actor?.auth?.userId ?? null,
            reason: nextStatus === "PENDING_REVIEW" && before.status === "APPROVED" ? "Content changed; re-review required" : null
          }
        });
      }
      await this.audit.record(
        actor,
        {
          action: scope.kind === "admin" ? "product.admin_update" : "product.update",
          entityType: "Product",
          entityId: productId,
          before,
          after: { ...input, status: nextStatus }
        },
        tx
      );
      await this.indexer.reindexSearch(productId, tx);
    });
    await this.indexer.refresh([productId]);
    return this.getManaged(productId, scope);
  }
  async submit(productId, scope, actor) {
    const p = await this.loadManaged(productId, scope);
    if (!["DRAFT", "REJECTED"].includes(p.status)) throw businessRule(`A ${p.status.toLowerCase()} product cannot be submitted`);
    if (scope.kind === "seller") await this.assertSellerCanList(scope.sellerId, true);
    if (p.images.length === 0) throw businessRule("Add at least one product image before submitting for review");
    await this.transition(p.id, p.status, "PENDING_REVIEW", actor, null, true);
    return this.getManaged(productId, scope);
  }
  /** Seller on/off switch for their approved listings on this product. */
  async setActive(productId, sellerId, isActive, actor) {
    const listings = await this.db.sellerProductListing.findMany({ where: { productId, sellerId, deletedAt: null } });
    if (!listings.length) throw notFound("Product");
    if (isActive) {
      const seller = await this.db.seller.findUnique({ where: { id: sellerId } });
      if (seller?.status !== "APPROVED") throw forbidden("Only approved sellers can activate listings");
    }
    await this.db.sellerProductListing.updateMany({ where: { productId, sellerId, deletedAt: null }, data: { isActive } });
    await this.audit.record(actor, { action: isActive ? "product.activate" : "product.deactivate", entityType: "Product", entityId: productId });
    await this.indexer.refresh([productId]);
  }
  /** Soft delete. Order history keeps its snapshots. */
  async archive(productId, scope, actor) {
    const p = await this.loadManaged(productId, scope);
    await this.db.$transaction(async (tx) => {
      await tx.product.update({ where: { id: p.id }, data: { status: "ARCHIVED", deletedAt: /* @__PURE__ */ new Date(), isFeatured: false } });
      const listings = await tx.sellerProductListing.findMany({ where: { productId: p.id }, select: { id: true } });
      await tx.sellerProductListing.updateMany({
        where: { productId: p.id },
        data: { status: "ARCHIVED", isActive: false, deletedAt: /* @__PURE__ */ new Date() }
      });
      await tx.cartItem.deleteMany({ where: { listingId: { in: listings.map((l) => l.id) } } });
      await tx.productApproval.create({ data: { productId: p.id, fromStatus: p.status, toStatus: "ARCHIVED", actorId: actor?.auth?.userId ?? null } });
      await this.audit.record(actor, { action: "product.archive", entityType: "Product", entityId: p.id, before: p }, tx);
    });
    await this.indexer.refresh([p.id]);
  }
  // ── Images ────────────────────────────────────────────────
  async addImages(productId, files, scope, actor) {
    const p = await this.loadManaged(productId, scope);
    if (!files.length) throw badRequest("Choose at least one image");
    if (p.images.length + files.length > MAX_IMAGES) throw businessRule(`A product can have at most ${MAX_IMAGES} images`);
    const stored = [];
    for (const f of files) stored.push(await storeOptimizedImage(this.storage, "products", f.buffer, f.mimeType));
    await this.db.productImage.createMany({
      data: stored.map((s, i) => ({
        productId,
        url: s.url,
        storageKey: s.key,
        alt: p.title.slice(0, 200),
        sortOrder: p.images.length + i
      }))
    });
    await this.onContentChange(p, scope, actor, "Images added");
    return this.getManaged(productId, scope);
  }
  async removeImage(productId, imageId, scope, actor) {
    const p = await this.loadManaged(productId, scope);
    const img = p.images.find((i) => i.id === imageId);
    if (!img) throw notFound("Image");
    await this.db.productImage.delete({ where: { id: imageId } });
    if (img.storageKey) {
      await this.storage.delete(img.storageKey, "public");
      await this.storage.delete(img.storageKey.replace(/\.webp$/, "-sm.webp"), "public");
    }
    await this.onContentChange(p, scope, actor, "Image removed");
    return this.getManaged(productId, scope);
  }
  async reorderImages(productId, imageIds, scope) {
    const p = await this.loadManaged(productId, scope);
    const known = new Set(p.images.map((i) => i.id));
    if (imageIds.some((id) => !known.has(id))) throw badRequest("Unknown image");
    await this.db.$transaction(imageIds.map((id, i) => this.db.productImage.update({ where: { id }, data: { sortOrder: i } })));
    return this.getManaged(productId, scope);
  }
  async onContentChange(p, scope, actor, reason) {
    const settings = await this.settings.get("catalog");
    if (scope.kind === "seller" && p.status === "APPROVED" && settings.productChangesRequireReapproval) {
      await this.transition(p.id, "APPROVED", "PENDING_REVIEW", actor, `${reason}; re-review required`, true);
    }
    await this.audit.record(actor, { action: "product.images", entityType: "Product", entityId: p.id, metadata: { reason } });
  }
  // ── Status transitions (shared by seller submit and admin moderation) ──────
  async transition(productId, from, to, actor, reason, cascadeOwnerListings) {
    await this.db.$transaction(async (tx) => {
      const updated = await tx.product.updateMany({
        where: { id: productId, status: from },
        data: {
          status: to,
          rejectionReason: to === "REJECTED" || to === "SUSPENDED" ? reason : null,
          ...to === "PENDING_REVIEW" ? { submittedAt: /* @__PURE__ */ new Date() } : {}
        }
      });
      if (updated.count !== 1) throw conflict("The product status changed in the meantime. Refresh and try again.");
      if (to === "APPROVED") {
        await tx.product.updateMany({ where: { id: productId, publishedAt: null }, data: { publishedAt: /* @__PURE__ */ new Date() } });
      }
      if (cascadeOwnerListings) {
        const p = await tx.product.findUniqueOrThrow({ where: { id: productId }, select: { ownerSellerId: true } });
        if (p.ownerSellerId) {
          await tx.sellerProductListing.updateMany({
            where: {
              productId,
              sellerId: p.ownerSellerId,
              deletedAt: null,
              status: { notIn: ["ARCHIVED"] }
            },
            data: { status: to === "SUSPENDED" ? void 0 : to, rejectionReason: to === "REJECTED" ? reason : null }
          });
        }
      }
      await tx.productApproval.create({
        data: { productId, fromStatus: from, toStatus: to, reason, actorId: actor?.auth?.userId ?? null }
      });
      await this.audit.record(
        actor,
        { action: `product.status.${to.toLowerCase()}`, entityType: "Product", entityId: productId, before: { status: from }, after: { status: to, reason } },
        tx
      );
    });
    await this.indexer.refresh([productId]);
  }
  async approve(productId, actor) {
    const p = await this.loadManaged(productId, { kind: "admin" });
    if (!["PENDING_REVIEW", "REJECTED", "SUSPENDED", "DRAFT"].includes(p.status)) {
      throw businessRule(`A ${p.status.toLowerCase()} product cannot be approved`);
    }
    await this.transition(p.id, p.status, "APPROVED", actor, null, true);
    await this.notifyOwner(p.ownerSellerId, "product.approved", { productName: p.title }, `/seller/products/${p.id}`);
    return this.getManaged(productId, { kind: "admin" });
  }
  async reject(productId, reason, actor) {
    const p = await this.loadManaged(productId, { kind: "admin" });
    if (!["PENDING_REVIEW", "APPROVED", "SUSPENDED"].includes(p.status)) {
      throw businessRule(`A ${p.status.toLowerCase()} product cannot be rejected`);
    }
    await this.transition(p.id, p.status, "REJECTED", actor, reason, true);
    await this.notifyOwner(p.ownerSellerId, "product.rejected", { productName: p.title, reason }, `/seller/products/${p.id}`);
    return this.getManaged(productId, { kind: "admin" });
  }
  async suspend(productId, reason, actor) {
    const p = await this.loadManaged(productId, { kind: "admin" });
    if (p.status !== "APPROVED") throw businessRule("Only live products can be suspended");
    await this.transition(p.id, "APPROVED", "SUSPENDED", actor, reason, false);
    await this.notifyOwner(p.ownerSellerId, "product.rejected", { productName: p.title, reason: `Suspended \u2014 ${reason}` }, `/seller/products/${p.id}`);
    return this.getManaged(productId, { kind: "admin" });
  }
  async setFeatured(productId, isFeatured, actor) {
    const p = await this.loadManaged(productId, { kind: "admin" });
    await this.db.product.update({ where: { id: p.id }, data: { isFeatured } });
    await this.audit.record(actor, { action: "product.feature", entityType: "Product", entityId: p.id, after: { isFeatured } });
  }
  async notifyOwner(sellerId, key, vars, link) {
    if (!sellerId) return;
    const seller = await this.db.seller.findUnique({ where: { id: sellerId }, select: { userId: true } });
    if (seller) await this.notifications.notify({ key, userId: seller.userId, vars, link });
  }
  // ── Offers on existing catalog products (multi-seller) ─────
  async createOffer(sellerId, input, actor) {
    await this.assertSellerCanList(sellerId, true);
    const variant = await this.db.productVariant.findFirst({
      where: { id: input.variantId, productId: input.productId, deletedAt: null, product: { status: "APPROVED", deletedAt: null } }
    });
    if (!variant) throw notFound("Product");
    if (input.price > input.mrp) throw badRequest("Selling price cannot exceed MRP");
    const existing = await this.db.sellerProductListing.findFirst({ where: { sellerId, variantId: variant.id } });
    if (existing) throw conflict("You already sell this variant");
    const settings = await this.settings.get("catalog");
    const status = settings.autoApproveListingsOnApprovedProducts ? "APPROVED" : "PENDING_REVIEW";
    const listing = await this.db.$transaction(async (tx) => {
      const l = await tx.sellerProductListing.create({
        data: {
          sellerId,
          productId: input.productId,
          variantId: variant.id,
          sku: input.sku,
          price: decimal(toPaise(input.price)),
          mrp: decimal(toPaise(input.mrp)),
          status
        }
      });
      await this.inventory.initialize(tx, l.id, sellerId, input.stock, 5, { reason: "Initial stock", actorId: actor?.auth?.userId });
      await this.audit.record(actor, { action: "listing.create", entityType: "SellerProductListing", entityId: l.id, after: input }, tx);
      return l;
    });
    await this.indexer.reindexSearch(input.productId);
    await this.indexer.refresh([input.productId]);
    return listing;
  }
  async decideListing(listingId, approve, reason, actor) {
    const listing = await this.db.sellerProductListing.findFirst({ where: { id: listingId, deletedAt: null } });
    if (!listing) throw notFound("Listing");
    await this.db.sellerProductListing.update({
      where: { id: listingId },
      data: { status: approve ? "APPROVED" : "REJECTED", rejectionReason: approve ? null : reason ?? null }
    });
    await this.audit.record(actor, {
      action: approve ? "listing.approve" : "listing.reject",
      entityType: "SellerProductListing",
      entityId: listingId,
      after: { reason }
    });
    await this.indexer.refresh([listing.productId]);
  }
  // ── Reads ─────────────────────────────────────────────────
  async getManaged(productId, scope) {
    const product = scope.kind === "admin" ? await this.db.product.findFirst({ where: { id: productId }, include: managedInclude }) : await this.loadManaged(productId, scope);
    if (!product) throw notFound("Product");
    const listings = await this.db.sellerProductListing.findMany({
      where: {
        productId,
        deletedAt: null,
        // Sellers only ever see their own listings on a product.
        ...scope.kind === "seller" ? { sellerId: scope.sellerId } : {}
      },
      include: {
        inventory: true,
        seller: { select: { id: true, displayName: true, slug: true, status: true } }
      }
    });
    const approvals = await this.db.productApproval.findMany({ where: { productId }, orderBy: { createdAt: "desc" }, take: 20 });
    return {
      ...product,
      listings: listings.map((l) => ({
        ...l,
        price: num(l.price),
        mrp: num(l.mrp),
        stock: l.inventory?.quantity ?? 0,
        reserved: l.inventory?.reserved ?? 0,
        available: (l.inventory?.quantity ?? 0) - (l.inventory?.reserved ?? 0),
        lowStockThreshold: l.inventory?.lowStockThreshold ?? 5
      })),
      approvals
    };
  }
  async listManaged(scope, q) {
    const where = {
      ...q.status === "ARCHIVED" ? {} : { deletedAt: null },
      ...q.status ? { status: q.status } : { status: { not: "ARCHIVED" } },
      ...q.categoryId ? { categoryId: q.categoryId } : {},
      ...scope.kind === "seller" ? { OR: [{ ownerSellerId: scope.sellerId }, { listings: { some: { sellerId: scope.sellerId, deletedAt: null } } }] } : q.sellerId ? { OR: [{ ownerSellerId: q.sellerId }, { listings: { some: { sellerId: q.sellerId } } }] } : {},
      ...q.q ? {
        AND: [
          {
            OR: [
              { title: { contains: q.q } },
              { listings: { some: { sku: { contains: q.q }, ...scope.kind === "seller" ? { sellerId: scope.sellerId } : {} } } }
            ]
          }
        ]
      } : {}
    };
    const orderBy = q.sort === "oldest" ? { createdAt: "asc" } : q.sort === "title" ? { title: "asc" } : q.sort === "submitted" ? { submittedAt: "asc" } : { updatedAt: "desc" };
    const [items, total] = await Promise.all([
      this.db.product.findMany({
        where,
        orderBy,
        ...pageArgs(q.page, q.pageSize),
        include: {
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          ownerSeller: { select: { id: true, displayName: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          listings: {
            where: { deletedAt: null, ...scope.kind === "seller" ? { sellerId: scope.sellerId } : {} },
            select: { id: true, sku: true, price: true, mrp: true, status: true, isActive: true, sellerId: true, inventory: { select: { quantity: true, reserved: true } } }
          }
        }
      }),
      this.db.product.count({ where })
    ]);
    return paginated(
      items.map((p) => ({
        ...p,
        searchText: void 0,
        listings: p.listings.map((l) => ({
          ...l,
          price: num(l.price),
          mrp: num(l.mrp),
          available: (l.inventory?.quantity ?? 0) - (l.inventory?.reserved ?? 0)
        })),
        totalStock: p.listings.reduce((s, l) => s + (l.inventory?.quantity ?? 0), 0),
        isOwner: scope.kind === "seller" ? p.ownerSellerId === scope.sellerId : void 0
      })),
      total,
      q.page,
      q.pageSize
    );
  }
  async history(productId) {
    await this.loadManaged(productId, { kind: "admin" });
    const [approvals, audit] = await Promise.all([
      this.db.productApproval.findMany({ where: { productId }, orderBy: { createdAt: "desc" } }),
      this.db.auditLog.findMany({
        where: { entityType: "Product", entityId: productId },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { actor: { select: { id: true, name: true, email: true } } }
      })
    ]);
    return { approvals, audit };
  }
  /** Counts for the seller dashboard / admin review queue. */
  async statusCounts(scope) {
    const rows = await this.db.product.groupBy({
      by: ["status"],
      where: { deletedAt: null, ...scope.kind === "seller" ? { ownerSellerId: scope.sellerId } : {} },
      _count: { _all: true }
    });
    return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
  }
};

// src/modules/content/content.service.ts
var ContentService = class {
  constructor(db, storefront, catalog, settings, storage, cache, audit) {
    this.db = db;
    this.storefront = storefront;
    this.catalog = catalog;
    this.settings = settings;
    this.storage = storage;
    this.cache = cache;
    this.audit = audit;
  }
  db;
  storefront;
  catalog;
  settings;
  storage;
  cache;
  audit;
  activeWindow() {
    const now = /* @__PURE__ */ new Date();
    return {
      isActive: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
    };
  }
  /** The public homepage: banners + every active section resolved to real data. */
  async homepage() {
    const cached = await this.cache.get("home:page");
    if (cached) return cached;
    const [banners, sections, promotions] = await Promise.all([
      this.db.banner.findMany({ where: this.activeWindow(), orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] }),
      this.db.homeSection.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: { category: { select: { id: true, name: true, slug: true } } } }),
      this.activePromotions()
    ]);
    const categories = await this.catalog.tree();
    const resolved = [];
    for (const s of sections) {
      const base = { id: s.id, type: s.type, title: s.title, subtitle: s.subtitle, category: s.category };
      if (s.type === "CATEGORY_GRID") {
        resolved.push({ ...base, categories: categories.slice(0, s.limit).map((c) => ({ id: c.id, name: c.name, slug: c.slug, imageUrl: c.imageUrl, icon: c.icon, productCount: c.productCount })) });
      } else if (s.type === "FEATURED_SELLERS") {
        resolved.push({ ...base, sellers: await this.storefront.featuredSellers(s.limit) });
      } else if (s.type === "RECENTLY_VIEWED") {
        resolved.push({ ...base, personalised: true });
      } else {
        const kind = s.type === "CATEGORY_PRODUCTS" ? "BEST_SELLERS" : s.type;
        const products = await this.storefront.productsBy(kind, s.limit, s.categoryId);
        if (products.length) resolved.push({ ...base, products });
      }
    }
    const page = {
      banners: {
        hero: banners.filter((b) => b.placement === "HERO"),
        strip: banners.filter((b) => b.placement === "STRIP"),
        category: banners.filter((b) => b.placement === "CATEGORY")
      },
      sections: resolved,
      promotions
    };
    await this.cache.set("home:page", page, 60);
    return page;
  }
  async activePromotions() {
    const now = /* @__PURE__ */ new Date();
    const rows = await this.db.promotion.findMany({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      include: { category: { select: { name: true, slug: true } } },
      orderBy: { endsAt: "asc" }
    });
    return rows.map((p) => ({ ...p, discountPercent: num(p.discountPercent) }));
  }
  /** Public, non-sensitive settings needed by the storefront shell. */
  async publicConfig() {
    const s = await this.settings.all();
    return {
      branding: s.branding,
      cod: { enabled: s.cod.enabled, maxOrderValue: s.cod.maxOrderValue, fee: s.cod.fee },
      returns: s.returns,
      reviews: { onlyVerifiedPurchasers: s.reviews.onlyVerifiedPurchasers },
      tax: { pricesInclusive: s.tax.pricesInclusive }
    };
  }
  // ── Admin CRUD ─────────────────────────────────────────────
  async bust() {
    await this.cache.delPrefix("home:");
  }
  listBanners() {
    return this.db.banner.findMany({ orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] });
  }
  async createBanner(input, actor) {
    const b = await this.db.banner.create({ data: input });
    await this.audit.record(actor, { action: "banner.create", entityType: "Banner", entityId: b.id, after: b });
    await this.bust();
    return b;
  }
  async updateBanner(id, input, actor) {
    const before = await this.db.banner.findUnique({ where: { id } });
    if (!before) throw notFound("Banner");
    const b = await this.db.banner.update({ where: { id }, data: input });
    await this.audit.record(actor, { action: "banner.update", entityType: "Banner", entityId: id, before, after: b });
    await this.bust();
    return b;
  }
  async deleteBanner(id, actor) {
    const before = await this.db.banner.findUnique({ where: { id } });
    if (!before) throw notFound("Banner");
    await this.db.banner.delete({ where: { id } });
    await this.audit.record(actor, { action: "banner.delete", entityType: "Banner", entityId: id, before });
    await this.bust();
  }
  async uploadImage(file) {
    const stored = await storeOptimizedImage(this.storage, "content", file.buffer, file.mimeType);
    return { url: stored.url, thumbUrl: stored.thumbUrl };
  }
  listSections() {
    return this.db.homeSection.findMany({ orderBy: { sortOrder: "asc" }, include: { category: { select: { id: true, name: true } } } });
  }
  async createSection(input, actor) {
    const s = await this.db.homeSection.create({ data: { ...input, categoryId: input.categoryId ?? null } });
    await this.audit.record(actor, { action: "home_section.create", entityType: "HomeSection", entityId: s.id, after: s });
    await this.bust();
    return s;
  }
  async updateSection(id, input, actor) {
    const before = await this.db.homeSection.findUnique({ where: { id } });
    if (!before) throw notFound("Section");
    const s = await this.db.homeSection.update({ where: { id }, data: { ...input, categoryId: input.categoryId ?? null } });
    await this.audit.record(actor, { action: "home_section.update", entityType: "HomeSection", entityId: id, before, after: s });
    await this.bust();
    return s;
  }
  async deleteSection(id, actor) {
    const before = await this.db.homeSection.findUnique({ where: { id } });
    if (!before) throw notFound("Section");
    await this.db.homeSection.delete({ where: { id } });
    await this.audit.record(actor, { action: "home_section.delete", entityType: "HomeSection", entityId: id, before });
    await this.bust();
  }
  async listPromotions() {
    const rows = await this.db.promotion.findMany({ orderBy: { startsAt: "desc" }, include: { category: { select: { id: true, name: true } } } });
    return rows.map((p) => ({ ...p, discountPercent: num(p.discountPercent) }));
  }
  async createPromotion(input, actor) {
    const p = await this.db.promotion.create({ data: { ...input, categoryId: input.categoryId ?? null } });
    await this.audit.record(actor, { action: "promotion.create", entityType: "Promotion", entityId: p.id, after: p });
    await this.bust();
    return p;
  }
  async updatePromotion(id, input, actor) {
    const before = await this.db.promotion.findUnique({ where: { id } });
    if (!before) throw notFound("Promotion");
    const p = await this.db.promotion.update({ where: { id }, data: { ...input, categoryId: input.categoryId ?? null } });
    await this.audit.record(actor, { action: "promotion.update", entityType: "Promotion", entityId: id, before, after: p });
    await this.bust();
    return p;
  }
  async deletePromotion(id, actor) {
    const before = await this.db.promotion.findUnique({ where: { id } });
    if (!before) throw notFound("Promotion");
    await this.db.promotion.delete({ where: { id } });
    await this.audit.record(actor, { action: "promotion.delete", entityType: "Promotion", entityId: id, before });
    await this.bust();
  }
};

// src/modules/coupons/coupon.service.ts
var invalid = (message) => new AppError(422, "BUSINESS_RULE", message);
var CouponService = class {
  constructor(db, audit) {
    this.db = db;
    this.audit = audit;
  }
  db;
  audit;
  toPricing(c) {
    return {
      code: c.code,
      type: c.type,
      value: num(c.value),
      maxDiscount: c.maxDiscount === null ? null : toPaise(c.maxDiscount),
      minOrderAmount: toPaise(c.minOrderAmount),
      scope: c.scope,
      scopeIds: Array.isArray(c.scopeIds) ? c.scopeIds : [],
      fundedBy: c.fundedBy
    };
  }
  /**
   * Validate that `code` can be used by this customer right now. Scope and minimum-order rules
   * are evaluated by the pricing engine against the actual cart lines.
   */
  async validate(code, userId, db = this.db) {
    const coupon = await db.coupon.findFirst({ where: { code: code.toUpperCase(), deletedAt: null } });
    if (!coupon || !coupon.isActive) throw invalid("This coupon code is not valid");
    const now = /* @__PURE__ */ new Date();
    if (coupon.startsAt > now) throw invalid("This coupon is not active yet");
    if (coupon.endsAt < now) throw invalid("This coupon has expired");
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw invalid("This coupon has been fully redeemed");
    if (userId) {
      const used = await db.couponUsage.count({ where: { couponId: coupon.id, userId, releasedAt: null } });
      if (used >= coupon.perCustomerLimit) throw invalid("You have already used this coupon");
      if (coupon.firstOrderOnly) {
        const orders = await db.order.count({ where: { customerId: userId, status: { not: "CANCELLED" } } });
        if (orders > 0) throw invalid("This coupon is valid on your first order only");
      }
    } else if (coupon.firstOrderOnly || coupon.perCustomerLimit) {
    }
    return coupon;
  }
  /** Atomically claim one redemption; fails if the global usage limit was reached concurrently. */
  async redeem(tx, coupon, userId, orderId, discount) {
    const claimed = await tx.$executeRaw`
      UPDATE \`Coupon\` SET usedCount = usedCount + 1, updatedAt = NOW(3)
      WHERE id = ${coupon.id} AND (usageLimit IS NULL OR usedCount < usageLimit)`;
    if (claimed !== 1) throw conflict("This coupon has just been fully redeemed. Please remove it and try again.");
    await tx.couponUsage.create({
      data: { couponId: coupon.id, userId, orderId, discountAmount: decimal(discount) }
    });
  }
  /** Return a redemption when an entire order is cancelled. */
  async release(tx, orderId) {
    const usage = await tx.couponUsage.findUnique({ where: { orderId } });
    if (!usage || usage.releasedAt) return;
    await tx.couponUsage.update({ where: { id: usage.id }, data: { releasedAt: /* @__PURE__ */ new Date() } });
    await tx.$executeRaw`UPDATE \`Coupon\` SET usedCount = GREATEST(usedCount - 1, 0) WHERE id = ${usage.couponId}`;
  }
  /** Public list of currently redeemable coupons (shown at checkout). */
  async available() {
    const now = /* @__PURE__ */ new Date();
    const rows = await this.db.coupon.findMany({
      where: { isActive: true, deletedAt: null, startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { endsAt: "asc" },
      take: 20
    });
    return rows.filter((c) => c.usageLimit === null || c.usedCount < c.usageLimit).map((c) => ({
      code: c.code,
      description: c.description,
      type: c.type,
      value: num(c.value),
      maxDiscount: c.maxDiscount === null ? null : num(c.maxDiscount),
      minOrderAmount: num(c.minOrderAmount),
      scope: c.scope,
      firstOrderOnly: c.firstOrderOnly,
      endsAt: c.endsAt
    }));
  }
  // ── Admin ──────────────────────────────────────────────────
  async list(q) {
    const where = { deletedAt: null, ...q.q ? { code: { contains: q.q.toUpperCase() } } : {} };
    const [items, total] = await Promise.all([
      this.db.coupon.findMany({ where, orderBy: { createdAt: "desc" }, ...pageArgs(q.page, q.pageSize) }),
      this.db.coupon.count({ where })
    ]);
    return paginated(
      items.map((c) => ({ ...c, value: num(c.value), maxDiscount: c.maxDiscount === null ? null : num(c.maxDiscount), minOrderAmount: num(c.minOrderAmount) })),
      total,
      q.page,
      q.pageSize
    );
  }
  data(input) {
    return {
      code: input.code,
      description: input.description ?? null,
      type: input.type,
      value: input.value,
      maxDiscount: input.maxDiscount ?? null,
      minOrderAmount: input.minOrderAmount,
      scope: input.scope,
      scopeIds: input.scope === "ALL" ? [] : input.scopeIds,
      fundedBy: input.fundedBy,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      usageLimit: input.usageLimit ?? null,
      perCustomerLimit: input.perCustomerLimit,
      firstOrderOnly: input.firstOrderOnly,
      isActive: input.isActive
    };
  }
  async create(input, actor) {
    if (await this.db.coupon.findUnique({ where: { code: input.code } })) throw conflict("A coupon with this code already exists");
    const c = await this.db.coupon.create({ data: this.data(input) });
    await this.audit.record(actor, { action: "coupon.create", entityType: "Coupon", entityId: c.id, after: c });
    return c;
  }
  async update(id, input, actor) {
    const before = await this.db.coupon.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw notFound("Coupon");
    const c = await this.db.coupon.update({ where: { id }, data: this.data(input) });
    await this.audit.record(actor, { action: "coupon.update", entityType: "Coupon", entityId: id, before, after: c });
    return c;
  }
  async remove(id, actor) {
    const before = await this.db.coupon.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw notFound("Coupon");
    await this.db.coupon.update({
      where: { id },
      data: { deletedAt: /* @__PURE__ */ new Date(), isActive: false, code: `${before.code}~${Date.now().toString(36)}`.slice(0, 40) }
    });
    await this.audit.record(actor, { action: "coupon.delete", entityType: "Coupon", entityId: id, before });
  }
  async usages(id, page, pageSize) {
    const [items, total] = await Promise.all([
      this.db.couponUsage.findMany({
        where: { couponId: id },
        include: { user: { select: { name: true, email: true } }, order: { select: { orderNumber: true, grandTotal: true } } },
        orderBy: { createdAt: "desc" },
        ...pageArgs(page, pageSize)
      }),
      this.db.couponUsage.count({ where: { couponId: id } })
    ]);
    return paginated(items, total, page, pageSize);
  }
};

// src/modules/customers/customer.service.ts
import { randomInt } from "crypto";
var MAX_ADDRESSES = 20;
var CustomerService = class {
  constructor(db, auth, storefront, channels, audit) {
    this.db = db;
    this.auth = auth;
    this.storefront = storefront;
    this.channels = channels;
    this.audit = audit;
  }
  db;
  auth;
  storefront;
  channels;
  audit;
  // ── Profile ────────────────────────────────────────────────
  async profile(userId) {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        status: true,
        createdAt: true,
        deletionRequestedAt: true,
        customerProfile: true
      }
    });
    return user;
  }
  async updateProfile(userId, input) {
    const current = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (input.phone && input.phone !== current.phone) {
      const taken = await this.db.user.findUnique({ where: { phone: input.phone } });
      if (taken) throw conflict("This phone number is already registered");
    }
    await this.db.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        ...input.phone && input.phone !== current.phone ? { phone: input.phone, phoneVerifiedAt: null } : {},
        customerProfile: {
          upsert: {
            create: { gender: input.gender, dateOfBirth: input.dateOfBirth ?? null },
            update: { gender: input.gender, dateOfBirth: input.dateOfBirth }
          }
        }
      }
    });
    this.auth.invalidatePrincipal(userId);
    return this.profile(userId);
  }
  // ── Phone verification (OTP over the configured SMS channel; console in development) ──
  async requestPhoneOtp(userId) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.phone) throw businessRule("Add a phone number to your profile first");
    if (user.phoneVerifiedAt) throw businessRule("Your phone number is already verified");
    const otp = String(randomInt(1e5, 1e6));
    await this.db.verificationToken.updateMany({ where: { userId, type: "PHONE_OTP", usedAt: null }, data: { usedAt: /* @__PURE__ */ new Date() } });
    await this.db.verificationToken.deleteMany({ where: { tokenHash: sha256(`otp:${userId}:${otp}`) } });
    await this.db.verificationToken.create({
      data: { userId, type: "PHONE_OTP", tokenHash: sha256(`otp:${userId}:${otp}`), expiresAt: new Date(Date.now() + 10 * 6e4) }
    });
    await this.channels.sms.send({ to: user.phone, text: `Your Vyora verification code is ${otp}. It expires in 10 minutes.` });
    return { sentTo: `******${user.phone.slice(-4)}`, expiresInSeconds: 600 };
  }
  async verifyPhoneOtp(userId, otp) {
    if (!/^\d{6}$/.test(otp)) throw badRequest("Enter the 6-digit code");
    const row = await this.db.verificationToken.findUnique({ where: { tokenHash: sha256(`otp:${userId}:${otp}`) } });
    if (!row || row.userId !== userId || row.usedAt || row.expiresAt < /* @__PURE__ */ new Date()) throw badRequest("The code is incorrect or has expired");
    await this.db.verificationToken.updateMany({ where: { userId, type: "PHONE_OTP", usedAt: null }, data: { usedAt: /* @__PURE__ */ new Date() } });
    await this.db.user.update({ where: { id: userId }, data: { phoneVerifiedAt: /* @__PURE__ */ new Date() } });
  }
  /** GDPR-style deletion request: the account is flagged and signed out; an admin completes it. */
  async requestDeletion(userId, actor) {
    const openOrders = await this.db.order.count({
      where: { customerId: userId, status: { in: ["PENDING_CONFIRMATION", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY"] } }
    });
    if (openOrders) throw businessRule("Please wait until your open orders are delivered or cancelled before deleting your account");
    const seller = await this.db.seller.findUnique({ where: { userId } });
    if (seller && seller.status === "APPROVED") throw businessRule("Seller accounts must be deactivated by an admin before deletion");
    await this.db.user.update({ where: { id: userId }, data: { status: "DELETION_REQUESTED", deletionRequestedAt: /* @__PURE__ */ new Date() } });
    await this.audit.record(actor, { action: "user.deletion_requested", entityType: "User", entityId: userId });
    await this.auth.revokeAllSessions(userId);
  }
  // ── Addresses ──────────────────────────────────────────────
  listAddresses(userId) {
    return this.db.customerAddress.findMany({ where: { userId, deletedAt: null }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] });
  }
  async createAddress(userId, input) {
    const count = await this.db.customerAddress.count({ where: { userId, deletedAt: null } });
    if (count >= MAX_ADDRESSES) throw businessRule(`You can save up to ${MAX_ADDRESSES} addresses`);
    return this.db.$transaction(async (tx) => {
      const makeDefault = input.isDefault || count === 0;
      if (makeDefault && count > 0) await tx.customerAddress.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      return tx.customerAddress.create({ data: { ...input, userId, isDefault: makeDefault } });
    });
  }
  async updateAddress(userId, id, input) {
    const existing = await this.db.customerAddress.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) throw notFound("Address");
    return this.db.$transaction(async (tx) => {
      if (input.isDefault) await tx.customerAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.customerAddress.update({ where: { id }, data: { ...input, isDefault: input.isDefault || existing.isDefault } });
    });
  }
  async setDefaultAddress(userId, id) {
    const existing = await this.db.customerAddress.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) throw notFound("Address");
    await this.db.$transaction([
      this.db.customerAddress.updateMany({ where: { userId }, data: { isDefault: false } }),
      this.db.customerAddress.update({ where: { id }, data: { isDefault: true } })
    ]);
  }
  async deleteAddress(userId, id) {
    const existing = await this.db.customerAddress.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) throw notFound("Address");
    await this.db.customerAddress.update({ where: { id }, data: { deletedAt: /* @__PURE__ */ new Date(), isDefault: false } });
    if (existing.isDefault) {
      const next = await this.db.customerAddress.findFirst({ where: { userId, deletedAt: null }, orderBy: { updatedAt: "desc" } });
      if (next) await this.db.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }
  // ── Wishlist ───────────────────────────────────────────────
  async wishlistId(userId) {
    const w = await this.db.wishlist.upsert({ where: { userId }, create: { userId }, update: {} });
    return w.id;
  }
  async wishlist(userId) {
    const id = await this.wishlistId(userId);
    const items = await this.db.wishlistItem.findMany({
      where: { wishlistId: id, product: { deletedAt: null } },
      orderBy: { createdAt: "desc" },
      select: { productId: true, createdAt: true }
    });
    const products = await this.db.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      select: {
        id: true,
        slug: true,
        title: true,
        minPrice: true,
        maxMrp: true,
        maxDiscountPct: true,
        inStock: true,
        ratingAvg: true,
        ratingCount: true,
        soldCount: true,
        isFeatured: true,
        publishedAt: true,
        codAvailable: true,
        status: true,
        brand: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 2, select: { url: true, storageKey: true, alt: true } }
      }
    });
    const cards = await this.storefront.toCards(products);
    return items.map((i) => {
      const card = cards.find((c) => c.id === i.productId);
      const p = products.find((x) => x.id === i.productId);
      return card ? { ...card, addedAt: i.createdAt, available: p?.status === "APPROVED" && p.minPrice !== null } : null;
    }).filter(Boolean);
  }
  async wishlistIds(userId) {
    const w = await this.db.wishlist.findUnique({ where: { userId }, include: { items: { select: { productId: true } } } });
    return w?.items.map((i) => i.productId) ?? [];
  }
  async addToWishlist(userId, productId) {
    const product = await this.db.product.findFirst({ where: { id: productId, deletedAt: null, status: "APPROVED" } });
    if (!product) throw notFound("Product");
    const id = await this.wishlistId(userId);
    await this.db.wishlistItem.upsert({ where: { wishlistId_productId: { wishlistId: id, productId } }, create: { wishlistId: id, productId }, update: {} });
  }
  async removeFromWishlist(userId, productId) {
    const id = await this.wishlistId(userId);
    await this.db.wishlistItem.deleteMany({ where: { wishlistId: id, productId } });
  }
  // ── Recently viewed ────────────────────────────────────────
  async recordView(userId, productId) {
    await this.db.recentlyViewedProduct.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: { viewedAt: /* @__PURE__ */ new Date() }
    });
    const stale = await this.db.recentlyViewedProduct.findMany({ where: { userId }, orderBy: { viewedAt: "desc" }, skip: 50, select: { id: true } });
    if (stale.length) await this.db.recentlyViewedProduct.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  }
  async recentlyViewed(userId, limit = 12) {
    const rows = await this.db.recentlyViewedProduct.findMany({ where: { userId }, orderBy: { viewedAt: "desc" }, take: limit, select: { productId: true } });
    const products = await this.db.product.findMany({
      where: { id: { in: rows.map((r) => r.productId) }, status: "APPROVED", deletedAt: null, minPrice: { not: null } },
      select: {
        id: true,
        slug: true,
        title: true,
        minPrice: true,
        maxMrp: true,
        maxDiscountPct: true,
        inStock: true,
        ratingAvg: true,
        ratingCount: true,
        soldCount: true,
        isFeatured: true,
        publishedAt: true,
        codAvailable: true,
        brand: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 2, select: { url: true, storageKey: true, alt: true } }
      }
    });
    const cards = await this.storefront.toCards(products);
    return rows.map((r) => cards.find((c) => c.id === r.productId)).filter(Boolean);
  }
  async subscribeStock(userId, productId) {
    const product = await this.db.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw notFound("Product");
    await this.db.stockSubscription.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: { notifiedAt: null }
    });
  }
};

// src/modules/finance/finance.service.ts
var SETTLEMENT_TRANSITIONS = {
  PENDING: ["APPROVED", "CANCELLED"],
  APPROVED: ["PROCESSING", "PAID", "CANCELLED"],
  PROCESSING: ["PAID", "FAILED"],
  FAILED: ["PROCESSING", "CANCELLED"],
  PAID: [],
  CANCELLED: []
};
var OPEN_SETTLEMENT = ["PENDING", "APPROVED", "PROCESSING", "FAILED"];
var FinanceService = class {
  constructor(db, audit, notifications, defaultCommission) {
    this.db = db;
    this.audit = audit;
    this.notifications = notifications;
    this.defaultCommission = defaultCommission;
  }
  db;
  audit;
  notifications;
  defaultCommission;
  async post(tx, entries) {
    const bySeller = /* @__PURE__ */ new Map();
    for (const e of entries.filter((e2) => e2.amount !== 0)) {
      if (!bySeller.has(e.sellerId)) bySeller.set(e.sellerId, []);
      bySeller.get(e.sellerId).push(e);
    }
    for (const [sellerId, list] of bySeller) {
      await tx.$queryRaw`SELECT id FROM \`Seller\` WHERE id = ${sellerId} FOR UPDATE`;
      const agg = await tx.sellerLedger.aggregate({ where: { sellerId }, _sum: { amount: true } });
      let balance = toPaise(agg._sum.amount);
      for (const e of list) {
        balance += e.amount;
        await tx.sellerLedger.create({
          data: {
            sellerId,
            type: e.type,
            amount: decimal(e.amount),
            balanceAfter: decimal(balance),
            description: e.description.slice(0, 300),
            orderId: e.orderId ?? null,
            sellerOrderId: e.sellerOrderId ?? null,
            orderItemId: e.orderItemId ?? null,
            settlementId: e.settlementId ?? null,
            actorId: e.actorId ?? null
          }
        });
      }
    }
  }
  async balances(sellerId, db = this.db) {
    const [ledger, open, byType] = await Promise.all([
      db.sellerLedger.aggregate({ where: { sellerId }, _sum: { amount: true } }),
      db.settlement.aggregate({ where: { sellerId, status: { in: OPEN_SETTLEMENT } }, _sum: { amount: true } }),
      db.sellerLedger.groupBy({ by: ["type"], where: { sellerId }, _sum: { amount: true } })
    ]);
    const balance = toPaise(ledger._sum.amount);
    const reserved = toPaise(open._sum.amount);
    const t = (type) => toPaise(byType.find((b) => b.type === type)?._sum.amount);
    return {
      balance: fromPaise(balance),
      inSettlement: fromPaise(reserved),
      availableForSettlement: fromPaise(Math.max(0, balance - reserved)),
      totals: {
        sales: fromPaise(t("SALE_CREDIT")),
        shipping: fromPaise(t("SHIPPING_CREDIT")),
        commission: fromPaise(-t("COMMISSION_DEBIT")),
        commissionTax: fromPaise(-t("COMMISSION_TAX_DEBIT")),
        refunds: fromPaise(-t("REFUND_DEBIT")),
        commissionReversals: fromPaise(t("COMMISSION_REVERSAL_CREDIT")),
        paidOut: fromPaise(-t("SETTLEMENT_PAYOUT")),
        adjustments: fromPaise(t("MANUAL_ADJUSTMENT"))
      }
    };
  }
  async ledger(sellerId, q) {
    const where = {
      sellerId,
      ...q.type ? { type: q.type } : {},
      ...q.from || q.to ? { createdAt: { ...q.from ? { gte: q.from } : {}, ...q.to ? { lte: q.to } : {} } } : {}
    };
    const [items, total] = await Promise.all([
      this.db.sellerLedger.findMany({ where, orderBy: { createdAt: "desc" }, ...pageArgs(q.page, q.pageSize) }),
      this.db.sellerLedger.count({ where })
    ]);
    return paginated(
      items.map((i) => ({ ...i, amount: num(i.amount), balanceAfter: num(i.balanceAfter) })),
      total,
      q.page,
      q.pageSize
    );
  }
  async adjust(input, actor) {
    const seller = await this.db.seller.findUnique({ where: { id: input.sellerId } });
    if (!seller) throw notFound("Seller");
    await this.db.$transaction(async (tx) => {
      await this.post(tx, [
        {
          sellerId: input.sellerId,
          type: "MANUAL_ADJUSTMENT",
          amount: toPaise(input.amount),
          description: `Manual adjustment: ${input.reason}`,
          actorId: actor?.auth?.userId
        }
      ]);
      await this.audit.record(actor, { action: "ledger.adjust", entityType: "Seller", entityId: input.sellerId, after: input }, tx);
    });
    return this.balances(input.sellerId);
  }
  // ── Settlements ────────────────────────────────────────────
  async createSettlement(input, actor) {
    const seller = await this.db.seller.findUnique({ where: { id: input.sellerId } });
    if (!seller) throw notFound("Seller");
    const settlement = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM \`Seller\` WHERE id = ${input.sellerId} FOR UPDATE`;
      const b = await this.balances(input.sellerId, tx);
      if (toPaise(input.amount) > toPaise(b.availableForSettlement)) {
        throw businessRule(`Amount exceeds the seller's available balance of \u20B9${b.availableForSettlement.toFixed(2)}`);
      }
      const s = await tx.settlement.create({
        data: {
          settlementNumber: referenceNumber("ST"),
          sellerId: input.sellerId,
          amount: decimal(toPaise(input.amount)),
          periodStart: input.periodStart ?? null,
          periodEnd: input.periodEnd ?? null,
          notes: input.notes ?? null,
          createdById: actor?.auth?.userId ?? null,
          transactions: {
            create: { toStatus: "PENDING", amount: decimal(toPaise(input.amount)), note: input.notes ?? null, actorId: actor?.auth?.userId ?? null }
          }
        }
      });
      await this.audit.record(actor, { action: "settlement.create", entityType: "Settlement", entityId: s.id, after: input }, tx);
      return s;
    });
    await this.notifySettlement(settlement.id);
    return settlement;
  }
  async changeSettlementStatus(id, to, input, actor) {
    const s = await this.db.settlement.findUnique({ where: { id } });
    if (!s) throw notFound("Settlement");
    if (!SETTLEMENT_TRANSITIONS[s.status].includes(to)) {
      throw businessRule(`Cannot move a settlement from ${s.status} to ${to}`);
    }
    if (to === "PAID" && !input.reference && !s.reference) {
      throw businessRule("Enter the bank transfer / UTR reference before marking as paid");
    }
    await this.db.$transaction(async (tx) => {
      const updated = await tx.settlement.updateMany({
        where: { id, status: s.status },
        data: {
          status: to,
          reference: input.reference ?? void 0,
          notes: input.notes ?? void 0,
          ...to === "APPROVED" ? { approvedAt: /* @__PURE__ */ new Date(), approvedById: actor?.auth?.userId ?? null } : {},
          ...to === "PAID" ? { paidAt: /* @__PURE__ */ new Date() } : {}
        }
      });
      if (updated.count !== 1) throw conflict("Settlement changed in the meantime");
      await tx.settlementTransaction.create({
        data: {
          settlementId: id,
          fromStatus: s.status,
          toStatus: to,
          amount: s.amount,
          reference: input.reference ?? null,
          note: input.notes ?? null,
          actorId: actor?.auth?.userId ?? null
        }
      });
      if (to === "PAID") {
        await this.post(tx, [
          {
            sellerId: s.sellerId,
            type: "SETTLEMENT_PAYOUT",
            amount: -toPaise(s.amount),
            description: `Payout ${s.settlementNumber}${input.reference ? ` (ref ${input.reference})` : ""}`,
            settlementId: s.id,
            actorId: actor?.auth?.userId
          }
        ]);
      }
      await this.audit.record(
        actor,
        { action: `settlement.${to.toLowerCase()}`, entityType: "Settlement", entityId: id, before: { status: s.status }, after: { status: to, ...input } },
        tx
      );
    });
    await this.notifySettlement(id);
    return this.settlementDetail(id, { sellerId: null });
  }
  async notifySettlement(id) {
    const s = await this.db.settlement.findUnique({ where: { id }, include: { seller: { select: { userId: true } } } });
    if (!s) return;
    await this.notifications.notify({
      key: "settlement.updated",
      userId: s.seller.userId,
      link: "/seller/payouts",
      vars: {
        settlementNumber: s.settlementNumber,
        status: s.status.toLowerCase(),
        amount: `\u20B9${num(s.amount).toFixed(2)}`,
        reference: s.reference ? `Reference: ${s.reference}` : ""
      }
    });
  }
  async listSettlements(scope, q) {
    const where = {
      ...scope.sellerId ? { sellerId: scope.sellerId } : q.sellerId ? { sellerId: q.sellerId } : {},
      ...q.status ? { status: q.status } : {}
    };
    const [items, total, sums] = await Promise.all([
      this.db.settlement.findMany({
        where,
        include: { seller: { select: { id: true, displayName: true, code: true } } },
        orderBy: { createdAt: "desc" },
        ...pageArgs(q.page, q.pageSize)
      }),
      this.db.settlement.count({ where }),
      this.db.settlement.groupBy({ by: ["status"], where, _sum: { amount: true }, _count: { _all: true } })
    ]);
    return {
      ...paginated(items.map((s) => ({ ...s, amount: num(s.amount) })), total, q.page, q.pageSize),
      summary: Object.fromEntries(sums.map((s) => [s.status, { count: s._count._all, amount: num(s._sum.amount) }]))
    };
  }
  async settlementDetail(id, scope) {
    const s = await this.db.settlement.findFirst({
      where: { id, ...scope.sellerId ? { sellerId: scope.sellerId } : {} },
      include: { transactions: { orderBy: { createdAt: "asc" } }, seller: { select: { id: true, displayName: true, code: true } } }
    });
    if (!s) throw notFound("Settlement");
    return { ...s, amount: num(s.amount), transactions: s.transactions.map((t) => ({ ...t, amount: num(t.amount) })) };
  }
  /** Sellers with outstanding balances (admin payout planning). */
  async outstanding() {
    const rows = await this.db.sellerLedger.groupBy({ by: ["sellerId"], _sum: { amount: true } });
    const open = await this.db.settlement.groupBy({ by: ["sellerId"], where: { status: { in: OPEN_SETTLEMENT } }, _sum: { amount: true } });
    const sellers = await this.db.seller.findMany({
      where: { id: { in: rows.map((r) => r.sellerId) } },
      select: { id: true, displayName: true, code: true, status: true }
    });
    return rows.map((r) => {
      const balance = toPaise(r._sum.amount);
      const inSettlement = toPaise(open.find((o) => o.sellerId === r.sellerId)?._sum.amount);
      return {
        seller: sellers.find((s) => s.id === r.sellerId),
        balance: fromPaise(balance),
        inSettlement: fromPaise(inSettlement),
        available: fromPaise(Math.max(0, balance - inSettlement))
      };
    }).filter((r) => r.balance !== 0).sort((a, b) => b.available - a.available);
  }
  // ── Commission rules ───────────────────────────────────────
  async activeRules(db = this.db) {
    const rules = await db.commissionRule.findMany({ where: { isActive: true } });
    return rules.map((r) => ({
      id: r.id,
      scope: r.scope,
      sellerId: r.sellerId,
      categoryId: r.categoryId,
      productId: r.productId,
      percentage: num(r.percentage),
      fixedAmount: toPaise(r.fixedAmount)
    }));
  }
  get defaultCommissionPercent() {
    return this.defaultCommission;
  }
  listRules(q) {
    return this.db.commissionRule.findMany({
      where: { ...q.scope ? { scope: q.scope } : {}, ...q.sellerId ? { sellerId: q.sellerId } : {} },
      include: {
        seller: { select: { id: true, displayName: true } },
        category: { select: { id: true, name: true } },
        product: { select: { id: true, title: true } }
      },
      orderBy: [{ scope: "asc" }, { createdAt: "desc" }]
    });
  }
  ruleData(input) {
    return {
      scope: input.scope,
      sellerId: ["SELLER", "SELLER_CATEGORY"].includes(input.scope) ? input.sellerId ?? null : null,
      categoryId: ["CATEGORY", "SELLER_CATEGORY"].includes(input.scope) ? input.categoryId ?? null : null,
      productId: input.scope === "PRODUCT" ? input.productId ?? null : null,
      percentage: input.percentage,
      fixedAmount: input.fixedAmount,
      isActive: input.isActive
    };
  }
  async createRule(input, actor) {
    const data = this.ruleData(input);
    const dup = await this.db.commissionRule.findFirst({
      where: { scope: data.scope, sellerId: data.sellerId, categoryId: data.categoryId, productId: data.productId, isActive: true }
    });
    if (dup && data.isActive) throw conflict("An active rule already exists for this scope. Edit it instead.");
    const rule = await this.db.commissionRule.create({ data });
    await this.audit.record(actor, { action: "commission.rule_create", entityType: "CommissionRule", entityId: rule.id, after: rule });
    return rule;
  }
  async updateRule(id, input, actor) {
    const before = await this.db.commissionRule.findUnique({ where: { id } });
    if (!before) throw notFound("Commission rule");
    const rule = await this.db.commissionRule.update({ where: { id }, data: this.ruleData(input) });
    await this.audit.record(actor, { action: "commission.rule_update", entityType: "CommissionRule", entityId: id, before, after: rule });
    return rule;
  }
  async deleteRule(id, actor) {
    const before = await this.db.commissionRule.findUnique({ where: { id } });
    if (!before) throw notFound("Commission rule");
    await this.db.commissionRule.delete({ where: { id } });
    await this.audit.record(actor, { action: "commission.rule_delete", entityType: "CommissionRule", entityId: id, before });
  }
  async commissions(scope, q) {
    const where = {
      ...scope.sellerId ? { sellerId: scope.sellerId } : q.sellerId ? { sellerId: q.sellerId } : {},
      ...q.status ? { status: q.status } : {}
    };
    const [items, total] = await Promise.all([
      this.db.commission.findMany({
        where,
        include: {
          orderItem: { select: { productName: true, sku: true, quantity: true, order: { select: { orderNumber: true } } } },
          seller: { select: { displayName: true } }
        },
        orderBy: { createdAt: "desc" },
        ...pageArgs(q.page, q.pageSize)
      }),
      this.db.commission.count({ where })
    ]);
    return paginated(
      items.map((c) => ({ ...c, baseAmount: num(c.baseAmount), rate: num(c.rate), amount: num(c.amount), taxAmount: num(c.taxAmount), fixedAmount: num(c.fixedAmount) })),
      total,
      q.page,
      q.pageSize
    );
  }
};

// src/modules/inventory/inventory.service.ts
var InventoryService = class {
  constructor(db, indexer, audit, notifications) {
    this.db = db;
    this.indexer = indexer;
    this.audit = audit;
    this.notifications = notifications;
  }
  db;
  indexer;
  audit;
  notifications;
  async movement(tx, listingId, type, quantityDelta, reservedDelta, ref) {
    const inv = await tx.inventory.findUniqueOrThrow({ where: { listingId } });
    await tx.inventoryMovement.create({
      data: {
        inventoryId: inv.id,
        type,
        quantityDelta,
        reservedDelta,
        quantityAfter: inv.quantity,
        reservedAfter: inv.reserved,
        reason: ref.reason?.slice(0, 300),
        referenceType: ref.referenceType,
        referenceId: ref.referenceId,
        actorId: ref.actorId ?? null
      }
    });
    return inv;
  }
  /** Reserve stock for an order. Throws OUT_OF_STOCK if fewer than `qty` units are available. */
  async reserve(tx, listingId, qty, ref) {
    const affected = await tx.$executeRaw`
      UPDATE \`Inventory\` SET reserved = reserved + ${qty}, updatedAt = NOW(3)
      WHERE listingId = ${listingId} AND quantity - reserved >= ${qty}`;
    if (affected !== 1) throw outOfStock("Some items in your cart just went out of stock", [{ listingId }]);
    return this.movement(tx, listingId, "RESERVE", 0, qty, ref);
  }
  async release(tx, listingId, qty, ref) {
    const affected = await tx.$executeRaw`
      UPDATE \`Inventory\` SET reserved = reserved - ${qty}, updatedAt = NOW(3)
      WHERE listingId = ${listingId} AND reserved >= ${qty}`;
    if (affected !== 1) throw businessRule("Inventory reservation mismatch", [{ listingId }]);
    return this.movement(tx, listingId, "RELEASE", 0, -qty, ref);
  }
  /** Convert a reservation into a shipped (consumed) unit. */
  async consume(tx, listingId, qty, ref) {
    const affected = await tx.$executeRaw`
      UPDATE \`Inventory\` SET quantity = quantity - ${qty}, reserved = reserved - ${qty}, updatedAt = NOW(3)
      WHERE listingId = ${listingId} AND reserved >= ${qty} AND quantity >= ${qty}`;
    if (affected !== 1) throw businessRule("Inventory reservation mismatch", [{ listingId }]);
    return this.movement(tx, listingId, "SHIP", -qty, -qty, ref);
  }
  async restock(tx, listingId, qty, ref) {
    await tx.$executeRaw`
      UPDATE \`Inventory\` SET quantity = quantity + ${qty}, updatedAt = NOW(3) WHERE listingId = ${listingId}`;
    return this.movement(tx, listingId, "RETURN_RESTOCK", qty, 0, ref);
  }
  async initialize(tx, listingId, sellerId, quantity, lowStockThreshold, ref) {
    await tx.inventory.create({ data: { listingId, sellerId, quantity, lowStockThreshold } });
    return this.movement(tx, listingId, "INITIAL", quantity, 0, ref);
  }
  /**
   * Manual adjustment by a seller (own listings only) or admin. The new on-hand quantity can
   * never fall below the units already reserved for open orders.
   */
  async adjust(listingId, input, actor, scope, type = "ADJUSTMENT", tx) {
    if (input.delta === void 0 && input.setTo === void 0 && input.lowStockThreshold === void 0) {
      throw badRequest("Provide delta, setTo or lowStockThreshold");
    }
    const run = async (db) => {
      const inv = await db.inventory.findFirst({
        where: { listingId, ...scope.sellerId ? { sellerId: scope.sellerId } : {} },
        include: { listing: { select: { productId: true, sku: true } } }
      });
      if (!inv) throw notFound("Inventory");
      if (input.lowStockThreshold !== void 0) {
        await db.inventory.update({ where: { id: inv.id }, data: { lowStockThreshold: input.lowStockThreshold } });
      }
      if (input.delta === void 0 && input.setTo === void 0) return inv;
      const target = input.setTo ?? inv.quantity + (input.delta ?? 0);
      if (target < 0) throw businessRule("Stock cannot be negative");
      const affected = await db.$executeRaw`
        UPDATE \`Inventory\` SET quantity = ${target}, updatedAt = NOW(3),
          lowStockAlertedAt = IF(${target} - reserved > lowStockThreshold, NULL, lowStockAlertedAt)
        WHERE id = ${inv.id} AND ${target} >= reserved`;
      if (affected !== 1) {
        throw businessRule(`Stock cannot be set below the ${inv.reserved} unit(s) reserved for open orders`);
      }
      const after = await this.movement(db, listingId, type, target - inv.quantity, 0, {
        reason: input.reason,
        actorId: actor?.auth?.userId,
        referenceType: "MANUAL"
      });
      await this.audit.record(
        actor,
        {
          action: "inventory.adjust",
          entityType: "Inventory",
          entityId: inv.id,
          before: { quantity: inv.quantity, reserved: inv.reserved },
          after: { quantity: after.quantity, reserved: after.reserved },
          metadata: { sku: inv.listing.sku, reason: input.reason }
        },
        db
      );
      return { ...after, productId: inv.listing.productId, wasAvailable: inv.quantity - inv.reserved };
    };
    if (tx) return run(tx);
    const result = await this.db.$transaction((t) => run(t));
    if ("productId" in result) {
      await this.indexer.refresh([result.productId]);
      if (result.wasAvailable <= 0 && result.quantity - result.reserved > 0) {
        await this.notifyBackInStock(result.productId).catch(() => void 0);
      }
    }
    return result;
  }
  async bulkUpdate(sellerId, items, reason, actor) {
    const results = [];
    for (const item of items) {
      const listing = await this.db.sellerProductListing.findFirst({
        where: { sellerId, sku: item.sku, deletedAt: null },
        select: { id: true }
      });
      if (!listing) {
        results.push({ sku: item.sku, ok: false, error: "SKU not found" });
        continue;
      }
      try {
        await this.adjust(listing.id, { setTo: item.quantity, reason }, actor, { sellerId }, "IMPORT");
        results.push({ sku: item.sku, ok: true });
      } catch (err) {
        results.push({ sku: item.sku, ok: false, error: err.message });
      }
    }
    return { updated: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok), results };
  }
  async list(scope, q) {
    const where = {
      ...scope.sellerId ? { sellerId: scope.sellerId } : {},
      listing: {
        deletedAt: null,
        ...q.q ? { OR: [{ sku: { contains: q.q } }, { product: { title: { contains: q.q } } }] } : {}
      }
    };
    if (q.filter === "low" || q.filter === "out") {
      const sellerCond = scope.sellerId ?? null;
      const rows = q.filter === "out" ? await this.db.$queryRaw`
            SELECT id FROM \`Inventory\` WHERE (${sellerCond} IS NULL OR sellerId = ${sellerCond}) AND quantity - reserved <= 0` : await this.db.$queryRaw`
            SELECT id FROM \`Inventory\` WHERE (${sellerCond} IS NULL OR sellerId = ${sellerCond})
              AND quantity - reserved > 0 AND quantity - reserved <= lowStockThreshold`;
      where.id = { in: rows.map((r) => r.id) };
    }
    const [items, total] = await Promise.all([
      this.db.inventory.findMany({
        where,
        include: {
          listing: {
            select: {
              id: true,
              sku: true,
              price: true,
              status: true,
              isActive: true,
              variant: { select: { name: true } },
              product: { select: { id: true, title: true, slug: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } }
            }
          },
          seller: { select: { id: true, displayName: true } }
        },
        orderBy: { updatedAt: "desc" },
        ...pageArgs(q.page, q.pageSize)
      }),
      this.db.inventory.count({ where })
    ]);
    return paginated(
      items.map((i) => ({ ...i, available: i.quantity - i.reserved, isLow: i.quantity - i.reserved <= i.lowStockThreshold })),
      total,
      q.page,
      q.pageSize
    );
  }
  async movements(listingId, scope, page, pageSize) {
    const inv = await this.db.inventory.findFirst({
      where: { listingId, ...scope.sellerId ? { sellerId: scope.sellerId } : {} }
    });
    if (!inv) throw notFound("Inventory");
    const [items, total] = await Promise.all([
      this.db.inventoryMovement.findMany({ where: { inventoryId: inv.id }, orderBy: { createdAt: "desc" }, ...pageArgs(page, pageSize) }),
      this.db.inventoryMovement.count({ where: { inventoryId: inv.id } })
    ]);
    return paginated(items, total, page, pageSize);
  }
  /** Alert the seller once when a listing crosses its low-stock threshold (re-armed on restock). */
  async checkLowStock(listingIds) {
    for (const listingId of listingIds) {
      const inv = await this.db.inventory.findUnique({
        where: { listingId },
        include: { listing: { select: { sku: true, product: { select: { title: true } } } }, seller: { select: { userId: true } } }
      });
      if (!inv) continue;
      const available = inv.quantity - inv.reserved;
      if (available <= inv.lowStockThreshold && !inv.lowStockAlertedAt) {
        const claimed = await this.db.inventory.updateMany({
          where: { id: inv.id, lowStockAlertedAt: null },
          data: { lowStockAlertedAt: /* @__PURE__ */ new Date() }
        });
        if (claimed.count) {
          await this.notifications.notify({
            key: "inventory.low_stock",
            userId: inv.seller.userId,
            link: "/seller/inventory?filter=low",
            vars: { sku: inv.listing.sku, productName: inv.listing.product.title, available }
          });
        }
      }
    }
  }
  async notifyBackInStock(productId) {
    const subs = await this.db.stockSubscription.findMany({
      where: { productId, notifiedAt: null },
      include: { product: { select: { title: true, slug: true } } },
      take: 500
    });
    for (const s of subs) {
      await this.notifications.notify({
        key: "stock.back_in_stock",
        userId: s.userId,
        link: `/p/${s.product.slug}`,
        vars: { productName: s.product.title }
      });
    }
    if (subs.length) {
      await this.db.stockSubscription.updateMany({ where: { id: { in: subs.map((s) => s.id) } }, data: { notifiedAt: /* @__PURE__ */ new Date() } });
    }
  }
};

// src/modules/notifications/templates.ts
var DEFAULT_TEMPLATES = {
  "auth.welcome": {
    subject: "Welcome to {{brand}}, {{name}}!",
    body: "Hi {{name}}, your {{brand}} account is ready. Start exploring thousands of products from trusted sellers.",
    channels: ["IN_APP", "EMAIL"],
    description: "Customer registration"
  },
  "auth.verify_email": {
    subject: "Verify your email for {{brand}}",
    body: "Hi {{name}}, please confirm your email address by opening this link: {{link}}\nThe link expires in 24 hours.",
    channels: ["EMAIL"],
    description: "Email verification link"
  },
  "auth.password_reset": {
    subject: "Reset your {{brand}} password",
    body: "Hi {{name}}, we received a request to reset your password. Open this link to choose a new one: {{link}}\nThe link expires in 1 hour. If you did not request this, you can ignore this email.",
    channels: ["EMAIL"],
    description: "Password reset link"
  },
  "seller.invite": {
    subject: "You have been invited to sell on {{brand}}",
    body: "Hi {{name}}, a seller account for {{businessName}} has been created for you. Set your password here: {{link}}\nThe link expires in 72 hours.",
    channels: ["EMAIL"],
    description: "Admin-created seller invitation"
  },
  "seller.registered": {
    subject: "We received your seller application",
    body: "Hi {{name}}, thanks for registering {{businessName}} on {{brand}}. Our team will review your application shortly.",
    channels: ["IN_APP", "EMAIL"],
    description: "Seller registration (to seller)"
  },
  "seller.registered_admin": {
    subject: "New seller application: {{businessName}}",
    body: "{{businessName}} ({{email}}) has applied to sell on {{brand}} and is awaiting approval.",
    channels: ["IN_APP"],
    description: "Seller registration (to admins)"
  },
  "seller.approved": {
    subject: "Your seller account is approved \u{1F389}",
    body: "Congratulations {{name}}! {{businessName}} is now approved on {{brand}}. You can start listing products from your seller dashboard.",
    channels: ["IN_APP", "EMAIL"],
    description: "Seller approval"
  },
  "seller.rejected": {
    subject: "Update on your seller application",
    body: "Hi {{name}}, unfortunately we could not approve {{businessName}} at this time. Reason: {{reason}}",
    channels: ["IN_APP", "EMAIL"],
    description: "Seller rejection"
  },
  "seller.suspended": {
    subject: "Your seller account has been suspended",
    body: "Hi {{name}}, {{businessName}} has been suspended. Reason: {{reason}}. Contact support for help.",
    channels: ["IN_APP", "EMAIL"],
    description: "Seller suspension"
  },
  "seller.reactivated": {
    subject: "Your seller account is active again",
    body: "Hi {{name}}, {{businessName}} has been reactivated on {{brand}}.",
    channels: ["IN_APP", "EMAIL"],
    description: "Seller reactivation"
  },
  "product.approved": {
    subject: "Product approved: {{productName}}",
    body: '"{{productName}}" has been approved and is now live on {{brand}}.',
    channels: ["IN_APP", "EMAIL"],
    description: "Product approval"
  },
  "product.rejected": {
    subject: "Product needs changes: {{productName}}",
    body: '"{{productName}}" was not approved. Reason: {{reason}}. Update the listing and resubmit it for review.',
    channels: ["IN_APP", "EMAIL"],
    description: "Product rejection"
  },
  "order.placed": {
    subject: "Order {{orderNumber}} placed successfully",
    body: "Hi {{name}}, thank you for shopping with {{brand}}! Your order {{orderNumber}} of {{amount}} has been placed. Payment: Cash on Delivery.",
    channels: ["IN_APP", "EMAIL"],
    description: "Order placed (customer)"
  },
  "order.new_for_seller": {
    subject: "New order {{subOrderNumber}}",
    body: "You have a new order {{subOrderNumber}} with {{itemCount}} item(s) worth {{amount}}. Please confirm it from your dashboard.",
    channels: ["IN_APP", "EMAIL"],
    description: "New order (seller)"
  },
  "order.status_changed": {
    subject: "Your order {{orderNumber}} is {{status}}",
    body: "Hi {{name}}, items from {{sellerName}} in order {{orderNumber}} are now {{status}}. {{note}}",
    channels: ["IN_APP", "EMAIL"],
    description: "Order status update (customer)"
  },
  "order.shipped": {
    subject: "Shipped: order {{orderNumber}}",
    body: "Good news {{name}}! Items from {{sellerName}} have shipped via {{carrier}}. Tracking number: {{trackingNumber}}.",
    channels: ["IN_APP", "EMAIL", "SMS"],
    description: "Shipment update"
  },
  "order.delivered": {
    subject: "Delivered: order {{orderNumber}}",
    body: "Hi {{name}}, your items from {{sellerName}} have been delivered. We hope you love them \u2014 leave a review!",
    channels: ["IN_APP", "EMAIL"],
    description: "Delivery confirmation"
  },
  "order.cancelled": {
    subject: "Order {{orderNumber}} cancelled",
    body: "Items in order {{orderNumber}} have been cancelled. Reason: {{reason}}",
    channels: ["IN_APP", "EMAIL"],
    description: "Cancellation (customer)"
  },
  "order.cancelled_seller": {
    subject: "Order {{subOrderNumber}} cancelled by customer",
    body: "The customer cancelled {{subOrderNumber}}. Reason: {{reason}}",
    channels: ["IN_APP"],
    description: "Cancellation (seller)"
  },
  "return.requested": {
    subject: "Return requested for {{subOrderNumber}}",
    body: "A customer requested a return ({{returnNumber}}) for {{subOrderNumber}}. Reason: {{reason}}",
    channels: ["IN_APP", "EMAIL"],
    description: "Return request (seller)"
  },
  "return.updated": {
    subject: "Return {{returnNumber}} {{status}}",
    body: "Hi {{name}}, your return {{returnNumber}} is now {{status}}. {{note}}",
    channels: ["IN_APP", "EMAIL"],
    description: "Return update (customer)"
  },
  "settlement.updated": {
    subject: "Settlement {{settlementNumber}} {{status}}",
    body: "Settlement {{settlementNumber}} of {{amount}} is now {{status}}. {{reference}}",
    channels: ["IN_APP", "EMAIL"],
    description: "Settlement status (seller)"
  },
  "inventory.low_stock": {
    subject: "Low stock: {{sku}}",
    body: "{{productName}} ({{sku}}) has only {{available}} unit(s) left.",
    channels: ["IN_APP", "EMAIL"],
    description: "Low-stock alert (seller)"
  },
  "stock.back_in_stock": {
    subject: "Back in stock: {{productName}}",
    body: "{{productName}} is available again on {{brand}}. Grab it before it sells out!",
    channels: ["IN_APP", "EMAIL"],
    description: "Availability notification (customer)"
  }
};
function render(template, vars) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => {
    const v = vars[k];
    return v === void 0 || v === null ? "" : String(v);
  });
}
var escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// src/modules/notifications/notification.service.ts
var JOB = "notification.dispatch";
var NotificationService = class {
  constructor(db, env, channels, jobs, settings) {
    this.db = db;
    this.env = env;
    this.channels = channels;
    this.jobs = jobs;
    this.settings = settings;
    jobs.register(JOB, (payload) => this.dispatch(payload));
  }
  db;
  env;
  channels;
  jobs;
  settings;
  /** Queue a notification. Never throws — notification failures must not break business flows. */
  async notify(input) {
    try {
      await this.jobs.enqueue(JOB, input);
    } catch (err) {
      logger.error({ err, key: input.key }, "failed to enqueue notification");
    }
  }
  /** Notify every active admin (in-app). */
  async notifyAdmins(input) {
    const admins = await this.db.user.findMany({
      where: { status: "ACTIVE", roles: { some: { role: { code: "ADMIN" } } } },
      select: { id: true },
      take: 50
    });
    await Promise.all(admins.map((a) => this.notify({ ...input, userId: a.id })));
  }
  async template(key, channel) {
    const override = await this.db.notificationTemplate.findUnique({ where: { key_channel: { key, channel } } });
    if (override) return override.isActive ? { subject: override.subject, body: override.body } : null;
    const def = DEFAULT_TEMPLATES[key];
    return def ? { subject: def.subject, body: def.body } : null;
  }
  /** Deliver a notification on each channel (runs in the job worker). */
  async dispatch(input) {
    const def = DEFAULT_TEMPLATES[input.key];
    const channels = input.channels ?? def?.channels ?? ["IN_APP"];
    const branding = await this.settings.get("branding");
    const user = input.userId ? await this.db.user.findUnique({ where: { id: input.userId }, select: { id: true, name: true, email: true, phone: true, status: true } }) : null;
    if (user && user.status === "DELETED") return;
    const vars = { brand: branding.name, name: user?.name ?? "", ...input.vars };
    for (const channel of channels) {
      const tpl = await this.template(input.key, channel);
      if (!tpl) continue;
      const subject = render(tpl.subject, vars);
      const body = render(tpl.body, vars);
      try {
        if (channel === "IN_APP" && user) {
          await this.db.notification.create({
            data: {
              userId: user.id,
              type: input.key,
              title: subject.slice(0, 200),
              body: body.slice(0, 1e3),
              link: input.link?.slice(0, 500) ?? null
            }
          });
        }
        if (channel === "EMAIL") {
          const to = input.email ?? user?.email;
          if (!to) continue;
          const msg = await this.db.outboundMessage.create({
            data: { channel: "EMAIL", recipient: to, subject, body, templateKey: input.key }
          });
          try {
            await this.channels.email.send({
              to,
              subject,
              text: body,
              html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#1f2330">${escapeHtml(body).replace(/\n/g, "<br>")}<p style="color:#8a8fa3;font-size:12px;margin-top:24px">${escapeHtml(branding.name)}</p></div>`
            });
            await this.db.outboundMessage.update({ where: { id: msg.id }, data: { status: "SENT", sentAt: /* @__PURE__ */ new Date() } });
          } catch (err) {
            await this.db.outboundMessage.update({
              where: { id: msg.id },
              data: { status: "FAILED", error: String(err.message).slice(0, 1e3) }
            });
          }
        }
        if (channel === "SMS") {
          const to = input.phone ?? user?.phone;
          if (!to) continue;
          await this.channels.sms.send({ to, text: body.slice(0, 300) });
          await this.db.outboundMessage.create({
            data: { channel: "SMS", recipient: to, body: body.slice(0, 300), status: "SENT", sentAt: /* @__PURE__ */ new Date(), templateKey: input.key }
          });
        }
      } catch (err) {
        logger.error({ err, key: input.key, channel }, "notification delivery failed");
      }
    }
  }
  // ── In-app inbox ──────────────────────────────────────────
  async list(userId, page, pageSize, unreadOnly = false) {
    const where = { userId, ...unreadOnly ? { readAt: null } : {} };
    const [items, total, unread] = await Promise.all([
      this.db.notification.findMany({ where, orderBy: { createdAt: "desc" }, ...pageArgs(page, pageSize) }),
      this.db.notification.count({ where }),
      this.db.notification.count({ where: { userId, readAt: null } })
    ]);
    return { ...paginated(items, total, page, pageSize), unread };
  }
  async markRead(userId, id) {
    await this.db.notification.updateMany({
      where: { userId, readAt: null, ...id ? { id } : {} },
      data: { readAt: /* @__PURE__ */ new Date() }
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
      overrides: overrides.filter((o) => o.key === key)
    }));
  }
  async upsertTemplate(key, channel, data) {
    return this.db.notificationTemplate.upsert({
      where: { key_channel: { key, channel } },
      create: { key, channel, ...data },
      update: data
    });
  }
  async outbox(page, pageSize, recipient) {
    const where = recipient ? { recipient } : {};
    const [items, total] = await Promise.all([
      this.db.outboundMessage.findMany({ where, orderBy: { createdAt: "desc" }, ...pageArgs(page, pageSize) }),
      this.db.outboundMessage.count({ where })
    ]);
    return paginated(items, total, page, pageSize);
  }
  get frontendUrl() {
    return this.env.FRONTEND_URL.replace(/\/$/, "");
  }
};

// src/modules/orders/checkout.service.ts
var CheckoutService = class {
  constructor(db, cart, coupons, inventory, shipping, finance, payments, settings, indexer, audit, notifications) {
    this.db = db;
    this.cart = cart;
    this.coupons = coupons;
    this.inventory = inventory;
    this.shipping = shipping;
    this.finance = finance;
    this.payments = payments;
    this.settings = settings;
    this.indexer = indexer;
    this.audit = audit;
    this.notifications = notifications;
  }
  db;
  cart;
  coupons;
  inventory;
  shipping;
  finance;
  payments;
  settings;
  indexer;
  audit;
  notifications;
  /** COD eligibility rules: global switch, order value limits, restricted categories/products, PIN code. */
  async codEligibility(pricing, evaluated, pincode) {
    const cod = await this.settings.get("cod");
    const reasons = [];
    if (!cod.enabled) reasons.push("Cash on Delivery is currently unavailable");
    const total = fromPaise(pricing.grandTotal);
    if (cod.maxOrderValue && total > cod.maxOrderValue) reasons.push(`Cash on Delivery is available for orders up to \u20B9${cod.maxOrderValue}`);
    if (cod.minOrderValue && total < cod.minOrderValue) reasons.push(`Cash on Delivery needs a minimum order of \u20B9${cod.minOrderValue}`);
    const buyable = evaluated.filter((e) => e.purchasable);
    const blocked = buyable.filter((e) => !e.item.listing.product.codAvailable);
    if (blocked.length) reasons.push(`${blocked.map((b) => b.item.listing.product.title).join(", ")} cannot be paid by cash on delivery`);
    if (cod.restrictedCategoryIds.length) {
      const restricted = buyable.filter((e) => cod.restrictedCategoryIds.includes(e.item.listing.product.categoryId));
      if (restricted.length) reasons.push("Some items belong to categories that require prepaid payment");
    }
    if (pincode) {
      const check = await this.shipping.checkPincode(pincode);
      if (!check.serviceable) reasons.push(`We do not deliver to PIN code ${pincode} yet`);
      else if (!check.codAvailable) reasons.push(`Cash on Delivery is not available for PIN code ${pincode}`);
    }
    return { available: reasons.length === 0, reasons };
  }
  async ownAddress(userId, addressId) {
    const address = await this.db.customerAddress.findFirst({ where: { id: addressId, userId, deletedAt: null } });
    if (!address) throw notFound("Address");
    return address;
  }
  /** Checkout summary for the review step. Everything is recomputed server-side. */
  async quote(userId, input) {
    const cart = await this.cart.findCart({ userId });
    const items = cart ? await this.cart.items(cart.id) : [];
    const address = input.addressId ? await this.ownAddress(userId, input.addressId) : null;
    const pincode = address?.pincode ?? input.pincode ?? null;
    const couponCode = input.couponCode ?? cart?.couponCode ?? null;
    const { pricing, couponError, evaluated } = await this.cart.quote(items, {
      userId,
      couponCode,
      shippingMethod: input.shippingMethod
    });
    const [cod, delivery, methods] = await Promise.all([
      this.codEligibility(pricing, evaluated, pincode),
      pincode ? this.shipping.checkPincode(pincode, input.shippingMethod) : Promise.resolve(null),
      this.shipping.methods()
    ]);
    return {
      items: evaluated.map((e) => this.cart.itemView(e)),
      summary: summaryView(pricing),
      couponCode,
      couponError,
      hasIssues: evaluated.some((e) => !e.purchasable) || items.length === 0,
      priceChanged: evaluated.some((e) => e.priceChanged),
      delivery,
      shippingMethods: methods.filter((m) => m.isActive),
      paymentMethods: this.payments.methods().map((m) => ({
        ...m,
        available: m.method === "COD" ? cod.available : false,
        reasons: m.method === "COD" ? cod.reasons : []
      }))
    };
  }
  /**
   * Place an order. Guarantees:
   *  • idempotent per (customer, idempotencyKey) — retries return the original order;
   *  • all prices, discounts, shipping and taxes are recomputed from the database;
   *  • stock is reserved atomically; any shortfall rolls the whole order back;
   *  • coupon redemption is claimed atomically against its usage limit.
   */
  async placeOrder(userId, input, meta) {
    const existing = await this.db.order.findUnique({
      where: { customerId_idempotencyKey: { customerId: userId, idempotencyKey: input.idempotencyKey } },
      select: { id: true, orderNumber: true }
    });
    if (existing) return { ...existing, duplicate: true };
    const [user, address] = await Promise.all([
      this.db.user.findUniqueOrThrow({ where: { id: userId } }),
      this.ownAddress(userId, input.addressId)
    ]);
    if (user.status !== "ACTIVE") throw businessRule("Your account cannot place orders right now");
    const provider = this.payments.get(input.paymentMethod);
    try {
      const result = await this.db.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM \`User\` WHERE id = ${userId} FOR UPDATE`;
          const again = await tx.order.findUnique({
            where: { customerId_idempotencyKey: { customerId: userId, idempotencyKey: input.idempotencyKey } },
            select: { id: true, orderNumber: true }
          });
          if (again) return { ...again, duplicate: true, created: null };
          const cart = await tx.cart.findUnique({ where: { userId } });
          const items = cart ? await this.cart.items(cart.id, tx) : [];
          if (!items.length) throw businessRule("Your cart is empty");
          const couponCode = input.couponCode ?? cart?.couponCode ?? null;
          let coupon = null;
          if (couponCode) coupon = await this.coupons.validate(couponCode, userId, tx);
          const { pricing, evaluated } = await this.cart.quote(items, {
            userId,
            couponCode: coupon?.code ?? null,
            shippingMethod: input.shippingMethod
          });
          const problems = evaluated.filter((e) => !e.purchasable);
          if (problems.length) {
            throw new AppError(
              409,
              "OUT_OF_STOCK",
              "Some items in your cart are unavailable. Please review your cart.",
              problems.map((p) => ({ itemId: p.item.id, listingId: p.item.listingId, issue: p.issue }))
            );
          }
          if (coupon && !pricing.coupon?.applied) throw businessRule(pricing.coupon?.message ?? "Coupon cannot be applied");
          const changed = evaluated.filter((e) => e.priceChanged);
          const expected = input.expectedGrandTotal !== void 0 ? toPaise(input.expectedGrandTotal) : null;
          if (expected !== null && expected !== pricing.grandTotal || expected === null && changed.length) {
            throw new AppError(409, "PRICE_CHANGED", "Prices changed since you added these items. Please review the updated total.", [
              { grandTotal: fromPaise(pricing.grandTotal), items: changed.map((c) => c.item.id) }
            ]);
          }
          const cod = await this.codEligibility(pricing, evaluated, address.pincode);
          if (input.paymentMethod === "COD" && !cod.available) throw businessRule(cod.reasons[0] ?? "Cash on Delivery is unavailable");
          const delivery = await this.shipping.checkPincode(address.pincode, input.shippingMethod);
          if (!delivery.serviceable) throw businessRule(`We do not deliver to PIN code ${address.pincode} yet`);
          const orderNumber = referenceNumber("VY");
          for (const e of evaluated) {
            await this.inventory.reserve(tx, e.item.listingId, e.item.quantity, {
              referenceType: "ORDER",
              referenceId: orderNumber,
              reason: `Reserved for order ${orderNumber}`,
              actorId: userId
            });
          }
          const [rules, commissionSettings, orderSettings, taxSettings] = await Promise.all([
            this.finance.activeRules(tx),
            this.settings.get("commission"),
            this.settings.get("orders"),
            this.settings.get("tax")
          ]);
          const itemByListing = new Map(evaluated.map((e) => [e.item.listingId, e.item]));
          const initialStatus = orderSettings.autoConfirm ? "CONFIRMED" : "PENDING_CONFIRMATION";
          const order = await tx.order.create({
            data: {
              orderNumber,
              customerId: userId,
              idempotencyKey: input.idempotencyKey,
              status: initialStatus,
              paymentMethod: input.paymentMethod,
              paymentStatus: "COD_PENDING",
              shippingMethod: input.shippingMethod,
              itemsSubtotal: decimal(pricing.itemsSubtotal),
              mrpTotal: decimal(pricing.mrpTotal),
              discountTotal: decimal(pricing.discountTotal),
              shippingTotal: decimal(pricing.shippingTotal),
              codFee: decimal(pricing.codFee),
              taxTotal: decimal(pricing.taxTotal),
              grandTotal: decimal(pricing.grandTotal),
              couponId: coupon?.id ?? null,
              couponCode: coupon?.code ?? null,
              shipName: address.fullName,
              shipPhone: address.phone,
              shipLine1: address.line1,
              shipLine2: address.line2,
              shipLandmark: address.landmark,
              shipCity: address.city,
              shipState: address.state,
              shipPincode: address.pincode,
              notes: input.notes ?? null
            }
          });
          const createdSellerOrders = [];
          for (const [gi, group] of pricing.groups.entries()) {
            const first = itemByListing.get(group.lines[0].key);
            let commissionTotal = 0;
            const subOrderNumber = `${orderNumber}-${gi + 1}`;
            const so = await tx.sellerOrder.create({
              data: {
                subOrderNumber,
                orderId: order.id,
                sellerId: group.sellerId,
                status: initialStatus,
                fulfillmentMode: first.listing.seller.fulfillmentMode,
                itemsSubtotal: decimal(group.itemsSubtotal),
                discountTotal: decimal(group.discount),
                shippingTotal: decimal(group.shipping),
                taxTotal: decimal(group.tax),
                grandTotal: decimal(group.total),
                confirmedAt: orderSettings.autoConfirm ? /* @__PURE__ */ new Date() : null
              }
            });
            for (const line of group.lines) {
              const item = itemByListing.get(line.key);
              const rule = resolveCommission(
                rules,
                { sellerId: line.sellerId, productId: line.productId, categoryLineage: line.categoryIds },
                this.finance.defaultCommissionPercent
              );
              const c = commissionFor(line, rule, commissionSettings.taxRate);
              commissionTotal += c.commission;
              const oi = await tx.orderItem.create({
                data: {
                  orderId: order.id,
                  sellerOrderId: so.id,
                  sellerId: line.sellerId,
                  listingId: item.listingId,
                  productId: item.listing.productId,
                  variantId: item.listing.variantId,
                  categoryId: item.listing.product.categoryId,
                  productName: item.listing.product.title,
                  variantName: item.listing.variant.name === "Default" ? null : item.listing.variant.name,
                  sku: item.listing.sku,
                  sellerName: item.listing.seller.displayName,
                  imageUrl: item.listing.product.images[0]?.url ?? null,
                  hsnCode: item.listing.product.hsnCode,
                  unitPrice: decimal(line.unitPrice),
                  unitMrp: decimal(line.unitMrp),
                  quantity: line.quantity,
                  lineSubtotal: decimal(line.lineSubtotal),
                  discountAmount: decimal(line.discount),
                  sellerFundedDiscount: decimal(line.sellerFundedDiscount),
                  shippingAmount: decimal(line.shipping),
                  taxRate: line.taxRate,
                  taxAmount: decimal(line.tax),
                  taxInclusive: taxSettings.pricesInclusive,
                  lineTotal: decimal(line.total),
                  commissionRate: rule.percentage,
                  commissionFixed: decimal(rule.fixedPerUnit),
                  commissionAmount: decimal(c.commission),
                  status: initialStatus,
                  isReturnable: item.listing.product.isReturnable,
                  returnWindowDays: item.listing.product.returnWindowDays
                }
              });
              await tx.commission.create({
                data: {
                  orderItemId: oi.id,
                  sellerId: line.sellerId,
                  baseAmount: decimal(c.base),
                  rate: rule.percentage,
                  fixedAmount: decimal(rule.fixedPerUnit * line.quantity),
                  amount: decimal(c.commission),
                  taxRate: commissionSettings.taxRate,
                  taxAmount: decimal(c.commissionTax),
                  ruleId: rule.ruleId,
                  ruleScope: rule.scope
                }
              });
              await tx.product.update({ where: { id: item.listing.productId }, data: { soldCount: { increment: line.quantity } } });
            }
            await tx.sellerOrder.update({ where: { id: so.id }, data: { commissionTotal: decimal(commissionTotal) } });
            await tx.orderStatusHistory.create({
              data: { orderId: order.id, sellerOrderId: so.id, toStatus: initialStatus, actorId: userId, actorRole: "CUSTOMER", note: "Order placed" }
            });
            createdSellerOrders.push({
              id: so.id,
              sellerId: group.sellerId,
              subOrderNumber,
              total: fromPaise(group.total),
              itemCount: group.lines.reduce((s, l) => s + l.quantity, 0)
            });
          }
          const payment = await provider.createPayment({
            orderId: order.id,
            orderNumber,
            amount: pricing.grandTotal,
            currency: "INR",
            customer: { id: user.id, email: user.email, phone: user.phone, name: user.name }
          });
          await tx.payment.create({
            data: {
              orderId: order.id,
              provider: provider.code,
              method: input.paymentMethod,
              amount: decimal(pricing.grandTotal),
              status: payment.status,
              providerRef: payment.providerRef ?? null
            }
          });
          await tx.order.update({ where: { id: order.id }, data: { paymentStatus: payment.status } });
          await tx.orderStatusHistory.create({
            data: { orderId: order.id, toStatus: initialStatus, actorId: userId, actorRole: "CUSTOMER", note: `Order placed \xB7 ${provider.label}` }
          });
          if (coupon) await this.coupons.redeem(tx, coupon, userId, order.id, pricing.discountTotal + (pricing.coupon?.shippingWaived ?? 0));
          await tx.cartItem.deleteMany({ where: { id: { in: evaluated.map((e) => e.item.id) } } });
          if (cart) await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
          await this.audit.record(
            { auth: null, ip: meta.ip, userAgent: meta.userAgent },
            {
              action: "order.place",
              entityType: "Order",
              entityId: order.id,
              after: { orderNumber, grandTotal: fromPaise(pricing.grandTotal), sellers: createdSellerOrders.length }
            },
            tx
          );
          return {
            id: order.id,
            orderNumber,
            duplicate: false,
            created: { sellerOrders: createdSellerOrders, grandTotal: fromPaise(pricing.grandTotal), listingIds: evaluated.map((e) => e.item.listingId), productIds: evaluated.map((e) => e.item.listing.productId) }
          };
        },
        { maxWait: 1e4, timeout: 3e4 }
      );
      if (result.created) {
        const c = result.created;
        await this.notifications.notify({
          key: "order.placed",
          userId,
          link: `/account/orders/${result.id}`,
          vars: { orderNumber: result.orderNumber, amount: `\u20B9${c.grandTotal.toFixed(2)}` }
        });
        const sellers = await this.db.seller.findMany({ where: { id: { in: c.sellerOrders.map((s) => s.sellerId) } }, select: { id: true, userId: true } });
        for (const so of c.sellerOrders) {
          await this.notifications.notify({
            key: "order.new_for_seller",
            userId: sellers.find((s) => s.id === so.sellerId).userId,
            link: `/seller/orders/${so.id}`,
            vars: { subOrderNumber: so.subOrderNumber, itemCount: so.itemCount, amount: `\u20B9${so.total.toFixed(2)}` }
          });
        }
        await this.indexer.refresh(c.productIds);
        await this.inventory.checkLowStock(c.listingIds).catch((err) => logger.error({ err }, "low-stock check failed"));
      }
      return { id: result.id, orderNumber: result.orderNumber, duplicate: result.duplicate };
    } catch (err) {
      if (isUniqueViolation(err, "idempotencyKey")) {
        const winner = await this.db.order.findUnique({
          where: { customerId_idempotencyKey: { customerId: userId, idempotencyKey: input.idempotencyKey } },
          select: { id: true, orderNumber: true }
        });
        if (winner) return { ...winner, duplicate: true };
      }
      if (err instanceof AppError) throw err;
      if (isUniqueViolation(err)) throw badRequest("Please try placing the order again");
      throw err;
    }
  }
};

// src/modules/orders/fulfillment.service.ts
var activeQty = (i) => i.quantity - i.cancelledQuantity;
var FulfillmentService = class {
  constructor(db, inventory, finance, coupons, shipping, settings, indexer, audit, notifications) {
    this.db = db;
    this.inventory = inventory;
    this.finance = finance;
    this.coupons = coupons;
    this.shipping = shipping;
    this.settings = settings;
    this.indexer = indexer;
    this.audit = audit;
    this.notifications = notifications;
  }
  db;
  inventory;
  finance;
  coupons;
  shipping;
  settings;
  indexer;
  audit;
  notifications;
  actorRole(actor) {
    return primaryRole(actor?.auth ?? null);
  }
  /** Load a sub-order the caller may act on. Other sellers' sub-orders are reported as not found. */
  async loadSellerOrder(tx, sellerOrderId, scope) {
    const so = await tx.sellerOrder.findFirst({
      where: {
        id: sellerOrderId,
        ...scope.kind === "seller" ? { sellerId: scope.sellerId } : {},
        ...scope.kind === "customer" ? { order: { customerId: scope.userId } } : {}
      },
      include: { items: true, order: true, seller: { select: { id: true, status: true, userId: true, displayName: true } } }
    });
    if (!so) throw notFound("Order");
    return so;
  }
  /** Recompute the parent order status and payment amount after any sub-order change. */
  async syncParent(tx, orderId, actor, note) {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { sellerOrders: true, items: true, payments: true } });
    const next = deriveParentStatus(order.sellerOrders.map((s) => s.status));
    const allCancelled = next === "CANCELLED";
    const allDelivered = order.sellerOrders.filter((s) => s.status !== "CANCELLED").every((s) => s.status === "DELIVERED");
    const due = order.items.reduce((s, i) => s + prorate(toPaise(i.lineTotal), activeQty(i), i.quantity), 0) + (allCancelled ? 0 : toPaise(order.codFee));
    const payment = order.payments[0];
    if (payment) {
      const collected = toPaise(payment.collected);
      const status = allCancelled && collected === 0 ? "FAILED" : payment.status;
      await tx.payment.update({ where: { id: payment.id }, data: { amount: decimal(due), status } });
      if (status !== order.paymentStatus) await tx.order.update({ where: { id: orderId }, data: { paymentStatus: status } });
    }
    if (next !== order.status) {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: next,
          cancelledAt: allCancelled ? /* @__PURE__ */ new Date() : void 0,
          deliveredAt: allDelivered && next === "DELIVERED" ? /* @__PURE__ */ new Date() : void 0
        }
      });
      await tx.orderStatusHistory.create({
        data: { orderId, fromStatus: order.status, toStatus: next, note: note ?? null, actorId: actor?.auth?.userId ?? null, actorRole: this.actorRole(actor) }
      });
    }
    if (allCancelled) await this.coupons.release(tx, orderId);
    return next;
  }
  /** Cancel `qty` units of each given item (pre-shipment only). Releases stock and reverses commission. */
  async cancelItems(tx, items, reason, actor) {
    for (const { item, qty } of items) {
      if (qty <= 0) continue;
      if (item.listingId) {
        await this.inventory.release(tx, item.listingId, qty, {
          referenceType: "ORDER_ITEM",
          referenceId: item.id,
          reason: `Cancelled: ${reason}`,
          actorId: actor?.auth?.userId
        });
      }
      const cancelledQuantity = item.cancelledQuantity + qty;
      const full = cancelledQuantity >= item.quantity;
      await tx.orderItem.update({
        where: { id: item.id },
        data: { cancelledQuantity, status: full ? "CANCELLED" : void 0 }
      });
      if (full) await tx.commission.updateMany({ where: { orderItemId: item.id }, data: { status: "REVERSED" } });
      if (item.productId) await tx.product.update({ where: { id: item.productId }, data: { soldCount: { decrement: qty } } });
    }
  }
  // ── Seller / admin fulfillment ─────────────────────────────
  async updateSellerOrderStatus(sellerOrderId, to, input, scope, actor) {
    if (scope.kind === "customer") throw forbidden();
    const result = await this.db.$transaction(async (tx) => {
      const so = await this.loadSellerOrder(tx, sellerOrderId, scope);
      if (!canTransition(so.status, to)) {
        throw businessRule(`An order that is ${ORDER_STATUS_LABELS[so.status].toLowerCase()} cannot be marked ${ORDER_STATUS_LABELS[to].toLowerCase()}`);
      }
      if (scope.kind === "seller" && to !== "CANCELLED") {
        const sellersSettings = await this.settings.get("sellers");
        if (so.seller.status !== "APPROVED") {
          if (to === "CONFIRMED") throw forbidden("Your seller account cannot accept new orders while it is not active");
          if (!(so.seller.status === "SUSPENDED" && sellersSettings.suspendedCanFulfillExisting)) {
            throw forbidden("Your seller account cannot process orders right now");
          }
        }
      }
      if (to === "SHIPPED" && !input.trackingNumber && so.fulfillmentMode === "SELLER") {
        throw badRequest("Enter the carrier and tracking number to mark the order as shipped");
      }
      const moved = await tx.sellerOrder.updateMany({
        where: { id: so.id, status: so.status },
        data: {
          status: to,
          ...to === "CONFIRMED" ? { confirmedAt: /* @__PURE__ */ new Date() } : {},
          ...to === "SHIPPED" ? { shippedAt: /* @__PURE__ */ new Date() } : {},
          ...to === "DELIVERED" ? { deliveredAt: /* @__PURE__ */ new Date() } : {},
          ...to === "CANCELLED" ? { cancelledAt: /* @__PURE__ */ new Date(), cancelReason: input.note ?? "Cancelled by seller" } : {}
        }
      });
      if (moved.count !== 1) throw conflict("This order was updated by someone else. Refresh and try again.");
      const active = so.items.filter((i) => activeQty(i) > 0);
      if (to === "CANCELLED") {
        await this.cancelItems(tx, active.map((item) => ({ item, qty: activeQty(item) })), input.note ?? "Rejected by seller", actor);
      } else {
        await tx.orderItem.updateMany({ where: { id: { in: active.map((i) => i.id) } }, data: { status: to } });
      }
      if (to === "SHIPPED") {
        for (const item of active) {
          if (item.listingId) {
            await this.inventory.consume(tx, item.listingId, activeQty(item), {
              referenceType: "ORDER_ITEM",
              referenceId: item.id,
              reason: `Shipped in ${so.subOrderNumber}`,
              actorId: actor?.auth?.userId
            });
          }
        }
        const rule = await this.shipping.rule(so.order.shippingMethod).catch(() => null);
        const day = 864e5;
        await tx.shipment.create({
          data: {
            sellerOrderId: so.id,
            carrier: input.carrier ?? (so.fulfillmentMode === "PLATFORM" ? "Vyora Logistics" : null),
            trackingNumber: input.trackingNumber ?? null,
            trackingUrl: input.trackingUrl ?? null,
            status: "SHIPPED",
            shippedAt: /* @__PURE__ */ new Date(),
            estimatedFrom: rule ? new Date(Date.now() + rule.minDays * day) : null,
            estimatedTo: rule ? new Date(Date.now() + rule.maxDays * day) : null,
            items: { create: active.map((i) => ({ orderItemId: i.id, quantity: activeQty(i) })) },
            events: { create: { status: "SHIPPED", note: input.note ?? "Handed over to carrier" } }
          }
        });
      }
      if (to === "OUT_FOR_DELIVERY" || to === "DELIVERED") {
        const shipment = await tx.shipment.findFirst({ where: { sellerOrderId: so.id }, orderBy: { createdAt: "desc" } });
        if (shipment) {
          await tx.shipment.update({
            where: { id: shipment.id },
            data: { status: to, ...to === "DELIVERED" ? { deliveredAt: /* @__PURE__ */ new Date() } : {} }
          });
          await tx.shipmentEvent.create({ data: { shipmentId: shipment.id, status: to, note: input.note ?? null } });
        }
      }
      await tx.orderStatusHistory.create({
        data: {
          orderId: so.orderId,
          sellerOrderId: so.id,
          fromStatus: so.status,
          toStatus: to,
          note: input.note ?? null,
          actorId: actor?.auth?.userId ?? null,
          actorRole: this.actorRole(actor)
        }
      });
      await this.syncParent(tx, so.orderId, actor);
      await this.audit.record(
        actor,
        {
          action: `order.fulfillment.${to.toLowerCase()}`,
          entityType: "SellerOrder",
          entityId: so.id,
          before: { status: so.status },
          after: { status: to, ...input }
        },
        tx
      );
      return so;
    });
    const productIds = result.items.map((i) => i.productId).filter(Boolean);
    await this.indexer.refresh(productIds);
    const key = to === "SHIPPED" ? "order.shipped" : to === "DELIVERED" ? "order.delivered" : to === "CANCELLED" ? "order.cancelled" : "order.status_changed";
    await this.notifications.notify({
      key,
      userId: result.order.customerId,
      link: `/account/orders/${result.orderId}`,
      vars: {
        orderNumber: result.order.orderNumber,
        sellerName: result.seller.displayName,
        status: ORDER_STATUS_LABELS[to].toLowerCase(),
        note: input.note ?? "",
        reason: input.note ?? "The seller could not fulfil these items",
        carrier: input.carrier ?? "our delivery partner",
        trackingNumber: input.trackingNumber ?? "\u2014"
      }
    });
    return { id: result.id, status: to };
  }
  // ── Customer cancellation ──────────────────────────────────
  async cancelByCustomer(userId, orderId, input, actor) {
    const affected = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${orderId} AND customerId = ${userId} FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: { id: orderId, customerId: userId },
        include: { sellerOrders: { include: { items: true, seller: { select: { userId: true } } } } }
      });
      if (!order) throw notFound("Order");
      const requested = input.orderItemIds?.length ? new Set(input.orderItemIds) : null;
      const touched = [];
      for (const so of order.sellerOrders) {
        const items = so.items.filter((i) => activeQty(i) > 0 && (!requested || requested.has(i.id)));
        if (!items.length) continue;
        if (!CUSTOMER_CANCELLABLE.includes(so.status)) {
          if (requested) throw businessRule(`Items from ${so.items[0]?.sellerName ?? "this seller"} have already shipped and can no longer be cancelled`);
          continue;
        }
        await this.cancelItems(tx, items.map((item) => ({ item, qty: activeQty(item) })), input.reason, actor);
        const remaining = await tx.orderItem.count({ where: { sellerOrderId: so.id, status: { not: "CANCELLED" } } });
        if (remaining === 0) {
          await tx.sellerOrder.update({
            where: { id: so.id },
            data: { status: "CANCELLED", cancelledAt: /* @__PURE__ */ new Date(), cancelReason: `Customer: ${input.reason}` }
          });
        }
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            sellerOrderId: so.id,
            fromStatus: so.status,
            toStatus: remaining === 0 ? "CANCELLED" : so.status,
            note: `Cancelled by customer (${items.length} item${items.length > 1 ? "s" : ""}): ${input.reason}`,
            actorId: userId,
            actorRole: "CUSTOMER"
          }
        });
        touched.push(so);
      }
      if (requested) {
        const known = new Set(order.sellerOrders.flatMap((s) => s.items.map((i) => i.id)));
        if ([...requested].some((id) => !known.has(id))) throw notFound("Order item");
      }
      if (!touched.length) throw businessRule("Nothing in this order can be cancelled anymore");
      await this.syncParent(tx, orderId, actor, "Cancelled by customer");
      await this.audit.record(actor, { action: "order.cancel", entityType: "Order", entityId: orderId, after: input }, tx);
      return { order, touched };
    });
    await this.indexer.refresh(affected.touched.flatMap((s) => s.items.map((i) => i.productId)).filter(Boolean));
    await this.notifications.notify({
      key: "order.cancelled",
      userId,
      link: `/account/orders/${orderId}`,
      vars: { orderNumber: affected.order.orderNumber, reason: input.reason }
    });
    for (const so of affected.touched) {
      await this.notifications.notify({
        key: "order.cancelled_seller",
        userId: so.seller.userId,
        link: `/seller/orders/${so.id}`,
        vars: { subOrderNumber: so.subOrderNumber, reason: input.reason }
      });
    }
  }
  /** Admin cancellation of a sub-order before shipment (e.g. fraud, unreachable customer). */
  async cancelByAdmin(sellerOrderId, reason, actor) {
    return this.updateSellerOrderStatus(sellerOrderId, "CANCELLED", { note: reason }, { kind: "admin" }, actor);
  }
  // ── COD collection & seller earnings ───────────────────────
  /**
   * Confirm that cash for a delivered sub-order has been received (courier remittance).
   * Only now does the seller earn: sale credit, commission and commission-tax debits and
   * (for seller-fulfilled orders) the shipping fee are posted to the seller ledger.
   */
  async confirmCodCollection(sellerOrderId, input, actor) {
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM \`SellerOrder\` WHERE id = ${sellerOrderId} FOR UPDATE`;
      const so = await tx.sellerOrder.findUnique({
        where: { id: sellerOrderId },
        include: { items: { include: { commission: true } }, order: { include: { payments: true, sellerOrders: true } } }
      });
      if (!so) throw notFound("Order");
      if (so.status !== "DELIVERED") throw businessRule("Cash can only be confirmed for delivered orders");
      if (so.codCollected) throw conflict("Cash collection was already confirmed for this order");
      const payment = so.order.payments[0];
      if (!payment || payment.method !== "COD") throw businessRule("This order is not a Cash on Delivery order");
      const entries = [];
      let collected = 0;
      for (const item of so.items) {
        const qty = activeQty(item);
        if (qty <= 0) continue;
        collected += prorate(toPaise(item.lineTotal), qty, item.quantity);
        const earnQty = qty - item.returnedQuantity;
        if (earnQty <= 0) continue;
        const base = prorate(toPaise(item.lineSubtotal) - toPaise(item.sellerFundedDiscount), earnQty, item.quantity);
        const commission = prorate(toPaise(item.commissionAmount), earnQty, item.quantity);
        const commissionTax = prorate(toPaise(item.commission?.taxAmount ?? 0), earnQty, item.quantity);
        const common = { sellerId: so.sellerId, orderId: so.orderId, sellerOrderId: so.id, orderItemId: item.id, actorId: actor?.auth?.userId };
        entries.push(
          { ...common, type: "SALE_CREDIT", amount: base, description: `Sale ${so.subOrderNumber} \xB7 ${item.productName} \xD7 ${earnQty}` },
          { ...common, type: "COMMISSION_DEBIT", amount: -commission, description: `Commission ${Number(item.commissionRate)}% \xB7 ${so.subOrderNumber}` },
          { ...common, type: "COMMISSION_TAX_DEBIT", amount: -commissionTax, description: `GST on commission \xB7 ${so.subOrderNumber}` }
        );
        if (so.fulfillmentMode === "SELLER") {
          entries.push({
            ...common,
            type: "SHIPPING_CREDIT",
            amount: prorate(toPaise(item.shippingAmount), earnQty, item.quantity),
            description: `Shipping fee \xB7 ${so.subOrderNumber}`
          });
        }
        if (item.commission) await tx.commission.update({ where: { id: item.commission.id }, data: { status: "EARNED" } });
      }
      await this.finance.post(tx, entries);
      await tx.sellerOrder.update({ where: { id: so.id }, data: { codCollected: true, codCollectedAt: /* @__PURE__ */ new Date() } });
      const others = so.order.sellerOrders.filter((s) => s.id !== so.id && s.status !== "CANCELLED");
      const isLast = others.every((s) => s.codCollected);
      const newCollected = toPaise(payment.collected) + collected + (isLast ? toPaise(so.order.codFee) : 0);
      const paid = isLast;
      const hasPendingRefunds = await tx.refund.count({ where: { orderId: so.orderId, status: "PENDING" } }) > 0;
      const status = paid ? hasPendingRefunds ? "REFUND_PENDING" : "PAID" : "COD_PENDING";
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          collected: decimal(newCollected),
          status,
          paidAt: paid ? /* @__PURE__ */ new Date() : void 0,
          providerRef: input.reference ?? payment.providerRef
        }
      });
      await tx.order.update({ where: { id: so.orderId }, data: { paymentStatus: status } });
      await this.audit.record(
        actor,
        {
          action: "payment.cod_collected",
          entityType: "SellerOrder",
          entityId: so.id,
          after: { collected: fromPaise(collected), reference: input.reference, ledgerEntries: entries.length }
        },
        tx
      );
    });
  }
  // ── Returns ────────────────────────────────────────────────
  async requestReturn(userId, orderId, input, actor) {
    const returnsSettings = await this.settings.get("returns");
    if (!returnsSettings.enabled) throw businessRule("Returns are currently not accepted");
    const created = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${orderId} AND customerId = ${userId} FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: { id: orderId, customerId: userId },
        include: {
          items: { include: { returnItems: { include: { returnRequest: { select: { status: true } } } }, sellerOrder: true } }
        }
      });
      if (!order) throw notFound("Order");
      const bySellerOrder = /* @__PURE__ */ new Map();
      for (const req of input.items) {
        const item = order.items.find((i) => i.id === req.orderItemId);
        if (!item) throw notFound("Order item");
        if (item.sellerOrder.status !== "DELIVERED" || !item.sellerOrder.deliveredAt) throw businessRule(`"${item.productName}" has not been delivered yet`);
        if (!item.isReturnable) throw businessRule(`"${item.productName}" is not eligible for return`);
        const deadline = item.sellerOrder.deliveredAt.getTime() + item.returnWindowDays * 864e5;
        if (Date.now() > deadline) throw businessRule(`The return window for "${item.productName}" has closed`);
        const inFlight = item.returnItems.filter((r) => !["REJECTED", "CANCELLED"].includes(r.returnRequest.status)).reduce((s, r) => s + r.quantity, 0);
        const returnable = activeQty(item) - inFlight;
        if (req.quantity > returnable) throw businessRule(`You can return at most ${Math.max(0, returnable)} unit(s) of "${item.productName}"`);
        if (!bySellerOrder.has(item.sellerOrderId)) bySellerOrder.set(item.sellerOrderId, []);
        bySellerOrder.get(item.sellerOrderId).push({ item, qty: req.quantity });
      }
      const requests = [];
      for (const [sellerOrderId, lines] of bySellerOrder) {
        const refundFor = (l) => prorate(toPaise(l.item.lineTotal) - toPaise(l.item.shippingAmount), l.qty, l.item.quantity);
        const total = lines.reduce((s, l) => s + refundFor(l), 0);
        const rr = await tx.returnRequest.create({
          data: {
            returnNumber: referenceNumber("RT"),
            orderId,
            sellerOrderId,
            customerId: userId,
            reason: input.reason,
            comments: input.comments ?? null,
            refundAmount: decimal(total),
            items: {
              create: lines.map((l) => ({ orderItemId: l.item.id, quantity: l.qty, refundAmount: decimal(refundFor(l)) }))
            }
          },
          include: { sellerOrder: { include: { seller: { select: { userId: true } } } } }
        });
        await tx.orderItem.updateMany({ where: { id: { in: lines.map((l) => l.item.id) } }, data: { status: "RETURN_REQUESTED" } });
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            sellerOrderId,
            fromStatus: "DELIVERED",
            toStatus: "RETURN_REQUESTED",
            note: `Return ${rr.returnNumber}: ${input.reason}`,
            actorId: userId,
            actorRole: "CUSTOMER"
          }
        });
        requests.push(rr);
      }
      await this.audit.record(actor, { action: "return.request", entityType: "Order", entityId: orderId, after: input }, tx);
      return requests;
    });
    for (const rr of created) {
      await this.notifications.notify({
        key: "return.requested",
        userId: rr.sellerOrder.seller.userId,
        link: `/seller/returns`,
        vars: { subOrderNumber: rr.sellerOrder.subOrderNumber, returnNumber: rr.returnNumber, reason: rr.reason }
      });
    }
    return created.map((r) => ({ id: r.id, returnNumber: r.returnNumber, refundAmount: Number(r.refundAmount) }));
  }
  async decideReturn(returnId, input, scope, actor) {
    if (scope.kind === "customer") throw forbidden();
    const rr = await this.db.$transaction(async (tx) => {
      const r = await tx.returnRequest.findFirst({
        where: { id: returnId, ...scope.kind === "seller" ? { sellerOrder: { sellerId: scope.sellerId } } : {} },
        include: { items: { include: { orderItem: { include: { commission: true } } } }, sellerOrder: true, order: { include: { payments: true } } }
      });
      if (!r) throw notFound("Return request");
      const itemIds = r.items.map((i) => i.orderItemId);
      if (input.decision === "APPROVE" || input.decision === "REJECT") {
        if (r.status !== "REQUESTED") throw businessRule("This return has already been reviewed");
        const status2 = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
        const moved = await tx.returnRequest.updateMany({
          where: { id: r.id, status: "REQUESTED" },
          data: { status: status2, decisionNote: input.note ?? null, decidedAt: /* @__PURE__ */ new Date() }
        });
        if (moved.count !== 1) throw conflict("This return was updated by someone else");
        await tx.orderItem.updateMany({
          where: { id: { in: itemIds } },
          data: { status: status2 === "APPROVED" ? "RETURN_APPROVED" : "RETURN_REJECTED" }
        });
      } else {
        if (!["APPROVED", "PICKED_UP"].includes(r.status)) throw businessRule("Approve the return before marking it received");
        const moved = await tx.returnRequest.updateMany({
          where: { id: r.id, status: r.status },
          data: { status: "RECEIVED", receivedAt: /* @__PURE__ */ new Date(), restock: input.restock, decisionNote: input.note ?? r.decisionNote }
        });
        if (moved.count !== 1) throw conflict("This return was updated by someone else");
        const ledger = [];
        for (const ri of r.items) {
          const oi = ri.orderItem;
          if (input.restock && oi.listingId) {
            await this.inventory.restock(tx, oi.listingId, ri.quantity, {
              referenceType: "RETURN",
              referenceId: r.id,
              reason: `Return ${r.returnNumber}`,
              actorId: actor?.auth?.userId
            });
          }
          await tx.orderItem.update({
            where: { id: oi.id },
            data: { returnedQuantity: { increment: ri.quantity }, status: toPaise(ri.refundAmount) > 0 ? "REFUND_PENDING" : "RETURNED" }
          });
          if (r.sellerOrder.codCollected) {
            const base = prorate(toPaise(oi.lineSubtotal) - toPaise(oi.sellerFundedDiscount), ri.quantity, oi.quantity);
            const commission = prorate(toPaise(oi.commissionAmount), ri.quantity, oi.quantity);
            const commissionTax = prorate(toPaise(oi.commission?.taxAmount ?? 0), ri.quantity, oi.quantity);
            const common = { sellerId: r.sellerOrder.sellerId, orderId: r.orderId, sellerOrderId: r.sellerOrderId, orderItemId: oi.id, actorId: actor?.auth?.userId };
            ledger.push(
              { ...common, type: "REFUND_DEBIT", amount: -base, description: `Return ${r.returnNumber} \xB7 ${oi.productName} \xD7 ${ri.quantity}` },
              { ...common, type: "COMMISSION_REVERSAL_CREDIT", amount: commission + commissionTax, description: `Commission reversed \xB7 ${r.returnNumber}` }
            );
          }
        }
        await this.finance.post(tx, ledger);
        if (toPaise(r.refundAmount) > 0) {
          const payment = r.order.payments[0];
          await tx.refund.create({
            data: {
              orderId: r.orderId,
              paymentId: payment?.id ?? null,
              returnRequestId: r.id,
              amount: r.refundAmount,
              method: "bank_transfer",
              reason: `Return ${r.returnNumber}: ${r.reason}`
            }
          });
          if (payment && payment.status === "PAID") {
            await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUND_PENDING" } });
            await tx.order.update({ where: { id: r.orderId }, data: { paymentStatus: "REFUND_PENDING" } });
          }
        }
      }
      await tx.orderStatusHistory.create({
        data: {
          orderId: r.orderId,
          sellerOrderId: r.sellerOrderId,
          toStatus: input.decision === "APPROVE" ? "RETURN_APPROVED" : input.decision === "REJECT" ? "RETURN_REJECTED" : "RETURNED",
          note: `Return ${r.returnNumber}${input.note ? `: ${input.note}` : ""}`,
          actorId: actor?.auth?.userId ?? null,
          actorRole: this.actorRole(actor)
        }
      });
      await this.audit.record(actor, { action: `return.${input.decision.toLowerCase()}`, entityType: "ReturnRequest", entityId: r.id, after: input }, tx);
      return r;
    });
    await this.indexer.refresh(rr.items.map((i) => i.orderItem.productId).filter(Boolean));
    const status = input.decision === "APPROVE" ? "approved" : input.decision === "REJECT" ? "rejected" : "received \u2014 refund initiated";
    await this.notifications.notify({
      key: "return.updated",
      userId: rr.customerId,
      link: `/account/orders/${rr.orderId}`,
      vars: { returnNumber: rr.returnNumber, status, note: input.note ?? "" }
    });
  }
  /** Customer withdraws a return that has not been received yet. */
  async cancelReturn(userId, returnId, actor) {
    await this.db.$transaction(async (tx) => {
      const r = await tx.returnRequest.findFirst({ where: { id: returnId, customerId: userId }, include: { items: true } });
      if (!r) throw notFound("Return request");
      if (!["REQUESTED", "APPROVED"].includes(r.status)) throw businessRule("This return can no longer be cancelled");
      await tx.returnRequest.update({ where: { id: r.id }, data: { status: "CANCELLED" } });
      await tx.orderItem.updateMany({ where: { id: { in: r.items.map((i) => i.orderItemId) } }, data: { status: "DELIVERED" } });
      await this.audit.record(actor, { action: "return.cancel", entityType: "ReturnRequest", entityId: r.id }, tx);
    });
  }
  // ── Refunds (admin) ────────────────────────────────────────
  async processRefund(refundId, input, actor) {
    await this.db.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({ where: { id: refundId }, include: { returnRequest: { include: { items: true } } } });
      if (!refund) throw notFound("Refund");
      if (refund.status !== "PENDING") throw businessRule("This refund has already been processed");
      if (!input.failed && !input.reference) throw badRequest("Enter the refund transfer reference");
      const status = input.failed ? "FAILED" : "PROCESSED";
      const moved = await tx.refund.updateMany({
        where: { id: refund.id, status: "PENDING" },
        data: { status, reference: input.reference ?? null, method: input.method ?? refund.method, processedAt: /* @__PURE__ */ new Date(), reason: input.note ?? refund.reason }
      });
      if (moved.count !== 1) throw conflict("Refund changed in the meantime");
      if (status === "PROCESSED") {
        await tx.order.update({ where: { id: refund.orderId }, data: { refundedTotal: { increment: refund.amount } } });
        if (refund.paymentId) await tx.payment.update({ where: { id: refund.paymentId }, data: { refunded: { increment: refund.amount } } });
        if (refund.returnRequest) {
          await tx.returnRequest.update({ where: { id: refund.returnRequest.id }, data: { status: "REFUNDED" } });
          await tx.orderItem.updateMany({ where: { id: { in: refund.returnRequest.items.map((i) => i.orderItemId) } }, data: { status: "REFUNDED" } });
        }
      }
      if (refund.paymentId) {
        const p = await tx.payment.findUniqueOrThrow({ where: { id: refund.paymentId } });
        const pending = await tx.refund.count({ where: { paymentId: p.id, status: "PENDING" } });
        const next = pending > 0 ? "REFUND_PENDING" : toPaise(p.refunded) >= toPaise(p.collected) && toPaise(p.collected) > 0 ? "REFUNDED" : toPaise(p.collected) > 0 ? "PAID" : p.status;
        await tx.payment.update({ where: { id: p.id }, data: { status: next } });
        await tx.order.update({ where: { id: refund.orderId }, data: { paymentStatus: next } });
      }
      await this.audit.record(actor, { action: `refund.${status.toLowerCase()}`, entityType: "Refund", entityId: refund.id, after: input }, tx);
    });
  }
};

// src/modules/orders/order-query.service.ts
var dateRange = (q) => q.from || q.to ? { ...q.from ? { gte: q.from } : {}, ...q.to ? { lte: q.to } : {} } : void 0;
var money = (v) => num(v);
function customerItem(i) {
  return {
    id: i.id,
    productId: i.productId,
    productName: i.productName,
    variantName: i.variantName,
    sku: i.sku,
    imageUrl: i.imageUrl,
    sellerName: i.sellerName,
    unitPrice: money(i.unitPrice),
    unitMrp: money(i.unitMrp),
    quantity: i.quantity,
    cancelledQuantity: i.cancelledQuantity,
    returnedQuantity: i.returnedQuantity,
    discount: money(i.discountAmount),
    shipping: money(i.shippingAmount),
    taxRate: money(i.taxRate),
    tax: money(i.taxAmount),
    lineTotal: money(i.lineTotal),
    status: i.status,
    isReturnable: i.isReturnable,
    returnWindowDays: i.returnWindowDays
  };
}
var OrderQueryService = class {
  constructor(db) {
    this.db = db;
  }
  db;
  // ── Customer ───────────────────────────────────────────────
  async customerOrders(userId, q) {
    const where = {
      customerId: userId,
      ...q.status ? { status: q.status } : {},
      ...dateRange(q) ? { placedAt: dateRange(q) } : {},
      ...q.q ? { OR: [{ orderNumber: { contains: q.q } }, { items: { some: { productName: { contains: q.q } } } }] } : {}
    };
    const [items, total] = await Promise.all([
      this.db.order.findMany({
        where,
        orderBy: { placedAt: "desc" },
        ...pageArgs(q.page, q.pageSize),
        include: {
          items: { select: { id: true, productName: true, imageUrl: true, quantity: true, status: true, variantName: true } },
          sellerOrders: { select: { id: true, status: true } }
        }
      }),
      this.db.order.count({ where })
    ]);
    return paginated(
      items.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        statusLabel: ORDER_STATUS_LABELS[o.status],
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        grandTotal: money(o.grandTotal),
        placedAt: o.placedAt,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        items: o.items.slice(0, 4),
        shipments: o.sellerOrders.length
      })),
      total,
      q.page,
      q.pageSize
    );
  }
  async customerOrder(userId, orderId) {
    const o = await this.db.order.findFirst({
      where: { id: orderId, customerId: userId },
      include: {
        items: true,
        sellerOrders: {
          include: {
            seller: { select: { displayName: true, slug: true } },
            shipments: { include: { events: { orderBy: { occurredAt: "asc" } } }, orderBy: { createdAt: "asc" } }
          },
          orderBy: { createdAt: "asc" }
        },
        payments: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
        returns: { include: { items: true }, orderBy: { createdAt: "desc" } },
        refunds: { orderBy: { createdAt: "desc" } }
      }
    });
    if (!o) throw notFound("Order");
    const payment = o.payments[0];
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      statusLabel: ORDER_STATUS_LABELS[o.status],
      placedAt: o.placedAt,
      deliveredAt: o.deliveredAt,
      cancelledAt: o.cancelledAt,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      shippingMethod: o.shippingMethod,
      couponCode: o.couponCode,
      notes: o.notes,
      address: {
        fullName: o.shipName,
        phone: o.shipPhone,
        line1: o.shipLine1,
        line2: o.shipLine2,
        landmark: o.shipLandmark,
        city: o.shipCity,
        state: o.shipState,
        pincode: o.shipPincode
      },
      totals: {
        mrpTotal: money(o.mrpTotal),
        itemsSubtotal: money(o.itemsSubtotal),
        discount: money(o.discountTotal),
        shipping: money(o.shippingTotal),
        codFee: money(o.codFee),
        tax: money(o.taxTotal),
        grandTotal: money(o.grandTotal),
        refunded: money(o.refundedTotal),
        amountDue: payment ? fromPaise(Math.max(0, toPaise(payment.amount) - toPaise(payment.collected))) : 0,
        payable: payment ? money(payment.amount) : money(o.grandTotal)
      },
      sellerOrders: o.sellerOrders.map((so) => ({
        id: so.id,
        subOrderNumber: so.subOrderNumber,
        status: so.status,
        statusLabel: ORDER_STATUS_LABELS[so.status],
        seller: so.seller,
        canCancel: CUSTOMER_CANCELLABLE.includes(so.status),
        deliveredAt: so.deliveredAt,
        shippedAt: so.shippedAt,
        total: money(so.grandTotal),
        items: o.items.filter((i) => i.sellerOrderId === so.id).map((i) => {
          const deadline = so.deliveredAt ? so.deliveredAt.getTime() + i.returnWindowDays * 864e5 : null;
          const inReturn = o.returns.filter((r) => !["REJECTED", "CANCELLED"].includes(r.status)).flatMap((r) => r.items).filter((ri) => ri.orderItemId === i.id).reduce((s, ri) => s + ri.quantity, 0);
          return {
            ...customerItem(i),
            returnableQuantity: so.status === "DELIVERED" && i.isReturnable && deadline && Date.now() <= deadline ? Math.max(0, i.quantity - i.cancelledQuantity - inReturn) : 0,
            returnDeadline: deadline ? new Date(deadline) : null
          };
        }),
        shipments: so.shipments.map((s) => ({
          id: s.id,
          carrier: s.carrier,
          trackingNumber: s.trackingNumber,
          trackingUrl: s.trackingUrl,
          status: s.status,
          shippedAt: s.shippedAt,
          deliveredAt: s.deliveredAt,
          estimatedFrom: s.estimatedFrom,
          estimatedTo: s.estimatedTo,
          events: s.events
        }))
      })),
      history: o.statusHistory.map((h) => ({ id: h.id, sellerOrderId: h.sellerOrderId, fromStatus: h.fromStatus, toStatus: h.toStatus, note: h.note, createdAt: h.createdAt })),
      returns: o.returns.map((r) => ({
        id: r.id,
        returnNumber: r.returnNumber,
        status: r.status,
        reason: r.reason,
        refundAmount: money(r.refundAmount),
        createdAt: r.createdAt,
        decisionNote: r.decisionNote,
        items: r.items.map((ri) => ({ orderItemId: ri.orderItemId, quantity: ri.quantity, refundAmount: money(ri.refundAmount) }))
      })),
      refunds: o.refunds.map((r) => ({ id: r.id, amount: money(r.amount), status: r.status, method: r.method, reference: r.reference, processedAt: r.processedAt, createdAt: r.createdAt })),
      payment: payment ? { status: payment.status, amount: money(payment.amount), collected: money(payment.collected), refunded: money(payment.refunded), paidAt: payment.paidAt } : null
    };
  }
  // ── Seller (strictly scoped to the authenticated seller) ───
  async sellerOrders(sellerId, q) {
    const where = {
      sellerId,
      ...q.status ? { status: q.status } : {},
      ...dateRange(q) ? { createdAt: dateRange(q) } : {},
      ...q.q ? { OR: [{ subOrderNumber: { contains: q.q } }, { items: { some: { OR: [{ productName: { contains: q.q } }, { sku: { contains: q.q } }] } } }] } : {}
    };
    const [items, total, counts] = await Promise.all([
      this.db.sellerOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...pageArgs(q.page, q.pageSize),
        include: {
          items: { select: { id: true, productName: true, variantName: true, sku: true, imageUrl: true, quantity: true, cancelledQuantity: true, unitPrice: true, status: true } },
          order: { select: { orderNumber: true, shipName: true, shipCity: true, shipState: true, shipPincode: true, paymentMethod: true, placedAt: true } }
        }
      }),
      this.db.sellerOrder.count({ where }),
      this.db.sellerOrder.groupBy({ by: ["status"], where: { sellerId }, _count: { _all: true } })
    ]);
    return {
      ...paginated(
        items.map((so) => ({
          id: so.id,
          subOrderNumber: so.subOrderNumber,
          orderNumber: so.order.orderNumber,
          status: so.status,
          statusLabel: ORDER_STATUS_LABELS[so.status],
          placedAt: so.order.placedAt,
          paymentMethod: so.order.paymentMethod,
          codCollected: so.codCollected,
          customer: { name: so.order.shipName, city: so.order.shipCity, state: so.order.shipState, pincode: so.order.shipPincode },
          total: money(so.grandTotal),
          commission: money(so.commissionTotal),
          items: so.items.map((i) => ({ ...i, unitPrice: money(i.unitPrice) }))
        })),
        total,
        q.page,
        q.pageSize
      ),
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all]))
    };
  }
  async sellerOrder(sellerOrderId, scope) {
    const so = await this.db.sellerOrder.findFirst({
      where: { id: sellerOrderId, ...scope.sellerId ? { sellerId: scope.sellerId } : {} },
      include: {
        items: { include: { commission: true } },
        order: true,
        seller: { select: { id: true, displayName: true, code: true, fulfillmentMode: true, addresses: { where: { isPickup: true }, take: 1 } } },
        shipments: { include: { events: { orderBy: { occurredAt: "asc" } }, items: true } },
        statusHistory: { orderBy: { createdAt: "asc" } },
        returns: { include: { items: true }, orderBy: { createdAt: "desc" } }
      }
    });
    if (!so) throw notFound("Order");
    return {
      id: so.id,
      subOrderNumber: so.subOrderNumber,
      orderId: scope.sellerId ? void 0 : so.orderId,
      orderNumber: so.order.orderNumber,
      status: so.status,
      statusLabel: ORDER_STATUS_LABELS[so.status],
      fulfillmentMode: so.fulfillmentMode,
      placedAt: so.order.placedAt,
      confirmedAt: so.confirmedAt,
      shippedAt: so.shippedAt,
      deliveredAt: so.deliveredAt,
      cancelledAt: so.cancelledAt,
      cancelReason: so.cancelReason,
      paymentMethod: so.order.paymentMethod,
      codCollected: so.codCollected,
      codCollectedAt: so.codCollectedAt,
      shippingMethod: so.order.shippingMethod,
      // Delivery details needed to fulfil — no customer email or account data.
      deliveryAddress: {
        fullName: so.order.shipName,
        phone: so.order.shipPhone,
        line1: so.order.shipLine1,
        line2: so.order.shipLine2,
        landmark: so.order.shipLandmark,
        city: so.order.shipCity,
        state: so.order.shipState,
        pincode: so.order.shipPincode
      },
      seller: { id: so.seller.id, name: so.seller.displayName, code: so.seller.code, pickupAddress: so.seller.addresses[0] ?? null },
      totals: {
        itemsSubtotal: money(so.itemsSubtotal),
        discount: money(so.discountTotal),
        shipping: money(so.shippingTotal),
        tax: money(so.taxTotal),
        total: money(so.grandTotal),
        commission: money(so.commissionTotal)
      },
      items: so.items.map((i) => ({
        ...customerItem(i),
        sellerFundedDiscount: money(i.sellerFundedDiscount),
        commissionRate: money(i.commissionRate),
        commissionAmount: money(i.commissionAmount),
        commissionTax: money(i.commission?.taxAmount),
        hsnCode: i.hsnCode
      })),
      shipments: so.shipments,
      history: so.statusHistory,
      returns: so.returns.map((r) => ({ ...r, refundAmount: money(r.refundAmount), items: r.items.map((ri) => ({ ...ri, refundAmount: money(ri.refundAmount) })) }))
    };
  }
  /** Printable packing slip (HTML) for a seller sub-order. */
  async packingSlip(sellerOrderId, scope, brand) {
    const so = await this.sellerOrder(sellerOrderId, scope);
    const rows = so.items.filter((i) => i.quantity - i.cancelledQuantity > 0).map(
      (i) => `<tr><td>${escapeHtml(i.sku)}</td><td>${escapeHtml(i.productName)}${i.variantName ? ` <small>(${escapeHtml(i.variantName)})</small>` : ""}</td><td class="r">${i.quantity - i.cancelledQuantity}</td></tr>`
    ).join("");
    const a = so.deliveryAddress;
    const cod = so.paymentMethod === "COD" ? `<p class="cod">CASH ON DELIVERY \u2014 collect \u20B9${so.totals.total.toFixed(2)}</p>` : "";
    return `<!doctype html><html><head><meta charset="utf-8"><title>Packing slip ${escapeHtml(so.subOrderNumber)}</title>
<style>body{font-family:system-ui,sans-serif;color:#111;margin:32px}h1{font-size:20px;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}
td,th{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px}.r{text-align:right}.grid{display:flex;gap:32px;margin-top:16px}
.box{flex:1;border:1px solid #ccc;padding:12px;font-size:13px;line-height:1.5}.cod{font-weight:700;border:2px dashed #111;padding:8px;text-align:center}
@media print{button{display:none}}</style></head><body>
<button onclick="window.print()">Print</button>
<h1>${escapeHtml(brand)} \xB7 Packing slip</h1>
<p>Sub-order <b>${escapeHtml(so.subOrderNumber)}</b> \xB7 Order ${escapeHtml(so.orderNumber)} \xB7 Placed ${so.placedAt.toISOString().slice(0, 10)}</p>
${cod}
<div class="grid"><div class="box"><b>Ship to</b><br>${escapeHtml(a.fullName)}<br>${escapeHtml(a.line1)}${a.line2 ? `<br>${escapeHtml(a.line2)}` : ""}${a.landmark ? `<br>Near ${escapeHtml(a.landmark)}` : ""}<br>${escapeHtml(a.city)}, ${escapeHtml(a.state)} ${escapeHtml(a.pincode)}<br>Phone: ${escapeHtml(a.phone)}</div>
<div class="box"><b>From</b><br>${escapeHtml(so.seller.name)} (${escapeHtml(so.seller.code)})${so.seller.pickupAddress ? `<br>${escapeHtml(so.seller.pickupAddress.line1)}<br>${escapeHtml(so.seller.pickupAddress.city)}, ${escapeHtml(so.seller.pickupAddress.state)} ${escapeHtml(so.seller.pickupAddress.pincode)}` : ""}</div></div>
<table><thead><tr><th>SKU</th><th>Item</th><th class="r">Qty</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
  }
  // ── Admin ──────────────────────────────────────────────────
  async adminOrders(q) {
    const where = {
      ...q.status ? { status: q.status } : {},
      ...q.paymentStatus ? { paymentStatus: q.paymentStatus } : {},
      ...q.sellerId ? { sellerOrders: { some: { sellerId: q.sellerId } } } : {},
      ...dateRange(q) ? { placedAt: dateRange(q) } : {},
      ...q.q ? {
        OR: [
          { orderNumber: { contains: q.q } },
          { shipName: { contains: q.q } },
          { shipPhone: { contains: q.q } },
          { customer: { email: { contains: q.q } } }
        ]
      } : {}
    };
    const [items, total] = await Promise.all([
      this.db.order.findMany({
        where,
        orderBy: { placedAt: "desc" },
        ...pageArgs(q.page, q.pageSize),
        include: {
          customer: { select: { id: true, name: true, email: true } },
          sellerOrders: { select: { id: true, subOrderNumber: true, status: true, codCollected: true, seller: { select: { displayName: true } } } },
          _count: { select: { items: true } }
        }
      }),
      this.db.order.count({ where })
    ]);
    return paginated(
      items.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        grandTotal: money(o.grandTotal),
        placedAt: o.placedAt,
        customer: o.customer,
        city: o.shipCity,
        itemCount: o._count.items,
        sellerOrders: o.sellerOrders
      })),
      total,
      q.page,
      q.pageSize
    );
  }
  async adminOrder(orderId) {
    const o = await this.db.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        items: { include: { commission: true } },
        sellerOrders: { include: { seller: { select: { id: true, displayName: true, code: true } }, shipments: { include: { events: true } } } },
        payments: { include: { refunds: true } },
        statusHistory: { orderBy: { createdAt: "asc" } },
        returns: { include: { items: true } },
        refunds: true,
        couponUsages: true
      }
    });
    if (!o) throw notFound("Order");
    return JSON.parse(JSON.stringify(o, (_k, v) => v && typeof v === "object" && v.constructor?.name === "Decimal" ? Number(v) : v));
  }
  async returns(scope, q) {
    const where = {
      ...scope.sellerId ? { sellerOrder: { sellerId: scope.sellerId } } : {},
      ...scope.customerId ? { customerId: scope.customerId } : {},
      ...q.status ? { status: q.status } : {}
    };
    const [items, total] = await Promise.all([
      this.db.returnRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...pageArgs(q.page, q.pageSize),
        include: {
          items: { include: { orderItem: { select: { productName: true, variantName: true, sku: true, imageUrl: true } } } },
          sellerOrder: { select: { id: true, subOrderNumber: true, seller: { select: { displayName: true } } } },
          order: { select: { orderNumber: true, shipName: true, shipCity: true } },
          refunds: true
        }
      }),
      this.db.returnRequest.count({ where })
    ]);
    return paginated(
      items.map((r) => ({
        ...r,
        refundAmount: money(r.refundAmount),
        items: r.items.map((i) => ({ ...i, refundAmount: money(i.refundAmount) })),
        refunds: r.refunds.map((f) => ({ ...f, amount: money(f.amount) }))
      })),
      total,
      q.page,
      q.pageSize
    );
  }
  async refunds(q) {
    const where = q.status ? { status: q.status } : {};
    const [items, total] = await Promise.all([
      this.db.refund.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...pageArgs(q.page, q.pageSize),
        include: { order: { select: { orderNumber: true, shipName: true, customer: { select: { email: true } } } }, returnRequest: { select: { returnNumber: true } } }
      }),
      this.db.refund.count({ where })
    ]);
    return paginated(items.map((r) => ({ ...r, amount: money(r.amount) })), total, q.page, q.pageSize);
  }
  /** Delivered sub-orders whose COD cash has not been reconciled yet. */
  async codPending(q) {
    const where = { status: "DELIVERED", codCollected: false, order: { paymentMethod: "COD" } };
    const [items, total, agg] = await Promise.all([
      this.db.sellerOrder.findMany({
        where,
        orderBy: { deliveredAt: "asc" },
        ...pageArgs(q.page, q.pageSize),
        include: { seller: { select: { displayName: true } }, order: { select: { orderNumber: true, shipName: true, shipCity: true } }, items: true }
      }),
      this.db.sellerOrder.count({ where }),
      this.db.sellerOrder.aggregate({ where, _sum: { grandTotal: true } })
    ]);
    return {
      ...paginated(
        items.map((so) => ({
          id: so.id,
          subOrderNumber: so.subOrderNumber,
          orderNumber: so.order.orderNumber,
          seller: so.seller.displayName,
          customer: so.order.shipName,
          city: so.order.shipCity,
          deliveredAt: so.deliveredAt,
          amountDue: fromPaise(so.items.reduce((s, i) => s + Math.round(toPaise(i.lineTotal) * (i.quantity - i.cancelledQuantity) / i.quantity), 0))
        })),
        total,
        q.page,
        q.pageSize
      ),
      totalOutstanding: money(agg._sum.grandTotal)
    };
  }
};

// src/modules/payments/payment-provider.ts
var CashOnDeliveryProvider = class {
  code = "cod";
  method = "COD";
  label = "Cash on Delivery";
  async createPayment() {
    return { status: "COD_PENDING" };
  }
  async verifyPayment(payment, payload) {
    const collected = payment.collected + payload.amount;
    return { status: collected >= payment.amount ? "PAID" : "COD_PENDING", collected };
  }
  async refundPayment() {
    return { status: "PENDING" };
  }
  async getPaymentStatus(payment) {
    return payment.status;
  }
};
var PaymentRegistry = class {
  providers = /* @__PURE__ */ new Map();
  constructor(providers) {
    for (const p of providers) this.providers.set(p.method, p);
  }
  get(method) {
    const p = this.providers.get(method);
    if (!p) throw new Error(`Payment method ${method} is not configured`);
    return p;
  }
  methods() {
    return [...this.providers.values()].map((p) => ({ method: p.method, code: p.code, label: p.label }));
  }
};

// src/modules/reviews/review.service.ts
var ReviewService = class {
  constructor(db, storage, settings, audit) {
    this.db = db;
    this.storage = storage;
    this.settings = settings;
    this.audit = audit;
  }
  db;
  storage;
  settings;
  audit;
  /** Recompute product & seller rating aggregates from approved reviews. */
  async refreshRatings(productId) {
    const agg = await this.db.review.aggregate({
      where: { productId, status: "APPROVED", deletedAt: null },
      _avg: { rating: true },
      _count: { _all: true }
    });
    await this.db.product.update({
      where: { id: productId },
      data: { ratingAvg: Number((agg._avg.rating ?? 0).toFixed(2)), ratingCount: agg._count._all }
    });
    const owner = await this.db.product.findUnique({ where: { id: productId }, select: { ownerSellerId: true } });
    if (owner?.ownerSellerId) {
      const s = await this.db.review.aggregate({
        where: { status: "APPROVED", deletedAt: null, product: { ownerSellerId: owner.ownerSellerId } },
        _avg: { rating: true },
        _count: { _all: true }
      });
      await this.db.seller.update({
        where: { id: owner.ownerSellerId },
        data: { ratingAvg: Number((s._avg.rating ?? 0).toFixed(2)), ratingCount: s._count._all }
      });
    }
  }
  /** Whether (and via which order item) the user may review this product. */
  async eligibility(userId, productId) {
    const [existing, item] = await Promise.all([
      this.db.review.findUnique({ where: { productId_userId: { productId, userId } } }),
      this.db.orderItem.findFirst({
        where: { productId, order: { customerId: userId }, sellerOrder: { status: "DELIVERED" }, review: null },
        orderBy: { createdAt: "desc" },
        select: { id: true }
      })
    ]);
    const settings = await this.settings.get("reviews");
    return {
      canReview: !existing && (Boolean(item) || !settings.onlyVerifiedPurchasers),
      verifiedPurchase: Boolean(item),
      orderItemId: item?.id ?? null,
      existingReviewId: existing?.id ?? null
    };
  }
  async create(userId, input, files) {
    const product = await this.db.product.findFirst({ where: { id: input.productId, deletedAt: null, status: "APPROVED" } });
    if (!product) throw notFound("Product");
    const settings = await this.settings.get("reviews");
    let orderItemId = null;
    if (input.orderItemId) {
      const item = await this.db.orderItem.findFirst({
        where: { id: input.orderItemId, productId: input.productId, order: { customerId: userId }, sellerOrder: { status: "DELIVERED" } },
        include: { review: true }
      });
      if (!item) throw forbidden("You can only review items from your delivered orders");
      if (item.review) throw conflict("You have already reviewed this purchase");
      orderItemId = item.id;
    } else {
      const eligible2 = await this.eligibility(userId, input.productId);
      orderItemId = eligible2.orderItemId;
    }
    if (!orderItemId && settings.onlyVerifiedPurchasers) throw forbidden("Only customers who bought this product can review it");
    if (await this.db.review.findUnique({ where: { productId_userId: { productId: input.productId, userId } } })) {
      throw conflict("You have already reviewed this product");
    }
    if (files.length > 5) throw businessRule("You can attach at most 5 photos");
    const images = [];
    for (const f of files) images.push(await storeOptimizedImage(this.storage, "reviews", f.buffer, f.mimeType));
    const review = await this.db.review.create({
      data: {
        productId: input.productId,
        userId,
        orderItemId,
        rating: input.rating,
        title: plainText(input.title) || null,
        body: plainText(input.body) || null,
        isVerifiedPurchase: Boolean(orderItemId),
        status: settings.requireModeration ? "PENDING" : "APPROVED",
        images: { create: images.map((i) => ({ url: i.url, storageKey: i.key })) }
      }
    });
    if (review.status === "APPROVED") await this.refreshRatings(input.productId);
    return review;
  }
  async forProduct(productId, q) {
    const where = {
      productId,
      status: "APPROVED",
      deletedAt: null,
      ...q.rating ? { rating: q.rating } : {},
      ...q.withPhotos ? { images: { some: {} } } : {}
    };
    const orderBy = q.sort === "helpful" ? [{ helpfulCount: "desc" }, { createdAt: "desc" }] : q.sort === "rating_high" ? [{ rating: "desc" }] : q.sort === "rating_low" ? [{ rating: "asc" }] : [{ createdAt: "desc" }];
    const [items, total] = await Promise.all([
      this.db.review.findMany({
        where,
        orderBy,
        ...pageArgs(q.page, q.pageSize),
        include: { images: true, user: { select: { name: true } } }
      }),
      this.db.review.count({ where })
    ]);
    return paginated(
      items.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        isVerifiedPurchase: r.isVerifiedPurchase,
        helpfulCount: r.helpfulCount,
        createdAt: r.createdAt,
        author: r.user.name.split(" ")[0],
        images: r.images.map((i) => ({ id: i.id, url: i.url }))
      })),
      total,
      q.page,
      q.pageSize
    );
  }
  mine(userId) {
    return this.db.review.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { title: true, slug: true } }, images: true }
    });
  }
  async remove(userId, reviewId) {
    const r = await this.db.review.findFirst({ where: { id: reviewId, userId, deletedAt: null } });
    if (!r) throw notFound("Review");
    await this.db.review.update({ where: { id: r.id }, data: { deletedAt: /* @__PURE__ */ new Date(), orderItemId: null } });
    await this.refreshRatings(r.productId);
  }
  async report(userId, reviewId, reason) {
    const r = await this.db.review.findFirst({ where: { id: reviewId, status: "APPROVED", deletedAt: null } });
    if (!r) throw notFound("Review");
    if (r.userId === userId) throw businessRule("You cannot report your own review");
    await this.db.reviewReport.upsert({
      where: { reviewId_userId: { reviewId, userId } },
      create: { reviewId, userId, reason },
      update: { reason, resolvedAt: null }
    });
  }
  async markHelpful(reviewId) {
    await this.db.review.updateMany({ where: { id: reviewId, status: "APPROVED" }, data: { helpfulCount: { increment: 1 } } });
  }
  // ── Moderation ─────────────────────────────────────────────
  async moderationQueue(q) {
    const where = {
      deletedAt: null,
      ...q.status ? { status: q.status } : {},
      ...q.reported ? { reports: { some: { resolvedAt: null } } } : {}
    };
    const [items, total] = await Promise.all([
      this.db.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...pageArgs(q.page, q.pageSize),
        include: {
          images: true,
          user: { select: { name: true, email: true } },
          product: { select: { id: true, title: true, slug: true } },
          reports: { where: { resolvedAt: null } }
        }
      }),
      this.db.review.count({ where })
    ]);
    return paginated(items, total, q.page, q.pageSize);
  }
  async moderate(reviewId, status, note, actor) {
    const r = await this.db.review.findFirst({ where: { id: reviewId, deletedAt: null } });
    if (!r) throw notFound("Review");
    await this.db.review.update({ where: { id: reviewId }, data: { status, moderationNote: note ?? null } });
    await this.db.reviewReport.updateMany({ where: { reviewId, resolvedAt: null }, data: { resolvedAt: /* @__PURE__ */ new Date() } });
    await this.audit.record(actor, { action: `review.${status.toLowerCase()}`, entityType: "Review", entityId: reviewId, before: { status: r.status }, after: { status, note } });
    await this.refreshRatings(r.productId);
  }
  async stats() {
    const [pending, reported, avg] = await Promise.all([
      this.db.review.count({ where: { status: "PENDING", deletedAt: null } }),
      this.db.review.count({ where: { deletedAt: null, reports: { some: { resolvedAt: null } } } }),
      this.db.review.aggregate({ where: { status: "APPROVED", deletedAt: null }, _avg: { rating: true } })
    ]);
    return { pending, reported, averageRating: num(avg._avg.rating ?? 0) };
  }
};

// src/modules/sellers/seller.service.ts
import { randomUUID as randomUUID2 } from "crypto";
var TRANSITIONS = {
  PENDING_APPROVAL: ["APPROVED", "REJECTED"],
  APPROVED: ["SUSPENDED", "INACTIVE"],
  REJECTED: ["APPROVED", "PENDING_APPROVAL"],
  SUSPENDED: ["APPROVED", "INACTIVE"],
  INACTIVE: ["APPROVED"]
};
var SellerService = class {
  constructor(db, auth, storage, indexer, audit, notifications) {
    this.db = db;
    this.auth = auth;
    this.storage = storage;
    this.indexer = indexer;
    this.audit = audit;
    this.notifications = notifications;
  }
  db;
  auth;
  storage;
  indexer;
  audit;
  notifications;
  async uniqueSlug(name) {
    const base = slugify(name) || "store";
    for (let i = 0; i < 20; i++) {
      const slug = i === 0 ? base : `${base}-${randomCode(4).toLowerCase()}`;
      if (!await this.db.seller.findUnique({ where: { slug }, select: { id: true } })) return slug;
    }
    return `${base}-${Date.now().toString(36)}`;
  }
  async uniqueCode() {
    for (let i = 0; i < 10; i++) {
      const code = `SL${randomCode(6)}`;
      if (!await this.db.seller.findUnique({ where: { code }, select: { id: true } })) return code;
    }
    throw new Error("Could not allocate seller code");
  }
  /** Public self-registration → PENDING_APPROVAL. Also works for an existing customer account. */
  async register(input, meta) {
    const existingUser = await this.db.user.findUnique({ where: { email: input.email }, include: { seller: true } });
    if (existingUser?.seller) throw conflict("A seller account already exists for this email");
    if (existingUser) throw conflict("An account with this email already exists. Sign in and apply from your account.");
    if (await this.db.user.findUnique({ where: { phone: input.phone } })) throw conflict("This phone number is already registered");
    const [sellerRole, customerRole] = await Promise.all([
      this.db.role.findUniqueOrThrow({ where: { code: "SELLER" } }),
      this.db.role.findUniqueOrThrow({ where: { code: "CUSTOMER" } })
    ]);
    const passwordHash = await this.auth.hashPassword(input.password);
    const slug = await this.uniqueSlug(input.businessName);
    const code = await this.uniqueCode();
    const user = await this.db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          passwordHash,
          roles: { create: [{ roleId: sellerRole.id }, { roleId: customerRole.id }] },
          customerProfile: { create: {} }
        }
      });
      const seller = await tx.seller.create({
        data: {
          userId: u.id,
          code,
          slug,
          businessName: input.businessName,
          displayName: input.businessName,
          businessType: input.businessType,
          gstin: input.gstin ?? null,
          pan: input.pan,
          supportEmail: input.email,
          supportPhone: input.phone,
          termsAcceptedAt: /* @__PURE__ */ new Date(),
          addresses: {
            create: {
              label: "Registered",
              line1: input.addressLine1,
              line2: input.addressLine2 ?? null,
              city: input.city,
              state: input.state,
              pincode: input.pincode
            }
          }
        }
      });
      await tx.sellerApproval.create({ data: { sellerId: seller.id, toStatus: "PENDING_APPROVAL", reason: "Self registration" } });
      await this.audit.record(
        { auth: null, ip: meta.ip, userAgent: meta.userAgent },
        { action: "seller.register", entityType: "Seller", entityId: seller.id, after: { businessName: input.businessName, email: input.email } },
        tx
      );
      return u;
    });
    await this.auth.sendVerificationEmail(user.id);
    await this.notifications.notify({ key: "seller.registered", userId: user.id, vars: { businessName: input.businessName }, link: "/seller" });
    await this.notifications.notifyAdmins({
      key: "seller.registered_admin",
      vars: { businessName: input.businessName, email: input.email },
      link: "/admin/sellers?status=PENDING_APPROVAL"
    });
    return this.auth.issueSession(user.id, meta);
  }
  /** Existing customer applies to become a seller. */
  async applyAsExistingUser(userId, input) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId }, include: { seller: true } });
    if (user.seller) throw conflict("You already have a seller account");
    const sellerRole = await this.db.role.findUniqueOrThrow({ where: { code: "SELLER" } });
    const seller = await this.db.$transaction(async (tx) => {
      await tx.userRole.upsert({
        where: { userId_roleId: { userId, roleId: sellerRole.id } },
        create: { userId, roleId: sellerRole.id },
        update: {}
      });
      if (!user.phone) await tx.user.update({ where: { id: userId }, data: { phone: input.phone } });
      const s = await tx.seller.create({
        data: {
          userId,
          code: await this.uniqueCode(),
          slug: await this.uniqueSlug(input.businessName),
          businessName: input.businessName,
          displayName: input.businessName,
          businessType: input.businessType,
          gstin: input.gstin ?? null,
          pan: input.pan,
          supportEmail: user.email,
          supportPhone: input.phone,
          termsAcceptedAt: /* @__PURE__ */ new Date(),
          addresses: {
            create: { line1: input.addressLine1, line2: input.addressLine2 ?? null, city: input.city, state: input.state, pincode: input.pincode }
          }
        }
      });
      await tx.sellerApproval.create({ data: { sellerId: s.id, toStatus: "PENDING_APPROVAL", reason: "Application from customer account" } });
      return s;
    });
    this.auth.invalidatePrincipal(userId);
    await this.notifications.notify({ key: "seller.registered", userId, vars: { businessName: input.businessName }, link: "/seller" });
    await this.notifications.notifyAdmins({
      key: "seller.registered_admin",
      vars: { businessName: input.businessName, email: user.email },
      link: "/admin/sellers?status=PENDING_APPROVAL"
    });
    return seller;
  }
  /** Admin-created seller: account without password + invitation link. */
  async adminCreate(input, actor) {
    await this.auth.assertEmailAvailable(input.email, input.phone);
    const [sellerRole, customerRole] = await Promise.all([
      this.db.role.findUniqueOrThrow({ where: { code: "SELLER" } }),
      this.db.role.findUniqueOrThrow({ where: { code: "CUSTOMER" } })
    ]);
    const status = input.autoApprove ? "APPROVED" : "PENDING_APPROVAL";
    const created = await this.db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          passwordHash: null,
          roles: { create: [{ roleId: sellerRole.id }, { roleId: customerRole.id }] },
          customerProfile: { create: {} }
        }
      });
      const s = await tx.seller.create({
        data: {
          userId: u.id,
          code: await this.uniqueCode(),
          slug: await this.uniqueSlug(input.businessName),
          businessName: input.businessName,
          displayName: input.businessName,
          businessType: input.businessType,
          gstin: input.gstin ?? null,
          pan: input.pan,
          supportEmail: input.email,
          supportPhone: input.phone,
          status,
          approvedAt: status === "APPROVED" ? /* @__PURE__ */ new Date() : null,
          addresses: {
            create: { line1: input.addressLine1, line2: input.addressLine2 ?? null, city: input.city, state: input.state, pincode: input.pincode }
          }
        }
      });
      await tx.sellerApproval.create({ data: { sellerId: s.id, toStatus: status, reason: "Created by admin", actorId: actor?.auth?.userId ?? null } });
      await this.audit.record(actor, { action: "seller.admin_create", entityType: "Seller", entityId: s.id, after: input }, tx);
      return { user: u, seller: s };
    });
    const token = await this.auth.createOneTimeToken(created.user.id, "SELLER_INVITE", 72 * 60);
    await this.notifications.notify({
      key: "seller.invite",
      userId: created.user.id,
      channels: ["EMAIL"],
      vars: { businessName: input.businessName, link: `${this.notifications.frontendUrl}/accept-invite?token=${token}` }
    });
    return created.seller;
  }
  async resendInvite(sellerId, actor) {
    const seller = await this.db.seller.findUnique({ where: { id: sellerId }, include: { user: true } });
    if (!seller) throw notFound("Seller");
    if (seller.user.passwordHash) throw businessRule("This seller has already set a password");
    const token = await this.auth.createOneTimeToken(seller.userId, "SELLER_INVITE", 72 * 60);
    await this.notifications.notify({
      key: "seller.invite",
      userId: seller.userId,
      channels: ["EMAIL"],
      vars: { businessName: seller.businessName, link: `${this.notifications.frontendUrl}/accept-invite?token=${token}` }
    });
    await this.audit.record(actor, { action: "seller.resend_invite", entityType: "Seller", entityId: sellerId });
  }
  // ── Seller self-service ────────────────────────────────────
  async me(sellerId) {
    const seller = await this.db.seller.findUniqueOrThrow({
      where: { id: sellerId },
      include: {
        addresses: true,
        documents: { orderBy: { createdAt: "desc" } },
        approvals: { orderBy: { createdAt: "desc" }, take: 10 },
        user: { select: { name: true, email: true, phone: true, emailVerifiedAt: true } }
      }
    });
    return { ...seller, ratingAvg: num(seller.ratingAvg), documents: seller.documents.map((d) => ({ ...d, storageKey: void 0 })) };
  }
  async updateProfile(sellerId, input, actor) {
    const before = await this.db.seller.findUniqueOrThrow({ where: { id: sellerId } });
    const updated = await this.db.seller.update({
      where: { id: sellerId },
      data: {
        displayName: input.displayName,
        description: input.description,
        supportEmail: input.supportEmail,
        supportPhone: input.supportPhone,
        fulfillmentMode: input.fulfillmentMode
      }
    });
    await this.audit.record(actor, { action: "seller.profile_update", entityType: "Seller", entityId: sellerId, before, after: updated });
    return updated;
  }
  async uploadLogo(sellerId, file) {
    const stored = await storeOptimizedImage(this.storage, "sellers", file.buffer, file.mimeType);
    return this.db.seller.update({ where: { id: sellerId }, data: { logoUrl: stored.url } });
  }
  /** KYC documents go to PRIVATE storage and are served only through short-lived signed URLs. */
  async uploadDocument(sellerId, type, file, actor) {
    const key = `seller-docs/${sellerId}/${randomUUID2()}${EXTENSIONS[file.mimeType] ?? ""}`;
    await this.storage.put(key, file.buffer, file.mimeType, "private");
    const doc = await this.db.sellerDocument.create({
      data: {
        sellerId,
        type,
        storageKey: key,
        originalName: file.filename,
        mimeType: file.mimeType,
        sizeBytes: file.size
      }
    });
    await this.audit.record(actor, { action: "seller.document_upload", entityType: "SellerDocument", entityId: doc.id, metadata: { type } });
    return { ...doc, storageKey: void 0 };
  }
  /** Signed URL for a document. Sellers can only reach their own documents; admins any. */
  async documentUrl(documentId, scope) {
    const doc = await this.db.sellerDocument.findFirst({
      where: { id: documentId, ...scope.sellerId ? { sellerId: scope.sellerId } : {} }
    });
    if (!doc) throw notFound("Document");
    return { url: await this.storage.signedUrl(doc.storageKey, 300), expiresInSeconds: 300 };
  }
  async deleteDocument(documentId, sellerId) {
    const doc = await this.db.sellerDocument.findFirst({ where: { id: documentId, sellerId } });
    if (!doc) throw notFound("Document");
    if (doc.status === "VERIFIED") throw businessRule("Verified documents cannot be removed");
    await this.db.sellerDocument.delete({ where: { id: doc.id } });
    await this.storage.delete(doc.storageKey, "private");
  }
  // ── Admin management ───────────────────────────────────────
  async list(q) {
    const where = {
      deletedAt: null,
      ...q.status ? { status: q.status } : {},
      ...q.q ? {
        OR: [
          { businessName: { contains: q.q } },
          { displayName: { contains: q.q } },
          { code: { contains: q.q } },
          { gstin: { contains: q.q } },
          { user: { email: { contains: q.q } } }
        ]
      } : {}
    };
    const [items, total] = await Promise.all([
      this.db.seller.findMany({
        where,
        include: {
          user: { select: { name: true, email: true, phone: true, lastLoginAt: true, passwordHash: true } },
          _count: { select: { listings: { where: { deletedAt: null } }, sellerOrders: true } }
        },
        orderBy: q.sort === "oldest" ? { createdAt: "asc" } : q.sort === "name" ? { businessName: "asc" } : { createdAt: "desc" },
        ...pageArgs(q.page, q.pageSize)
      }),
      this.db.seller.count({ where })
    ]);
    return paginated(
      items.map((s) => ({
        ...s,
        ratingAvg: num(s.ratingAvg),
        user: { ...s.user, passwordHash: void 0, invitePending: !s.user.passwordHash }
      })),
      total,
      q.page,
      q.pageSize
    );
  }
  async adminDetail(sellerId) {
    const seller = await this.db.seller.findFirst({
      where: { id: sellerId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, status: true, lastLoginAt: true, emailVerifiedAt: true, createdAt: true } },
        addresses: true,
        documents: { orderBy: { createdAt: "desc" } },
        approvals: { orderBy: { createdAt: "desc" } },
        commissionRules: { where: { isActive: true } }
      }
    });
    if (!seller) throw notFound("Seller");
    const [products, orders, ledger] = await Promise.all([
      this.db.product.groupBy({ by: ["status"], where: { ownerSellerId: sellerId, deletedAt: null }, _count: { _all: true } }),
      this.db.sellerOrder.groupBy({ by: ["status"], where: { sellerId }, _count: { _all: true }, _sum: { grandTotal: true } }),
      this.db.sellerLedger.aggregate({ where: { sellerId }, _sum: { amount: true } })
    ]);
    return {
      ...seller,
      ratingAvg: num(seller.ratingAvg),
      documents: seller.documents.map((d) => ({ ...d, storageKey: void 0 })),
      stats: {
        products: Object.fromEntries(products.map((p) => [p.status, p._count._all])),
        orders: Object.fromEntries(orders.map((o) => [o.status, { count: o._count._all, value: num(o._sum.grandTotal) }])),
        balance: num(ledger._sum.amount)
      }
    };
  }
  async changeStatus(sellerId, to, reason, actor) {
    const seller = await this.db.seller.findFirst({ where: { id: sellerId, deletedAt: null } });
    if (!seller) throw notFound("Seller");
    if (!TRANSITIONS[seller.status].includes(to)) {
      throw businessRule(`Cannot change a seller from ${seller.status} to ${to}`);
    }
    if ((to === "REJECTED" || to === "SUSPENDED") && !reason) throw businessRule("Please provide a reason");
    await this.db.$transaction(async (tx) => {
      const updated = await tx.seller.updateMany({
        where: { id: sellerId, status: seller.status },
        data: {
          status: to,
          statusReason: reason ?? null,
          approvedAt: to === "APPROVED" && !seller.approvedAt ? /* @__PURE__ */ new Date() : void 0
        }
      });
      if (updated.count !== 1) throw conflict("Seller status changed in the meantime");
      await tx.sellerApproval.create({
        data: { sellerId, fromStatus: seller.status, toStatus: to, reason: reason ?? null, actorId: actor?.auth?.userId ?? null }
      });
      await this.audit.record(
        actor,
        { action: `seller.status.${to.toLowerCase()}`, entityType: "Seller", entityId: sellerId, before: { status: seller.status }, after: { status: to, reason } },
        tx
      );
    });
    this.auth.invalidatePrincipal(seller.userId);
    await this.indexer.refreshForSeller(sellerId);
    const key = to === "APPROVED" ? seller.status === "PENDING_APPROVAL" || seller.status === "REJECTED" ? "seller.approved" : "seller.reactivated" : to === "REJECTED" ? "seller.rejected" : to === "SUSPENDED" ? "seller.suspended" : null;
    if (key) {
      await this.notifications.notify({
        key,
        userId: seller.userId,
        vars: { businessName: seller.businessName, reason: reason ?? "" },
        link: "/seller"
      });
    }
    return this.adminDetail(sellerId);
  }
  async adminUpdate(sellerId, input, actor) {
    const before = await this.db.seller.findFirst({ where: { id: sellerId, deletedAt: null } });
    if (!before) throw notFound("Seller");
    const updated = await this.db.seller.update({
      where: { id: sellerId },
      data: {
        businessName: input.businessName,
        displayName: input.displayName,
        description: input.description,
        supportEmail: input.supportEmail,
        supportPhone: input.supportPhone,
        fulfillmentMode: input.fulfillmentMode,
        gstin: input.gstin,
        pan: input.pan,
        isFeatured: input.isFeatured
      }
    });
    await this.audit.record(actor, { action: "seller.admin_update", entityType: "Seller", entityId: sellerId, before, after: updated });
    return updated;
  }
  async verifyDocument(documentId, status, note, actor) {
    const doc = await this.db.sellerDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw notFound("Document");
    const updated = await this.db.sellerDocument.update({ where: { id: documentId }, data: { status, note: note ?? null } });
    await this.audit.record(actor, { action: `seller.document_${status.toLowerCase()}`, entityType: "SellerDocument", entityId: documentId, metadata: { note } });
    return { ...updated, storageKey: void 0 };
  }
};

// src/modules/settings/settings.service.ts
var DEFAULT_SETTINGS = {
  branding: {
    name: "Vyora",
    tagline: "Everything you love, from sellers you trust",
    logoUrl: null,
    primaryColor: "#5B3DF5",
    accentColor: "#FF6B4A",
    announcement: "Free delivery on orders above \u20B9499 \xB7 Cash on Delivery available across India",
    supportEmail: "support@vyora.local",
    supportPhone: "1800-000-0000"
  },
  catalog: {
    /** When an APPROVED product is edited by its seller, send it back to review. */
    productChangesRequireReapproval: true,
    /** New offers by other sellers on an already-approved catalog product skip review. */
    autoApproveListingsOnApprovedProducts: false
  },
  orders: {
    /** Automatically confirm new sub-orders instead of waiting for seller acceptance. */
    autoConfirm: false,
    /** Sub-orders still unconfirmed after this many hours are flagged in admin. */
    confirmationSlaHours: 24
  },
  cod: {
    enabled: true,
    minOrderValue: 0,
    maxOrderValue: 5e4,
    fee: 0,
    restrictedCategoryIds: []
  },
  sellers: {
    /** Suspended sellers may keep fulfilling already-confirmed orders (never accept new ones). */
    suspendedCanFulfillExisting: true
  },
  commission: {
    /** GST charged by the marketplace on its commission, deducted from seller payouts. */
    taxRate: 18
  },
  returns: {
    enabled: true
  },
  reviews: {
    requireModeration: true,
    onlyVerifiedPurchasers: false
  },
  tax: {
    /** Listing prices include GST (Indian retail convention). */
    pricesInclusive: true,
    defaultRate: 18
  }
};
var SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);
var SettingsService = class {
  constructor(repo) {
    this.repo = repo;
  }
  repo;
  cache = null;
  async all() {
    if (this.cache && Date.now() - this.cache.at < 5e3) return this.cache.value;
    const stored = await this.repo.getAll();
    const merged = structuredClone(DEFAULT_SETTINGS);
    for (const key of SETTING_KEYS) {
      const v = stored[key];
      if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(merged[key], v);
    }
    this.cache = { value: merged, at: Date.now() };
    return merged;
  }
  async get(key) {
    return (await this.all())[key];
  }
  /** Shallow-merge a partial update into one settings group. Unknown fields are dropped. */
  async update(key, patch, actorId) {
    const current = await this.get(key);
    const allowed = Object.keys(DEFAULT_SETTINGS[key]);
    const next = { ...current };
    for (const [k, v] of Object.entries(patch)) {
      if (!allowed.includes(k)) continue;
      const def = DEFAULT_SETTINGS[key][k];
      if (def !== null && v !== null && typeof def !== typeof v) continue;
      next[k] = v;
    }
    await this.repo.set(key, next, actorId);
    this.cache = null;
    return next;
  }
  invalidate() {
    this.cache = null;
  }
};

// src/modules/shipping/shipping.service.ts
var ManualShippingProvider = class {
  name = "manual";
};
var DEFAULTS = {
  STANDARD: { label: "Standard delivery", baseFee: 40, freeAbove: 499, minDays: 3, maxDays: 7 },
  EXPRESS: { label: "Express delivery", baseFee: 99, freeAbove: null, minDays: 1, maxDays: 3 }
};
var ShippingService = class {
  constructor(db, settings, audit) {
    this.db = db;
    this.settings = settings;
    this.audit = audit;
  }
  db;
  settings;
  audit;
  provider = new ManualShippingProvider();
  async methods() {
    const rows = await this.db.shippingConfiguration.findMany({ orderBy: { baseFee: "asc" } });
    const byMethod = new Map(rows.map((r) => [r.method, r]));
    return Object.keys(DEFAULTS).map((m) => {
      const r = byMethod.get(m);
      return r ? { method: m, label: r.label, baseFee: num(r.baseFee), freeAbove: r.freeAbove === null ? null : num(r.freeAbove), minDays: r.minDays, maxDays: r.maxDays, isActive: r.isActive } : { method: m, ...DEFAULTS[m], isActive: true };
    });
  }
  async rule(method) {
    const m = (await this.methods()).find((x) => x.method === method);
    if (!m || !m.isActive) throw businessRule("This shipping method is not available");
    return {
      baseFee: toPaise(m.baseFee),
      freeAbove: m.freeAbove === null ? null : toPaise(m.freeAbove),
      minDays: m.minDays,
      maxDays: m.maxDays,
      label: m.label
    };
  }
  /**
   * Delivery eligibility for a PIN code. If no serviceability rows are configured, every valid
   * PIN is serviceable. Estimates are indicative ranges, never guaranteed dates.
   */
  async checkPincode(pincode, method = "STANDARD") {
    const [configured, row, cod, rule] = await Promise.all([
      this.db.serviceablePincode.count(),
      this.db.serviceablePincode.findUnique({ where: { pincode } }),
      this.settings.get("cod"),
      this.rule(method).catch(() => null)
    ]);
    const serviceable = configured === 0 ? true : Boolean(row?.isServiceable);
    const extra = row?.extraDays ?? 0;
    const now = /* @__PURE__ */ new Date();
    const addDays = (d) => {
      const x = new Date(now);
      x.setUTCDate(x.getUTCDate() + d);
      return x;
    };
    return {
      pincode,
      serviceable,
      codAvailable: serviceable && cod.enabled && (row ? row.codAvailable : true),
      city: row?.city ?? null,
      state: row?.state ?? null,
      estimate: serviceable && rule ? { minDays: rule.minDays + extra, maxDays: rule.maxDays + extra, from: addDays(rule.minDays + extra), to: addDays(rule.maxDays + extra) } : null
    };
  }
  // ── Admin configuration ────────────────────────────────────
  async upsertMethod(input, actor) {
    if (input.maxDays < input.minDays) throw businessRule("Maximum days must be at least the minimum days");
    const row = await this.db.shippingConfiguration.upsert({
      where: { method: input.method },
      create: { ...input, freeAbove: input.freeAbove ?? null },
      update: { ...input, freeAbove: input.freeAbove ?? null }
    });
    await this.audit.record(actor, { action: "shipping.config", entityType: "ShippingConfiguration", entityId: row.id, after: input });
    return row;
  }
  listPincodes(q) {
    return this.db.serviceablePincode.findMany({
      where: q ? { pincode: { startsWith: q } } : {},
      orderBy: { pincode: "asc" },
      take: 500
    });
  }
  async upsertPincode(input, actor) {
    const row = await this.db.serviceablePincode.upsert({ where: { pincode: input.pincode }, create: input, update: input });
    await this.audit.record(actor, { action: "shipping.pincode", entityType: "ServiceablePincode", entityId: row.id, after: input });
    return row;
  }
  async deletePincode(id, actor) {
    const row = await this.db.serviceablePincode.findUnique({ where: { id } });
    if (!row) throw notFound("PIN code");
    await this.db.serviceablePincode.delete({ where: { id } });
    await this.audit.record(actor, { action: "shipping.pincode_delete", entityType: "ServiceablePincode", entityId: id, before: row });
  }
};

// src/modules/tax/tax.service.ts
var TaxService = class {
  constructor(db, settings, audit) {
    this.db = db;
    this.settings = settings;
    this.audit = audit;
  }
  db;
  settings;
  audit;
  /** Map each categoryId → { rate, lineage (nearest first) }. */
  async resolve(categoryIds) {
    const unique = [...new Set(categoryIds)];
    const cats = await this.db.category.findMany({ where: { id: { in: unique } }, select: { id: true, path: true } });
    const lineages = new Map(cats.map((c) => [c.id, c.path.split("/").filter(Boolean).reverse()]));
    const allIds = [...new Set([...lineages.values()].flat())];
    const [configs, taxSettings] = await Promise.all([
      this.db.taxConfiguration.findMany({ where: { isActive: true, OR: [{ categoryId: { in: allIds } }, { categoryId: null }] } }),
      this.settings.get("tax")
    ]);
    const byCat = new Map(configs.filter((c) => c.categoryId).map((c) => [c.categoryId, num(c.rate)]));
    const fallback = configs.find((c) => c.categoryId === null);
    const defaultRate = fallback ? num(fallback.rate) : taxSettings.defaultRate;
    const out = /* @__PURE__ */ new Map();
    for (const id of unique) {
      const lineage = lineages.get(id) ?? [id];
      const hit = lineage.find((c) => byCat.has(c));
      out.set(id, { rate: hit ? byCat.get(hit) : defaultRate, lineage });
    }
    return { rates: out, inclusive: taxSettings.pricesInclusive };
  }
  list() {
    return this.db.taxConfiguration.findMany({ include: { category: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } });
  }
  async create(input, actor) {
    const row = await this.db.taxConfiguration.create({ data: { ...input, categoryId: input.categoryId ?? null } });
    await this.audit.record(actor, { action: "tax.create", entityType: "TaxConfiguration", entityId: row.id, after: row });
    return row;
  }
  async update(id, input, actor) {
    const before = await this.db.taxConfiguration.findUnique({ where: { id } });
    if (!before) throw notFound("Tax configuration");
    const row = await this.db.taxConfiguration.update({ where: { id }, data: { ...input, categoryId: input.categoryId ?? null } });
    await this.audit.record(actor, { action: "tax.update", entityType: "TaxConfiguration", entityId: id, before, after: row });
    return row;
  }
  async remove(id, actor) {
    const before = await this.db.taxConfiguration.findUnique({ where: { id } });
    if (!before) throw notFound("Tax configuration");
    await this.db.taxConfiguration.delete({ where: { id } });
    await this.audit.record(actor, { action: "tax.delete", entityType: "TaxConfiguration", entityId: id, before });
  }
};

// src/modules/users/user-admin.service.ts
var UserAdminService = class {
  constructor(db, auth, audit) {
    this.db = db;
    this.auth = auth;
    this.audit = audit;
  }
  db;
  auth;
  audit;
  async list(q) {
    const where = {
      deletedAt: null,
      ...q.status ? { status: q.status } : {},
      ...q.role ? { roles: { some: { role: { code: q.role } } } } : {},
      ...q.q ? { OR: [{ email: { contains: q.q } }, { name: { contains: q.q } }, { phone: { contains: q.q } }] } : {}
    };
    const [items, total] = await Promise.all([
      this.db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...pageArgs(q.page, q.pageSize),
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          deletionRequestedAt: true,
          lockedUntil: true,
          roles: { select: { role: { select: { code: true } } } },
          seller: { select: { id: true, businessName: true, status: true } },
          _count: { select: { orders: true } }
        }
      }),
      this.db.user.count({ where })
    ]);
    return paginated(items.map((u) => ({ ...u, roles: u.roles.map((r) => r.role.code) })), total, q.page, q.pageSize);
  }
  async detail(userId) {
    const user = await this.db.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        deletionRequestedAt: true,
        failedLoginCount: true,
        lockedUntil: true,
        roles: { select: { role: { select: { code: true, name: true } } } },
        seller: { select: { id: true, businessName: true, status: true } },
        addresses: { where: { deletedAt: null } },
        orders: { orderBy: { placedAt: "desc" }, take: 10, select: { id: true, orderNumber: true, status: true, grandTotal: true, placedAt: true } }
      }
    });
    if (!user) throw notFound("User");
    const security = await this.db.securityEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 });
    return { ...user, roles: user.roles.map((r) => r.role.code), orders: user.orders.map((o) => ({ ...o, grandTotal: Number(o.grandTotal) })), security };
  }
  async update(userId, input, actor) {
    const user = await this.db.user.findFirst({ where: { id: userId, deletedAt: null }, include: { roles: { include: { role: true } }, seller: true } });
    if (!user) throw notFound("User");
    if (userId === actor?.auth?.userId && (input.status === "SUSPENDED" || input.roles && !input.roles.includes("ADMIN"))) {
      throw businessRule("You cannot suspend yourself or remove your own admin role");
    }
    const before = { status: user.status, roles: user.roles.map((r) => r.role.code) };
    if (input.roles?.includes("SELLER") && !user.seller) throw businessRule("The seller role requires a seller account \u2014 create one from the Sellers page");
    if (input.roles && !input.roles.includes("ADMIN") && before.roles.includes("ADMIN")) {
      const admins = await this.db.userRole.count({ where: { role: { code: "ADMIN" }, user: { status: "ACTIVE", deletedAt: null } } });
      if (admins <= 1) throw businessRule("The marketplace must keep at least one active admin");
    }
    await this.db.$transaction(async (tx) => {
      if (input.status) {
        await tx.user.update({ where: { id: userId }, data: { status: input.status, ...input.status === "ACTIVE" ? { lockedUntil: null, failedLoginCount: 0 } : {} } });
      }
      if (input.roles) {
        const roles = await tx.role.findMany({ where: { code: { in: input.roles } } });
        await tx.userRole.deleteMany({ where: { userId } });
        await tx.userRole.createMany({ data: roles.map((r) => ({ userId, roleId: r.id })) });
      }
      await this.audit.record(actor, { action: "user.update", entityType: "User", entityId: userId, before, after: input }, tx);
    });
    if (input.status === "SUSPENDED") await this.auth.revokeAllSessions(userId);
    this.auth.invalidatePrincipal(userId);
    return this.detail(userId);
  }
  /** Complete an account deletion: anonymise personal data, keep order/financial history. */
  async anonymize(userId, actor) {
    const user = await this.db.user.findFirst({ where: { id: userId, deletedAt: null }, include: { seller: true } });
    if (!user) throw notFound("User");
    if (user.seller && user.seller.status === "APPROVED") throw businessRule("Deactivate the seller account first");
    const stamp = Date.now().toString(36);
    await this.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${stamp}-${userId.slice(-6)}@deleted.invalid`,
          phone: null,
          name: "Deleted user",
          passwordHash: null,
          status: "DELETED",
          deletedAt: /* @__PURE__ */ new Date()
        }
      });
      await tx.customerAddress.updateMany({ where: { userId }, data: { deletedAt: /* @__PURE__ */ new Date() } });
      await tx.cart.deleteMany({ where: { userId } });
      await tx.wishlist.deleteMany({ where: { userId } });
      await tx.recentlyViewedProduct.deleteMany({ where: { userId } });
      await tx.searchHistory.deleteMany({ where: { userId } });
      await this.audit.record(actor, { action: "user.anonymize", entityType: "User", entityId: userId }, tx);
    });
    await this.auth.revokeAllSessions(userId);
  }
  async roles() {
    const roles = await this.db.role.findMany({ include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } } });
    const permissions = await this.db.permission.findMany({ orderBy: { code: "asc" } });
    return {
      roles: roles.map((r) => ({ id: r.id, code: r.code, name: r.name, description: r.description, isSystem: r.isSystem, users: r._count.users, permissions: r.permissions.map((p) => p.permission.code) })),
      permissions
    };
  }
  async setRolePermissions(roleCode, permissionCodes, actor) {
    const role = await this.db.role.findUnique({ where: { code: roleCode }, include: { permissions: { include: { permission: true } } } });
    if (!role) throw notFound("Role");
    if (role.code === "ADMIN" && !permissionCodes.includes("roles:manage")) {
      throw businessRule("The admin role must keep the roles:manage permission");
    }
    const perms = await this.db.permission.findMany({ where: { code: { in: permissionCodes } } });
    await this.db.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      await tx.rolePermission.createMany({ data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })) });
      await this.audit.record(
        actor,
        { action: "role.permissions", entityType: "Role", entityId: role.id, before: role.permissions.map((p) => p.permission.code), after: perms.map((p) => p.code) },
        tx
      );
    });
    const users = await this.db.userRole.findMany({ where: { roleId: role.id }, select: { userId: true } });
    users.forEach((u) => this.auth.invalidatePrincipal(u.userId));
    return this.roles();
  }
  async auditLogs(q) {
    const where = {
      ...q.entityType ? { entityType: q.entityType } : {},
      ...q.actorId ? { actorId: q.actorId } : {},
      ...q.action ? { action: { startsWith: q.action } } : {},
      ...q.q ? { OR: [{ entityId: q.q }, { action: { contains: q.q } }] } : {}
    };
    const [items, total] = await Promise.all([
      this.db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, ...pageArgs(q.page, q.pageSize), include: { actor: { select: { name: true, email: true } } } }),
      this.db.auditLog.count({ where })
    ]);
    return paginated(items, total, q.page, q.pageSize);
  }
  async securityEvents(q) {
    const where = {
      ...q.type ? { type: q.type } : {},
      ...q.q ? { OR: [{ email: { contains: q.q } }, { ip: { contains: q.q } }, { userId: q.q }] } : {}
    };
    const [items, total, types] = await Promise.all([
      this.db.securityEvent.findMany({ where, orderBy: { createdAt: "desc" }, ...pageArgs(q.page, q.pageSize) }),
      this.db.securityEvent.count({ where }),
      this.db.securityEvent.groupBy({ by: ["type"], _count: { _all: true }, where: { createdAt: { gte: new Date(Date.now() - 7 * 864e5) } } })
    ]);
    return { ...paginated(items, total, q.page, q.pageSize), last7Days: types.map((t) => ({ type: t.type, count: t._count._all })) };
  }
};

// src/bootstrap/container.ts
function createContainer(env) {
  const database = createDatabaseProvider(env);
  const db = database.client;
  const redis = env.REDIS_ENABLED ? new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: false }) : null;
  const rateLimitStore = redis ? new RedisRateLimitStore(redis) : new MemoryRateLimitStore();
  const cache = env.APP_ENV === "test" ? new NoopCache() : redis ? new RedisCache(redis) : new MemoryCache();
  const jobs = redis ? new BullJobQueue(redis) : new InlineJobQueue();
  const storage = createStorage(env);
  const channels = createChannels(env);
  const settings = new SettingsService(new PrismaSettingsRepository(db));
  const audit = new AuditService(new PrismaAuditRepository(db), new PrismaSecurityEventRepository(db));
  const notifications = new NotificationService(db, env, channels, jobs, settings);
  const hasher = createPasswordHasher(env.PASSWORD_HASHER, env.APP_ENV === "test");
  const auth = new AuthService(db, env, hasher, audit, notifications);
  const indexer = new ProductIndexer(db, cache);
  const catalog = new CatalogService(db, cache, audit);
  const storefront = new StorefrontService(db, catalog, cache);
  const inventory = new InventoryService(db, indexer, audit, notifications);
  const products = new ProductService(db, storage, inventory, indexer, settings, audit, notifications);
  const productIo = new ProductIoService(db, products, inventory, indexer);
  const sellers = new SellerService(db, auth, storage, indexer, audit, notifications);
  const tax = new TaxService(db, settings, audit);
  const shipping = new ShippingService(db, settings, audit);
  const coupons = new CouponService(db, audit);
  const cart = new CartService(db, coupons, shipping, tax, settings);
  const finance = new FinanceService(db, audit, notifications, env.COMMISSION_DEFAULT_PERCENTAGE);
  const payments = new PaymentRegistry([new CashOnDeliveryProvider()]);
  const checkout = new CheckoutService(db, cart, coupons, inventory, shipping, finance, payments, settings, indexer, audit, notifications);
  const fulfillment = new FulfillmentService(db, inventory, finance, coupons, shipping, settings, indexer, audit, notifications);
  const orderQueries = new OrderQueryService(db);
  const customers = new CustomerService(db, auth, storefront, channels, audit);
  const reviews = new ReviewService(db, storage, settings, audit);
  const content = new ContentService(db, storefront, catalog, settings, storage, cache, audit);
  const analytics = new AnalyticsService(db, finance, products, env.DEFAULT_TIMEZONE);
  const users = new UserAdminService(db, auth, audit);
  return {
    env,
    database,
    db,
    redis,
    cache,
    jobs,
    storage,
    rateLimitStore,
    services: {
      settings,
      audit,
      notifications,
      auth,
      indexer,
      catalog,
      storefront,
      inventory,
      products,
      productIo,
      sellers,
      tax,
      shipping,
      coupons,
      cart,
      finance,
      payments,
      checkout,
      fulfillment,
      orderQueries,
      customers,
      reviews,
      content,
      analytics,
      users
    },
    async shutdown() {
      await jobs.close();
      await database.disconnect();
      if (redis) redis.disconnect();
    }
  };
}

// src/http/pipeline.ts
import { randomUUID as randomUUID3 } from "crypto";
import { Prisma as Prisma5 } from "@prisma/client";
import { ZodError } from "zod";

// src/http/cookies.ts
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const name = part.slice(0, idx).trim();
    if (!name || name in out) continue;
    const raw = part.slice(idx + 1).trim().replace(/^"|"$/g, "");
    try {
      out[name] = decodeURIComponent(raw);
    } catch {
      out[name] = raw;
    }
  }
  return out;
}
function serializeCookie(name, value, o) {
  if (!/^[A-Za-z0-9_\-.]+$/.test(name)) throw new Error(`Invalid cookie name: ${name}`);
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${o.path ?? "/"}`);
  if (o.domain) parts.push(`Domain=${o.domain}`);
  if (o.maxAgeSeconds !== void 0) {
    parts.push(`Max-Age=${Math.floor(o.maxAgeSeconds)}`);
    parts.push(`Expires=${new Date(Date.now() + o.maxAgeSeconds * 1e3).toUTCString()}`);
  }
  if (o.httpOnly) parts.push("HttpOnly");
  if (o.secure) parts.push("Secure");
  parts.push(`SameSite=${o.sameSite ?? "Lax"}`);
  return parts.join("; ");
}

// src/http/multipart.ts
import Busboy from "busboy";
var MIME = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  document: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  spreadsheet: [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ]
};
function sniffMime(buf, declared, filename) {
  const b = buf;
  if (b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return "image/png";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP")
    return "image/webp";
  if (b.length >= 6 && (b.toString("ascii", 0, 6) === "GIF87a" || b.toString("ascii", 0, 6) === "GIF89a"))
    return "image/gif";
  if (b.length >= 5 && b.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  if (b.length >= 4 && b[0] === 80 && b[1] === 75 && b[2] === 3 && b[3] === 4 && /\.xlsx$/i.test(filename))
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (/\.csv$/i.test(filename) || declared === "text/csv") {
    const sample = b.subarray(0, Math.min(b.length, 4096));
    if (!sample.includes(0)) return "text/csv";
  }
  return null;
}
function parseMultipart(stream, headers, opts) {
  return new Promise((resolve3, reject) => {
    const contentType = headers["content-type"] ?? "";
    if (!contentType.startsWith("multipart/form-data")) {
      reject(new AppError(415, "UNSUPPORTED_MEDIA", "Expected multipart/form-data"));
      return;
    }
    let bb;
    try {
      bb = Busboy({
        headers: { "content-type": contentType },
        limits: { files: opts.maxFiles, fileSize: opts.maxFileBytes, fields: 50, fieldSize: 1e5 }
      });
    } catch {
      reject(new AppError(400, "VALIDATION_ERROR", "Malformed multipart body"));
      return;
    }
    const fields = {};
    const files = [];
    let failed = null;
    const pending = [];
    bb.on("field", (name, value) => {
      fields[name] = value;
    });
    bb.on("file", (field, file, info) => {
      const chunks = [];
      let truncated = false;
      file.on("limit", () => {
        truncated = true;
      });
      pending.push(
        new Promise((res) => {
          file.on("data", (c) => chunks.push(c));
          file.on("end", () => {
            if (truncated) {
              failed ??= new AppError(
                413,
                "PAYLOAD_TOO_LARGE",
                `File exceeds the ${Math.round(opts.maxFileBytes / 1024 / 1024)}MB limit`
              );
              return res();
            }
            const buffer = Buffer.concat(chunks);
            if (buffer.length === 0) return res();
            const mime = sniffMime(buffer, info.mimeType, info.filename);
            if (!mime || !MIME[opts.allowed].includes(mime)) {
              failed ??= new AppError(415, "UNSUPPORTED_MEDIA", `Unsupported file type for "${info.filename}"`);
              return res();
            }
            files.push({
              field,
              filename: info.filename.replace(/[^\w.\- ]+/g, "_").slice(0, 200),
              mimeType: mime,
              buffer,
              size: buffer.length
            });
            res();
          });
        })
      );
    });
    bb.on("filesLimit", () => {
      failed ??= new AppError(413, "PAYLOAD_TOO_LARGE", `At most ${opts.maxFiles} files can be uploaded at once`);
    });
    bb.on("error", () => reject(new AppError(400, "VALIDATION_ERROR", "Malformed multipart body")));
    bb.on("close", async () => {
      await Promise.all(pending);
      if (failed) reject(failed);
      else resolve3({ fields, files });
    });
    stream.pipe(bb);
  });
}

// src/http/route.ts
function route(def) {
  return def;
}
var reply = {
  ok(result, message) {
    return { __reply: true, status: 200, body: { kind: "json", data: { success: true, result, message } } };
  },
  created(result, message) {
    return { __reply: true, status: 201, body: { kind: "json", data: { success: true, result, message } } };
  },
  noContent() {
    return { __reply: true, status: 204, body: { kind: "empty" } };
  },
  buffer(data, contentType, opts = {}) {
    const headers = {};
    if (opts.filename) headers["content-disposition"] = `attachment; filename="${opts.filename.replace(/"/g, "")}"`;
    if (opts.cache) headers["cache-control"] = opts.cache;
    return { __reply: true, status: 200, body: { kind: "buffer", data, contentType }, headers };
  },
  stream(data, contentType, opts = {}) {
    const headers = {};
    if (opts.cache) headers["cache-control"] = opts.cache;
    return { __reply: true, status: 200, body: { kind: "stream", data, contentType }, headers };
  },
  html(markup) {
    return {
      __reply: true,
      status: 200,
      body: { kind: "buffer", data: Buffer.from(markup), contentType: "text/html; charset=utf-8" }
    };
  },
  redirect(location, status = 302) {
    return { __reply: true, status, body: { kind: "empty" }, headers: { location } };
  }
};
var isReply = (v) => typeof v === "object" && v !== null && "__reply" in v;

// src/http/pipeline.ts
var ACCESS_COOKIE = "vy_at";
var REFRESH_COOKIE = "vy_rt";
var CSRF_COOKIE = "vy_csrf";
var CSRF_HEADER = "x-csrf-token";
var MUTATING = /* @__PURE__ */ new Set(["POST", "PUT", "PATCH", "DELETE"]);
function zodDetails(err) {
  return err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}
function securityHeaders(env, contentType) {
  const h = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "cross-origin-opener-policy": "same-origin",
    "x-dns-prefetch-control": "off"
  };
  if (!contentType?.startsWith("text/html")) {
    h["content-security-policy"] = "default-src 'none'; frame-ancestors 'none'";
  }
  if (env.APP_ENV === "production" || env.APP_ENV === "staging") {
    h["strict-transport-security"] = "max-age=31536000; includeSubDomains";
  }
  return h;
}
function parseBody(schema, value) {
  if (!schema) return value;
  const r = schema.safeParse(value ?? {});
  if (!r.success) throw new AppError(400, "VALIDATION_ERROR", "Please check your input", zodDetails(r.error));
  return r.data;
}
function createPipeline(deps) {
  const { env } = deps;
  const cookieBase = {
    secure: env.COOKIE_SECURE,
    sameSite: "Lax",
    domain: env.COOKIE_DOMAIN || void 0
  };
  return async function execute(route2, req) {
    const requestId = (req.headers["x-request-id"] ?? "").slice(0, 64) || randomUUID3();
    const cookies = parseCookies(req.headers.cookie);
    const setCookies = [];
    const started = Date.now();
    let status = 200;
    let userId;
    const respond = (res) => {
      const contentType = res.body.kind === "json" ? "application/json; charset=utf-8" : res.body.kind === "empty" ? void 0 : res.body.contentType;
      status = res.status;
      return {
        ...res,
        headers: {
          ...securityHeaders(env, contentType),
          "x-request-id": requestId,
          ...res.body.kind === "json" ? { "cache-control": "no-store" } : {},
          ...res.headers,
          ...contentType ? { "content-type": contentType } : {}
        },
        cookies: setCookies
      };
    };
    const errorResponse = (err) => {
      if (err instanceof AppError) {
        return respond({
          status: err.status,
          headers: {},
          body: {
            kind: "json",
            data: { success: false, error: { code: err.code, details: err.details ?? [] }, message: err.message }
          }
        });
      }
      if (err instanceof ZodError) {
        return respond({
          status: 400,
          headers: {},
          body: {
            kind: "json",
            data: {
              success: false,
              error: { code: "VALIDATION_ERROR", details: zodDetails(err) },
              message: "Please check your input"
            }
          }
        });
      }
      if (err instanceof Prisma5.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          return respond({
            status: 409,
            headers: {},
            body: {
              kind: "json",
              data: { success: false, error: { code: "CONFLICT", details: [] }, message: "A record with these details already exists" }
            }
          });
        }
        if (err.code === "P2034") {
          return respond({
            status: 409,
            headers: { "retry-after": "1" },
            body: { kind: "json", data: { success: false, error: { code: "CONFLICT", details: [] }, message: "We were busy processing another request. Please try again." } }
          });
        }
        if (err.code === "P2025") {
          return respond({
            status: 404,
            headers: {},
            body: { kind: "json", data: { success: false, error: { code: "NOT_FOUND", details: [] }, message: "Resource not found" } }
          });
        }
      }
      logger.error({ err, requestId, path: req.path, method: req.method }, "unhandled error");
      return respond({
        status: 500,
        headers: {},
        body: {
          kind: "json",
          data: {
            success: false,
            error: { code: "INTERNAL_ERROR", details: [] },
            message: "Something went wrong on our side. Please try again."
          }
        }
      });
    };
    try {
      if (!route2.rootLevel) {
        const hit = await deps.rateLimitStore.hit(`global:${req.ip}`, env.RATE_LIMIT_WINDOW_SECONDS);
        if (hit.count > env.RATE_LIMIT_MAX) {
          deps.onSecurityEvent?.("RATE_LIMITED", { ip: req.ip, details: { bucket: "global", path: req.path } });
          throw new AppError(429, "RATE_LIMITED", "Too many requests. Please slow down.");
        }
      }
      const authHeader = req.headers.authorization;
      const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
      const token = bearer ?? cookies[ACCESS_COOKIE] ?? null;
      let auth = null;
      if (token && route2.auth !== "public") {
        auth = await deps.resolveAuth(token);
      }
      userId = auth?.userId;
      if (route2.auth === "required" && !auth) {
        throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue");
      }
      if (MUTATING.has(req.method) && route2.csrf !== false && !bearer) {
        const header = req.headers[CSRF_HEADER] ?? "";
        const cookie = cookies[CSRF_COOKIE] ?? "";
        if (!header || !cookie || !safeEqual(header, cookie)) {
          deps.onSecurityEvent?.("CSRF_FAILED", { ip: req.ip, userId, details: { path: req.path } });
          throw new AppError(403, "CSRF_FAILED", "Your session token has expired. Please refresh the page and try again.");
        }
      }
      if (!cookies[CSRF_COOKIE] && !route2.rootLevel) {
        setCookies.push(serializeCookie(CSRF_COOKIE, randomToken(24), { ...cookieBase, httpOnly: false }));
      }
      if (route2.permissions?.length) {
        if (!auth) throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue");
        const missing = route2.permissions.filter((p) => !auth.permissions.has(p));
        if (missing.length) {
          deps.onSecurityEvent?.("ACCESS_DENIED", { ip: req.ip, userId, details: { path: req.path, missing } });
          throw new AppError(403, "FORBIDDEN", "You do not have permission to perform this action");
        }
      }
      if (route2.seller) {
        if (!auth) throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue");
        if (!auth.sellerId) throw new AppError(403, "FORBIDDEN", "A seller account is required");
      }
      if (route2.rateLimit) {
        const rl = route2.rateLimit;
        const key = `${rl.name}:${rl.by === "user" && auth ? auth.userId : req.ip}`;
        const hit = await deps.rateLimitStore.hit(key, rl.windowSeconds);
        if (hit.count > rl.max * env.RATE_LIMIT_ROUTE_MULTIPLIER) {
          deps.onSecurityEvent?.("RATE_LIMITED", { ip: req.ip, userId, details: { bucket: rl.name } });
          throw new AppError(429, "RATE_LIMITED", "Too many attempts. Please wait a moment and try again.");
        }
      }
      let rawBody = req.body;
      let files = [];
      if (route2.upload) {
        if (!req.rawStream) throw new AppError(400, "VALIDATION_ERROR", "Upload stream missing");
        const parsed = await parseMultipart(req.rawStream, req.headers, route2.upload);
        files = parsed.files;
        let data = { ...parsed.fields };
        if (typeof parsed.fields.data === "string") {
          try {
            data = { ...data, ...JSON.parse(parsed.fields.data) };
          } catch {
            throw new AppError(400, "VALIDATION_ERROR", 'Field "data" must be valid JSON');
          }
          delete data.data;
        }
        rawBody = data;
      }
      const params = parseBody(route2.schema?.params, req.params);
      const query = parseBody(route2.schema?.query, req.query);
      const body = route2.schema?.body ? parseBody(route2.schema.body, rawBody) : rawBody;
      const ctx = {
        body,
        query,
        params,
        headers: req.headers,
        cookies,
        ip: req.ip,
        userAgent: req.headers["user-agent"]?.slice(0, 300) ?? null,
        requestId,
        auth,
        files,
        setCookie(name, value, options = {}) {
          setCookies.push(serializeCookie(name, value, { ...cookieBase, httpOnly: true, ...options }));
        },
        clearCookie(name, options = {}) {
          setCookies.push(serializeCookie(name, "", { ...cookieBase, httpOnly: true, ...options, maxAgeSeconds: 0 }));
        }
      };
      const result = await route2.handler(ctx);
      if (isReply(result)) {
        return respond({ status: result.status, headers: result.headers ?? {}, body: result.body });
      }
      return respond({ status: 200, headers: {}, body: { kind: "json", data: { success: true, result } } });
    } catch (err) {
      return errorResponse(err);
    } finally {
      logger.debug(
        { requestId, method: req.method, path: req.path, status, ms: Date.now() - started, userId },
        "request"
      );
    }
  };
}

// src/modules/admin/admin.routes.ts
import { z as z4 } from "zod";

// src/http/helpers.ts
import { z as z3 } from "zod";
var idParams = z3.object({ id: idSchema });
var exportQuery = z3.object({
  format: z3.enum(["csv", "xlsx"]).default("csv"),
  from: z3.coerce.date().optional(),
  to: z3.coerce.date().optional()
});
var rangeQuery = z3.object({ from: z3.coerce.date().optional(), to: z3.coerce.date().optional() });
var actorOf = (ctx) => ({ auth: ctx.auth, ip: ctx.ip, userAgent: ctx.userAgent });
function sellerIdOf(ctx) {
  if (!ctx.auth?.sellerId) throw new Error("seller route without seller principal");
  return ctx.auth.sellerId;
}
var userIdOf = (ctx) => {
  if (!ctx.auth) throw new Error("authenticated route without principal");
  return ctx.auth.userId;
};
var MB = 1024 * 1024;

// src/database/status.ts
import { existsSync, readdirSync } from "fs";
import { join as join2, resolve as resolve2 } from "path";
function describeDatabaseUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const safe = new URL(url);
    if (safe.password) safe.password = "****";
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      database: decodeURIComponent(u.pathname.replace(/^\//, "")),
      user: decodeURIComponent(u.username),
      safeUrl: safe.toString()
    };
  } catch {
    return null;
  }
}
function expectedMigrations() {
  const candidates = [resolve2(process.cwd(), "prisma/migrations"), resolve2(process.cwd(), "backend/prisma/migrations")];
  for (const dir of candidates) {
    if (existsSync(dir)) {
      return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join2(dir, d.name, "migration.sql"))).map((d) => d.name).sort();
    }
  }
  return null;
}
var COUNTED_TABLES = ["User", "Seller", "Category", "Product", "SellerProductListing", "Order", "Coupon"];
function explainDatabaseError(message) {
  if (/Access denied|Authentication failed|valid database credentials/i.test(message)) return 'The database rejected the username or password (check DATABASE_URL; encode "@" in the password as %40).';
  if (/Unknown database/i.test(message)) return "The database name in DATABASE_URL does not exist on this server.";
  if (/Can't reach database server|ECONNREFUSED|ETIMEDOUT|timed out/i.test(message)) {
    return "The database server is unreachable (check host/port; shared hosting databases usually only accept connections from the hosting server itself).";
  }
  return message.split("\n").filter(Boolean).slice(-1)[0]?.slice(0, 300) ?? "Unknown database error";
}
async function databaseStatus(db, url) {
  const target = describeDatabaseUrl(url);
  const started = Date.now();
  try {
    const [server] = await db.$queryRaw`
      SELECT VERSION() AS version, DATABASE() AS db, CURRENT_USER() AS usr`;
    const latencyMs = Date.now() - started;
    const [tables] = await db.$queryRaw`
      SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE()`;
    let applied = [];
    try {
      applied = await db.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM \`_prisma_migrations\` ORDER BY migration_name`;
    } catch {
    }
    const done = applied.filter((m) => m.finished_at && !m.rolled_back_at).map((m) => m.migration_name);
    const failed = applied.filter((m) => !m.finished_at && !m.rolled_back_at).map((m) => m.migration_name);
    const expected = expectedMigrations();
    const data = {};
    if (done.length) {
      for (const t of COUNTED_TABLES) {
        try {
          const [row] = await db.$queryRawUnsafe(`SELECT COUNT(*) AS c FROM \`${t}\``);
          data[t] = Number(row.c);
        } catch {
          data[t] = -1;
        }
      }
    }
    return {
      connected: true,
      latencyMs,
      target,
      server: { version: server.version, database: server.db, user: server.usr },
      schema: {
        tables: Number(tables.c),
        migrationsApplied: done.length,
        migrationsExpected: expected?.length ?? null,
        pendingMigrations: expected ? expected.filter((m) => !done.includes(m)) : [],
        failedMigrations: failed,
        lastMigration: done[done.length - 1] ?? null
      },
      data
    };
  } catch (err) {
    return { connected: false, latencyMs: Date.now() - started, target, error: explainDatabaseError(err.message) };
  }
}

// src/modules/admin/admin.routes.ts
var P = Permissions;
var A = { auth: "required" };
var adminScope = { kind: "admin" };
function adminRoutes(c) {
  const s = c.services;
  const t = (tag) => ({ tags: [`Admin \xB7 ${tag}`] });
  const dashboard = [
    route({
      method: "GET",
      path: "/admin/dashboard",
      ...A,
      permissions: [P.REPORTS_READ],
      schema: { query: rangeQuery },
      docs: { ...t("Reports"), summary: "Marketplace KPIs from live data" },
      handler: async (ctx) => s.analytics.adminDashboard(defaultRange(ctx.query.from, ctx.query.to))
    }),
    route({
      method: "GET",
      path: "/admin/reports/:kind",
      ...A,
      permissions: [P.REPORTS_READ],
      schema: {
        params: z4.object({ kind: z4.enum(["sales", "orders", "products", "sellers", "categories", "settlements", "ledger"]) }),
        query: rangeQuery.extend({ sellerId: idSchema.optional() })
      },
      docs: { ...t("Reports"), summary: "Report data as rows" },
      handler: async (ctx) => s.analytics.report(ctx.params.kind, defaultRange(ctx.query.from, ctx.query.to), ctx.query.sellerId ?? null)
    }),
    route({
      method: "GET",
      path: "/admin/reports/:kind/export",
      ...A,
      permissions: [P.REPORTS_READ],
      schema: {
        params: z4.object({ kind: z4.enum(["sales", "orders", "products", "sellers", "categories", "settlements", "ledger"]) }),
        query: exportQuery.extend({ sellerId: idSchema.optional() })
      },
      docs: { ...t("Reports"), summary: "Export a report (CSV/XLSX)" },
      handler: async (ctx) => {
        const file = await s.analytics.export(ctx.params.kind, defaultRange(ctx.query.from, ctx.query.to), ctx.query.sellerId ?? null, ctx.query.format);
        return reply.buffer(file.data, file.contentType, { filename: file.filename });
      }
    })
  ];
  const users = [
    route({
      method: "GET",
      path: "/admin/users",
      ...A,
      permissions: [P.USERS_READ],
      schema: {
        query: paginationQuerySchema.extend({
          role: z4.enum(["ADMIN", "SELLER", "CUSTOMER"]).optional(),
          status: z4.enum(["ACTIVE", "SUSPENDED", "DELETION_REQUESTED", "DELETED"]).optional()
        })
      },
      docs: { ...t("Users"), summary: "All users" },
      handler: async (ctx) => s.users.list(ctx.query)
    }),
    route({
      method: "GET",
      path: "/admin/users/:id",
      ...A,
      permissions: [P.USERS_READ],
      schema: { params: idParams },
      docs: { ...t("Users"), summary: "User detail with security events" },
      handler: async (ctx) => s.users.detail(ctx.params.id)
    }),
    route({
      method: "PATCH",
      path: "/admin/users/:id",
      ...A,
      permissions: [P.USERS_MANAGE],
      schema: { params: idParams, body: userAdminUpdateSchema },
      docs: { ...t("Users"), summary: "Suspend/reactivate a user or change roles" },
      handler: async (ctx) => {
        if (ctx.body.roles && !ctx.auth.permissions.has(P.ROLES_MANAGE)) throw badRequest("Changing roles requires roles:manage");
        return reply.ok(await s.users.update(ctx.params.id, ctx.body, actorOf(ctx)), "User updated");
      }
    }),
    route({
      method: "POST",
      path: "/admin/users/:id/anonymize",
      ...A,
      permissions: [P.USERS_MANAGE],
      schema: { params: idParams },
      docs: { ...t("Users"), summary: "Complete account deletion (anonymise, keep financial history)" },
      handler: async (ctx) => {
        await s.users.anonymize(ctx.params.id, actorOf(ctx));
        return reply.ok(null, "Account deleted");
      }
    }),
    route({
      method: "GET",
      path: "/admin/roles",
      ...A,
      permissions: [P.ROLES_MANAGE],
      docs: { ...t("Users"), summary: "Roles and permissions" },
      handler: async () => s.users.roles()
    }),
    route({
      method: "PUT",
      path: "/admin/roles/:code/permissions",
      ...A,
      permissions: [P.ROLES_MANAGE],
      schema: { params: z4.object({ code: z4.enum(["ADMIN", "SELLER", "CUSTOMER"]) }), body: z4.object({ permissions: z4.array(z4.string().max(80)).max(100) }) },
      docs: { ...t("Users"), summary: "Set the permissions granted to a role" },
      handler: async (ctx) => reply.ok(await s.users.setRolePermissions(ctx.params.code, ctx.body.permissions, actorOf(ctx)), "Permissions saved")
    }),
    route({
      method: "GET",
      path: "/admin/audit-logs",
      ...A,
      permissions: [P.AUDIT_READ],
      schema: {
        query: paginationQuerySchema.extend({
          entityType: z4.string().max(40).optional(),
          actorId: idSchema.optional(),
          action: z4.string().max(80).optional()
        })
      },
      docs: { ...t("Security"), summary: "Audit trail" },
      handler: async (ctx) => s.users.auditLogs(ctx.query)
    }),
    route({
      method: "GET",
      path: "/admin/security-events",
      ...A,
      permissions: [P.AUDIT_READ],
      schema: { query: paginationQuerySchema.extend({ type: z4.string().max(60).optional() }) },
      docs: { ...t("Security"), summary: "Security events (logins, lockouts, denied access \u2026)" },
      handler: async (ctx) => s.users.securityEvents(ctx.query)
    })
  ];
  const sellers = [
    route({
      method: "GET",
      path: "/admin/sellers",
      ...A,
      permissions: [P.SELLERS_READ],
      schema: { query: sellerStatusQuerySchema },
      docs: { ...t("Sellers"), summary: "All sellers" },
      handler: async (ctx) => s.sellers.list(ctx.query)
    }),
    route({
      method: "POST",
      path: "/admin/sellers",
      ...A,
      permissions: [P.SELLERS_MANAGE],
      schema: { body: adminCreateSellerSchema },
      docs: { ...t("Sellers"), summary: "Create a seller and email a password-setup invitation" },
      handler: async (ctx) => reply.created(await s.sellers.adminCreate(ctx.body, actorOf(ctx)), "Seller created and invitation sent")
    }),
    route({
      method: "GET",
      path: "/admin/sellers/outstanding",
      ...A,
      permissions: [P.SETTLEMENTS_MANAGE],
      docs: { ...t("Finance"), summary: "Seller balances awaiting settlement" },
      handler: async () => s.finance.outstanding()
    }),
    route({
      method: "GET",
      path: "/admin/sellers/:id",
      ...A,
      permissions: [P.SELLERS_READ],
      schema: { params: idParams },
      docs: { ...t("Sellers"), summary: "Seller detail, KYC documents and approval history" },
      handler: async (ctx) => s.sellers.adminDetail(ctx.params.id)
    }),
    route({
      method: "PATCH",
      path: "/admin/sellers/:id",
      ...A,
      permissions: [P.SELLERS_MANAGE],
      schema: {
        params: idParams,
        body: sellerProfileUpdateSchema.extend({
          businessName: z4.string().trim().min(2).max(160).optional(),
          gstin: z4.string().trim().max(15).optional(),
          pan: z4.string().trim().max(10).optional(),
          isFeatured: z4.boolean().optional()
        })
      },
      docs: { ...t("Sellers"), summary: "Edit seller details / feature on homepage" },
      handler: async (ctx) => reply.ok(await s.sellers.adminUpdate(ctx.params.id, ctx.body, actorOf(ctx)), "Seller updated")
    }),
    ...[
      ["approve", "APPROVED", "Seller approved"],
      ["reject", "REJECTED", "Seller rejected"],
      ["suspend", "SUSPENDED", "Seller suspended"],
      ["reactivate", "APPROVED", "Seller reactivated"],
      ["deactivate", "INACTIVE", "Seller deactivated"]
    ].map(
      ([action, status, message]) => route({
        method: "PATCH",
        path: `/admin/sellers/:id/${action}`,
        ...A,
        permissions: [P.SELLERS_APPROVE],
        schema: { params: idParams, body: sellerDecisionSchema },
        docs: { ...t("Sellers"), summary: `${action[0].toUpperCase()}${action.slice(1)} seller` },
        handler: async (ctx) => reply.ok(await s.sellers.changeStatus(ctx.params.id, status, ctx.body.reason, actorOf(ctx)), message)
      })
    ),
    route({
      method: "POST",
      path: "/admin/sellers/:id/resend-invite",
      ...A,
      permissions: [P.SELLERS_MANAGE],
      schema: { params: idParams },
      docs: { ...t("Sellers"), summary: "Resend the password-setup invitation" },
      handler: async (ctx) => {
        await s.sellers.resendInvite(ctx.params.id, actorOf(ctx));
        return reply.ok(null, "Invitation sent");
      }
    }),
    route({
      method: "GET",
      path: "/admin/sellers/:id/ledger",
      ...A,
      permissions: [P.SETTLEMENTS_MANAGE],
      schema: { params: idParams, query: paginationQuerySchema },
      docs: { ...t("Finance"), summary: "A seller\u2019s ledger and balance" },
      handler: async (ctx) => ({
        balance: await s.finance.balances(ctx.params.id),
        ledger: await s.finance.ledger(ctx.params.id, ctx.query)
      })
    }),
    route({
      method: "GET",
      path: "/admin/seller-documents/:id/url",
      ...A,
      permissions: [P.SELLERS_READ],
      schema: { params: idParams },
      docs: { ...t("Sellers"), summary: "Signed URL for a KYC document" },
      handler: async (ctx) => s.sellers.documentUrl(ctx.params.id, { sellerId: null })
    }),
    route({
      method: "PATCH",
      path: "/admin/seller-documents/:id",
      ...A,
      permissions: [P.SELLERS_APPROVE],
      schema: { params: idParams, body: z4.object({ status: z4.enum(["VERIFIED", "REJECTED"]), note: z4.string().max(500).optional() }) },
      docs: { ...t("Sellers"), summary: "Verify or reject a KYC document" },
      handler: async (ctx) => reply.ok(await s.sellers.verifyDocument(ctx.params.id, ctx.body.status, ctx.body.note, actorOf(ctx)), "Document updated")
    })
  ];
  const products = [
    route({
      method: "GET",
      path: "/admin/products",
      ...A,
      permissions: [P.PRODUCTS_READ_ALL],
      schema: { query: managedProductQuerySchema },
      docs: { ...t("Products"), summary: "All products across sellers (review queue via status=PENDING_REVIEW)" },
      handler: async (ctx) => ({ ...await s.products.listManaged(adminScope, ctx.query), counts: await s.products.statusCounts(adminScope) })
    }),
    route({
      method: "POST",
      path: "/admin/products",
      ...A,
      permissions: [P.PRODUCTS_MANAGE_ALL],
      schema: { body: productUpsertSchema.extend({ sellerId: idSchema }) },
      docs: { ...t("Products"), summary: "Create a product on behalf of a seller" },
      handler: async (ctx) => {
        const { sellerId, ...input } = ctx.body;
        return reply.created(await s.products.create(sellerId, input, actorOf(ctx), true), "Product created");
      }
    }),
    route({
      method: "GET",
      path: "/admin/products/export",
      ...A,
      permissions: [P.PRODUCTS_READ_ALL],
      schema: { query: exportQuery },
      docs: { ...t("Products"), summary: "Export all listings" },
      handler: async (ctx) => {
        const file = await s.productIo.export({ sellerId: null }, ctx.query.format);
        return reply.buffer(file.data, file.contentType, { filename: file.filename });
      }
    }),
    route({
      method: "POST",
      path: "/admin/products/import",
      ...A,
      permissions: [P.PRODUCTS_MANAGE_ALL],
      upload: { maxFiles: 1, maxFileBytes: 5 * MB, allowed: "spreadsheet" },
      schema: { body: z4.object({ sellerId: idSchema }) },
      docs: { ...t("Products"), summary: "Bulk import products for a seller" },
      handler: async (ctx) => {
        if (!ctx.files[0]) throw badRequest("Choose a CSV or Excel file");
        return s.productIo.import(ctx.body.sellerId, ctx.files[0], actorOf(ctx));
      }
    }),
    route({
      method: "GET",
      path: "/admin/products/:id",
      ...A,
      permissions: [P.PRODUCTS_READ_ALL],
      schema: { params: idParams },
      docs: { ...t("Products"), summary: "Product with all seller listings and approval history" },
      handler: async (ctx) => s.products.getManaged(ctx.params.id, adminScope)
    }),
    route({
      method: "PUT",
      path: "/admin/products/:id",
      ...A,
      permissions: [P.PRODUCTS_MANAGE_ALL],
      schema: { params: idParams, body: productUpsertSchema },
      docs: { ...t("Products"), summary: "Edit any product (audited)" },
      handler: async (ctx) => reply.ok(await s.products.update(ctx.params.id, ctx.body, adminScope, actorOf(ctx)), "Product updated")
    }),
    route({
      method: "DELETE",
      path: "/admin/products/:id",
      ...A,
      permissions: [P.PRODUCTS_MANAGE_ALL],
      schema: { params: idParams },
      docs: { ...t("Products"), summary: "Remove (archive) a product" },
      handler: async (ctx) => {
        await s.products.archive(ctx.params.id, adminScope, actorOf(ctx));
        return reply.ok(null, "Product removed");
      }
    }),
    route({
      method: "GET",
      path: "/admin/products/:id/history",
      ...A,
      permissions: [P.PRODUCTS_READ_ALL],
      schema: { params: idParams },
      docs: { ...t("Products"), summary: "Product change history" },
      handler: async (ctx) => s.products.history(ctx.params.id)
    }),
    route({
      method: "PATCH",
      path: "/admin/products/:id/approve",
      ...A,
      permissions: [P.PRODUCTS_APPROVE],
      schema: { params: idParams },
      docs: { ...t("Products"), summary: "Approve product" },
      handler: async (ctx) => reply.ok(await s.products.approve(ctx.params.id, actorOf(ctx)), "Product approved")
    }),
    route({
      method: "PATCH",
      path: "/admin/products/:id/reject",
      ...A,
      permissions: [P.PRODUCTS_APPROVE],
      schema: { params: idParams, body: productRejectSchema },
      docs: { ...t("Products"), summary: "Reject product with a reason" },
      handler: async (ctx) => reply.ok(await s.products.reject(ctx.params.id, ctx.body.reason, actorOf(ctx)), "Product rejected")
    }),
    route({
      method: "PATCH",
      path: "/admin/products/:id/suspend",
      ...A,
      permissions: [P.PRODUCTS_APPROVE],
      schema: { params: idParams, body: productRejectSchema },
      docs: { ...t("Products"), summary: "Suspend a live product" },
      handler: async (ctx) => reply.ok(await s.products.suspend(ctx.params.id, ctx.body.reason, actorOf(ctx)), "Product suspended")
    }),
    route({
      method: "PATCH",
      path: "/admin/products/:id/feature",
      ...A,
      permissions: [P.PRODUCTS_MANAGE_ALL],
      schema: { params: idParams, body: z4.object({ isFeatured: z4.boolean() }) },
      docs: { ...t("Products"), summary: "Feature/unfeature a product" },
      handler: async (ctx) => {
        await s.products.setFeatured(ctx.params.id, ctx.body.isFeatured, actorOf(ctx));
        return reply.ok(null, ctx.body.isFeatured ? "Product featured" : "Product unfeatured");
      }
    }),
    route({
      method: "POST",
      path: "/admin/products/:id/images",
      ...A,
      permissions: [P.PRODUCTS_MANAGE_ALL],
      schema: { params: idParams },
      upload: { maxFiles: 10, maxFileBytes: c.env.UPLOAD_MAX_IMAGE_MB * MB, allowed: "image" },
      docs: { ...t("Products"), summary: "Upload images to any product" },
      handler: async (ctx) => reply.ok(await s.products.addImages(ctx.params.id, ctx.files, adminScope, actorOf(ctx)), "Images uploaded")
    }),
    route({
      method: "DELETE",
      path: "/admin/products/:id/images/:imageId",
      ...A,
      permissions: [P.PRODUCTS_MANAGE_ALL],
      schema: { params: z4.object({ id: idSchema, imageId: idSchema }) },
      docs: { ...t("Products"), summary: "Remove an image" },
      handler: async (ctx) => reply.ok(await s.products.removeImage(ctx.params.id, ctx.params.imageId, adminScope, actorOf(ctx)), "Image removed")
    }),
    route({
      method: "PUT",
      path: "/admin/products/:id/images",
      ...A,
      permissions: [P.PRODUCTS_MANAGE_ALL],
      schema: { params: idParams, body: z4.object({ imageIds: z4.array(idSchema).max(10) }) },
      docs: { ...t("Products"), summary: "Reorder product images" },
      handler: async (ctx) => s.products.reorderImages(ctx.params.id, ctx.body.imageIds, adminScope)
    }),
    route({
      method: "PATCH",
      path: "/admin/listings/:id/decision",
      ...A,
      permissions: [P.PRODUCTS_APPROVE],
      schema: { params: idParams, body: z4.object({ approve: z4.boolean(), reason: z4.string().max(1e3).optional() }) },
      docs: { ...t("Products"), summary: "Approve/reject a seller offer on an existing product" },
      handler: async (ctx) => {
        await s.products.decideListing(ctx.params.id, ctx.body.approve, ctx.body.reason, actorOf(ctx));
        return reply.ok(null, ctx.body.approve ? "Offer approved" : "Offer rejected");
      }
    }),
    route({
      method: "GET",
      path: "/admin/inventory",
      ...A,
      permissions: [P.INVENTORY_MANAGE_ALL],
      schema: { query: paginationQuerySchema.extend({ filter: z4.enum(["all", "low", "out"]).default("all") }) },
      docs: { ...t("Inventory"), summary: "Stock across all sellers" },
      handler: async (ctx) => s.inventory.list({ sellerId: null }, ctx.query)
    }),
    route({
      method: "PATCH",
      path: "/admin/inventory/:id",
      ...A,
      permissions: [P.INVENTORY_MANAGE_ALL],
      schema: { params: idParams, body: inventoryAdjustSchema },
      docs: { ...t("Inventory"), summary: "Adjust any listing\u2019s stock (audited)" },
      handler: async (ctx) => reply.ok(await s.inventory.adjust(ctx.params.id, ctx.body, actorOf(ctx), { sellerId: null }), "Stock updated")
    }),
    route({
      method: "GET",
      path: "/admin/inventory/:id/movements",
      ...A,
      permissions: [P.INVENTORY_MANAGE_ALL],
      schema: { params: idParams, query: paginationQuerySchema },
      docs: { ...t("Inventory"), summary: "Movement history" },
      handler: async (ctx) => s.inventory.movements(ctx.params.id, { sellerId: null }, ctx.query.page, ctx.query.pageSize)
    })
  ];
  const orders = [
    route({
      method: "GET",
      path: "/admin/orders",
      ...A,
      permissions: [P.ORDERS_READ_ALL],
      schema: { query: orderListQuerySchema.extend({ paymentStatus: z4.string().max(20).optional() }) },
      docs: { ...t("Orders"), summary: "All orders" },
      handler: async (ctx) => s.orderQueries.adminOrders(ctx.query)
    }),
    route({
      method: "GET",
      path: "/admin/orders/:id",
      ...A,
      permissions: [P.ORDERS_READ_ALL],
      schema: { params: idParams },
      docs: { ...t("Orders"), summary: "Full order incl. commissions, payments, refunds" },
      handler: async (ctx) => s.orderQueries.adminOrder(ctx.params.id)
    }),
    route({
      method: "GET",
      path: "/admin/seller-orders/:id",
      ...A,
      permissions: [P.ORDERS_READ_ALL],
      schema: { params: idParams },
      docs: { ...t("Orders"), summary: "Sub-order detail" },
      handler: async (ctx) => s.orderQueries.sellerOrder(ctx.params.id, { sellerId: null })
    }),
    route({
      method: "PATCH",
      path: "/admin/seller-orders/:id/status",
      ...A,
      permissions: [P.ORDERS_MANAGE_ALL],
      schema: { params: idParams, body: sellerOrderStatusSchema },
      docs: { ...t("Orders"), summary: "Update any sub-order (overrides seller restrictions)" },
      handler: async (ctx) => {
        const { status, ...rest } = ctx.body;
        return reply.ok(await s.fulfillment.updateSellerOrderStatus(ctx.params.id, status, rest, adminScope, actorOf(ctx)), "Order updated");
      }
    }),
    route({
      method: "POST",
      path: "/admin/seller-orders/:id/cod-collected",
      ...A,
      permissions: [P.ORDERS_MANAGE_ALL],
      schema: { params: idParams, body: z4.object({ reference: z4.string().max(120).optional() }) },
      docs: { ...t("Orders"), summary: "Confirm COD cash received \u2014 credits the seller ledger" },
      handler: async (ctx) => {
        await s.fulfillment.confirmCodCollection(ctx.params.id, ctx.body, actorOf(ctx));
        return reply.ok(null, "Cash collection confirmed");
      }
    }),
    route({
      method: "GET",
      path: "/admin/seller-orders/:id/packing-slip",
      ...A,
      permissions: [P.ORDERS_READ_ALL],
      schema: { params: idParams },
      docs: { ...t("Orders"), summary: "Packing slip" },
      handler: async (ctx) => reply.html(await s.orderQueries.packingSlip(ctx.params.id, { sellerId: null }, (await s.settings.get("branding")).name))
    }),
    route({
      method: "GET",
      path: "/admin/cod/pending",
      ...A,
      permissions: [P.ORDERS_READ_ALL],
      schema: { query: paginationQuerySchema },
      docs: { ...t("Orders"), summary: "Delivered COD sub-orders awaiting cash reconciliation" },
      handler: async (ctx) => s.orderQueries.codPending(ctx.query)
    }),
    route({
      method: "GET",
      path: "/admin/returns",
      ...A,
      permissions: [P.ORDERS_READ_ALL],
      schema: { query: paginationQuerySchema.extend({ status: z4.string().max(20).optional() }) },
      docs: { ...t("Orders"), summary: "All return requests" },
      handler: async (ctx) => s.orderQueries.returns({ sellerId: null }, ctx.query)
    }),
    route({
      method: "PATCH",
      path: "/admin/returns/:id",
      ...A,
      permissions: [P.ORDERS_MANAGE_ALL],
      schema: { params: idParams, body: returnDecisionSchema },
      docs: { ...t("Orders"), summary: "Decide or receive a return" },
      handler: async (ctx) => {
        await s.fulfillment.decideReturn(ctx.params.id, ctx.body, adminScope, actorOf(ctx));
        return reply.ok(null, "Return updated");
      }
    }),
    route({
      method: "GET",
      path: "/admin/refunds",
      ...A,
      permissions: [P.ORDERS_READ_ALL],
      schema: { query: paginationQuerySchema.extend({ status: z4.string().max(20).optional() }) },
      docs: { ...t("Orders"), summary: "Refunds" },
      handler: async (ctx) => s.orderQueries.refunds(ctx.query)
    }),
    route({
      method: "PATCH",
      path: "/admin/refunds/:id",
      ...A,
      permissions: [P.ORDERS_MANAGE_ALL],
      schema: {
        params: idParams,
        body: z4.object({ reference: z4.string().max(120).optional(), method: z4.string().max(40).optional(), failed: z4.boolean().default(false), note: z4.string().max(500).optional() })
      },
      docs: { ...t("Orders"), summary: "Record a refund payout (manual; no automatic transfers)" },
      handler: async (ctx) => {
        await s.fulfillment.processRefund(ctx.params.id, ctx.body, actorOf(ctx));
        return reply.ok(null, ctx.body.failed ? "Refund marked failed" : "Refund recorded");
      }
    })
  ];
  const finance = [
    route({
      method: "GET",
      path: "/admin/commission-rules",
      ...A,
      permissions: [P.COMMISSIONS_MANAGE],
      schema: { query: z4.object({ scope: z4.enum(COMMISSION_SCOPES).optional(), sellerId: idSchema.optional() }) },
      docs: { ...t("Finance"), summary: "Commission rules (precedence: product > seller+category > seller > category > global)" },
      handler: async (ctx) => ({ rules: await s.finance.listRules(ctx.query), defaultPercentage: s.finance.defaultCommissionPercent })
    }),
    route({
      method: "POST",
      path: "/admin/commission-rules",
      ...A,
      permissions: [P.COMMISSIONS_MANAGE],
      schema: { body: commissionRuleSchema },
      docs: { ...t("Finance"), summary: "Create commission rule" },
      handler: async (ctx) => reply.created(await s.finance.createRule(ctx.body, actorOf(ctx)), "Rule created")
    }),
    route({
      method: "PUT",
      path: "/admin/commission-rules/:id",
      ...A,
      permissions: [P.COMMISSIONS_MANAGE],
      schema: { params: idParams, body: commissionRuleSchema },
      docs: { ...t("Finance"), summary: "Update commission rule (applies to new orders only)" },
      handler: async (ctx) => reply.ok(await s.finance.updateRule(ctx.params.id, ctx.body, actorOf(ctx)), "Rule updated")
    }),
    route({
      method: "DELETE",
      path: "/admin/commission-rules/:id",
      ...A,
      permissions: [P.COMMISSIONS_MANAGE],
      schema: { params: idParams },
      docs: { ...t("Finance"), summary: "Delete commission rule" },
      handler: async (ctx) => {
        await s.finance.deleteRule(ctx.params.id, actorOf(ctx));
        return reply.ok(null, "Rule deleted");
      }
    }),
    route({
      method: "GET",
      path: "/admin/commissions",
      ...A,
      permissions: [P.COMMISSIONS_MANAGE],
      schema: { query: paginationQuerySchema.extend({ status: z4.string().max(20).optional(), sellerId: idSchema.optional() }) },
      docs: { ...t("Finance"), summary: "Item-level commission records" },
      handler: async (ctx) => s.finance.commissions({ sellerId: null }, ctx.query)
    }),
    route({
      method: "GET",
      path: "/admin/settlements",
      ...A,
      permissions: [P.SETTLEMENTS_MANAGE],
      schema: { query: paginationQuerySchema.extend({ status: z4.enum(SETTLEMENT_STATUSES).optional(), sellerId: idSchema.optional() }) },
      docs: { ...t("Finance"), summary: "Settlements" },
      handler: async (ctx) => s.finance.listSettlements({ sellerId: null }, ctx.query)
    }),
    route({
      method: "POST",
      path: "/admin/settlements",
      ...A,
      permissions: [P.SETTLEMENTS_MANAGE],
      schema: { body: createSettlementSchema },
      docs: { ...t("Finance"), summary: "Create a settlement (\u2264 available balance)" },
      handler: async (ctx) => reply.created(await s.finance.createSettlement(ctx.body, actorOf(ctx)), "Settlement created")
    }),
    route({
      method: "GET",
      path: "/admin/settlements/:id",
      ...A,
      permissions: [P.SETTLEMENTS_MANAGE],
      schema: { params: idParams },
      docs: { ...t("Finance"), summary: "Settlement detail with transaction trail" },
      handler: async (ctx) => s.finance.settlementDetail(ctx.params.id, { sellerId: null })
    }),
    route({
      method: "PATCH",
      path: "/admin/settlements/:id/status",
      ...A,
      permissions: [P.SETTLEMENTS_MANAGE],
      schema: { params: idParams, body: settlementStatusSchema },
      docs: { ...t("Finance"), summary: "Approve / process / mark paid (manual payout reference) / fail / cancel" },
      handler: async (ctx) => {
        const { status, ...rest } = ctx.body;
        return reply.ok(await s.finance.changeSettlementStatus(ctx.params.id, status, rest, actorOf(ctx)), "Settlement updated");
      }
    }),
    route({
      method: "POST",
      path: "/admin/ledger/adjustments",
      ...A,
      permissions: [P.SETTLEMENTS_MANAGE],
      schema: { body: ledgerAdjustmentSchema },
      docs: { ...t("Finance"), summary: "Post a manual ledger adjustment (audited)" },
      handler: async (ctx) => reply.created(await s.finance.adjust(ctx.body, actorOf(ctx)), "Adjustment posted")
    })
  ];
  const marketing = [
    route({
      method: "GET",
      path: "/admin/coupons",
      ...A,
      permissions: [P.COUPONS_MANAGE],
      schema: { query: paginationQuerySchema },
      docs: { ...t("Marketing"), summary: "Coupons" },
      handler: async (ctx) => s.coupons.list(ctx.query)
    }),
    route({
      method: "POST",
      path: "/admin/coupons",
      ...A,
      permissions: [P.COUPONS_MANAGE],
      schema: { body: couponSchema },
      docs: { ...t("Marketing"), summary: "Create coupon" },
      handler: async (ctx) => reply.created(await s.coupons.create(ctx.body, actorOf(ctx)), "Coupon created")
    }),
    route({
      method: "PUT",
      path: "/admin/coupons/:id",
      ...A,
      permissions: [P.COUPONS_MANAGE],
      schema: { params: idParams, body: couponSchema },
      docs: { ...t("Marketing"), summary: "Update coupon" },
      handler: async (ctx) => reply.ok(await s.coupons.update(ctx.params.id, ctx.body, actorOf(ctx)), "Coupon updated")
    }),
    route({
      method: "DELETE",
      path: "/admin/coupons/:id",
      ...A,
      permissions: [P.COUPONS_MANAGE],
      schema: { params: idParams },
      docs: { ...t("Marketing"), summary: "Delete coupon" },
      handler: async (ctx) => {
        await s.coupons.remove(ctx.params.id, actorOf(ctx));
        return reply.ok(null, "Coupon deleted");
      }
    }),
    route({
      method: "GET",
      path: "/admin/coupons/:id/usages",
      ...A,
      permissions: [P.COUPONS_MANAGE],
      schema: { params: idParams, query: paginationQuerySchema },
      docs: { ...t("Marketing"), summary: "Redemptions of a coupon" },
      handler: async (ctx) => s.coupons.usages(ctx.params.id, ctx.query.page, ctx.query.pageSize)
    }),
    ...contentCrud("banners", bannerSchema, {
      list: () => s.content.listBanners(),
      create: (b, a) => s.content.createBanner(b, a),
      update: (id, b, a) => s.content.updateBanner(id, b, a),
      remove: (id, a) => s.content.deleteBanner(id, a)
    }),
    ...contentCrud("home-sections", homeSectionSchema, {
      list: () => s.content.listSections(),
      create: (b, a) => s.content.createSection(b, a),
      update: (id, b, a) => s.content.updateSection(id, b, a),
      remove: (id, a) => s.content.deleteSection(id, a)
    }),
    ...contentCrud("promotions", promotionSchema, {
      list: () => s.content.listPromotions(),
      create: (b, a) => s.content.createPromotion(b, a),
      update: (id, b, a) => s.content.updatePromotion(id, b, a),
      remove: (id, a) => s.content.deletePromotion(id, a)
    }),
    route({
      method: "POST",
      path: "/admin/uploads/image",
      ...A,
      permissions: [P.CONTENT_MANAGE],
      upload: { maxFiles: 1, maxFileBytes: c.env.UPLOAD_MAX_IMAGE_MB * MB, allowed: "image" },
      docs: { ...t("Marketing"), summary: "Upload a banner/category image" },
      handler: async (ctx) => {
        if (!ctx.files[0]) throw badRequest("Choose an image");
        return s.content.uploadImage(ctx.files[0]);
      }
    }),
    route({
      method: "GET",
      path: "/admin/reviews",
      ...A,
      permissions: [P.REVIEWS_MODERATE],
      schema: {
        query: paginationQuerySchema.extend({
          status: z4.enum(["PENDING", "APPROVED", "REJECTED", "REMOVED"]).optional(),
          reported: z4.enum(["true", "false"]).optional()
        })
      },
      docs: { ...t("Marketing"), summary: "Review moderation queue" },
      handler: async (ctx) => ({ ...await s.reviews.moderationQueue({ ...ctx.query, reported: ctx.query.reported === "true" }), stats: await s.reviews.stats() })
    }),
    route({
      method: "PATCH",
      path: "/admin/reviews/:id",
      ...A,
      permissions: [P.REVIEWS_MODERATE],
      schema: { params: idParams, body: z4.object({ status: z4.enum(["APPROVED", "REJECTED", "REMOVED"]), note: z4.string().max(500).optional() }) },
      docs: { ...t("Marketing"), summary: "Approve / reject / remove a review" },
      handler: async (ctx) => {
        await s.reviews.moderate(ctx.params.id, ctx.body.status, ctx.body.note, actorOf(ctx));
        return reply.ok(null, "Review updated");
      }
    })
  ];
  const config = [
    route({
      method: "GET",
      path: "/admin/system/status",
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      docs: { ...t("Settings"), summary: "Database connection, schema/migration and data status (password never included)" },
      handler: async () => ({
        database: await databaseStatus(c.db, c.env.DATABASE_URL),
        app: { env: c.env.APP_ENV, framework: c.env.BACKEND_FRAMEWORK, databaseType: c.env.DATABASE_TYPE, orm: c.env.ORM_PROVIDER, storage: c.storage.name, redis: Boolean(c.redis) }
      })
    }),
    route({
      method: "GET",
      path: "/admin/settings",
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      docs: { ...t("Settings"), summary: "All marketplace settings" },
      handler: async () => s.settings.all()
    }),
    route({
      method: "PATCH",
      path: "/admin/settings/:key",
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      schema: { params: z4.object({ key: z4.enum(SETTING_KEYS) }), body: z4.record(z4.string(), z4.unknown()) },
      docs: { ...t("Settings"), summary: "Update one settings group (partial)" },
      handler: async (ctx) => {
        const before = await s.settings.get(ctx.params.key);
        const next = await s.settings.update(ctx.params.key, ctx.body, ctx.auth.userId);
        await s.audit.record(actorOf(ctx), { action: "settings.update", entityType: "SystemSetting", entityId: ctx.params.key, before, after: next });
        await c.cache.delPrefix("home:");
        return reply.ok(next, "Settings saved");
      }
    }),
    route({
      method: "GET",
      path: "/admin/shipping/methods",
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      docs: { ...t("Settings"), summary: "Shipping methods" },
      handler: async () => s.shipping.methods()
    }),
    route({
      method: "PUT",
      path: "/admin/shipping/methods",
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      schema: { body: shippingConfigSchema },
      docs: { ...t("Settings"), summary: "Configure a shipping method" },
      handler: async (ctx) => reply.ok(await s.shipping.upsertMethod(ctx.body, actorOf(ctx)), "Shipping updated")
    }),
    route({
      method: "GET",
      path: "/admin/shipping/pincodes",
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      schema: { query: z4.object({ q: z4.string().max(10).optional() }) },
      docs: { ...t("Settings"), summary: "Serviceable PIN codes (empty = all serviceable)" },
      handler: async (ctx) => s.shipping.listPincodes(ctx.query.q)
    }),
    route({
      method: "PUT",
      path: "/admin/shipping/pincodes",
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      schema: { body: pincodeSchemaInput },
      docs: { ...t("Settings"), summary: "Add/update a PIN code rule" },
      handler: async (ctx) => reply.ok(await s.shipping.upsertPincode(ctx.body, actorOf(ctx)), "PIN code saved")
    }),
    route({
      method: "DELETE",
      path: "/admin/shipping/pincodes/:id",
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      schema: { params: idParams },
      docs: { ...t("Settings"), summary: "Remove a PIN code rule" },
      handler: async (ctx) => {
        await s.shipping.deletePincode(ctx.params.id, actorOf(ctx));
        return reply.ok(null, "PIN code removed");
      }
    }),
    route({
      method: "GET",
      path: "/admin/tax",
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      docs: { ...t("Settings"), summary: "Tax configurations" },
      handler: async () => s.tax.list()
    }),
    route({
      method: "POST",
      path: "/admin/tax",
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      schema: { body: taxConfigSchema },
      docs: { ...t("Settings"), summary: "Create tax rate" },
      handler: async (ctx) => reply.created(await s.tax.create(ctx.body, actorOf(ctx)), "Tax rate created")
    }),
    route({
      method: "PUT",
      path: "/admin/tax/:id",
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      schema: { params: idParams, body: taxConfigSchema },
      docs: { ...t("Settings"), summary: "Update tax rate" },
      handler: async (ctx) => reply.ok(await s.tax.update(ctx.params.id, ctx.body, actorOf(ctx)), "Tax rate updated")
    }),
    route({
      method: "DELETE",
      path: "/admin/tax/:id",
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      schema: { params: idParams },
      docs: { ...t("Settings"), summary: "Delete tax rate" },
      handler: async (ctx) => {
        await s.tax.remove(ctx.params.id, actorOf(ctx));
        return reply.ok(null, "Tax rate deleted");
      }
    }),
    route({
      method: "GET",
      path: "/admin/notification-templates",
      ...A,
      permissions: [P.NOTIFICATIONS_MANAGE],
      docs: { ...t("Settings"), summary: "Notification templates with overrides" },
      handler: async () => s.notifications.listTemplates()
    }),
    route({
      method: "PUT",
      path: "/admin/notification-templates/:key/:channel",
      ...A,
      permissions: [P.NOTIFICATIONS_MANAGE],
      schema: { params: z4.object({ key: z4.string().max(80), channel: z4.enum(["IN_APP", "EMAIL", "SMS"]) }), body: notificationTemplateSchema },
      docs: { ...t("Settings"), summary: "Override a notification template" },
      handler: async (ctx) => {
        const row = await s.notifications.upsertTemplate(ctx.params.key, ctx.params.channel, ctx.body);
        await s.audit.record(actorOf(ctx), { action: "notification.template", entityType: "NotificationTemplate", entityId: row.id, after: ctx.body });
        return reply.ok(row, "Template saved");
      }
    }),
    route({
      method: "GET",
      path: "/admin/outbox",
      ...A,
      permissions: [P.NOTIFICATIONS_MANAGE],
      schema: { query: paginationQuerySchema.extend({ recipient: z4.string().max(191).optional() }) },
      docs: { ...t("Settings"), summary: "Outbound email/SMS log (development mail preview)" },
      handler: async (ctx) => s.notifications.outbox(ctx.query.page, ctx.query.pageSize, ctx.query.recipient)
    })
  ];
  function contentCrud(name, schema, ops) {
    const docs = t("Content");
    return [
      route({ method: "GET", path: `/admin/${name}`, ...A, permissions: [P.CONTENT_MANAGE], docs: { ...docs, summary: `List ${name}` }, handler: async () => ops.list() }),
      route({
        method: "POST",
        path: `/admin/${name}`,
        ...A,
        permissions: [P.CONTENT_MANAGE],
        schema: { body: schema },
        docs: { ...docs, summary: `Create ${name}` },
        handler: async (ctx) => reply.created(await ops.create(ctx.body, actorOf(ctx)), "Saved")
      }),
      route({
        method: "PUT",
        path: `/admin/${name}/:id`,
        ...A,
        permissions: [P.CONTENT_MANAGE],
        schema: { params: idParams, body: schema },
        docs: { ...docs, summary: `Update ${name}` },
        handler: async (ctx) => reply.ok(await ops.update(ctx.params.id, ctx.body, actorOf(ctx)), "Saved")
      }),
      route({
        method: "DELETE",
        path: `/admin/${name}/:id`,
        ...A,
        permissions: [P.CONTENT_MANAGE],
        schema: { params: idParams },
        docs: { ...docs, summary: `Delete ${name}` },
        handler: async (ctx) => {
          await ops.remove(ctx.params.id, actorOf(ctx));
          return reply.ok(null, "Deleted");
        }
      })
    ];
  }
  return [...dashboard, ...users, ...sellers, ...products, ...orders, ...finance, ...marketing, ...config];
}

// src/modules/auth/auth.routes.ts
var tags = ["Auth"];
var REFRESH_PATH = "/api/v1/auth";
function authRoutes(c) {
  const setSession = async (ctx, s) => {
    ctx.setCookie(ACCESS_COOKIE, s.accessToken, { maxAgeSeconds: s.accessMaxAgeSeconds });
    ctx.setCookie(REFRESH_COOKIE, s.refreshToken, { maxAgeSeconds: s.refreshMaxAgeSeconds, path: REFRESH_PATH });
    ctx.setCookie(CSRF_COOKIE, randomToken(24), { httpOnly: false });
    const guest = ctx.cookies[GUEST_CART_COOKIE];
    if (guest) {
      await c.services.cart.mergeGuestCart(guest, s.userId);
      ctx.clearCookie(GUEST_CART_COOKIE);
    }
    return c.services.auth.sessionUser(s.userId);
  };
  const clearSession = (ctx) => {
    ctx.clearCookie(ACCESS_COOKIE);
    ctx.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH });
  };
  const meta = (ctx) => ({ ip: ctx.ip, userAgent: ctx.userAgent });
  return [
    route({
      method: "GET",
      path: "/auth/csrf",
      auth: "public",
      docs: { tags, summary: "Issue a CSRF token cookie (double-submit)" },
      handler: async (ctx) => {
        let token = ctx.cookies[CSRF_COOKIE];
        if (!token) {
          token = randomToken(24);
          ctx.setCookie(CSRF_COOKIE, token, { httpOnly: false });
        }
        return { csrfToken: token };
      }
    }),
    route({
      method: "POST",
      path: "/auth/register",
      auth: "public",
      schema: { body: registerSchema },
      rateLimit: { name: "auth:register", windowSeconds: 3600, max: 20 },
      docs: { tags, summary: "Register a customer account" },
      handler: async (ctx) => {
        const session = await c.services.auth.registerCustomer(ctx.body, meta(ctx));
        return reply.created(await setSession(ctx, session), "Welcome aboard! Your account has been created.");
      }
    }),
    route({
      method: "POST",
      path: "/auth/login",
      auth: "public",
      schema: { body: loginSchema },
      rateLimit: { name: "auth:login", windowSeconds: 60, max: 10 },
      docs: { tags, summary: "Sign in with email and password" },
      handler: async (ctx) => {
        const session = await c.services.auth.login(ctx.body.email, ctx.body.password, meta(ctx));
        return reply.ok(await setSession(ctx, session), "Signed in successfully");
      }
    }),
    route({
      method: "POST",
      path: "/auth/refresh",
      auth: "public",
      rateLimit: { name: "auth:refresh", windowSeconds: 60, max: 60 },
      docs: { tags, summary: "Rotate the refresh token and issue a new access token" },
      handler: async (ctx) => {
        const token = ctx.cookies[REFRESH_COOKIE];
        if (!token) throw unauthenticated("Your session has expired. Please sign in again.");
        try {
          const session = await c.services.auth.refresh(token, meta(ctx));
          ctx.setCookie(ACCESS_COOKIE, session.accessToken, { maxAgeSeconds: session.accessMaxAgeSeconds });
          ctx.setCookie(REFRESH_COOKIE, session.refreshToken, { maxAgeSeconds: session.refreshMaxAgeSeconds, path: REFRESH_PATH });
          return c.services.auth.sessionUser(session.userId);
        } catch (err) {
          clearSession(ctx);
          throw err;
        }
      }
    }),
    route({
      method: "POST",
      path: "/auth/logout",
      auth: "optional",
      docs: { tags, summary: "Sign out and revoke the session" },
      handler: async (ctx) => {
        await c.services.auth.logout(ctx.cookies[REFRESH_COOKIE], ctx.auth);
        clearSession(ctx);
        return reply.ok(null, "Signed out");
      }
    }),
    route({
      method: "GET",
      path: "/auth/me",
      auth: "required",
      docs: { tags, summary: "Current user with roles, permissions and seller account" },
      handler: async (ctx) => c.services.auth.sessionUser(ctx.auth.userId)
    }),
    route({
      method: "POST",
      path: "/auth/forgot-password",
      auth: "public",
      schema: { body: forgotPasswordSchema },
      rateLimit: { name: "auth:forgot", windowSeconds: 900, max: 5 },
      docs: { tags, summary: "Email a password reset link" },
      handler: async (ctx) => {
        await c.services.auth.forgotPassword(ctx.body.email, meta(ctx));
        return reply.ok(null, "If an account exists for this email, a reset link is on its way.");
      }
    }),
    route({
      method: "POST",
      path: "/auth/reset-password",
      auth: "public",
      schema: { body: resetPasswordSchema },
      rateLimit: { name: "auth:reset", windowSeconds: 900, max: 10 },
      docs: { tags, summary: "Set a new password using a reset or invitation token" },
      handler: async (ctx) => {
        const session = await c.services.auth.resetPassword(ctx.body.token, ctx.body.password, meta(ctx));
        return reply.ok(await setSession(ctx, session), "Your password has been updated");
      }
    }),
    route({
      method: "POST",
      path: "/auth/verify-email",
      auth: "public",
      schema: { body: verifyEmailSchema },
      rateLimit: { name: "auth:verify", windowSeconds: 900, max: 20 },
      docs: { tags, summary: "Confirm an email address" },
      handler: async (ctx) => {
        await c.services.auth.verifyEmail(ctx.body.token);
        return reply.ok(null, "Your email address is verified");
      }
    }),
    route({
      method: "POST",
      path: "/auth/resend-verification",
      auth: "required",
      rateLimit: { name: "auth:resend", windowSeconds: 900, max: 3, by: "user" },
      docs: { tags, summary: "Resend the email verification link" },
      handler: async (ctx) => {
        await c.services.auth.sendVerificationEmail(ctx.auth.userId);
        return reply.ok(null, "Verification email sent");
      }
    }),
    route({
      method: "POST",
      path: "/auth/change-password",
      auth: "required",
      schema: { body: changePasswordSchema },
      rateLimit: { name: "auth:change", windowSeconds: 900, max: 10, by: "user" },
      docs: { tags, summary: "Change password (signs out other devices)" },
      handler: async (ctx) => {
        await c.services.auth.changePassword(
          ctx.auth.userId,
          ctx.body.currentPassword,
          ctx.body.newPassword,
          meta(ctx),
          ctx.auth.sessionId
        );
        return reply.ok(null, "Password changed. Other devices have been signed out.");
      }
    })
  ];
}

// src/modules/catalog/catalog.routes.ts
import { z as z5 } from "zod";
var tags2 = ["Catalog"];
function catalogRoutes(c) {
  const s = c.services;
  return [
    // ── Public storefront ────────────────────────────────────
    route({
      method: "GET",
      path: "/config",
      auth: "public",
      docs: { tags: ["Storefront"], summary: "Public marketplace configuration (branding, COD rules)" },
      handler: async () => s.content.publicConfig()
    }),
    route({
      method: "GET",
      path: "/home",
      auth: "public",
      docs: { tags: ["Storefront"], summary: "Homepage banners and sections (admin configurable)" },
      handler: async () => s.content.homepage()
    }),
    route({
      method: "GET",
      path: "/categories",
      auth: "public",
      docs: { tags: tags2, summary: "Category tree" },
      handler: async () => s.catalog.tree()
    }),
    route({
      method: "GET",
      path: "/categories/:slug",
      auth: "public",
      schema: { params: z5.object({ slug: z5.string().max(160) }) },
      docs: { tags: tags2, summary: "Category with breadcrumbs, children and filterable attributes" },
      handler: async (ctx) => s.catalog.bySlug(ctx.params.slug)
    }),
    route({
      method: "GET",
      path: "/brands",
      auth: "public",
      schema: { query: z5.object({ q: z5.string().max(80).optional(), categoryId: idSchema.optional() }) },
      docs: { tags: tags2, summary: "Active brands" },
      handler: async (ctx) => s.catalog.listBrands({ q: ctx.query.q, categoryId: ctx.query.categoryId })
    }),
    route({
      method: "GET",
      path: "/attributes",
      auth: "public",
      schema: { query: z5.object({ categoryId: idSchema.optional() }) },
      docs: { tags: tags2, summary: "Attribute definitions (optionally for a category and its ancestors)" },
      handler: async (ctx) => ctx.query.categoryId ? s.catalog.filterableAttributes(ctx.query.categoryId) : s.catalog.listAttributes()
    }),
    route({
      method: "GET",
      path: "/products",
      auth: "public",
      schema: { query: productListQuerySchema },
      docs: { tags: tags2, summary: "Product listing with filters, sorting, pagination and facets" },
      handler: async (ctx) => s.storefront.list(ctx.query, { facets: true })
    }),
    route({
      method: "GET",
      path: "/products/:slug",
      auth: "optional",
      schema: { params: z5.object({ slug: z5.string().max(220) }) },
      docs: { tags: tags2, summary: "Product detail with seller offers, related and frequently-bought-together items" },
      handler: async (ctx) => {
        const product = await s.storefront.detail(ctx.params.slug);
        const [related, frequentlyBoughtTogether] = await Promise.all([
          s.storefront.related(product.id, 12),
          s.storefront.frequentlyBoughtTogether(product.id, 4)
        ]);
        if (ctx.auth) void s.customers.recordView(ctx.auth.userId, product.id).catch(() => void 0);
        return { ...product, related, frequentlyBoughtTogether };
      }
    }),
    route({
      method: "GET",
      path: "/stores/:slug",
      auth: "public",
      schema: { params: z5.object({ slug: z5.string().max(160) }) },
      docs: { tags: tags2, summary: "Public seller storefront profile" },
      handler: async (ctx) => s.storefront.sellerStore(ctx.params.slug)
    }),
    route({
      method: "GET",
      path: "/sellers-featured",
      auth: "public",
      docs: { tags: tags2, summary: "Featured sellers" },
      handler: async () => s.storefront.featuredSellers(12)
    }),
    // ── Search ───────────────────────────────────────────────
    route({
      method: "GET",
      path: "/search",
      auth: "optional",
      schema: { query: productListQuerySchema.extend({ q: z5.string().trim().min(1).max(120) }) },
      rateLimit: { name: "search", windowSeconds: 60, max: 120 },
      docs: { tags: ["Search"], summary: "Full-text product search (name, brand, category, SKU, attributes)" },
      handler: async (ctx) => {
        const result = await s.storefront.list(ctx.query, { facets: true });
        if (ctx.query.page === 1) void s.storefront.recordSearch(ctx.auth?.userId ?? null, ctx.query.q, result.total).catch(() => void 0);
        const suggestions = result.total === 0 ? await s.storefront.productsBy("BEST_SELLERS", 8) : [];
        return { ...result, suggestions };
      }
    }),
    route({
      method: "GET",
      path: "/search/suggestions",
      auth: "public",
      schema: { query: z5.object({ q: z5.string().max(120).default("") }) },
      rateLimit: { name: "search:suggest", windowSeconds: 60, max: 240 },
      docs: { tags: ["Search"], summary: "Typeahead suggestions" },
      handler: async (ctx) => s.storefront.suggestions(ctx.query.q)
    }),
    route({
      method: "GET",
      path: "/search/popular",
      auth: "public",
      docs: { tags: ["Search"], summary: "Popular searches (last 30 days)" },
      handler: async () => s.storefront.popularSearches()
    }),
    route({
      method: "GET",
      path: "/search/recent",
      auth: "required",
      docs: { tags: ["Search"], summary: "Your recent searches" },
      handler: async (ctx) => s.storefront.recentSearches(ctx.auth.userId)
    }),
    route({
      method: "DELETE",
      path: "/search/recent",
      auth: "required",
      docs: { tags: ["Search"], summary: "Clear your search history" },
      handler: async (ctx) => {
        await s.storefront.clearSearchHistory(ctx.auth.userId);
        return reply.ok(null, "Search history cleared");
      }
    }),
    // ── Shipping helpers ─────────────────────────────────────
    route({
      method: "GET",
      path: "/shipping/pincode/:pincode",
      auth: "public",
      schema: {
        params: z5.object({ pincode: pincodeSchema }),
        query: z5.object({ method: z5.enum(SHIPPING_METHODS).default("STANDARD") })
      },
      docs: { tags: ["Shipping"], summary: "Delivery eligibility, COD availability and estimated delivery range" },
      handler: async (ctx) => s.shipping.checkPincode(ctx.params.pincode, ctx.query.method)
    }),
    route({
      method: "GET",
      path: "/shipping/methods",
      auth: "public",
      docs: { tags: ["Shipping"], summary: "Shipping methods and fees" },
      handler: async () => (await s.shipping.methods()).filter((m) => m.isActive)
    }),
    route({
      method: "GET",
      path: "/coupons/available",
      auth: "public",
      docs: { tags: ["Coupons"], summary: "Currently redeemable coupons" },
      handler: async () => s.coupons.available()
    }),
    // ── Admin: categories, brands, attributes ────────────────
    route({
      method: "GET",
      path: "/admin/categories",
      auth: "required",
      permissions: [Permissions.CATALOG_MANAGE],
      docs: { tags: ["Admin \xB7 Catalog"], summary: "Full category tree including inactive" },
      handler: async () => s.catalog.tree({ includeInactive: true })
    }),
    route({
      method: "GET",
      path: "/admin/categories/:id",
      auth: "required",
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { params: idParams },
      docs: { tags: ["Admin \xB7 Catalog"], summary: "Category detail with commission and tax overrides" },
      handler: async (ctx) => s.catalog.categoryAdminDetail(ctx.params.id)
    }),
    route({
      method: "POST",
      path: "/admin/categories",
      auth: "required",
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { body: categorySchema },
      docs: { tags: ["Admin \xB7 Catalog"], summary: "Create category" },
      handler: async (ctx) => reply.created(await s.catalog.createCategory(ctx.body, actorOf(ctx)), "Category created")
    }),
    route({
      method: "PATCH",
      path: "/admin/categories/:id",
      auth: "required",
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { params: idParams, body: categorySchema.partial() },
      docs: { tags: ["Admin \xB7 Catalog"], summary: "Update category (also moves it in the tree)" },
      handler: async (ctx) => reply.ok(await s.catalog.updateCategory(ctx.params.id, ctx.body, actorOf(ctx)), "Category updated")
    }),
    route({
      method: "DELETE",
      path: "/admin/categories/:id",
      auth: "required",
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { params: idParams },
      docs: { tags: ["Admin \xB7 Catalog"], summary: "Delete an empty category" },
      handler: async (ctx) => {
        await s.catalog.deleteCategory(ctx.params.id, actorOf(ctx));
        return reply.ok(null, "Category deleted");
      }
    }),
    route({
      method: "PUT",
      path: "/admin/categories-order",
      auth: "required",
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { body: z5.object({ items: z5.array(z5.object({ id: idSchema, sortOrder: z5.number().int().min(0) })).max(500) }) },
      docs: { tags: ["Admin \xB7 Catalog"], summary: "Reorder categories" },
      handler: async (ctx) => {
        await s.catalog.reorderCategories(ctx.body.items, actorOf(ctx));
        return reply.ok(null, "Order saved");
      }
    }),
    route({
      method: "GET",
      path: "/admin/brands",
      auth: "required",
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { query: z5.object({ q: z5.string().max(80).optional() }) },
      docs: { tags: ["Admin \xB7 Catalog"], summary: "All brands" },
      handler: async (ctx) => s.catalog.listBrands({ q: ctx.query.q, includeInactive: true })
    }),
    route({
      method: "POST",
      path: "/admin/brands",
      auth: "required",
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { body: brandSchema },
      docs: { tags: ["Admin \xB7 Catalog"], summary: "Create brand" },
      handler: async (ctx) => reply.created(await s.catalog.createBrand(ctx.body, actorOf(ctx)), "Brand created")
    }),
    route({
      method: "PATCH",
      path: "/admin/brands/:id",
      auth: "required",
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { params: idParams, body: brandSchema.partial() },
      docs: { tags: ["Admin \xB7 Catalog"], summary: "Update brand" },
      handler: async (ctx) => reply.ok(await s.catalog.updateBrand(ctx.params.id, ctx.body, actorOf(ctx)), "Brand updated")
    }),
    route({
      method: "DELETE",
      path: "/admin/brands/:id",
      auth: "required",
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { params: idParams },
      docs: { tags: ["Admin \xB7 Catalog"], summary: "Delete unused brand" },
      handler: async (ctx) => {
        await s.catalog.deleteBrand(ctx.params.id, actorOf(ctx));
        return reply.ok(null, "Brand deleted");
      }
    }),
    route({
      method: "POST",
      path: "/admin/attributes",
      auth: "required",
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { body: attributeSchema },
      docs: { tags: ["Admin \xB7 Catalog"], summary: "Create attribute" },
      handler: async (ctx) => reply.created(await s.catalog.createAttribute(ctx.body, actorOf(ctx)), "Attribute created")
    }),
    route({
      method: "PATCH",
      path: "/admin/attributes/:id",
      auth: "required",
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { params: idParams, body: attributeSchema.partial() },
      docs: { tags: ["Admin \xB7 Catalog"], summary: "Update attribute" },
      handler: async (ctx) => reply.ok(await s.catalog.updateAttribute(ctx.params.id, ctx.body, actorOf(ctx)), "Attribute updated")
    }),
    route({
      method: "DELETE",
      path: "/admin/attributes/:id",
      auth: "required",
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { params: idParams },
      docs: { tags: ["Admin \xB7 Catalog"], summary: "Delete attribute" },
      handler: async (ctx) => {
        await s.catalog.deleteAttribute(ctx.params.id, actorOf(ctx));
        return reply.ok(null, "Attribute deleted");
      }
    })
  ];
}

// src/modules/customers/customer.routes.ts
import { z as z6 } from "zod";
var P2 = Permissions;
function customerRoutes(c) {
  const s = c.services;
  const owner = (ctx, create) => {
    if (ctx.auth) return { userId: ctx.auth.userId };
    const token = ctx.cookies[GUEST_CART_COOKIE];
    if (token && /^[A-Za-z0-9_-]{32,64}$/.test(token)) return { guestToken: token };
    if (!create) return null;
    const fresh = s.cart.newGuestToken();
    ctx.setCookie(GUEST_CART_COOKIE, fresh, { maxAgeSeconds: 30 * 86400 });
    return { guestToken: fresh };
  };
  const cart = [
    route({
      method: "GET",
      path: "/cart",
      auth: "optional",
      docs: { tags: ["Cart"], summary: "Current cart (user or guest) with live prices and availability" },
      handler: async (ctx) => s.cart.view(owner(ctx, false))
    }),
    route({
      method: "POST",
      path: "/cart/items",
      auth: "optional",
      schema: { body: addCartItemSchema },
      rateLimit: { name: "cart:add", windowSeconds: 60, max: 60 },
      docs: { tags: ["Cart"], summary: "Add a seller offer (listing) to the cart" },
      handler: async (ctx) => {
        const o = owner(ctx, true);
        await s.cart.add(o, ctx.body.listingId, ctx.body.quantity);
        return reply.ok(await s.cart.view(o), "Added to cart");
      }
    }),
    route({
      method: "PATCH",
      path: "/cart/items/:id",
      auth: "optional",
      schema: { params: idParams, body: updateCartItemSchema },
      docs: { tags: ["Cart"], summary: "Change quantity" },
      handler: async (ctx) => {
        const o = owner(ctx, false);
        if (!o) return reply.ok(await s.cart.view(null));
        await s.cart.update(o, ctx.params.id, ctx.body.quantity);
        return s.cart.view(o);
      }
    }),
    route({
      method: "DELETE",
      path: "/cart/items/:id",
      auth: "optional",
      schema: { params: idParams },
      docs: { tags: ["Cart"], summary: "Remove an item" },
      handler: async (ctx) => {
        const o = owner(ctx, false);
        if (o) await s.cart.remove(o, ctx.params.id);
        return reply.ok(await s.cart.view(o), "Removed from cart");
      }
    }),
    route({
      method: "POST",
      path: "/cart/coupon",
      auth: "optional",
      schema: { body: applyCouponSchema },
      rateLimit: { name: "cart:coupon", windowSeconds: 300, max: 20 },
      docs: { tags: ["Cart"], summary: "Apply a coupon code (validated server-side)" },
      handler: async (ctx) => reply.ok(await s.cart.applyCoupon(owner(ctx, true), ctx.body.code), "Coupon applied")
    }),
    route({
      method: "DELETE",
      path: "/cart/coupon",
      auth: "optional",
      docs: { tags: ["Cart"], summary: "Remove the coupon" },
      handler: async (ctx) => {
        const o = owner(ctx, false);
        if (o) await s.cart.removeCoupon(o);
        return s.cart.view(o);
      }
    }),
    route({
      method: "POST",
      path: "/cart/acknowledge-prices",
      auth: "optional",
      docs: { tags: ["Cart"], summary: "Accept updated prices for items whose price changed" },
      handler: async (ctx) => {
        const o = owner(ctx, false);
        if (o) await s.cart.acknowledgePrices(o);
        return s.cart.view(o);
      }
    })
  ];
  const orders = [
    route({
      method: "POST",
      path: "/checkout",
      auth: "required",
      permissions: [P2.CUSTOMER_ORDERS],
      schema: { body: checkoutQuoteSchema },
      docs: { tags: ["Checkout"], summary: "Checkout review: server-computed totals, delivery estimate and payment options" },
      handler: async (ctx) => s.checkout.quote(userIdOf(ctx), ctx.body)
    }),
    route({
      method: "POST",
      path: "/orders",
      auth: "required",
      permissions: [P2.CUSTOMER_ORDERS],
      schema: { body: placeOrderSchema },
      rateLimit: { name: "orders:place", windowSeconds: 60, max: 10, by: "user" },
      docs: { tags: ["Orders"], summary: "Place an order (COD). Idempotent per idempotencyKey." },
      handler: async (ctx) => {
        const result = await s.checkout.placeOrder(userIdOf(ctx), ctx.body, { ip: ctx.ip, userAgent: ctx.userAgent });
        return result.duplicate ? reply.ok(result, "Order already placed") : reply.created(result, "Order placed successfully");
      }
    }),
    route({
      method: "GET",
      path: "/orders",
      auth: "required",
      permissions: [P2.CUSTOMER_ORDERS],
      schema: { query: orderListQuerySchema.omit({ sellerId: true }) },
      docs: { tags: ["Orders"], summary: "Your orders" },
      handler: async (ctx) => s.orderQueries.customerOrders(userIdOf(ctx), ctx.query)
    }),
    route({
      method: "GET",
      path: "/orders/:id",
      auth: "required",
      permissions: [P2.CUSTOMER_ORDERS],
      schema: { params: idParams },
      docs: { tags: ["Orders"], summary: "Order detail with tracking (only your own orders)" },
      handler: async (ctx) => s.orderQueries.customerOrder(userIdOf(ctx), ctx.params.id)
    }),
    route({
      method: "POST",
      path: "/orders/:id/cancel",
      auth: "required",
      permissions: [P2.CUSTOMER_ORDERS],
      schema: { params: idParams, body: cancelOrderSchema },
      docs: { tags: ["Orders"], summary: "Cancel the whole order or selected items before shipment" },
      handler: async (ctx) => {
        await s.fulfillment.cancelByCustomer(userIdOf(ctx), ctx.params.id, ctx.body, actorOf(ctx));
        return reply.ok(await s.orderQueries.customerOrder(userIdOf(ctx), ctx.params.id), "Cancellation confirmed");
      }
    }),
    route({
      method: "POST",
      path: "/orders/:id/returns",
      auth: "required",
      permissions: [P2.CUSTOMER_ORDERS],
      schema: { params: idParams, body: returnRequestSchema },
      docs: { tags: ["Orders"], summary: "Request a return for delivered items" },
      handler: async (ctx) => reply.created(await s.fulfillment.requestReturn(userIdOf(ctx), ctx.params.id, ctx.body, actorOf(ctx)), "Return requested")
    }),
    route({
      method: "GET",
      path: "/me/returns",
      auth: "required",
      schema: { query: paginationQuerySchema },
      docs: { tags: ["Orders"], summary: "Your return requests and refund status" },
      handler: async (ctx) => s.orderQueries.returns({ sellerId: null, customerId: userIdOf(ctx) }, ctx.query)
    }),
    route({
      method: "POST",
      path: "/me/returns/:id/cancel",
      auth: "required",
      schema: { params: idParams },
      docs: { tags: ["Orders"], summary: "Withdraw a return request" },
      handler: async (ctx) => {
        await s.fulfillment.cancelReturn(userIdOf(ctx), ctx.params.id, actorOf(ctx));
        return reply.ok(null, "Return cancelled");
      }
    })
  ];
  const account = [
    route({
      method: "GET",
      path: "/me/profile",
      auth: "required",
      docs: { tags: ["Account"], summary: "Your profile" },
      handler: async (ctx) => s.customers.profile(userIdOf(ctx))
    }),
    route({
      method: "PATCH",
      path: "/me/profile",
      auth: "required",
      permissions: [P2.CUSTOMER_PROFILE],
      schema: { body: profileUpdateSchema },
      docs: { tags: ["Account"], summary: "Update your profile" },
      handler: async (ctx) => reply.ok(await s.customers.updateProfile(userIdOf(ctx), ctx.body), "Profile updated")
    }),
    route({
      method: "POST",
      path: "/me/phone/otp",
      auth: "required",
      rateLimit: { name: "phone:otp", windowSeconds: 900, max: 3, by: "user" },
      docs: { tags: ["Account"], summary: "Send a phone verification code (SMS provider; console in development)" },
      handler: async (ctx) => reply.ok(await s.customers.requestPhoneOtp(userIdOf(ctx)), "Verification code sent")
    }),
    route({
      method: "POST",
      path: "/me/phone/verify",
      auth: "required",
      schema: { body: z6.object({ otp: z6.string().trim().max(10) }) },
      rateLimit: { name: "phone:verify", windowSeconds: 900, max: 5, by: "user" },
      docs: { tags: ["Account"], summary: "Verify phone with the code" },
      handler: async (ctx) => {
        await s.customers.verifyPhoneOtp(userIdOf(ctx), ctx.body.otp);
        return reply.ok(null, "Phone number verified");
      }
    }),
    route({
      method: "POST",
      path: "/me/delete-request",
      auth: "required",
      docs: { tags: ["Account"], summary: "Request account deletion" },
      handler: async (ctx) => {
        await s.customers.requestDeletion(userIdOf(ctx), actorOf(ctx));
        ctx.clearCookie("vy_at");
        ctx.clearCookie("vy_rt", { path: "/api/v1/auth" });
        return reply.ok(null, "Your deletion request has been received. You have been signed out.");
      }
    }),
    route({
      method: "GET",
      path: "/me/addresses",
      auth: "required",
      docs: { tags: ["Account"], summary: "Saved addresses" },
      handler: async (ctx) => s.customers.listAddresses(userIdOf(ctx))
    }),
    route({
      method: "POST",
      path: "/me/addresses",
      auth: "required",
      schema: { body: addressSchema },
      docs: { tags: ["Account"], summary: "Add address" },
      handler: async (ctx) => reply.created(await s.customers.createAddress(userIdOf(ctx), ctx.body), "Address saved")
    }),
    route({
      method: "PUT",
      path: "/me/addresses/:id",
      auth: "required",
      schema: { params: idParams, body: addressSchema },
      docs: { tags: ["Account"], summary: "Update address" },
      handler: async (ctx) => reply.ok(await s.customers.updateAddress(userIdOf(ctx), ctx.params.id, ctx.body), "Address updated")
    }),
    route({
      method: "PATCH",
      path: "/me/addresses/:id/default",
      auth: "required",
      schema: { params: idParams },
      docs: { tags: ["Account"], summary: "Make default address" },
      handler: async (ctx) => {
        await s.customers.setDefaultAddress(userIdOf(ctx), ctx.params.id);
        return reply.ok(await s.customers.listAddresses(userIdOf(ctx)), "Default address updated");
      }
    }),
    route({
      method: "DELETE",
      path: "/me/addresses/:id",
      auth: "required",
      schema: { params: idParams },
      docs: { tags: ["Account"], summary: "Delete address" },
      handler: async (ctx) => {
        await s.customers.deleteAddress(userIdOf(ctx), ctx.params.id);
        return reply.ok(null, "Address removed");
      }
    }),
    route({
      method: "GET",
      path: "/me/wishlist",
      auth: "required",
      docs: { tags: ["Wishlist"], summary: "Wishlist products" },
      handler: async (ctx) => s.customers.wishlist(userIdOf(ctx))
    }),
    route({
      method: "GET",
      path: "/me/wishlist/ids",
      auth: "required",
      docs: { tags: ["Wishlist"], summary: "Product ids in the wishlist" },
      handler: async (ctx) => s.customers.wishlistIds(userIdOf(ctx))
    }),
    route({
      method: "POST",
      path: "/me/wishlist/:id",
      auth: "required",
      schema: { params: idParams },
      docs: { tags: ["Wishlist"], summary: "Add product to wishlist" },
      handler: async (ctx) => {
        await s.customers.addToWishlist(userIdOf(ctx), ctx.params.id);
        return reply.ok(await s.customers.wishlistIds(userIdOf(ctx)), "Saved to wishlist");
      }
    }),
    route({
      method: "DELETE",
      path: "/me/wishlist/:id",
      auth: "required",
      schema: { params: idParams },
      docs: { tags: ["Wishlist"], summary: "Remove product from wishlist" },
      handler: async (ctx) => {
        await s.customers.removeFromWishlist(userIdOf(ctx), ctx.params.id);
        return reply.ok(await s.customers.wishlistIds(userIdOf(ctx)), "Removed from wishlist");
      }
    }),
    route({
      method: "GET",
      path: "/me/recently-viewed",
      auth: "required",
      docs: { tags: ["Account"], summary: "Recently viewed products" },
      handler: async (ctx) => s.customers.recentlyViewed(userIdOf(ctx))
    }),
    route({
      method: "GET",
      path: "/me/recommendations",
      auth: "required",
      docs: { tags: ["Account"], summary: "Personalised recommendations" },
      handler: async (ctx) => s.storefront.recommendedFor(userIdOf(ctx))
    }),
    route({
      method: "POST",
      path: "/me/stock-alerts/:id",
      auth: "required",
      schema: { params: idParams },
      docs: { tags: ["Account"], summary: "Notify me when a product is back in stock" },
      handler: async (ctx) => {
        await s.customers.subscribeStock(userIdOf(ctx), ctx.params.id);
        return reply.ok(null, "We'll let you know when it's back");
      }
    }),
    route({
      method: "GET",
      path: "/me/notifications",
      auth: "required",
      schema: { query: paginationQuerySchema.extend({ unread: z6.enum(["true", "false"]).optional() }) },
      docs: { tags: ["Notifications"], summary: "In-app notifications" },
      handler: async (ctx) => s.notifications.list(userIdOf(ctx), ctx.query.page, ctx.query.pageSize, ctx.query.unread === "true")
    }),
    route({
      method: "POST",
      path: "/me/notifications/read",
      auth: "required",
      schema: { body: z6.object({ id: idSchema.optional() }) },
      docs: { tags: ["Notifications"], summary: "Mark one or all notifications read" },
      handler: async (ctx) => {
        await s.notifications.markRead(userIdOf(ctx), ctx.body.id);
        return reply.ok(null);
      }
    }),
    // ── Reviews ──────────────────────────────────────────────
    route({
      method: "GET",
      path: "/reviews/product/:id",
      auth: "public",
      schema: {
        params: idParams,
        query: paginationQuerySchema.extend({
          rating: z6.coerce.number().int().min(1).max(5).optional(),
          withPhotos: z6.enum(["true", "false"]).optional(),
          sort: z6.enum(["recent", "helpful", "rating_high", "rating_low"]).optional()
        })
      },
      docs: { tags: ["Reviews"], summary: "Approved reviews for a product" },
      handler: async (ctx) => s.reviews.forProduct(ctx.params.id, { ...ctx.query, withPhotos: ctx.query.withPhotos === "true" })
    }),
    route({
      method: "GET",
      path: "/reviews/eligibility/:id",
      auth: "required",
      schema: { params: idParams },
      docs: { tags: ["Reviews"], summary: "Can I review this product, and will it be a verified purchase?" },
      handler: async (ctx) => s.reviews.eligibility(userIdOf(ctx), ctx.params.id)
    }),
    route({
      method: "POST",
      path: "/reviews",
      auth: "required",
      permissions: [P2.CUSTOMER_REVIEWS],
      schema: { body: reviewSchema },
      upload: { maxFiles: 5, maxFileBytes: c.env.UPLOAD_MAX_IMAGE_MB * MB, allowed: "image" },
      rateLimit: { name: "reviews:create", windowSeconds: 3600, max: 20, by: "user" },
      docs: { tags: ["Reviews"], summary: "Write a review (multipart; optional photos)" },
      handler: async (ctx) => reply.created(await s.reviews.create(userIdOf(ctx), ctx.body, ctx.files), "Thanks for your review!")
    }),
    route({
      method: "GET",
      path: "/me/reviews",
      auth: "required",
      docs: { tags: ["Reviews"], summary: "Your reviews" },
      handler: async (ctx) => s.reviews.mine(userIdOf(ctx))
    }),
    route({
      method: "DELETE",
      path: "/me/reviews/:id",
      auth: "required",
      schema: { params: idParams },
      docs: { tags: ["Reviews"], summary: "Delete your review" },
      handler: async (ctx) => {
        await s.reviews.remove(userIdOf(ctx), ctx.params.id);
        return reply.ok(null, "Review deleted");
      }
    }),
    route({
      method: "POST",
      path: "/reviews/:id/report",
      auth: "required",
      schema: { params: idParams, body: reviewReportSchema },
      rateLimit: { name: "reviews:report", windowSeconds: 3600, max: 30, by: "user" },
      docs: { tags: ["Reviews"], summary: "Report a review" },
      handler: async (ctx) => {
        await s.reviews.report(userIdOf(ctx), ctx.params.id, ctx.body.reason);
        return reply.ok(null, "Thanks \u2014 our team will take a look");
      }
    }),
    route({
      method: "POST",
      path: "/reviews/:id/helpful",
      auth: "required",
      schema: { params: idParams },
      rateLimit: { name: "reviews:helpful", windowSeconds: 3600, max: 100, by: "user" },
      docs: { tags: ["Reviews"], summary: "Mark a review helpful" },
      handler: async (ctx) => {
        await s.reviews.markHelpful(ctx.params.id);
        return reply.ok(null);
      }
    })
  ];
  return [...cart, ...orders, ...account];
}

// src/modules/sellers/seller.routes.ts
import { z as z7 } from "zod";
var tags3 = ["Seller"];
var P3 = Permissions;
function sellerRoutes(c) {
  const s = c.services;
  const scope = (ctx) => ({ kind: "seller", sellerId: sellerIdOf(ctx) });
  return [
    // ── Onboarding ───────────────────────────────────────────
    route({
      method: "POST",
      path: "/sellers/register",
      auth: "public",
      schema: { body: sellerRegistrationSchema },
      rateLimit: { name: "seller:register", windowSeconds: 3600, max: 10 },
      docs: { tags: ["Seller onboarding"], summary: "Register as a seller (status PENDING_APPROVAL)" },
      handler: async (ctx) => {
        const session = await s.sellers.register(ctx.body, { ip: ctx.ip, userAgent: ctx.userAgent });
        ctx.setCookie(ACCESS_COOKIE, session.accessToken, { maxAgeSeconds: session.accessMaxAgeSeconds });
        ctx.setCookie(REFRESH_COOKIE, session.refreshToken, { maxAgeSeconds: session.refreshMaxAgeSeconds, path: "/api/v1/auth" });
        ctx.setCookie(CSRF_COOKIE, randomToken(24), { httpOnly: false });
        return reply.created(await s.auth.sessionUser(session.userId), "Application submitted. We will review it shortly.");
      }
    }),
    route({
      method: "POST",
      path: "/sellers/apply",
      auth: "required",
      schema: { body: sellerBusinessSchema.extend(sellerAgreementSchema.shape).extend({ phone: phoneSchema }) },
      docs: { tags: ["Seller onboarding"], summary: "Apply to sell from an existing customer account" },
      handler: async (ctx) => reply.created(await s.sellers.applyAsExistingUser(ctx.auth.userId, ctx.body), "Application submitted")
    }),
    route({
      method: "GET",
      path: "/sellers/me",
      auth: "required",
      seller: true,
      docs: { tags: tags3, summary: "Your seller account, documents and approval history" },
      handler: async (ctx) => s.sellers.me(sellerIdOf(ctx))
    }),
    route({
      method: "PATCH",
      path: "/sellers/me",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_PROFILE],
      schema: { body: sellerProfileUpdateSchema },
      docs: { tags: tags3, summary: "Update store profile" },
      handler: async (ctx) => reply.ok(await s.sellers.updateProfile(sellerIdOf(ctx), ctx.body, actorOf(ctx)), "Profile updated")
    }),
    route({
      method: "POST",
      path: "/sellers/me/logo",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_PROFILE],
      upload: { maxFiles: 1, maxFileBytes: c.env.UPLOAD_MAX_IMAGE_MB * MB, allowed: "image" },
      docs: { tags: tags3, summary: 'Upload store logo (multipart field "file")' },
      handler: async (ctx) => {
        if (!ctx.files[0]) throw badRequest("Choose an image");
        return reply.ok(await s.sellers.uploadLogo(sellerIdOf(ctx), ctx.files[0]), "Logo updated");
      }
    }),
    route({
      method: "POST",
      path: "/sellers/me/documents",
      auth: "required",
      seller: true,
      upload: { maxFiles: 1, maxFileBytes: c.env.UPLOAD_MAX_DOCUMENT_MB * MB, allowed: "document" },
      schema: { body: z7.object({ type: sellerDocumentTypeSchema }) },
      docs: { tags: tags3, summary: "Upload a KYC document (private storage)" },
      handler: async (ctx) => {
        if (!ctx.files[0]) throw badRequest("Choose a file");
        return reply.created(await s.sellers.uploadDocument(sellerIdOf(ctx), ctx.body.type, ctx.files[0], actorOf(ctx)), "Document uploaded");
      }
    }),
    route({
      method: "GET",
      path: "/sellers/me/documents/:id/url",
      auth: "required",
      seller: true,
      schema: { params: idParams },
      docs: { tags: tags3, summary: "Short-lived signed URL for one of your documents" },
      handler: async (ctx) => s.sellers.documentUrl(ctx.params.id, { sellerId: sellerIdOf(ctx) })
    }),
    route({
      method: "DELETE",
      path: "/sellers/me/documents/:id",
      auth: "required",
      seller: true,
      schema: { params: idParams },
      docs: { tags: tags3, summary: "Remove an unverified document" },
      handler: async (ctx) => {
        await s.sellers.deleteDocument(ctx.params.id, sellerIdOf(ctx));
        return reply.ok(null, "Document removed");
      }
    }),
    // ── Dashboard ────────────────────────────────────────────
    route({
      method: "GET",
      path: "/seller/dashboard",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_DASHBOARD],
      schema: { query: rangeQuery },
      docs: { tags: tags3, summary: "Seller KPIs computed from your own records only" },
      handler: async (ctx) => s.analytics.sellerDashboard(sellerIdOf(ctx), defaultRange(ctx.query.from, ctx.query.to))
    }),
    // ── Products ─────────────────────────────────────────────
    route({
      method: "GET",
      path: "/seller/products",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_PRODUCTS],
      schema: { query: managedProductQuerySchema.omit({ sellerId: true }) },
      docs: { tags: tags3, summary: "Your products and offers" },
      handler: async (ctx) => ({
        ...await s.products.listManaged(scope(ctx), ctx.query),
        counts: await s.products.statusCounts(scope(ctx))
      })
    }),
    route({
      method: "POST",
      path: "/seller/products",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_PRODUCTS],
      schema: { body: productUpsertSchema },
      docs: { tags: tags3, summary: "Create a product (saved as draft)" },
      handler: async (ctx) => reply.created(await s.products.create(sellerIdOf(ctx), ctx.body, actorOf(ctx)), "Product saved as draft")
    }),
    route({
      method: "GET",
      path: "/seller/products/export",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_PRODUCTS],
      schema: { query: exportQuery },
      docs: { tags: tags3, summary: "Export your catalog (CSV/XLSX)" },
      handler: async (ctx) => {
        const file = await s.productIo.export({ sellerId: sellerIdOf(ctx) }, ctx.query.format);
        return reply.buffer(file.data, file.contentType, { filename: file.filename });
      }
    }),
    route({
      method: "GET",
      path: "/seller/products/import-template",
      auth: "required",
      seller: true,
      docs: { tags: tags3, summary: "CSV import template" },
      handler: async () => reply.buffer(s.productIo.template(), "text/csv; charset=utf-8", { filename: "product-import-template.csv" })
    }),
    route({
      method: "POST",
      path: "/seller/products/import",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_PRODUCTS],
      upload: { maxFiles: 1, maxFileBytes: 5 * MB, allowed: "spreadsheet" },
      rateLimit: { name: "seller:import", windowSeconds: 300, max: 10, by: "user" },
      docs: { tags: tags3, summary: "Bulk import products from CSV/XLSX" },
      handler: async (ctx) => {
        if (!ctx.files[0]) throw badRequest("Choose a CSV or Excel file");
        return s.productIo.import(sellerIdOf(ctx), ctx.files[0], actorOf(ctx));
      }
    }),
    route({
      method: "GET",
      path: "/seller/products/:id",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_PRODUCTS],
      schema: { params: idParams },
      docs: { tags: tags3, summary: "One of your products (404 for anyone else\u2019s)" },
      handler: async (ctx) => s.products.getManaged(ctx.params.id, scope(ctx))
    }),
    route({
      method: "PATCH",
      path: "/seller/products/:id",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_PRODUCTS],
      schema: { params: idParams, body: productUpsertSchema },
      docs: { tags: tags3, summary: "Update your product" },
      handler: async (ctx) => reply.ok(await s.products.update(ctx.params.id, ctx.body, scope(ctx), actorOf(ctx)), "Product updated")
    }),
    route({
      method: "DELETE",
      path: "/seller/products/:id",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_PRODUCTS],
      schema: { params: idParams },
      docs: { tags: tags3, summary: "Archive your product" },
      handler: async (ctx) => {
        await s.products.archive(ctx.params.id, scope(ctx), actorOf(ctx));
        return reply.ok(null, "Product archived");
      }
    }),
    route({
      method: "POST",
      path: "/seller/products/:id/submit",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_PRODUCTS],
      schema: { params: idParams },
      docs: { tags: tags3, summary: "Submit a draft/rejected product for review" },
      handler: async (ctx) => reply.ok(await s.products.submit(ctx.params.id, scope(ctx), actorOf(ctx)), "Submitted for review")
    }),
    route({
      method: "PATCH",
      path: "/seller/products/:id/active",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_PRODUCTS],
      schema: { params: idParams, body: z7.object({ isActive: z7.boolean() }) },
      docs: { tags: tags3, summary: "Activate or deactivate your listings for a product" },
      handler: async (ctx) => {
        await s.products.setActive(ctx.params.id, sellerIdOf(ctx), ctx.body.isActive, actorOf(ctx));
        return reply.ok(null, ctx.body.isActive ? "Listing activated" : "Listing deactivated");
      }
    }),
    route({
      method: "POST",
      path: "/seller/products/:id/images",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_PRODUCTS],
      schema: { params: idParams },
      upload: { maxFiles: 10, maxFileBytes: c.env.UPLOAD_MAX_IMAGE_MB * MB, allowed: "image" },
      docs: { tags: tags3, summary: "Upload product images (multipart)" },
      handler: async (ctx) => reply.ok(await s.products.addImages(ctx.params.id, ctx.files, scope(ctx), actorOf(ctx)), "Images uploaded")
    }),
    route({
      method: "DELETE",
      path: "/seller/products/:id/images/:imageId",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_PRODUCTS],
      schema: { params: z7.object({ id: idSchema, imageId: idSchema }) },
      docs: { tags: tags3, summary: "Remove a product image" },
      handler: async (ctx) => reply.ok(await s.products.removeImage(ctx.params.id, ctx.params.imageId, scope(ctx), actorOf(ctx)), "Image removed")
    }),
    route({
      method: "PUT",
      path: "/seller/products/:id/images",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_PRODUCTS],
      schema: { params: idParams, body: z7.object({ imageIds: z7.array(idSchema).max(10) }) },
      docs: { tags: tags3, summary: "Reorder product images" },
      handler: async (ctx) => s.products.reorderImages(ctx.params.id, ctx.body.imageIds, scope(ctx))
    }),
    route({
      method: "GET",
      path: "/seller/catalog",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_PRODUCTS],
      schema: { query: paginationQuerySchema },
      docs: { tags: tags3, summary: "Approved catalog products you can also sell" },
      handler: async (ctx) => {
        const res = await s.storefront.list({ ...ctx.query, sort: ctx.query.q ? "relevance" : "popular" });
        return res;
      }
    }),
    route({
      method: "POST",
      path: "/seller/offers",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_PRODUCTS],
      schema: {
        body: z7.object({
          productId: idSchema,
          variantId: idSchema,
          sku: z7.string().trim().min(2).max(64).regex(/^[A-Za-z0-9._-]+$/),
          price: moneySchema,
          mrp: moneySchema,
          stock: z7.coerce.number().int().min(0).max(1e6)
        })
      },
      docs: { tags: tags3, summary: "Sell an existing catalog product (your own offer, price and stock)" },
      handler: async (ctx) => reply.created(await s.products.createOffer(sellerIdOf(ctx), ctx.body, actorOf(ctx)), "Offer created")
    }),
    // ── Inventory ────────────────────────────────────────────
    route({
      method: "GET",
      path: "/seller/inventory",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_INVENTORY],
      schema: { query: paginationQuerySchema.extend({ filter: z7.enum(["all", "low", "out"]).default("all") }) },
      docs: { tags: tags3, summary: "Your stock levels" },
      handler: async (ctx) => s.inventory.list({ sellerId: sellerIdOf(ctx) }, ctx.query)
    }),
    route({
      method: "PATCH",
      path: "/seller/inventory/:id",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_INVENTORY],
      schema: { params: idParams, body: inventoryAdjustSchema },
      docs: { tags: tags3, summary: "Adjust stock of one of your listings (id = listing id)" },
      handler: async (ctx) => reply.ok(await s.inventory.adjust(ctx.params.id, ctx.body, actorOf(ctx), { sellerId: sellerIdOf(ctx) }), "Stock updated")
    }),
    route({
      method: "POST",
      path: "/seller/inventory/bulk",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_INVENTORY],
      schema: { body: bulkInventorySchema },
      docs: { tags: tags3, summary: "Bulk stock update by SKU" },
      handler: async (ctx) => s.inventory.bulkUpdate(sellerIdOf(ctx), ctx.body.items, ctx.body.reason, actorOf(ctx))
    }),
    route({
      method: "GET",
      path: "/seller/inventory/:id/movements",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_INVENTORY],
      schema: { params: idParams, query: paginationQuerySchema },
      docs: { tags: tags3, summary: "Stock movement history of a listing" },
      handler: async (ctx) => s.inventory.movements(ctx.params.id, { sellerId: sellerIdOf(ctx) }, ctx.query.page, ctx.query.pageSize)
    }),
    // ── Orders & returns ─────────────────────────────────────
    route({
      method: "GET",
      path: "/seller/orders",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_ORDERS],
      schema: { query: orderListQuerySchema.omit({ sellerId: true }) },
      docs: { tags: tags3, summary: "Your sub-orders (only your items)" },
      handler: async (ctx) => s.orderQueries.sellerOrders(sellerIdOf(ctx), ctx.query)
    }),
    route({
      method: "GET",
      path: "/seller/orders/:id",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_ORDERS],
      schema: { params: idParams },
      docs: { tags: tags3, summary: "Sub-order detail with delivery address" },
      handler: async (ctx) => s.orderQueries.sellerOrder(ctx.params.id, { sellerId: sellerIdOf(ctx) })
    }),
    route({
      method: "PATCH",
      path: "/seller/orders/:id/status",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_ORDERS],
      schema: { params: idParams, body: sellerOrderStatusSchema },
      docs: { tags: tags3, summary: "Accept/reject, process, ship (with tracking) and deliver" },
      handler: async (ctx) => {
        const { status, ...rest } = ctx.body;
        return reply.ok(await s.fulfillment.updateSellerOrderStatus(ctx.params.id, status, rest, scope(ctx), actorOf(ctx)), "Order updated");
      }
    }),
    route({
      method: "GET",
      path: "/seller/orders/:id/packing-slip",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_ORDERS],
      schema: { params: idParams },
      docs: { tags: tags3, summary: "Printable packing slip (HTML)" },
      handler: async (ctx) => {
        const brand = (await s.settings.get("branding")).name;
        return reply.html(await s.orderQueries.packingSlip(ctx.params.id, { sellerId: sellerIdOf(ctx) }, brand));
      }
    }),
    route({
      method: "GET",
      path: "/seller/returns",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_ORDERS],
      schema: { query: paginationQuerySchema.extend({ status: z7.string().max(20).optional() }) },
      docs: { tags: tags3, summary: "Return requests for your orders" },
      handler: async (ctx) => s.orderQueries.returns({ sellerId: sellerIdOf(ctx) }, ctx.query)
    }),
    route({
      method: "PATCH",
      path: "/seller/returns/:id",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_ORDERS],
      schema: { params: idParams, body: returnDecisionSchema },
      docs: { tags: tags3, summary: "Approve, reject or receive a return" },
      handler: async (ctx) => {
        await s.fulfillment.decideReturn(ctx.params.id, ctx.body, scope(ctx), actorOf(ctx));
        return reply.ok(null, "Return updated");
      }
    }),
    // ── Finance ──────────────────────────────────────────────
    route({
      method: "GET",
      path: "/seller/balance",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_SETTLEMENTS],
      docs: { tags: tags3, summary: "Ledger balance and payable amount" },
      handler: async (ctx) => s.finance.balances(sellerIdOf(ctx))
    }),
    route({
      method: "GET",
      path: "/seller/ledger",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_SETTLEMENTS],
      schema: { query: paginationQuerySchema.extend({ from: z7.coerce.date().optional(), to: z7.coerce.date().optional() }) },
      docs: { tags: tags3, summary: "Your ledger entries" },
      handler: async (ctx) => s.finance.ledger(sellerIdOf(ctx), ctx.query)
    }),
    route({
      method: "GET",
      path: "/seller/settlements",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_SETTLEMENTS],
      schema: { query: paginationQuerySchema.extend({ status: z7.enum(SETTLEMENT_STATUSES).optional() }) },
      docs: { tags: tags3, summary: "Your settlements" },
      handler: async (ctx) => s.finance.listSettlements({ sellerId: sellerIdOf(ctx) }, ctx.query)
    }),
    route({
      method: "GET",
      path: "/seller/settlements/:id",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_SETTLEMENTS],
      schema: { params: idParams },
      docs: { tags: tags3, summary: "Settlement detail" },
      handler: async (ctx) => s.finance.settlementDetail(ctx.params.id, { sellerId: sellerIdOf(ctx) })
    }),
    route({
      method: "GET",
      path: "/seller/commissions",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_SETTLEMENTS],
      schema: { query: paginationQuerySchema.extend({ status: z7.string().max(20).optional() }) },
      docs: { tags: tags3, summary: "Commission deducted per order item" },
      handler: async (ctx) => s.finance.commissions({ sellerId: sellerIdOf(ctx) }, ctx.query)
    }),
    route({
      method: "GET",
      path: "/seller/reports/:kind/export",
      auth: "required",
      seller: true,
      permissions: [P3.SELLER_DASHBOARD],
      schema: { params: z7.object({ kind: z7.enum(["sales", "orders", "products", "settlements", "ledger"]) }), query: exportQuery },
      docs: { tags: tags3, summary: "Export your reports (CSV/XLSX)" },
      handler: async (ctx) => {
        const file = await s.analytics.export(ctx.params.kind, defaultRange(ctx.query.from, ctx.query.to), sellerIdOf(ctx), ctx.query.format);
        return reply.buffer(file.data, file.contentType, { filename: file.filename });
      }
    })
  ];
}

// src/modules/system/system.routes.ts
import { z as z9 } from "zod";

// src/http/openapi.ts
import { z as z8 } from "zod";
function toJsonSchema(schema) {
  if (!schema) return void 0;
  try {
    return z8.toJSONSchema(schema, { io: "input", unrepresentable: "any" });
  } catch {
    return { type: "object" };
  }
}
function buildOpenApi(routes, meta) {
  const paths = {};
  for (const r of routes) {
    if (r.rootLevel && !r.docs) continue;
    const full = (r.rootLevel ? r.path : `${API_PREFIX}${r.path}`).replace(/:([A-Za-z0-9_]+)/g, "{$1}").replace(/\*([A-Za-z0-9_]+)$/, "{$1}");
    const params = [];
    for (const m of full.matchAll(/\{([A-Za-z0-9_]+)\}/g)) params.push({ name: m[1], in: "path", required: true, schema: { type: "string" } });
    const q = toJsonSchema(r.schema?.query);
    for (const [name, schema] of Object.entries(q?.properties ?? {})) {
      params.push({ name, in: "query", required: q?.required?.includes(name) ?? false, schema });
    }
    const body = r.upload ? {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties: { file: { type: "string", format: "binary" }, data: { type: "string", description: "Optional JSON fields" } }
          }
        }
      }
    } : r.schema?.body ? { required: true, content: { "application/json": { schema: toJsonSchema(r.schema.body) } } } : void 0;
    paths[full] ??= {};
    paths[full][r.method.toLowerCase()] = {
      tags: r.docs?.tags ?? ["Other"],
      summary: r.docs?.summary,
      description: [
        r.docs?.description,
        r.auth === "required" ? "Requires authentication." : r.auth === "optional" ? "Authentication optional." : void 0,
        r.permissions?.length ? `Permissions: ${r.permissions.join(", ")}.` : void 0,
        r.seller ? "Requires a seller account; data is scoped to the authenticated seller." : void 0
      ].filter(Boolean).join(" "),
      parameters: params,
      requestBody: body,
      security: r.auth === "required" ? [{ cookieAuth: [] }, { bearerAuth: [] }] : [],
      responses: {
        "200": { description: "Success \u2014 `{ success: true, result, message? }`" },
        "400": { description: "VALIDATION_ERROR" },
        "401": { description: "UNAUTHENTICATED" },
        "403": { description: "FORBIDDEN / CSRF_FAILED" },
        "404": { description: "NOT_FOUND" },
        "409": { description: "CONFLICT / OUT_OF_STOCK / PRICE_CHANGED" },
        "422": { description: "BUSINESS_RULE" },
        "429": { description: "RATE_LIMITED" }
      }
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: meta.title,
      version: meta.version,
      description: "Vyora marketplace REST API. Browser clients authenticate with HTTP-only cookies and must send the `x-csrf-token` header (value of the `vy_csrf` cookie) on mutating requests. API clients may use `Authorization: Bearer <access token>` instead."
    },
    servers: [{ url: meta.serverUrl }],
    components: {
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: "vy_at" },
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
      }
    },
    paths
  };
}

// src/modules/system/system.routes.ts
var startedAt = /* @__PURE__ */ new Date();
function systemRoutes(c, getAllRoutes) {
  let openapiCache = null;
  const env = c.env;
  const xmlEscape = (s) => s.replace(/[<>&'"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[ch]);
  const routes = [
    route({
      method: "GET",
      path: "/health",
      rootLevel: true,
      auth: "public",
      docs: { tags: ["System"], summary: "Liveness probe" },
      handler: async () => ({ status: "ok", uptimeSeconds: Math.round((Date.now() - startedAt.getTime()) / 1e3) })
    }),
    route({
      method: "GET",
      path: "/health/ready",
      rootLevel: true,
      auth: "public",
      docs: { tags: ["System"], summary: "Readiness probe (database, redis)" },
      handler: async () => {
        const db = await c.database.healthCheck();
        let redis = null;
        if (c.redis) {
          try {
            await c.redis.ping();
            redis = { ok: true };
          } catch {
            redis = { ok: false };
          }
        }
        const ok = db.ok && (redis?.ok ?? true);
        const body = {
          success: ok,
          result: {
            status: ok ? "ready" : "degraded",
            framework: env.BACKEND_FRAMEWORK,
            database: { type: env.DATABASE_TYPE, orm: env.ORM_PROVIDER, ok: db.ok, latencyMs: db.latencyMs },
            redis,
            storage: c.storage.name
          }
        };
        return { __reply: true, status: ok ? 200 : 503, body: { kind: "json", data: body } };
      }
    }),
    route({
      method: "GET",
      path: "/openapi.json",
      auth: "public",
      docs: { tags: ["System"], summary: "OpenAPI document" },
      handler: async () => {
        openapiCache ??= buildOpenApi(getAllRoutes(), { title: "Vyora Marketplace API", version: "1.0.0", serverUrl: env.API_BASE_URL });
        return reply.buffer(Buffer.from(JSON.stringify(openapiCache)), "application/json; charset=utf-8");
      }
    }),
    route({
      method: "GET",
      path: "/api/docs",
      rootLevel: true,
      auth: "public",
      handler: async () => {
        if (env.APP_ENV === "production") throw notFound("Route");
        return reply.html(`<!doctype html><html><head><meta charset="utf-8"><title>Vyora API docs</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"></head>
<body><div id="ui"></div><script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/api/v1/openapi.json', dom_id: '#ui', withCredentials: true });</script></body></html>`);
      }
    }),
    // Public uploaded media (product images, banners). Cacheable forever — keys are content-unique.
    route({
      method: "GET",
      path: "/uploads/*key",
      rootLevel: true,
      auth: "public",
      schema: { params: z9.object({ key: z9.string().max(400) }) },
      handler: async (ctx) => {
        if (c.storage.name !== "local") throw notFound("File");
        let obj;
        try {
          obj = await c.storage.get(ctx.params.key, "public");
        } catch {
          throw notFound("File");
        }
        if (!obj) throw notFound("File");
        const r = reply.stream(obj.stream, obj.contentType, { cache: "public, max-age=31536000, immutable" });
        r.headers = { ...r.headers, "cross-origin-resource-policy": "cross-origin" };
        return r;
      }
    }),
    // Private files (seller KYC) — only reachable with a valid, unexpired signature.
    route({
      method: "GET",
      path: "/files/private/*key",
      rootLevel: true,
      auth: "public",
      schema: { params: z9.object({ key: z9.string().max(400) }), query: z9.object({ exp: z9.coerce.number(), sig: z9.string().max(100) }) },
      handler: async (ctx) => {
        if (!(c.storage instanceof LocalStorageProvider)) throw notFound("File");
        if (!c.storage.verifySignature(ctx.params.key, ctx.query.exp, ctx.query.sig)) {
          throw new AppError(403, "FORBIDDEN", "This link has expired");
        }
        const obj = await c.storage.get(ctx.params.key, "private");
        if (!obj) throw notFound("File");
        return reply.stream(obj.stream, obj.contentType, { cache: "private, no-store" });
      }
    }),
    route({
      method: "GET",
      path: "/sitemap.xml",
      rootLevel: true,
      auth: "public",
      handler: async () => {
        const base = env.FRONTEND_URL.replace(/\/$/, "");
        const { products, categories, sellers } = await c.services.storefront.sitemapEntries();
        const url = (loc, lastmod) => `<url><loc>${xmlEscape(base + loc)}</loc>${lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : ""}</url>`;
        const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[
          url("/"),
          ...categories.map((x) => url(`/c/${x.slug}`, x.updatedAt)),
          ...products.map((x) => url(`/p/${x.slug}`, x.updatedAt)),
          ...sellers.map((x) => url(`/store/${x.slug}`, x.updatedAt))
        ].join("")}</urlset>`;
        const r = reply.buffer(Buffer.from(xml), "application/xml; charset=utf-8", { cache: "public, max-age=3600" });
        return r;
      }
    }),
    route({
      method: "GET",
      path: "/robots.txt",
      rootLevel: true,
      auth: "public",
      handler: async () => {
        const base = env.FRONTEND_URL.replace(/\/$/, "");
        const body = env.APP_ENV === "production" ? `User-agent: *
Disallow: /admin
Disallow: /seller
Disallow: /account
Disallow: /checkout
Disallow: /cart
Sitemap: ${base}/sitemap.xml
` : "User-agent: *\nDisallow: /\n";
        return reply.buffer(Buffer.from(body), "text/plain; charset=utf-8", { cache: "public, max-age=3600" });
      }
    })
  ];
  if (env.APP_ENV === "development" || env.APP_ENV === "test") {
    routes.push(
      route({
        method: "GET",
        path: "/dev/mailbox",
        auth: "public",
        schema: { query: z9.object({ to: z9.string().max(191).optional() }) },
        docs: { tags: ["System"], summary: "Development-only: emails captured by the console mailer" },
        handler: async (ctx) => c.services.notifications.outbox(1, 50, ctx.query.to)
      })
    );
  }
  return routes;
}

// src/app.ts
async function createApp(env, opts = {}) {
  const container = createContainer(env);
  const framework = opts.framework ?? env.BACKEND_FRAMEWORK;
  const adapter = framework === "hapi" ? createHapiAdapter(env) : createExpressAdapter(env);
  const routes = [];
  routes.push(
    ...systemRoutes(container, () => routes),
    ...authRoutes(container),
    ...catalogRoutes(container),
    ...customerRoutes(container),
    ...sellerRoutes(container),
    ...adminRoutes(container)
  );
  const pipeline = createPipeline({
    env,
    resolveAuth: (token) => container.services.auth.resolveAuth(token),
    rateLimitStore: container.rateLimitStore,
    onSecurityEvent: (type, info) => container.services.audit.securityEvent(type, { ip: info.ip, userId: info.userId, details: info.details })
  });
  await container.database.connect();
  await adapter.init(routes, pipeline);
  return {
    container,
    adapter,
    routes,
    async close() {
      await adapter.close().catch(() => void 0);
      await container.shutdown();
    }
  };
}

// src/server.ts
async function main() {
  let env;
  try {
    env = loadEnv();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`
\u2716 ${err.message}
`);
      process.exit(1);
    }
    throw err;
  }
  const target = describeDatabaseUrl(env.DATABASE_URL);
  let app;
  try {
    app = await createApp(env);
  } catch (err) {
    console.error(`
\u2716 Could not connect to the database ${target?.safeUrl ?? ""}
  ${explainDatabaseError(err.message)}
`);
    process.exit(1);
  }
  const status = await databaseStatus(app.container.db, env.DATABASE_URL);
  if (!status.connected) {
    console.error(`
\u2716 Database check failed for ${target?.safeUrl}
  ${status.error}
`);
    process.exit(1);
  }
  const s = status.schema;
  logger.info(
    {
      database: status.server.database,
      host: `${target?.host}:${target?.port}`,
      server: status.server.version,
      tables: s.tables,
      migrations: `${s.migrationsApplied}/${s.migrationsExpected ?? "?"}`
    },
    `\u2714 Database connected (${status.server.database} @ ${target?.host}, ${status.latencyMs} ms)`
  );
  if (s.migrationsApplied === 0) {
    logger.warn("Database has no tables yet \u2014 run `pnpm db:deploy` (then `pnpm db:seed`) or import the SQL export.");
  } else if (s.pendingMigrations.length) {
    logger.warn({ pending: s.pendingMigrations }, "Database schema is behind \u2014 run `pnpm db:deploy`.");
  }
  await app.adapter.listen(env.PORT);
  logger.info(
    { framework: app.adapter.name, db: `${env.DATABASE_TYPE}+${env.ORM_PROVIDER}`, storage: env.STORAGE_PROVIDER, redis: env.REDIS_ENABLED },
    `Vyora API listening on :${env.PORT} (${env.APP_ENV}) \u2014 docs at ${env.API_BASE_URL}/api/docs`
  );
  let closing = false;
  const shutdown = async (signal) => {
    if (closing) return;
    closing = true;
    logger.info({ signal }, "shutting down");
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("unhandledRejection", (err) => logger.error({ err }, "unhandled rejection"));
}
main().catch((err) => {
  logger.fatal({ err }, "failed to start");
  process.exit(1);
});
//# sourceMappingURL=server.js.map
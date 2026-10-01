import pino from 'pino';

const level = process.env.LOG_LEVEL ?? 'info';
const pretty = process.env.NODE_ENV === 'development' && process.stdout.isTTY;

export const logger = pino({
  level,
  base: { service: 'vyora-api' },
  redact: {
    paths: [
      'password',
      '*.password',
      '*.passwordHash',
      'req.headers.authorization',
      'req.headers.cookie',
      '*.token',
      '*.refreshToken',
    ],
    censor: '[redacted]',
  },
  ...(pretty ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } } } : {}),
});

export type Logger = typeof logger;

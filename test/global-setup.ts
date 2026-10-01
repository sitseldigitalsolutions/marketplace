import { execSync } from 'node:child_process';

/**
 * Bring the dedicated test database (DATABASE_URL from .env.test) up to the latest migration.
 * This is non-destructive: tests create uniquely named fixtures, so they never depend on an
 * empty database. To wipe it manually run `pnpm --filter @vyora/backend test:db:prepare`.
 */
export default function setup() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url.includes('_test')) {
    throw new Error(`Refusing to run tests against a non-test database: ${url}`);
  }
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
}

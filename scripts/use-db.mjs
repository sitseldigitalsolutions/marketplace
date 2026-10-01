#!/usr/bin/env node
/**
 * Switch the backend's database (DATABASE_URL in backend/.env).
 *
 *   pnpm db:use local                  → local Docker MySQL (marketplace)
 *   pnpm db:use hostinger <host>       → Hostinger MySQL, using the user/password/database from
 *                                        .env.hostinger (git-ignored) and the given REMOTE host
 *
 * The previous .env is backed up to .env.backup. No credentials are stored in this script.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const envPath = resolve(root, '.env');
const LOCAL = 'mysql://root:password@localhost:3306/marketplace';
const [, , target, host, port] = process.argv;

function hostingerUrl() {
  const file = resolve(root, '.env.hostinger');
  if (!existsSync(file)) {
    console.error('✖ .env.hostinger not found (copy .env.hostinger.example and fill in the Hostinger database credentials).');
    process.exit(1);
  }
  const line = readFileSync(file, 'utf8').match(/^DATABASE_URL=(.+)$/m);
  if (!line) {
    console.error('✖ DATABASE_URL missing in .env.hostinger');
    process.exit(1);
  }
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    console.error(
      '\n✖ Give the Hostinger REMOTE MySQL host, e.g.  pnpm db:use hostinger srv1234.hstgr.io\n' +
        '  (hPanel → Databases → Remote MySQL; 127.0.0.1/localhost only works on the Hostinger server itself)\n',
    );
    process.exit(1);
  }
  const u = new URL(line[1].trim());
  u.hostname = host;
  u.port = port ?? '3306';
  return u.toString();
}

let url;
if (target === 'local') url = LOCAL;
else if (target === 'hostinger') url = hostingerUrl();
else {
  console.error('Usage: pnpm db:use local | pnpm db:use hostinger <host> [port]');
  process.exit(1);
}

const env = readFileSync(envPath, 'utf8');
copyFileSync(envPath, `${envPath}.backup`);
const next = /^DATABASE_URL=.*$/m.test(env) ? env.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${url}`) : `${env}\nDATABASE_URL=${url}\n`;
writeFileSync(envPath, next);
console.log(`✔ DATABASE_URL now points to ${url.replace(/:[^:@/]+@/, ':****@')}  (backup: .env.backup)`);
console.log('  Next: pnpm db:check   →   pnpm db:setup (creates tables + inserts data)   →   pnpm dev');

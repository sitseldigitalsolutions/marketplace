# Vyora — backend

Node.js + TypeScript REST API (`/api/v1`) with Express or Hapi adapters, Prisma + MySQL. Package: `@vyora/backend`.

## Configuration

All server settings live in this folder. Copy the template and fill in the secrets:

| File | Purpose |
|---|---|
| `.env` (from `.env.example`) | Local development — port, DB, JWT/file secrets, storage, Redis, email, rate limits |
| `.env.test` (from `.env.test.example`) | Overrides for `pnpm test` (database `marketplace_test`, `uploads-test/`) |
| `.env.e2e` (from `.env.e2e.example`) | Overrides for the Playwright run (database `marketplace_e2e`, `uploads-e2e/`) |
| `.env.hostinger` (from `.env.hostinger.example`) | Hostinger production values; used by `pnpm db:use hostinger <host>` |

All `.env*` files except the `*.example` templates are git-ignored. Variables are validated at startup by
`src/config/env.ts`. When you change `PORT`, update `VITE_API_PROXY` in `frontend/.env` too.

## Commands (run here, or from the repo root with `pnpm --filter @vyora/backend <script>`)

| Script | What it does |
|---|---|
| `pnpm dev` | API with hot reload (tsx watch) |
| `pnpm build` / `pnpm start` | Bundle to `dist/` with tsup / run the bundle |
| `pnpm test` | Vitest unit + integration tests against `marketplace_test` (MySQL must be running) |
| `pnpm db:migrate` / `db:deploy` / `db:seed` / `db:reset` | Prisma migrations and demo seed |
| `pnpm db:check` | Print connection, tables, migrations and row counts |
| `pnpm db:use local \| hostinger <host>` | Switch `DATABASE_URL` in `.env` (previous file saved to `.env.backup`) |
| `pnpm db:e2e:prepare` | Migrate + seed `marketplace_e2e` for the Playwright suite |

## Layout

```
prisma/        schema, migrations, seed + demo content
src/           config · bootstrap · http (pipeline) · adapters (express/hapi) · database · infrastructure · modules · shared
test/          Vitest suites
scripts/       use-db.mjs
docker/mysql/  init.sql mounted by docker-compose (creates dev/test/shadow/e2e databases)
docs/          SECURITY, INTEGRATIONS, MONGODB
uploads/       local file storage (git-ignored)
exports/       SQL dumps (git-ignored)
Dockerfile     production image — build from the repo root: docker build -f backend/Dockerfile .
```

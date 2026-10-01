# Vyora — backend API

Node.js + TypeScript REST API (`/api/v1`), Express, Prisma + MySQL. Deployed standalone; the frontend runs on its own host.

## Deploy (Hostinger)

| Setting | Value |
|---|---|
| Build command | `pnpm run build` (runs `prisma generate` + `tsup`) |
| Entry file | `server.js` (loads `dist/server.js`) |
| Environment | see `.env.hostinger.example` |

For a separate frontend host also set `FRONTEND_URL` (the site origin), `CORS_ORIGINS` (extra origins, comma-separated) and
`COOKIE_DOMAIN` (shared parent domain, so the site can read the CSRF cookie).

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Watch mode (`.env`) |
| `pnpm build` / `pnpm start` | Production build / run |
| `pnpm db:deploy` | Apply migrations |
| `pnpm db:seed` | Seed reference + demo data |
| `pnpm db:check` | Print DB connection, tables, migrations |

## Layout

- `src/` — application code (`server.ts` entry)
- `prisma/` — schema, migrations, seed
- `vendor/shared/` — copy of the monorepo's `@vyora/shared` package (keep in sync with `shared/src`)
- `uploads/` — locally stored product images

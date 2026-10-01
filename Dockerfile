# ── Vyora backend (production image) ───────────────────────────
# Build from the repository root (the backend imports ../shared):
#   docker build -f backend/Dockerfile -t vyora-backend .
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY shared/package.json shared/
RUN pnpm install --frozen-lockfile --filter @vyora/backend...

FROM deps AS build
COPY shared shared
COPY backend backend
RUN pnpm --filter @vyora/backend exec prisma generate && pnpm --filter @vyora/backend build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/backend/node_modules /app/backend/node_modules
COPY --from=build /app/backend/dist /app/backend/dist
COPY --from=build /app/backend/prisma /app/backend/prisma
COPY --from=build /app/backend/package.json /app/backend/package.json
# Generated Prisma client lives in the pnpm store inside node_modules
COPY --from=build /app/node_modules/.pnpm /app/node_modules/.pnpm
WORKDIR /app/backend
RUN mkdir -p uploads && chown -R node:node /app/backend/uploads
USER node
EXPOSE 4000
# Apply pending migrations, then start. (Run seeds manually: `node dist/seed.js`.)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]

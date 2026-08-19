FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/tsconfig/package.json ./packages/tsconfig/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

# Prisma validates its datasource while generating the client. No database
# connection is made during this image build; Render supplies the real URL at runtime.
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lastbench_build
ENV DATABASE_URL=${DATABASE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN pnpm --filter @lastbench/api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs lastbench

# Copy node_modules maintaining exact monorepo structure for pnpm symlinks to work
COPY --from=builder --chown=lastbench:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=lastbench:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=lastbench:nodejs /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy built code maintaining exact monorepo structure
COPY --from=builder --chown=lastbench:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=lastbench:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=lastbench:nodejs /app/apps/api/prisma ./apps/api/prisma

RUN mkdir -p ./apps/api/uploads && chown lastbench:nodejs ./apps/api/uploads

USER lastbench
EXPOSE 3001
WORKDIR /app/apps/api
CMD ["node", "dist/index.js"]

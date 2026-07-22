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
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
# L-3: Run prisma generate explicitly before building so the Prisma Client
# is always regenerated from the current schema, regardless of build script changes
RUN pnpm --filter @lastbench/api exec prisma generate
RUN pnpm --filter @lastbench/api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# L-5: Run as non-root user — container escape vulnerabilities are far less
# dangerous when the process doesn't have root privileges
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs lastbench

COPY --from=builder --chown=lastbench:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=lastbench:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=lastbench:nodejs /app/apps/api/package.json ./
COPY --from=builder --chown=lastbench:nodejs /app/node_modules ./node_modules

# Create uploads directory with correct ownership
RUN mkdir -p ./uploads && chown lastbench:nodejs ./uploads

USER lastbench

EXPOSE 3001
CMD ["node", "dist/index.js"]

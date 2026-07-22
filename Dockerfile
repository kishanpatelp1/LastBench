FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @lastbench/api exec prisma generate
RUN pnpm --filter @lastbench/api build
RUN pnpm --filter @lastbench/api deploy --prod /app/pruned

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs lastbench

COPY --from=builder --chown=lastbench:nodejs /app/pruned ./
RUN mkdir -p ./uploads && chown lastbench:nodejs ./uploads

USER lastbench

EXPOSE 3001
CMD ["node", "dist/index.js"]

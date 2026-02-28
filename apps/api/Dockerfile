# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

# Copy workspace manifests first for better layer caching.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json

# Install only the API workspace dependencies (including dev deps for build).
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter api...

COPY apps/api apps/api

RUN pnpm --filter api prisma:generate
RUN pnpm --filter api build

# Keep only production dependencies for the runtime image.
RUN pnpm prune --prod


FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production
ENV PORT=4000

WORKDIR /app/apps/api

# Copy runtime files from builder.
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/api/node_modules /app/apps/api/node_modules
COPY --from=builder /app/apps/api/dist /app/apps/api/dist
COPY --from=builder /app/apps/api/prisma /app/apps/api/prisma
COPY --from=builder /app/apps/api/package.json /app/apps/api/package.json
COPY --from=builder /app/apps/api/prisma.config.ts /app/apps/api/prisma.config.ts

EXPOSE 4000

CMD ["node", "dist/main"]

# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

WORKDIR /app

# Copy workspace manifests first for better layer caching.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json

# Install only the API workspace dependencies (including dev deps for build).
RUN pnpm install --frozen-lockfile --filter api...

COPY apps/api apps/api

RUN pnpm --filter api prisma:generate
RUN pnpm --filter api build

# Create a production-only bundle for the API workspace.
RUN pnpm --filter api deploy --legacy --prod /prod/api
# Generate Prisma client inside the production bundle.
RUN pnpm --dir /prod/api prisma:generate


FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production
ENV PORT=4000

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/apps/api

# Copy production package output and compiled NestJS bundle.
COPY --from=builder /prod/api/ /app/apps/api/
COPY --from=builder /app/apps/api/dist /app/apps/api/dist

EXPOSE 4000

CMD ["node", "dist/src/main.js"]

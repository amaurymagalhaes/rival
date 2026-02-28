# Phase 1: Foundation, Test Infrastructure & Skeleton Deploy (1.5 hours)

## Objective

Set up the monorepo, define the complete database schema, provision infrastructure, **set up the full test infrastructure for TDD**, and deploy working skeletons to verify the full stack works end-to-end before writing any feature code.

## TDD Note

Phase 1 is infrastructure-only — no feature code, so no Red-Green-Refactor yet. However, test infrastructure (configs, helpers, factories, test DB) is set up here so that **Phase 2 can start by writing failing tests immediately**.

## Time Breakdown

| Task | Minutes |
|------|---------|
| Create monorepo structure (pnpm workspace, folders) | 10 |
| Initialize NestJS project in apps/api | 10 |
| Initialize Next.js 15 project in apps/web | 10 |
| Provision Neon database, get connection string | 5 |
| Write full Prisma schema (4 models, all constraints, indexes) | 20 |
| Run prisma migrate, verify schema on Neon | 5 |
| Write seed script (3 users, 6 blogs, likes, comments) | 10 |
| **Set up backend test infrastructure** (Jest config, test DB, helpers, factories) | **10** |
| **Set up frontend test infrastructure** (Jest config, jest-dom setup) | **5** |
| **Set up E2E test infrastructure** (Playwright config) | **5** |
| Deploy NestJS skeleton to Railway (health endpoint) | 5 |
| Deploy Next.js skeleton to Vercel (hello page) | 5 |

## Step-by-Step Implementation

### 1. Create Monorepo

```bash
mkdir hyperblog-blog && cd hyperblog-blog
pnpm init
mkdir -p apps/api apps/web packages/shared/src
```

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Root package.json scripts:**
```json
{
  "scripts": {
    "dev": "pnpm --filter './apps/*' --parallel dev",
    "dev:api": "pnpm --filter api dev",
    "dev:web": "pnpm --filter web dev",
    "build": "pnpm --filter './packages/*' build && pnpm --filter './apps/*' build",
    "test": "pnpm -r test",
    "db:migrate": "pnpm --filter api prisma:migrate",
    "db:push": "pnpm --filter api prisma:push"
  }
}
```

### 2. Initialize NestJS

```bash
cd apps/api
npx @nestjs/cli new . --package-manager pnpm --strict
```

Add health endpoint in `app.controller.ts`:
```typescript
@Get('health')
@Public()
health() { return { status: 'ok', timestamp: new Date().toISOString() }; }
```

### 3. Initialize Next.js 15

```bash
cd apps/web
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias
npx shadcn@latest init
npx shadcn@latest add button input card skeleton textarea label
```

### 4. Provision Neon Database

1. Create Neon project "hyperblog-blog"
2. Copy connection string (includes `?sslmode=require`)
3. Set in `apps/api/.env`: `DATABASE_URL=postgresql://...`

### 5. Prisma Schema (Complete)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  name         String?
  passwordHash String    @map("password_hash")
  createdAt    DateTime  @default(now()) @map("created_at")

  blogs    Blog[]
  likes    Like[]
  comments Comment[]

  @@map("users")
}

model Blog {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  title       String
  slug        String   @unique
  content     String
  summary     String?
  isPublished Boolean  @default(false) @map("is_published")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  likes    Like[]
  comments Comment[]

  @@index([userId])
  @@index([isPublished, createdAt(sort: Desc)])
  @@map("blogs")
}

model Like {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  blogId    String   @map("blog_id")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  blog Blog @relation(fields: [blogId], references: [id], onDelete: Cascade)

  @@unique([userId, blogId])
  @@index([blogId])
  @@map("likes")
}

model Comment {
  id        String   @id @default(cuid())
  blogId    String   @map("blog_id")
  userId    String   @map("user_id")
  content   String
  createdAt DateTime @default(now()) @map("created_at")

  blog Blog @relation(fields: [blogId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([blogId])
  @@index([createdAt(sort: Desc)])
  @@map("comments")
}
```

**Key design decisions:**
- CUIDs for all IDs (URL-friendly, sortable, collision-resistant)
- `@@map` for snake_case DB column names, PascalCase in TypeScript
- Composite index `[isPublished, createdAt DESC]` on Blog = feed query index
- `@@unique([userId, blogId])` on Like = DB-enforced "one like per user per blog"
- `onDelete: Cascade` on all relations = clean referential integrity

### 6. Run Migrations

```bash
cd apps/api
npx prisma migrate dev --name init
```

### 7. Seed Script

```typescript
// apps/api/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create 3 users
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const alice = await prisma.user.create({
    data: { email: 'alice@example.com', name: 'Alice', passwordHash },
  });
  const bob = await prisma.user.create({
    data: { email: 'bob@example.com', name: 'Bob', passwordHash },
  });
  const carol = await prisma.user.create({
    data: { email: 'carol@example.com', name: 'Carol', passwordHash },
  });

  // Create 6 blogs (4 published, 2 drafts)
  const blogs = await Promise.all([
    prisma.blog.create({ data: { userId: alice.id, title: 'Getting Started with NestJS', slug: 'getting-started-with-nestjs', content: 'NestJS is a progressive Node.js framework...', isPublished: true } }),
    prisma.blog.create({ data: { userId: alice.id, title: 'Advanced TypeScript Patterns', slug: 'advanced-typescript-patterns', content: 'TypeScript offers many advanced patterns...', isPublished: true } }),
    prisma.blog.create({ data: { userId: bob.id, title: 'React Server Components Explained', slug: 'react-server-components-explained', content: 'Server components are a paradigm shift...', isPublished: true } }),
    prisma.blog.create({ data: { userId: bob.id, title: 'My Draft Post', slug: 'my-draft-post', content: 'Work in progress...', isPublished: false } }),
    prisma.blog.create({ data: { userId: carol.id, title: 'PostgreSQL Performance Tips', slug: 'postgresql-performance-tips', content: 'Here are my top tips for PostgreSQL...', isPublished: true } }),
    prisma.blog.create({ data: { userId: carol.id, title: 'Unpublished Ideas', slug: 'unpublished-ideas', content: 'Some ideas I am working on...', isPublished: false } }),
  ]);

  // Create likes
  await prisma.like.createMany({
    data: [
      { userId: bob.id, blogId: blogs[0].id },
      { userId: carol.id, blogId: blogs[0].id },
      { userId: alice.id, blogId: blogs[2].id },
      { userId: carol.id, blogId: blogs[4].id },
    ],
  });

  // Create comments
  await prisma.comment.createMany({
    data: [
      { blogId: blogs[0].id, userId: bob.id, content: 'Great introduction!' },
      { blogId: blogs[0].id, userId: carol.id, content: 'Very helpful, thanks!' },
      { blogId: blogs[2].id, userId: alice.id, content: 'Server components are amazing.' },
    ],
  });

  console.log('Seed completed.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

### 8. Deploy Skeleton to Railway

1. Connect GitHub repo to Railway
2. Set root directory: `apps/api`
3. Build command: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter api build`
4. Start command: `node dist/main.js`
5. Environment variables: `DATABASE_URL`, `JWT_SECRET`, `PORT=3001`
6. Verify: `curl https://<app>.railway.app/health`

### 9. Deploy Skeleton to Vercel

1. Import GitHub repo
2. Root directory: `apps/web`
3. Install command: `cd ../.. && pnpm install --frozen-lockfile`
4. Build command: `cd ../.. && pnpm --filter web build`
5. Environment variable: `API_URL=https://<app>.railway.app`
6. Verify: browser loads the Next.js page

### 10. Set Up Backend Test Infrastructure

This is critical — all of Phase 2-4 TDD depends on this being ready.

**Verify/update Jest config for NestJS** (`jest.config.ts` ships with CLI).

**Test database setup:**
```typescript
// apps/api/test/setup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_TEST });

beforeEach(async () => {
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.blog.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => { await prisma.$disconnect(); });

export { prisma };
```

**Test helpers:**
```typescript
// apps/api/test/helpers/auth.helper.ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { faker } from '@faker-js/faker';

export async function createTestUser(app: INestApplication) {
  const email = faker.internet.email();
  const password = 'TestPass123!';
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password });
  return { email, password, token: res.body.accessToken, userId: res.body.user.id };
}

export function authRequest(app: INestApplication, token: string) {
  return {
    get: (url: string) => request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => request(app.getHttpServer()).post(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) => request(app.getHttpServer()).patch(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => request(app.getHttpServer()).delete(url).set('Authorization', `Bearer ${token}`),
  };
}
```

**Test factories:**
```typescript
// apps/api/test/factories/user.factory.ts
// apps/api/test/factories/blog.factory.ts
// Pre-built factory functions for creating test data with sensible defaults
```

**Install test dependencies:**
```bash
cd apps/api
pnpm add -D @faker-js/faker jest-mock-extended supertest @types/supertest
```

### 11. Set Up Frontend Test Infrastructure

```bash
cd apps/web
pnpm add -D jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom @types/jest ts-jest
```

**Jest config:**
```typescript
// apps/web/jest.config.ts
import nextJest from 'next/jest';

const createJestConfig = nextJest({ dir: './' });

export default createJestConfig({
  testEnvironment: 'jsdom',
  setupFilesAfterSetup: ['<rootDir>/jest.setup.ts'],
});
```

```typescript
// apps/web/jest.setup.ts
import '@testing-library/jest-dom';
```

### 12. Set Up E2E Test Infrastructure

```bash
pnpm add -D @playwright/test
npx playwright install chromium
```

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: [
    { command: 'pnpm dev:api', port: 4000, reuseExistingServer: true },
    { command: 'pnpm dev:web', port: 3000, reuseExistingServer: true },
  ],
  use: { baseURL: 'http://localhost:3000' },
  testDir: './e2e/tests',
});
```

### 13. Deploy Skeletons

Deploy NestJS to Railway and Next.js to Vercel (same as before — health endpoint + hello page).

## Acceptance Criteria

- [ ] Monorepo with `apps/api`, `apps/web`, `packages/shared`, `pnpm-workspace.yaml`
- [ ] Prisma schema has User, Blog, Like, Comment with all fields, constraints, indexes
- [ ] `prisma migrate dev` succeeds against Neon
- [ ] Seed script creates realistic test data
- [ ] **Backend test infrastructure ready**: Jest config, test DB setup, helpers, factories installed
- [ ] **Frontend test infrastructure ready**: Jest + testing-library configured
- [ ] **E2E test infrastructure ready**: Playwright installed and configured
- [ ] NestJS responds to `GET /health` on Railway URL
- [ ] Next.js renders a page on Vercel URL
- [ ] Git: clean initial commit with test infrastructure included

## Exit Gate

Backend and frontend are reachable from the internet. Database has schema and seed data. **Test infrastructure is fully ready — running `pnpm test` in any app exits cleanly (0 tests, 0 failures).** Phase 2 can start by writing failing tests immediately.

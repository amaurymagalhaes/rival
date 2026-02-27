# Phase 4: Polish, Deploy & README (1.5 hours) — TDD

## Objective

Final deployment, error/loading/empty states, responsiveness pass, remaining tests (TDD for middleware + BlogCard), E2E tests, and the README.

## TDD Workflow

The remaining 4 tests follow Red-Green-Refactor:
- middleware.test.ts and BlogCard.test.tsx are written FIRST, then their subjects are implemented/verified
- E2E tests are written FIRST as the final validation layer

## Time Breakdown

| Task | Minutes |
|------|---------|
| **Middleware — TDD Cycle** | |
| **RED: Write middleware.test.ts** (1 failing test) | **3** |
| GREEN: Verify/fix middleware until test passes | 3 |
| **BlogCard — TDD Cycle** | |
| **RED: Write BlogCard.test.tsx** (1 failing test) | **4** |
| GREEN: Verify/fix BlogCard until test passes | 3 |
| **E2E — TDD Cycle** | |
| **RED: Write happy-path.spec.ts** (1 failing test) | **5** |
| GREEN: Fix any issues until E2E passes | 5 |
| **RED: Write like-flow.spec.ts** (1 failing test) | **4** |
| GREEN: Fix any issues until E2E passes | 4 |
| **Deploy & Polish** | |
| Final deployment: redeploy backend + frontend with all features | 15 |
| Verify all features work on deployed URLs (smoke test) | 10 |
| Fix deployment-specific bugs (CORS, env vars, etc.) | 10 |
| Error boundaries (error.tsx for feed, blog detail, dashboard) | 10 |
| Loading states (loading.tsx with skeletons) | 5 |
| 404 pages (not-found.tsx for blog detail) | 5 |
| Basic responsiveness check (mobile viewport) | 5 |
| Write README | 15 |
| Clean commit history, final push | 5 |

---

## TDD Step-by-Step

### Step 1: RED — Write middleware.test.ts (1 test, FAILING)

```typescript
// apps/web/__tests__/middleware.test.ts
import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '../src/middleware';

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    redirect: jest.fn().mockReturnValue({ type: 'redirect' }),
    next: jest.fn().mockReturnValue({ type: 'next' }),
  },
}));

describe('middleware', () => {
  // TEST 16: Redirects /dashboard to /login without token
  it('redirects /dashboard to /login when no token cookie exists', () => {
    const mockRequest = {
      nextUrl: { pathname: '/dashboard' },
      cookies: { get: jest.fn().mockReturnValue(undefined) },
      url: 'http://localhost:3000/dashboard',
    } as unknown as NextRequest;

    const result = middleware(mockRequest);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/login' }),
    );
  });
});
```

**Run: `pnpm --filter web test middleware` → FAIL (if middleware not working). This is RED.**

### Step 2: GREEN — Verify/fix middleware

The middleware should already exist from Phase 2. This test validates it works correctly. If it fails, fix the middleware until the test passes.

### Step 3: RED — Write BlogCard.test.tsx (1 test, FAILING)

```tsx
// apps/web/__tests__/components/BlogCard.test.tsx
import { render, screen } from '@testing-library/react';
import { BlogCard } from '@/features/blog/components/BlogCard';

describe('BlogCard', () => {
  // TEST 15: Renders title, author, counts, and date
  it('renders title, author name, like count, comment count, and date', () => {
    render(
      <BlogCard
        blog={{
          id: 'blog-1',
          title: 'Test Blog Title',
          slug: 'test-blog-title',
          summary: 'A summary of the blog post',
          createdAt: '2026-02-27T12:00:00Z',
          user: { id: 'user-1', name: 'John Doe' },
          _count: { likes: 5, comments: 3 },
        }}
      />
    );

    expect(screen.getByText('Test Blog Title')).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
```

**Run: `pnpm --filter web test BlogCard` → FAIL (if component doesn't match). This is RED.**

### Step 4: GREEN — Verify/fix BlogCard

BlogCard should already exist from Phase 3. This test validates its rendering. Fix if needed until test passes.

### Step 5: RED — Write happy-path.spec.ts (1 E2E test, FAILING)

```typescript
// e2e/tests/happy-path.spec.ts
import { test, expect } from '@playwright/test';

test('register → create blog → publish → view in feed', async ({ page }) => {
  const email = `e2e-${Date.now()}@test.com`;
  const password = 'TestPass123!';

  // Register
  await page.goto('/register');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');

  // Create blog
  await page.click('text=New Blog'); // or appropriate selector
  await page.fill('input[name="title"]', 'E2E Test Blog');
  await page.fill('textarea[name="content"]', 'This is an E2E test blog post.');
  await page.click('button[type="submit"]');

  // Publish
  await page.waitForURL(/\/dashboard/);
  // Click publish toggle/button
  await page.click('text=Publish'); // or appropriate selector

  // Navigate to feed
  await page.goto('/feed');

  // Blog should be visible
  await expect(page.getByText('E2E Test Blog')).toBeVisible();

  // Click to view
  await page.click('text=E2E Test Blog');
  await expect(page.getByText('This is an E2E test blog post.')).toBeVisible();
});
```

**Run: `npx playwright test happy-path` → FAIL if any step breaks. This is RED.**

### Step 6: GREEN — Fix any issues until happy-path passes

This E2E test validates the entire Phase 2 + 3 frontend flow. Fix any broken selectors, missing routes, or form handling until it passes.

### Step 7: RED — Write like-flow.spec.ts (1 E2E test, FAILING)

```typescript
// e2e/tests/like-flow.spec.ts
import { test, expect } from '@playwright/test';

test('like blog and verify count persists after refresh', async ({ page }) => {
  const email = `e2e-like-${Date.now()}@test.com`;
  const password = 'TestPass123!';

  // Register and login
  await page.goto('/register');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');

  // Navigate to feed (needs at least one published blog from seed data)
  await page.goto('/feed');

  // Find first blog card's like button and get initial count
  const likeButton = page.locator('[data-testid="like-button"]').first();
  const countBefore = await likeButton.locator('[data-testid="like-count"]').textContent();

  // Click like
  await likeButton.click();

  // Count should increment
  const expectedCount = String(Number(countBefore) + 1);
  await expect(likeButton.locator('[data-testid="like-count"]')).toHaveText(expectedCount);

  // Refresh and verify persisted
  await page.reload();
  await expect(page.locator('[data-testid="like-button"]').first().locator('[data-testid="like-count"]')).toHaveText(expectedCount);
});
```

**Run: `npx playwright test like-flow` → FAIL if any step breaks. This is RED.**

### Step 8: GREEN — Fix until like-flow passes

Fix any missing data-testid attributes, broken selectors, or like flow issues.

---

## Error States (error.tsx files)

### Feed Error

```tsx
// app/(public)/feed/error.tsx
'use client';
export default function FeedError({ error, reset }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 text-center">
      <h2 className="text-xl font-semibold mb-2">Failed to load feed</h2>
      <p className="text-gray-500 mb-4">Something went wrong. Please try again.</p>
      <button onClick={reset} className="px-4 py-2 bg-primary text-white rounded">
        Try Again
      </button>
    </div>
  );
}
```

### Blog Detail Error

```tsx
// app/(public)/blogs/[slug]/error.tsx — same pattern, "Failed to load blog"
```

### Blog Detail Not Found

```tsx
// app/(public)/blogs/[slug]/not-found.tsx
import Link from 'next/link';
export default function BlogNotFound() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 text-center">
      <h2 className="text-2xl font-bold mb-2">Blog not found</h2>
      <p className="text-gray-500 mb-4">This blog doesn't exist or hasn't been published yet.</p>
      <Link href="/feed" className="text-primary hover:underline">Back to Feed</Link>
    </div>
  );
}
```

## Loading States (loading.tsx files)

```tsx
// app/(public)/feed/loading.tsx
import { BlogCardSkeleton } from '@/features/blog/components/BlogCardSkeleton';
export default function FeedLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="h-9 bg-gray-200 rounded w-24 mb-8 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => <BlogCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
```

## Responsiveness

Three breakpoints, mobile-first with Tailwind:

| Element | Mobile | Tablet (md:) | Desktop (lg:) |
|---------|--------|-------------|--------------|
| Feed grid | 1 column | 2 columns | 3 columns |
| Blog content | Full width, px-4 | max-w-prose mx-auto | Same |
| Dashboard | Stack | Stack | Sidebar + main |
| Forms | Full width | max-w-2xl mx-auto | Same |
| Header nav | Hamburger toggle | Visible links | Same |

Key classes:
- Feed: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Content: `max-w-prose mx-auto px-4`
- Container: `max-w-5xl mx-auto px-4`

## Optional: Pino Structured Logging (10 min if time permits)

```bash
cd apps/api && pnpm add nestjs-pino pino-http pino-pretty
```

```typescript
// app.module.ts
imports: [
  LoggerModule.forRoot({
    pinoHttp: {
      transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
      autoLogging: true,
      serializers: {
        req: (req) => ({ method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    },
  }),
]
```

## README (Full Structure)

```markdown
# Secure Blog Platform

Live Demo: [frontend-url] | API: [backend-url]

## Tech Stack
- Backend: NestJS (TypeScript strict), Prisma ORM, PostgreSQL (Neon)
- Frontend: Next.js 15 (App Router, Server Components, Server Actions)
- Auth: JWT with httpOnly cookies, bcrypt password hashing
- Testing: TDD (Red-Green-Refactor), Jest + Playwright
- Deployment: Vercel (frontend), Railway (backend), Neon (database)

## Features
- User registration & login with JWT authentication
- Blog CRUD with auto-generated SEO-friendly slugs
- Public feed with cursor-based pagination
- Like system with optimistic UI updates
- Comment system with real-time feel (no page reloads)
- Rate limiting on public endpoints

## Development Methodology
TDD (Test-Driven Development) — all backend services and key frontend components were built test-first using Red-Green-Refactor cycles. 18 tests across unit, integration, component, and E2E layers.

## Architecture
[... same as original ...]

## Tradeoffs Made
[... same as original ...]

## What I Would Improve
[... same as original ...]

## Scaling to 1M Users
[... same as original ...]
```

## Test Checkpoint — FINAL

At the end of Phase 4, **all 18 tests must pass**:

| Layer | File | Tests | Cumulative |
|-------|------|-------|-----------|
| Unit | auth.service.spec.ts | 4 | 4 |
| Unit | blog.service.spec.ts | 3 | 7 |
| Integration | auth.integration.spec.ts | 1 | 8 |
| Integration | feed.integration.spec.ts | 2 | 10 |
| Integration | like.integration.spec.ts | 2 | 12 |
| Component | LikeButton.test.tsx | 2 | 14 |
| Component | BlogCard.test.tsx | 1 | 15 |
| Unit | middleware.test.ts | 1 | 16 |
| E2E | happy-path.spec.ts | 1 | 17 |
| E2E | like-flow.spec.ts | 1 | **18** |

```bash
pnpm --filter api test        # → 12 green
pnpm --filter web test        # → 4 green
npx playwright test            # → 2 green
```

## Deployment Checklist

- [ ] Set Railway env vars: DATABASE_URL, JWT_SECRET, FRONTEND_URL, PORT
- [ ] Set Vercel env var: API_URL (Railway URL)
- [ ] Verify CORS allows Vercel frontend origin
- [ ] Run Prisma migrate on production DB
- [ ] Seed production DB (optional, for demo)
- [ ] Smoke test all features on deployed URLs
- [ ] Verify 429 rate limiting works
- [ ] Verify httpOnly cookie is set (DevTools → Application → Cookies)
- [ ] Check mobile viewport doesn't break

## Acceptance Criteria

- [ ] **middleware.test.ts written FIRST** — test drives middleware verification
- [ ] **BlogCard.test.tsx written FIRST** — test drives component verification
- [ ] **happy-path.spec.ts written FIRST** — E2E validates full user journey
- [ ] **like-flow.spec.ts written FIRST** — E2E validates like persistence
- [ ] **All 18 tests pass** across all layers
- [ ] Deployed frontend URL loads, all features work
- [ ] Deployed backend URL responds to all 13 endpoints
- [ ] CORS configured correctly
- [ ] README contains all required sections + TDD methodology mention
- [ ] No console errors in production
- [ ] App acceptable on mobile viewport
- [ ] Clean commit history (feature-based, not "wip")
- [ ] Repository is PUBLIC on GitHub
- [ ] Rate limiting returns 429

## Exit Gate

Submission is complete. Live URLs work. README is thorough. Repo is public. **All 18 tests green.** Every feature was built test-first. Ready to submit.

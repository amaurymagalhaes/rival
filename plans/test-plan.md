# Test Plan — 18 Tests, TDD (Red-Green-Refactor)

## TDD Methodology

Every test is written **BEFORE** the implementation it validates. The cycle:

1. **RED**: Write the test → run → it fails (the feature doesn't exist yet)
2. **GREEN**: Write minimum code to make the test pass
3. **REFACTOR**: Clean up code while keeping the test green

Tests are never an afterthought — they drive the design.

## Test Budget Allocation

| Phase | Tests | Time | Focus | TDD Cycle |
|-------|-------|------|-------|-----------|
| Phase 1 | 0 | ~15 min | Test infrastructure setup only | N/A (infra) |
| Phase 2 | 8 | ~28 min | Auth unit (RED→GREEN) + Blog unit (RED→GREEN) + Auth integration (RED→GREEN) | 3 RED→GREEN cycles |
| Phase 3 | 6 | ~23 min | Feed integration (RED→GREEN) + Like integration (RED→GREEN) + LikeButton (RED→GREEN) | 3 RED→GREEN cycles |
| Phase 4 | 4 | ~18 min | Middleware (RED→GREEN) + BlogCard (RED→GREEN) + 2 E2E (RED→GREEN) | 4 RED→GREEN cycles |
| **Total** | **18** | **~84 min** | | **10 TDD cycles** |

Note: TDD adds ~20 min vs writing tests after, but produces better-designed code and catches bugs earlier.

## Test Infrastructure (Phase 1 — Set up BEFORE any feature code)

### Files to Create

```
apps/api/
  jest.config.ts              # Ships with NestJS CLI — verify it exists
  test/
    setup.ts                  # Global test setup (test DB, cleanup)
    helpers/
      auth.helper.ts          # createTestUser(), authRequest()
    factories/
      user.factory.ts         # Generate test users
      blog.factory.ts         # Generate test blogs
  src/
    auth/
      auth.service.spec.ts    # Written in Phase 2 BEFORE AuthService
    blog/
      blog.service.spec.ts    # Written in Phase 2 BEFORE BlogService
  test/
    auth.integration.spec.ts  # Written in Phase 2 AFTER auth backend
    feed.integration.spec.ts  # Written in Phase 3 BEFORE FeedModule
    like.integration.spec.ts  # Written in Phase 3 BEFORE LikeModule
apps/web/
  jest.config.ts              # next/jest config
  jest.setup.ts               # Import @testing-library/jest-dom
  __tests__/
    components/
      LikeButton.test.tsx     # Written in Phase 3 BEFORE LikeButton
      BlogCard.test.tsx        # Written in Phase 4 BEFORE verification
    middleware.test.ts         # Written in Phase 4 BEFORE verification
e2e/
  playwright.config.ts
  tests/
    happy-path.spec.ts        # Written in Phase 4 as final validation
    like-flow.spec.ts          # Written in Phase 4 as final validation
```

### Test Database

Use a separate Neon database branch or `DATABASE_URL_TEST` env var.

```typescript
// apps/api/test/setup.ts
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_TEST });

beforeEach(async () => {
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.blog.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => { await prisma.$disconnect(); });
```

### Test Helpers

```typescript
// apps/api/test/helpers/auth.helper.ts
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
    get: (url) => request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${token}`),
    post: (url) => request(app.getHttpServer()).post(url).set('Authorization', `Bearer ${token}`),
    patch: (url) => request(app.getHttpServer()).patch(url).set('Authorization', `Bearer ${token}`),
    delete: (url) => request(app.getHttpServer()).delete(url).set('Authorization', `Bearer ${token}`),
  };
}
```

---

## THE 18 TESTS — TDD Order

### Phase 2: Auth TDD Cycle

#### RED: `apps/api/src/auth/auth.service.spec.ts` (4 unit tests)

**Written BEFORE AuthService exists. Mock:** PrismaService, bcrypt, JwtService

| # | Test | Assert | Write When |
|---|------|--------|-----------|
| 1 | register hashes password and returns access token | bcrypt.hash called with 12 rounds, jwtService.sign called, response has accessToken | **Before** AuthService |
| 2 | register throws 409 on duplicate email | prisma.user.create throws P2002 → ConflictException | **Before** AuthService |
| 3 | login returns access token for valid credentials | bcrypt.compare returns true, response has accessToken | **Before** AuthService |
| 4 | login throws 401 for wrong password | bcrypt.compare returns false → UnauthorizedException("Invalid credentials") | **Before** AuthService |

**GREEN:** Implement AuthService → run tests → 4/4 pass

#### RED: `apps/api/src/blog/blog.service.spec.ts` (3 unit tests)

**Written BEFORE BlogService exists. Mock:** PrismaService

| # | Test | Assert | Write When |
|---|------|--------|-----------|
| 5 | create generates correct slug from title | Input "My First Blog" → slug "my-first-blog" | **Before** BlogService |
| 6 | update throws 403 when non-owner updates | blog.userId !== requestUser.id → ForbiddenException | **Before** BlogService |
| 7 | delete throws 403 when non-owner deletes | Same pattern as update | **Before** BlogService |

**GREEN:** Implement BlogService → run tests → 3/3 pass

#### RED: `apps/api/test/auth.integration.spec.ts` (1 integration test)

**Written AFTER auth backend, BEFORE integration is verified. Mock:** Nothing. Real NestJS app + test database.

| # | Test | Assert | Write When |
|---|------|--------|-----------|
| 8 | register → login → access protected route | POST /auth/register → 201; POST /auth/login → 200; GET /blogs (with token) → 200; GET /blogs (no token) → 401 | **After** auth backend built |

**GREEN:** Should pass immediately if auth was built correctly. Fix if RED.

**Phase 2 checkpoint: 8 tests green.**

---

### Phase 3: Feed & Social TDD Cycle

#### RED: `apps/api/test/feed.integration.spec.ts` (2 integration tests)

**Written BEFORE FeedModule exists. Mock:** Nothing. Real app + test DB.

| # | Test | Assert | Write When |
|---|------|--------|-----------|
| 9 | Returns only published blogs with cursor pagination | items.length === 5, sorted newest first, each has _count.likes + _count.comments | **Before** FeedModule |
| 10 | Does not expose passwordHash in response | No item has user.passwordHash field | **Before** FeedModule |

**GREEN:** Implement FeedModule → run tests → 2/2 pass

#### RED: `apps/api/test/like.integration.spec.ts` (2 integration tests)

**Written BEFORE LikeModule exists. Mock:** Nothing.

| # | Test | Assert | Write When |
|---|------|--------|-----------|
| 11 | Like/unlike cycle updates count | POST like → 201, likeCount: 1; DELETE unlike → 200, likeCount: 0 | **Before** LikeModule |
| 12 | Duplicate like returns 409 | POST like → 201; POST like again → 409 | **Before** LikeModule |

**GREEN:** Implement LikeModule → run tests → 2/2 pass

#### RED: `apps/web/__tests__/components/LikeButton.test.tsx` (2 component tests)

**Written BEFORE LikeButton exists. Mock:** jest.mock the toggleLike server action.

| # | Test | Assert | Write When |
|---|------|--------|-----------|
| 13 | Renders like count | Render with initialCount=5 → screen.getByText('5') | **Before** LikeButton |
| 14 | Optimistically increments count on click | Click → screen.getByText('6') (before server action resolves) | **Before** LikeButton |

**GREEN:** Implement LikeButton → run tests → 2/2 pass

**Phase 3 checkpoint: 14 cumulative tests green.**

---

### Phase 4: Polish & E2E TDD Cycle

#### RED: `apps/web/__tests__/components/BlogCard.test.tsx` (1 component test)

**Written BEFORE verification. Mock:** Nothing (pure presentational).

| # | Test | Assert | Write When |
|---|------|--------|-----------|
| 15 | Renders title, author, counts, and date | All expected text content present | **Before** verification |

**GREEN:** BlogCard exists from Phase 3. Test validates it. Fix if RED.

#### RED: `apps/web/__tests__/middleware.test.ts` (1 unit test)

**Written BEFORE verification. Mock:** NextRequest, NextResponse.

| # | Test | Assert | Write When |
|---|------|--------|-----------|
| 16 | Redirects /dashboard to /login without token | middleware(mockRequest) → response redirects to /login | **Before** verification |

**GREEN:** Middleware exists from Phase 2. Test validates it. Fix if RED.

#### RED: `e2e/tests/happy-path.spec.ts` (1 E2E test)

**Mock:** Nothing. Full stack running via Playwright webServer.

| # | Test | Assert | Write When |
|---|------|--------|-----------|
| 17 | Register → create blog → publish → view in feed | Full user journey through UI | **Before** E2E verification |

**GREEN:** Fix any UI issues until the full journey passes.

#### RED: `e2e/tests/like-flow.spec.ts` (1 E2E test)

| # | Test | Assert | Write When |
|---|------|--------|-----------|
| 18 | Like blog and verify count persists | Login → /feed → click like → count +1 → refresh → count still incremented | **Before** E2E verification |

**GREEN:** Fix any issues until like persistence is verified end-to-end.

**Phase 4 checkpoint: ALL 18 tests green.**

---

## Cut List (If Time Runs Short)

Cut from bottom up:

1. **First cut:** like-flow.spec.ts (save 7 min) — like integration test covers logic
2. **Next:** middleware.test.ts (save 3 min) — verify manually
3. **Next:** BlogCard.test.tsx (save 4 min) — pure presentational, unlikely to break
4. **Next:** feed integration passwordHash test (save 2 min) — verify manually

**Absolute minimum (13 tests, ~45 min):**
auth unit (4) + blog unit (3) + auth integration (1) + feed integration (1) + like integration (2) + LikeButton (2) + happy-path E2E (1)

---

## CI Configuration (For README)

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  backend-tests:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL_TEST: ${{ secrets.DATABASE_URL_TEST }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm --filter api install
      - run: pnpm --filter api exec prisma migrate deploy
      - run: pnpm --filter api test

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm --filter web install
      - run: pnpm --filter web test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: npx playwright install --with-deps chromium
      - run: pnpm --filter e2e test
```

Note: CI setup is documented in README but NOT implemented during the assessment (saves 30-45 min). Tests run locally.

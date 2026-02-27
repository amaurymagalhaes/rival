# Phase 3: Feed & Social Features (2 hours) — TDD

## Objective

Implement the public feed with cursor pagination, the like system with optimistic UI, the comment system, and rate limiting. **Every backend feature and the LikeButton component start with failing tests.**

## TDD Workflow

Each feature follows Red-Green-Refactor:
1. **RED**: Write the test file with all test cases → run → all fail
2. **GREEN**: Implement the minimum code to make each test pass, one by one
3. **REFACTOR**: Clean up while keeping tests green

## Time Breakdown

| Task | Minutes |
|------|---------|
| **Feed Module — TDD Cycle** | |
| **RED: Write feed.integration.spec.ts** (2 failing tests) | **8** |
| GREEN: FeedModule + FeedService (cursor pagination, _count, select) | 20 |
| GREEN: Verify no passwordHash exposure → test 10 passes | 2 |
| REFACTOR: Clean up feed module | 3 |
| Rate limiting: @nestjs/throttler setup + per-endpoint overrides | 10 |
| **Like Module — TDD Cycle** | |
| **RED: Write like.integration.spec.ts** (2 failing tests) | **7** |
| GREEN: POST /blogs/:id/like (unique constraint, 409 on duplicate) → test 11 passes | 10 |
| GREEN: DELETE /blogs/:id/like (idempotent unlike) → test 12 passes | 5 |
| REFACTOR: Clean up like module | 3 |
| **Comment Module** (no dedicated tests — covered by E2E) | |
| POST /blogs/:id/comments (validation, auth required) | 10 |
| GET /blogs/:id/comments (sorted newest, include author) | 10 |
| **Frontend Feed** | |
| getFeed() query helper (server-side fetch with cache tags) | 5 |
| /feed page (Server Component with Suspense) | 10 |
| BlogCard component (dual variant: feed + dashboard) | 10 |
| BlogCardSkeleton (loading state) | 5 |
| LoadMoreButton (client component, cursor pagination) | 10 |
| EmptyState component | 5 |
| **Frontend Blog Detail** | |
| /blogs/[slug] page (Server Component, generateMetadata for SEO) | 10 |
| **LikeButton — TDD Cycle** | |
| **RED: Write LikeButton.test.tsx** (2 failing tests) | **8** |
| GREEN: LikeButton (useOptimistic + useTransition + Server Action) → tests 13-14 pass | 15 |
| toggleLike Server Action | 5 |
| **Comment UI** (no tests — covered by E2E) | |
| CommentList + CommentItem (Server Components) | 10 |
| CommentForm (useActionState + Server Action) | 10 |
| postComment Server Action (revalidatePath) | 5 |

---

## TDD Step-by-Step

### Step 1: RED — Write feed.integration.spec.ts (2 tests, ALL FAILING)

Write BEFORE creating FeedModule/FeedService:

```typescript
// apps/api/test/feed.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Feed Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.comment.deleteMany();
    await prisma.like.deleteMany();
    await prisma.blog.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => { await app.close(); });

  // TEST 9: Returns only published blogs with cursor pagination
  it('should return only published blogs sorted newest first with counts', async () => {
    const passwordHash = await bcrypt.hash('TestPass123!', 12);
    const user = await prisma.user.create({
      data: { email: 'feed@test.com', name: 'Feed User', passwordHash },
    });

    // Create 5 published + 2 unpublished blogs
    for (let i = 0; i < 5; i++) {
      const blog = await prisma.blog.create({
        data: {
          userId: user.id,
          title: `Published Blog ${i}`,
          slug: `published-blog-${i}`,
          content: 'Content',
          isPublished: true,
        },
      });
      // Add 2 likes and 1 comment each
      const liker1 = await prisma.user.create({
        data: { email: `liker1-${i}@test.com`, passwordHash },
      });
      const liker2 = await prisma.user.create({
        data: { email: `liker2-${i}@test.com`, passwordHash },
      });
      await prisma.like.createMany({
        data: [
          { userId: liker1.id, blogId: blog.id },
          { userId: liker2.id, blogId: blog.id },
        ],
      });
      await prisma.comment.create({
        data: { userId: liker1.id, blogId: blog.id, content: 'Comment' },
      });
    }
    await prisma.blog.create({
      data: { userId: user.id, title: 'Draft 1', slug: 'draft-1', content: 'Draft', isPublished: false },
    });
    await prisma.blog.create({
      data: { userId: user.id, title: 'Draft 2', slug: 'draft-2', content: 'Draft', isPublished: false },
    });

    const res = await request(app.getHttpServer())
      .get('/public/feed')
      .expect(200);

    expect(res.body.items).toHaveLength(5);
    expect(res.body.items[0]._count.likes).toBe(2);
    expect(res.body.items[0]._count.comments).toBe(1);
    // Sorted newest first
    const dates = res.body.items.map((i: any) => new Date(i.createdAt).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  // TEST 10: Does not expose passwordHash in response
  it('should not expose passwordHash in feed response', async () => {
    const passwordHash = await bcrypt.hash('TestPass123!', 12);
    const user = await prisma.user.create({
      data: { email: 'secure@test.com', name: 'Secure', passwordHash },
    });
    await prisma.blog.create({
      data: { userId: user.id, title: 'Test', slug: 'test', content: 'Test', isPublished: true },
    });

    const res = await request(app.getHttpServer())
      .get('/public/feed')
      .expect(200);

    const item = res.body.items[0];
    expect(item.user).not.toHaveProperty('passwordHash');
    expect(item.user).not.toHaveProperty('password_hash');
  });
});
```

**Run: `pnpm --filter api test feed.integration` → 2 FAILURES (FeedModule doesn't exist). This is RED.**

### Step 2: GREEN — Implement Feed Module

#### Feed Service

```typescript
async getFeed(cursor?: string, take: number = 20) {
  const blogs = await this.prisma.blog.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: 'desc' },
    take: take + 1,  // Fetch one extra to determine hasNextPage
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,  // Skip the cursor itself
    }),
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      createdAt: true,
      user: {
        select: { id: true, name: true },
      },
      _count: {
        select: { likes: true, comments: true },
      },
    },
  });

  const hasNextPage = blogs.length > take;
  const items = hasNextPage ? blogs.slice(0, take) : blogs;

  return {
    items,
    nextCursor: hasNextPage ? items[items.length - 1].id : null,
    hasNextPage,
  };
}
```

**Why this avoids N+1:**
- `_count` generates a lateral join/subquery in PostgreSQL, NOT N separate COUNT queries
- `select` (not `include`) ensures we only fetch needed columns — `content` is excluded from feed
- The composite index `@@index([isPublished, createdAt(sort: Desc)])` covers WHERE + ORDER BY
- Single query, O(1) pagination via cursor

#### Feed Controller

```typescript
@Controller('public')
@Public()
export class FeedController {
  @Get('feed')
  getFeed(
    @Query('cursor') cursor?: string,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take?: number,
  ) {
    return this.feedService.getFeed(cursor, Math.min(take, 50));
  }

  @Get('blogs/:slug')
  getBlogBySlug(@Param('slug') slug: string) {
    return this.feedService.getBlogBySlug(slug);
  }
}
```

**Run: `pnpm --filter api test feed.integration` → 2 PASSES. This is GREEN.**

### Step 3: Rate Limiting (no dedicated test — verified manually + E2E)

#### Setup (3 lines in app.module.ts)

```typescript
imports: [
  ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
],
providers: [
  { provide: APP_GUARD, useClass: ThrottlerGuard },
],
```

#### Per-Endpoint Overrides

```typescript
// Auth endpoints: strict limits for brute force protection
@Throttle([{ name: 'default', ttl: 60000, limit: 5 }])
@Post('login')
login() { ... }

@Throttle([{ name: 'default', ttl: 60000, limit: 5 }])
@Post('register')
register() { ... }
```

### Step 4: RED — Write like.integration.spec.ts (2 tests, ALL FAILING)

Write BEFORE creating LikeModule/LikeService:

```typescript
// apps/api/test/like.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Like Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.comment.deleteMany();
    await prisma.like.deleteMany();
    await prisma.blog.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => { await app.close(); });

  async function createUserAndBlog() {
    const passwordHash = await bcrypt.hash('TestPass123!', 12);
    const author = await prisma.user.create({
      data: { email: 'author@test.com', name: 'Author', passwordHash },
    });
    const blog = await prisma.blog.create({
      data: { userId: author.id, title: 'Test Blog', slug: 'test-blog', content: 'Content', isPublished: true },
    });

    // Register a different user to like the blog
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'liker@test.com', password: 'TestPass123!' });
    const token = registerRes.body.accessToken;

    return { blog, token };
  }

  // TEST 11: Like/unlike cycle updates count
  it('like → count=1, unlike → count=0', async () => {
    const { blog, token } = await createUserAndBlog();

    // Like
    const likeRes = await request(app.getHttpServer())
      .post(`/blogs/${blog.id}/like`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(likeRes.body.likeCount).toBe(1);

    // Unlike
    const unlikeRes = await request(app.getHttpServer())
      .delete(`/blogs/${blog.id}/like`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(unlikeRes.body.likeCount).toBe(0);
  });

  // TEST 12: Duplicate like returns 409
  it('duplicate like returns 409', async () => {
    const { blog, token } = await createUserAndBlog();

    await request(app.getHttpServer())
      .post(`/blogs/${blog.id}/like`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/blogs/${blog.id}/like`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
  });
});
```

**Run: `pnpm --filter api test like.integration` → 2 FAILURES. This is RED.**

### Step 5: GREEN — Implement Like Module

#### Like Service

```typescript
async like(blogId: string, userId: string) {
  const blog = await this.prisma.blog.findUnique({
    where: { id: blogId },
    select: { id: true },
  });
  if (!blog) throw new NotFoundException('Blog not found');

  try {
    await this.prisma.like.create({ data: { userId, blogId } });
  } catch (error) {
    if (error.code === 'P2002') throw new ConflictException('Already liked');
    throw error;
  }

  const likeCount = await this.prisma.like.count({ where: { blogId } });
  return { liked: true, likeCount };
}

async unlike(blogId: string, userId: string) {
  await this.prisma.like.deleteMany({ where: { userId, blogId } });
  const likeCount = await this.prisma.like.count({ where: { blogId } });
  return { liked: false, likeCount };
}
```

#### Like Controller

```typescript
@Controller('blogs/:id/like')
export class LikeController {
  @Post()
  like(@Param('id') blogId: string, @CurrentUser() user) {
    return this.likeService.like(blogId, user.id);
  }

  @Delete()
  unlike(@Param('id') blogId: string, @CurrentUser() user) {
    return this.likeService.unlike(blogId, user.id);
  }
}
```

**Run: `pnpm --filter api test like.integration` → 2 PASSES. This is GREEN.**

### Step 6: Comment Module (no TDD — covered by E2E)

```typescript
// Comment Service
async create(blogId: string, userId: string, dto: CreateCommentDto) {
  const blog = await this.prisma.blog.findUnique({ where: { id: blogId } });
  if (!blog) throw new NotFoundException('Blog not found');

  return this.prisma.comment.create({
    data: { blogId, userId, content: dto.content },
    select: {
      id: true, content: true, createdAt: true,
      user: { select: { id: true, name: true } },
    },
  });
}

async findByBlog(blogId: string) {
  return this.prisma.comment.findMany({
    where: { blogId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, content: true, createdAt: true,
      user: { select: { id: true, name: true } },
    },
  });
}
```

### Step 7: Frontend Feed (no TDD — tested via E2E)

Build the feed page, BlogCard, LoadMoreButton, blog detail page.

### Step 8: RED — Write LikeButton.test.tsx (2 tests, ALL FAILING)

Write BEFORE creating the LikeButton component:

```tsx
// apps/web/__tests__/components/LikeButton.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LikeButton } from '@/features/blog/components/LikeButton';

// Mock the toggleLike server action
jest.mock('@/features/blog/actions/toggle-like', () => ({
  toggleLike: jest.fn().mockResolvedValue(undefined),
}));

describe('LikeButton', () => {
  // TEST 13: Renders like count
  it('renders the initial like count', () => {
    render(<LikeButton blogId="blog-1" initialLiked={false} initialCount={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  // TEST 14: Optimistically increments count on click
  it('optimistically increments count on click', async () => {
    const user = userEvent.setup();
    render(<LikeButton blogId="blog-1" initialLiked={false} initialCount={5} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('6')).toBeInTheDocument();
  });
});
```

**Run: `pnpm --filter web test LikeButton` → 2 FAILURES (LikeButton doesn't exist). This is RED.**

### Step 9: GREEN — Implement LikeButton

```tsx
'use client';
import { useOptimistic, useTransition } from 'react';
import { toggleLike } from '@/features/blog/actions/toggle-like';

export function LikeButton({ blogId, initialLiked, initialCount }) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    { liked: initialLiked, count: initialCount },
    (state, newLiked: boolean) => ({
      liked: newLiked,
      count: newLiked ? state.count + 1 : state.count - 1,
    })
  );

  function handleClick() {
    startTransition(async () => {
      setOptimistic(!optimistic.liked);
      await toggleLike(blogId, !optimistic.liked);
    });
  }

  return (
    <button onClick={handleClick} disabled={isPending}>
      <Heart fill={optimistic.liked ? 'currentColor' : 'none'} />
      <span>{optimistic.count}</span>
    </button>
  );
}
```

**Run: `pnpm --filter web test LikeButton` → 2 PASSES. This is GREEN.**

### Step 10: Build remaining frontend (toggleLike action, CommentForm, CommentList)

#### toggleLike Server Action

```tsx
'use server';
export async function toggleLike(blogId: string, liked: boolean) {
  const headers = await getAuthHeaders();
  await fetch(createApiUrl(`/blogs/${blogId}/like`), {
    method: liked ? 'POST' : 'DELETE',
    headers,
  });
  revalidateTag('feed');
  revalidateTag(`blog-${blogId}`);
}
```

#### LoadMoreButton (Client Component)

```tsx
'use client';
export function LoadMoreButton({ initialCursor }) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    startTransition(async () => {
      const result = await loadMoreFeed(cursor);
      setItems(prev => [...prev, ...result.items]);
      setCursor(result.nextCursor);
    });
  }

  return (
    <>
      {/* Render additional items */}
      {cursor && <button onClick={handleLoadMore}>{isPending ? 'Loading...' : 'Load More'}</button>}
    </>
  );
}
```

#### CommentForm (useActionState)

```tsx
'use client';
const [state, action, isPending] = useActionState(postComment.bind(null, blogId), null);
// Form with textarea, submit button, error display
// Clears on success, no page reload
```

---

## API Endpoints (Phase 3)

| Method | Path | Auth | Status Codes |
|--------|------|------|-------------|
| GET | /public/feed?cursor=&take= | Public | 200 |
| POST | /blogs/:id/like | JWT | 201, 401, 404, 409 |
| DELETE | /blogs/:id/like | JWT | 200, 401, 404 |
| POST | /blogs/:id/comments | JWT | 201, 400, 401, 404 |
| GET | /blogs/:id/comments | Public | 200, 404 |

## Test Checkpoint

At the end of Phase 3, you must have:
- **Phase 2 tests**: 8 (4 auth unit + 3 blog unit + 1 auth integration)
- **Phase 3 tests**: 6 (2 feed integration + 2 like integration + 2 LikeButton component)
- **Running total: 14 tests, ALL passing**

Run: `pnpm --filter api test` → 12 green, `pnpm --filter web test` → 2 green

## Acceptance Criteria

- [ ] **feed.integration.spec.ts written BEFORE FeedModule** — 2 tests drive the implementation
- [ ] **like.integration.spec.ts written BEFORE LikeModule** — 2 tests drive the implementation
- [ ] **LikeButton.test.tsx written BEFORE LikeButton component** — 2 tests drive the implementation
- [ ] All 14 cumulative tests pass
- [ ] GET /public/feed returns paginated published blogs with author info, like count, comment count
- [ ] Cursor pagination works: first page (no cursor), subsequent pages (pass nextCursor), hasNextPage flag
- [ ] No N+1 queries (Prisma _count aggregation in single query)
- [ ] /feed page renders BlogCard list with "Load More" button
- [ ] /feed shows loading skeleton while fetching, empty state when no blogs
- [ ] Authenticated user can like a blog → count updates optimistically (instant UI)
- [ ] Double-like returns 409 (DB constraint prevents duplicate)
- [ ] User can unlike → count decreases
- [ ] Authenticated user can post comment → appears without page reload
- [ ] Comments sorted newest first with author name and date
- [ ] Rate limiting returns 429 when threshold exceeded
- [ ] Git: commit after feed TDD, commit after likes+comments TDD

## Exit Gate

The full user journey works: register → login → create blog → publish → see in feed → like → comment → view on public URL. Rate limiting is active. Social features feel responsive with optimistic UI. **All 14 tests green.**

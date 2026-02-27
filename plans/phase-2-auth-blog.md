# Phase 2: Authentication & Blog CRUD (2.5 hours) — TDD

## Objective

Implement the complete auth system (register, login, JWT, guards), blog CRUD with ownership enforcement, and the frontend auth flow with httpOnly cookie proxy pattern. **Every backend feature starts with a failing test (Red-Green-Refactor).**

## TDD Workflow

Each backend feature follows Red-Green-Refactor:
1. **RED**: Write the test file with all test cases → run → all fail
2. **GREEN**: Implement the minimum code to make each test pass, one by one
3. **REFACTOR**: Clean up while keeping tests green

## Time Breakdown

| Task | Minutes |
|------|---------|
| **Auth Module — TDD Cycle** | |
| PrismaModule (global) + PrismaService (prerequisite, no test needed) | 10 |
| **RED: Write auth.service.spec.ts** (4 failing tests) | **10** |
| GREEN: AuthModule register (bcrypt 12 rounds, DTO validation) → tests 1-2 pass | 15 |
| GREEN: AuthModule login (JWT sign, generic error message) → tests 3-4 pass | 15 |
| REFACTOR: Clean up auth module | 5 |
| JwtStrategy + Global JwtAuthGuard + @Public() decorator | 15 |
| GET /auth/me endpoint | 5 |
| Global ValidationPipe + AllExceptionsFilter + PrismaExceptionFilter | 15 |
| helmet() + CORS config | 5 |
| **RED: Write auth.integration.spec.ts** (1 failing test) | **5** |
| GREEN: Verify register → login → protected route → all pass | 5 |
| **Blog Module — TDD Cycle** | |
| **RED: Write blog.service.spec.ts** (3 failing tests) | **8** |
| GREEN: POST /blogs (create, slug generation) → test 5 passes | 15 |
| GREEN: PATCH /blogs/:id (update with BlogOwnerGuard) → test 6 passes | 10 |
| GREEN: DELETE /blogs/:id (delete with BlogOwnerGuard) → test 7 passes | 10 |
| REFACTOR: Clean up blog module | 5 |
| GET /blogs (list own blogs for dashboard) | 5 |
| GET /public/blogs/:slug (published only, 404 for unpublished) | 10 |
| **Frontend** (no unit tests — tested via E2E in Phase 4) | |
| Server Action proxy: login.ts (POST → set httpOnly cookie → redirect) | 15 |
| Server Action proxy: register.ts | 10 |
| Server Action: logout.ts (delete cookie → redirect) | 5 |
| Server Action: get-current-user.ts (GET /auth/me) | 5 |
| lib/auth.ts (getToken, getAuthHeaders helpers) | 5 |
| lib/api.ts (createApiUrl helper with API_URL) | 5 |
| middleware.ts (redirect /dashboard/* to /login if no cookie) | 10 |
| LoginForm component (use client, useActionState) | 10 |
| RegisterForm component | 10 |
| Header component (Server Component, calls getCurrentUser) | 10 |
| **Frontend Dashboard** | |
| Dashboard layout (protected route group) | 5 |
| Blog list page (Server Component, fetches own blogs) | 10 |
| BlogEditor component (create/edit form, useActionState) | 15 |
| DeleteBlogButton component (confirmation dialog) | 10 |
| Create/edit/delete Server Actions | 10 |

---

## TDD Step-by-Step

### Step 1: PrismaModule (prerequisite — no test)

```typescript
// prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() { await this.$connect(); }
}

// prisma/prisma.module.ts
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### Step 2: RED — Write auth.service.spec.ts (4 tests, ALL FAILING)

Write this file BEFORE creating AuthService or AuthModule:

```typescript
// apps/api/src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { create: jest.Mock; findUnique: jest.Mock } };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    jwtService = { sign: jest.fn().mockReturnValue('mock-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // TEST 1: register hashes password and returns access token
  it('register should hash password with 12 rounds and return accessToken', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    prisma.user.create.mockResolvedValue({
      id: 'user-1', email: 'test@test.com', name: null, createdAt: new Date(),
    });

    const result = await service.register({
      email: 'test@test.com', password: 'TestPass123!',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('TestPass123!', 12);
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'user-1', email: 'test@test.com' }),
    );
    expect(result).toHaveProperty('accessToken', 'mock-token');
  });

  // TEST 2: register throws 409 on duplicate email
  it('register should throw ConflictException on duplicate email', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    prisma.user.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.register({ email: 'dup@test.com', password: 'TestPass123!' }),
    ).rejects.toThrow(ConflictException);
  });

  // TEST 3: login returns access token for valid credentials
  it('login should return accessToken for valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1', email: 'test@test.com', passwordHash: 'hashed',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login({
      email: 'test@test.com', password: 'TestPass123!',
    });

    expect(bcrypt.compare).toHaveBeenCalledWith('TestPass123!', 'hashed');
    expect(result).toHaveProperty('accessToken', 'mock-token');
  });

  // TEST 4: login throws 401 for wrong password
  it('login should throw UnauthorizedException for wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1', email: 'test@test.com', passwordHash: 'hashed',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: 'test@test.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
```

**Run: `pnpm --filter api test auth.service` → 4 FAILURES (AuthService doesn't exist yet). This is RED.**

### Step 3: GREEN — Implement AuthService to pass tests 1-4

Now create the auth module, service, DTOs — just enough to make the 4 tests pass:

```typescript
// Key patterns:
- bcrypt.hash(password, 12) for registration
- bcrypt.compare(password, passwordHash) for login
- Same "Invalid credentials" message for wrong email AND wrong password
- jwtService.sign({ sub: user.id, email: user.email }, { expiresIn: '24h' })
- select: { id, email, name, createdAt } — NEVER return passwordHash
- ConflictException (409) for duplicate email (catch P2002)
```

**Run: `pnpm --filter api test auth.service` → 4 PASSES. This is GREEN.**

### Step 4: REFACTOR auth module (clean up while tests stay green)

### Step 5: Build JWT infrastructure (guard, strategy, @Public)

```typescript
// strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true },
    });
    if (!user) throw new UnauthorizedException();
    return user; // attached to req.user
  }
}
```

### Global Guard + @Public() Pattern

```typescript
// Every endpoint is protected by default
// Public endpoints use @Public() to opt out
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
]

// Usage:
@Public()
@Get('feed')
getFeed() { ... }
```

### Step 6: Global pipes and filters

```typescript
// Global setup in main.ts:
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
}));

// DTOs use class-validator decorators:
// RegisterDto: @IsEmail(), @IsString() @MinLength(8) password, @IsOptional() name
// LoginDto: @IsEmail(), @IsString() password
// CreateBlogDto: @IsString() @MinLength(1) @MaxLength(200) title, @IsString() content, @IsBoolean() @IsOptional() isPublished
// UpdateBlogDto: extends PartialType(CreateBlogDto)
```

### Error Handling

```typescript
// AllExceptionsFilter: catches everything, returns { statusCode, message, timestamp }
// PrismaExceptionFilter: P2002 → 409, P2025 → 404
// Never expose stack traces or internal details
// Status codes: 400 (validation), 401 (unauth), 403 (forbidden), 404 (not found), 409 (conflict)
```

### Step 7: RED — Write auth.integration.spec.ts (1 test, FAILING)

```typescript
// apps/api/test/auth.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  // TEST 8: register → login → access protected route
  it('register → login → access protected route → 401 without token', async () => {
    const email = `test-${Date.now()}@test.com`;
    const password = 'TestPass123!';

    // Register
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);
    expect(registerRes.body).toHaveProperty('accessToken');

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    expect(loginRes.body).toHaveProperty('accessToken');

    // Access protected route with token
    await request(app.getHttpServer())
      .get('/blogs')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(200);

    // Access protected route without token → 401
    await request(app.getHttpServer())
      .get('/blogs')
      .expect(401);
  });
});
```

**Run: Should pass since auth backend is already implemented. If it doesn't, fix until GREEN.**

### Step 8: RED — Write blog.service.spec.ts (3 tests, ALL FAILING)

Write BEFORE creating BlogService:

```typescript
// apps/api/src/blog/blog.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BlogService } from './blog.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

describe('BlogService', () => {
  let service: BlogService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      blog: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BlogService>(BlogService);
  });

  // TEST 5: create generates correct slug from title
  it('create should generate slug from title', async () => {
    prisma.blog.create.mockResolvedValue({
      id: 'blog-1', title: 'My First Blog', slug: 'my-first-blog',
    });

    const result = await service.create(
      { title: 'My First Blog', content: 'Content here' },
      'user-1',
    );

    expect(prisma.blog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'my-first-blog' }),
      }),
    );
  });

  // TEST 6: update throws 403 when non-owner updates
  it('update should throw ForbiddenException when non-owner updates', async () => {
    prisma.blog.findUnique.mockResolvedValue({ id: 'blog-1', userId: 'owner-1' });

    await expect(
      service.update('blog-1', { title: 'New Title' }, 'not-owner'),
    ).rejects.toThrow(ForbiddenException);
  });

  // TEST 7: delete throws 403 when non-owner deletes
  it('delete should throw ForbiddenException when non-owner deletes', async () => {
    prisma.blog.findUnique.mockResolvedValue({ id: 'blog-1', userId: 'owner-1' });

    await expect(
      service.delete('blog-1', 'not-owner'),
    ).rejects.toThrow(ForbiddenException);
  });
});
```

**Run: `pnpm --filter api test blog.service` → 3 FAILURES (BlogService doesn't exist yet). This is RED.**

### Step 9: GREEN — Implement BlogService to pass tests 5-7

```typescript
// Key patterns:
// Slug generation:
const baseSlug = slugify(dto.title, { lower: true, strict: true });
try {
  return await prisma.blog.create({ data: { ...dto, slug: baseSlug, userId } });
} catch (e) {
  if (e.code === 'P2002' && e.meta?.target?.includes('slug')) {
    return await prisma.blog.create({ data: { ...dto, slug: `${baseSlug}-${nanoid(6)}`, userId } });
  }
  throw e;
}

// Ownership check:
const blog = await this.prisma.blog.findUnique({ where: { id }, select: { userId: true } });
if (!blog) throw new NotFoundException('Blog not found');
if (blog.userId !== requestUserId) throw new ForbiddenException('Not the blog owner');
```

**Run: `pnpm --filter api test blog.service` → 3 PASSES. This is GREEN.**

### Step 10: REFACTOR blog module + implement remaining endpoints

- GET /blogs (list own blogs) — no separate test, covered by integration
- GET /public/blogs/:slug — no separate test, covered by feed integration in Phase 3

### Blog Owner Guard

```typescript
@Injectable()
export class BlogOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const blog = await this.prisma.blog.findUnique({
      where: { id: req.params.id },
      select: { userId: true },
    });
    if (!blog) throw new NotFoundException('Blog not found');
    if (blog.userId !== req.user.id) throw new ForbiddenException('Not the blog owner');
    return true;
  }
}
```

### Step 11: Frontend Auth (no TDD — tested via E2E)

Frontend Server Actions and components don't get unit tests in this phase. They're validated through:
- Manual testing during development
- E2E tests in Phase 4

#### BFF Proxy Pattern

```
Browser → Server Action (same origin) → NestJS (server-to-server)
         [reads/sets httpOnly cookie]    [Bearer token in header]
```

**Login Server Action:**
1. Receives form data (email, password)
2. Calls NestJS `POST /auth/login` from server
3. NestJS returns `{ accessToken, user }`
4. Sets httpOnly cookie: `cookies().set('token', accessToken, { httpOnly: true, secure: true, sameSite: 'lax' })`
5. Redirects to `/dashboard`

**Authenticated Server Component data fetching:**
1. `getToken()` reads cookie
2. Passes `Authorization: Bearer <token>` to NestJS
3. NestJS validates, returns data
4. Server Component renders with data

#### Form Pattern (useActionState)

```typescript
// LoginForm.tsx
'use client';
const [state, formAction, isPending] = useActionState(login, null);
// Renders form with formAction, shows state.error, disables during isPending
```

#### Header (Server Component, no AuthContext needed)

```typescript
// Header.tsx — Server Component
const user = await getCurrentUser();
// Renders Login/Register or Dashboard/Logout based on user presence
```

---

## API Endpoints (Phase 2)

| Method | Path | Auth | Status Codes |
|--------|------|------|-------------|
| POST | /auth/register | Public | 201, 400, 409 |
| POST | /auth/login | Public | 200, 400, 401 |
| GET | /auth/me | JWT | 200, 401 |
| POST | /blogs | JWT | 201, 400, 401 |
| GET | /blogs | JWT | 200, 401 |
| PATCH | /blogs/:id | JWT+Owner | 200, 400, 401, 403, 404 |
| DELETE | /blogs/:id | JWT+Owner | 204, 401, 403, 404 |
| GET | /public/blogs/:slug | Public | 200, 404 |

## Test Checkpoint

At the end of Phase 2, you must have:
- **8 tests total** (4 auth unit + 3 blog unit + 1 auth integration)
- **All passing** (`pnpm --filter api test` → 8/8 green)

## Acceptance Criteria

- [ ] **auth.service.spec.ts written BEFORE AuthService** — 4 tests drive the implementation
- [ ] **blog.service.spec.ts written BEFORE BlogService** — 3 tests drive the implementation
- [ ] **auth.integration.spec.ts passes** — full register → login → protected route flow
- [ ] All 8 tests pass: `pnpm --filter api test`
- [ ] User can register with email/password → receives token in httpOnly cookie
- [ ] User can login → token set in httpOnly cookie via Server Action
- [ ] Invalid credentials return 401 with generic "Invalid credentials" (no email enumeration)
- [ ] Duplicate email returns 409
- [ ] Protected routes redirect unauthenticated users to /login
- [ ] User can create blog → slug auto-generated → appears in dashboard
- [ ] User can edit own blog (title, content, isPublished)
- [ ] User cannot edit/delete another user's blog → 403
- [ ] GET /public/blogs/:slug returns published blog with author info
- [ ] GET /public/blogs/:slug for unpublished blog → 404
- [ ] All DTOs validated (empty title rejected, short password rejected, etc.)
- [ ] Global exception filter returns consistent error format
- [ ] Git: commit after auth TDD complete, commit after blog TDD complete

## Exit Gate

Full auth flow works end-to-end through the browser. Blog CRUD works through the dashboard. Public blog view works by slug. **All 8 tests are green.** The app is usable for basic blogging.

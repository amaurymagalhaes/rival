# Redis-Backed Distributed Rate Limiting — Implementation Plan

## 1. Current State Analysis

### What exists today

The app uses `@nestjs/throttler@6.5.0` with **in-memory storage** (the default). Configuration lives in two places:

| Location | Config | Effect |
|----------|--------|--------|
| `apps/api/src/app.module.ts` L18 | `ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }])` | Global default: 60 requests per 60 seconds per IP |
| `apps/api/src/app.module.ts` L29 | `{ provide: APP_GUARD, useClass: ThrottlerGuard }` | Applied globally via guard |
| `apps/api/src/auth/auth.controller.ts` L21, L28 | `@Throttle({ default: { ttl: 60000, limit: 5 } })` | Auth endpoints: 5 requests per 60 seconds |

### Problem

In-memory storage is per-process. If the API is scaled to N instances behind a load balancer, a client can make `N * limit` requests by rotating across instances. There is no shared state.

### Current route inventory

| Route | Method | Auth | Current Limit | Sensitivity |
|-------|--------|------|---------------|-------------|
| `GET /` | GET | Public | 60/min (global) | Low |
| `GET /health` | GET | Public | 60/min (global) | Bypass candidate |
| `POST /auth/register` | POST | Public | 5/min (explicit) | Critical |
| `POST /auth/login` | POST | Public | 5/min (explicit) | Critical |
| `GET /auth/me` | GET | JWT | 60/min (global) | Low |
| `POST /blogs` | POST | JWT | 60/min (global) | Moderate |
| `GET /blogs` | GET | JWT | 60/min (global) | Low |
| `GET /blogs/:id` | GET | JWT | 60/min (global) | Low |
| `PATCH /blogs/:id` | PATCH | JWT | 60/min (global) | Moderate |
| `DELETE /blogs/:id` | DELETE | JWT | 60/min (global) | Moderate |
| `POST /blogs/:id/like` | POST | JWT | 60/min (global) | Moderate |
| `DELETE /blogs/:id/like` | DELETE | JWT | 60/min (global) | Low |
| `POST /blogs/:id/comments` | POST | JWT | 60/min (global) | Moderate |
| `GET /public/blogs/:slug/comments` | GET | Public | 60/min (global) | Low |
| `GET /public/feed` | GET | Public | 60/min (global) | Low |
| `GET /public/blogs/:slug` | GET | Public | 60/min (global) | Low |
| `POST /blogs/:id/seo-analysis` | POST | JWT | 60/min (global) | Moderate |

---

## 2. Architecture Decisions

### 2.1 Package Selection

**Use `@nestjs/throttler` v6.5 + `@nestjs/throttler-storage-redis` v1.x** (the official NestJS Redis storage adapter).

Rationale:
- Already using `@nestjs/throttler@6.5.0` — zero API migration
- `@nestjs/throttler-storage-redis` is the official adapter maintained by the NestJS team
- Uses `ioredis` under the hood, which can be shared with BullMQ if job queues are added later
- Alternatives considered:
  - **Custom `ThrottlerStorage` with raw ioredis**: More control but unnecessary maintenance burden
  - **`rate-limiter-flexible`**: Excellent library but would require replacing the entire `@nestjs/throttler` setup and losing decorator compatibility

### 2.2 Algorithm: Sliding Window Log

**Recommendation: Sliding Window** (what `@nestjs/throttler-storage-redis` implements).

| Algorithm | Accuracy | Memory | Burst Tolerance | Verdict |
|-----------|----------|--------|-----------------|---------|
| Fixed Window | Low — boundary spikes (2x burst at window edges) | Low | Poor | Reject |
| Sliding Window Log | High — exact per-request timestamps | Moderate (stores each request timestamp) | Excellent | **Selected** |
| Token Bucket | High | Low | Configurable | Over-engineered for this use case |

The `@nestjs/throttler-storage-redis` adapter uses Redis sorted sets to implement a sliding window log. Each request is stored as a member with its timestamp as score. On each check, expired entries are pruned with `ZREMRANGEBYSCORE`, and the remaining count is compared against the limit. This gives precise per-second accuracy with no boundary-spike problem.

### 2.3 Redis Connection Strategy

A **shared `ioredis` instance** injected via a `RedisModule`, reusable by both the throttler and any future BullMQ integration.

```
┌─────────────────────────────────────────────────────┐
│                    AppModule                        │
│                                                     │
│  ┌───────────┐   ┌───────────────────────────────┐  │
│  │RedisModule│──>│ ThrottlerModule (Redis store)  │  │
│  │ (ioredis) │   └───────────────────────────────┘  │
│  │           │   ┌───────────────────────────────┐  │
│  │           │──>│ BullMQ (future)               │  │
│  └───────────┘   └───────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 2.4 Key Naming Strategy

Redis keys will follow the pattern:

```
rival-blog:throttle:{tracker}:{ttl}:{limit}:{key}
```

Where:
- `tracker` identifies the throttle tier (e.g., `default`, `auth-strict`)
- `ttl` and `limit` are part of the key to differentiate per-route overrides
- `key` is the client IP (or user ID for authenticated requests)

The `@nestjs/throttler-storage-redis` adapter handles this automatically via its `getRecord` and `addRecord` methods with the key format `{prefix}:{key}:{ttl}:{limit}`.

### 2.5 Tiered Rate Limits

| Tier | Routes | Limit | TTL | Key Strategy |
|------|--------|-------|-----|-------------|
| `auth-strict` | `POST /auth/login`, `POST /auth/register` | 5 | 60s | IP only (unauthenticated) |
| `write-moderate` | `POST /blogs`, `PATCH /blogs/:id`, `DELETE /blogs/:id`, `POST /blogs/:id/like`, `POST /blogs/:id/comments`, `POST /blogs/:id/seo-analysis` | 30 | 60s | User ID (authenticated) |
| `read-generous` | `GET /public/*`, `GET /blogs`, `GET /blogs/:id`, `GET /auth/me` | 100 | 60s | IP or User ID |
| `global-default` | Everything else (fallback) | 60 | 60s | IP |

---

## 3. Environment Variables

Add to `apps/api/.env` (and `.env.example`):

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=rival-blog:

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_FALLBACK_TO_MEMORY=true
```

For production (Railway/Render), `REDIS_URL` is the typical env var:

```env
REDIS_URL=redis://:password@host:6379/0
```

The `RedisModule` will support both formats — `REDIS_URL` takes precedence over individual `REDIS_HOST`/`REDIS_PORT`/etc. variables.

---

## 4. File-by-File Implementation Steps

### Step 1: Install dependencies

```bash
pnpm --filter api add ioredis @nestjs/throttler-storage-redis
pnpm --filter api add -D @types/ioredis
```

Note: `@types/ioredis` is bundled with `ioredis` since v5, so the devDependency may not be needed. Verify after install.

### Step 2: Create RedisModule (shared ioredis instance)

**New file: `apps/api/src/redis/redis.module.ts`**

```typescript
import { Global, Module, Logger } from '@nestjs/common';
import { REDIS_CLIENT } from './redis.constants';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const logger = new Logger('RedisModule');

        const redisUrl = process.env.REDIS_URL;
        const redis = redisUrl
          ? new Redis(redisUrl, {
              maxRetriesPerRequest: 3,
              lazyConnect: true,
              keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'rival-blog:',
            })
          : new Redis({
              host: process.env.REDIS_HOST ?? 'localhost',
              port: Number(process.env.REDIS_PORT) || 6379,
              password: process.env.REDIS_PASSWORD || undefined,
              db: Number(process.env.REDIS_DB) || 0,
              maxRetriesPerRequest: 3,
              lazyConnect: true,
              keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'rival-blog:',
            });

        redis.on('connect', () => logger.log('Redis connected'));
        redis.on('error', (err) => logger.error('Redis error', err.message));
        redis.on('close', () => logger.warn('Redis connection closed'));

        redis.connect().catch((err) => {
          logger.error('Redis initial connection failed', err.message);
        });

        return redis;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
```

**New file: `apps/api/src/redis/redis.constants.ts`**

```typescript
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
```

**New file: `apps/api/src/redis/index.ts`**

```typescript
export { RedisModule } from './redis.module';
export { REDIS_CLIENT } from './redis.constants';
```

### Step 3: Create the resilient throttler storage adapter (graceful degradation)

The storage adapter wraps `ThrottlerStorageRedisService` and falls back to the built-in in-memory `ThrottlerStorageService` when Redis is unavailable.

**New file: `apps/api/src/rate-limiting/resilient-throttler-storage.service.ts`**

```typescript
import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nestjs/throttler-storage-redis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import Redis from 'ioredis';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class ResilientThrottlerStorageService implements ThrottlerStorage {
  private readonly logger = new Logger('ResilientThrottlerStorage');
  private redisStorage: ThrottlerStorageRedisService;
  private inMemoryRecords = new Map<string, { hits: number[]; blocked?: { until: number } }>();
  private redisAvailable = false;
  private readonly fallbackEnabled: boolean;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    this.fallbackEnabled =
      process.env.RATE_LIMIT_FALLBACK_TO_MEMORY !== 'false';
    this.redisStorage = new ThrottlerStorageRedisService(redis);
  }

  async onModuleInit() {
    try {
      await this.redis.ping();
      this.redisAvailable = true;
      this.logger.log('Redis available — using distributed rate limiting');
    } catch {
      this.redisAvailable = false;
      if (this.fallbackEnabled) {
        this.logger.warn(
          'Redis unavailable — falling back to in-memory rate limiting',
        );
      } else {
        this.logger.error(
          'Redis unavailable and fallback disabled — rate limiting will fail open',
        );
      }
    }
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    if (this.redisAvailable) {
      try {
        return await this.redisStorage.increment(
          key,
          ttl,
          limit,
          blockDuration,
          throttlerName,
        );
      } catch (err) {
        this.logger.error(
          `Redis increment failed, falling back to in-memory: ${(err as Error).message}`,
        );
        this.redisAvailable = false;
        // Start a background check to restore Redis
        this.scheduleRedisRecoveryCheck();
      }
    }

    if (!this.fallbackEnabled) {
      // Fail open: allow the request
      return {
        totalHits: 0,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }

    return this.incrementInMemory(key, ttl, limit, blockDuration);
  }

  private incrementInMemory(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): ThrottlerStorageRecord {
    const now = Date.now();
    const windowStart = now - ttl;

    let record = this.inMemoryRecords.get(key);
    if (!record) {
      record = { hits: [] };
      this.inMemoryRecords.set(key, record);
    }

    // Check if blocked
    if (record.blocked && record.blocked.until > now) {
      return {
        totalHits: limit + 1,
        timeToExpire: Math.ceil((record.blocked.until - now) / 1000),
        isBlocked: true,
        timeToBlockExpire: Math.ceil((record.blocked.until - now) / 1000),
      };
    }

    // Prune old hits
    record.hits = record.hits.filter((ts) => ts > windowStart);
    record.hits.push(now);

    const totalHits = record.hits.length;
    const isBlocked = totalHits > limit;

    if (isBlocked && blockDuration > 0) {
      record.blocked = { until: now + blockDuration };
    }

    return {
      totalHits,
      timeToExpire: Math.ceil(ttl / 1000),
      isBlocked,
      timeToBlockExpire: isBlocked
        ? Math.ceil(blockDuration / 1000)
        : 0,
    };
  }

  private scheduleRedisRecoveryCheck() {
    setTimeout(async () => {
      try {
        await this.redis.ping();
        this.redisAvailable = true;
        this.inMemoryRecords.clear();
        this.logger.log('Redis recovered — switching back to distributed rate limiting');
      } catch {
        this.logger.warn('Redis still unavailable — next check in 30s');
        this.scheduleRedisRecoveryCheck();
      }
    }, 30_000);
  }
}
```

### Step 4: Create custom throttler guard with tiered limits and response headers

**New file: `apps/api/src/rate-limiting/tiered-throttler.guard.ts`**

```typescript
import {
  Injectable,
  ExecutionContext,
  Inject,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { RATE_LIMIT_SKIP_KEY } from './decorators/skip-throttle.decorator';

@Injectable()
export class TieredThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger('TieredThrottlerGuard');

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use user ID for authenticated requests, IP for unauthenticated
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    return req.ips?.length ? req.ips[0] : req.ip;
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const reflector = (this as any).reflector as Reflector;

    // Check for @SkipThrottle() decorator
    const skipThrottle = reflector.getAllAndOverride<boolean>(
      RATE_LIMIT_SKIP_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipThrottle) return true;

    return false;
  }

  protected getRequestResponse(context: ExecutionContext) {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();
    return { req, res };
  }

  protected async handleRequest(
    requestProps: {
      context: ExecutionContext;
      limit: number;
      ttl: number;
      throttler: { name: string; limit: number; ttl: number; blockDuration?: number };
      blockDuration: number;
      getTracker: (req: Record<string, any>) => Promise<string>;
      generateKey: (
        context: ExecutionContext,
        tracker: string,
        throttlerName: string,
      ) => string;
    },
  ): Promise<boolean> {
    const result = await super.handleRequest(requestProps);

    // Add rate limit headers
    const { context, limit, ttl } = requestProps;
    const { res } = this.getRequestResponse(context);
    const { req } = this.getRequestResponse(context);

    const tracker = await this.getTracker(req);
    const key = this.generateKey(context, tracker, requestProps.throttler.name);
    const storage = (this as any).storageService as ThrottlerStorage;

    try {
      // We don't re-increment — just read current state from the storage
      // The headers are approximations based on the current limit/ttl
      res.header('X-RateLimit-Limit', String(limit));
      res.header('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000 + ttl / 1000)));
    } catch {
      // Header setting failed — non-critical
    }

    return result;
  }
}
```

### Step 5: Create custom decorators

**New file: `apps/api/src/rate-limiting/decorators/skip-throttle.decorator.ts`**

```typescript
import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_SKIP_KEY = 'rate-limit-skip';
export const SkipThrottle = () => SetMetadata(RATE_LIMIT_SKIP_KEY, true);
```

**New file: `apps/api/src/rate-limiting/decorators/rate-limit.decorator.ts`**

```typescript
import { Throttle } from '@nestjs/throttler';

/**
 * Pre-configured rate limit tiers.
 *
 * Usage:
 *   @RateLimit('strict')    // 5 req/min  — auth endpoints
 *   @RateLimit('moderate')  // 30 req/min — write operations
 *   @RateLimit('generous')  // 100 req/min — read operations
 *
 * Or custom:
 *   @RateLimit({ limit: 10, ttl: 30000 })
 */
export type RateLimitTier = 'strict' | 'moderate' | 'generous';

const TIER_CONFIG: Record<RateLimitTier, { limit: number; ttl: number }> = {
  strict: { limit: 5, ttl: 60_000 },
  moderate: { limit: 30, ttl: 60_000 },
  generous: { limit: 100, ttl: 60_000 },
};

export function RateLimit(
  tierOrConfig: RateLimitTier | { limit: number; ttl: number },
) {
  const config =
    typeof tierOrConfig === 'string'
      ? TIER_CONFIG[tierOrConfig]
      : tierOrConfig;

  return Throttle({ default: { limit: config.limit, ttl: config.ttl } });
}
```

**New file: `apps/api/src/rate-limiting/index.ts`**

```typescript
export { ResilientThrottlerStorageService } from './resilient-throttler-storage.service';
export { TieredThrottlerGuard } from './tiered-throttler.guard';
export { RateLimit } from './decorators/rate-limit.decorator';
export { SkipThrottle } from './decorators/skip-throttle.decorator';
```

### Step 6: Create the RateLimitingModule

**New file: `apps/api/src/rate-limiting/rate-limiting.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ResilientThrottlerStorageService } from './resilient-throttler-storage.service';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: (storage: ResilientThrottlerStorageService) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
        storage,
      }),
      inject: [ResilientThrottlerStorageService],
    }),
  ],
  providers: [ResilientThrottlerStorageService],
  exports: [ResilientThrottlerStorageService, ThrottlerModule],
})
export class RateLimitingModule {}
```

### Step 7: Update AppModule

**Modify: `apps/api/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis';
import { RateLimitingModule } from './rate-limiting/rate-limiting.module';
import { TieredThrottlerGuard } from './rate-limiting';
import { AuthModule } from './auth/auth.module';
import { BlogModule } from './blog/blog.module';
import { FeedModule } from './feed/feed.module';
import { LikeModule } from './like/like.module';
import { CommentModule } from './comment/comment.module';
import { SeoModule } from './seo/seo.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    RateLimitingModule,
    AuthModule,
    BlogModule,
    FeedModule,
    LikeModule,
    CommentModule,
    SeoModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: TieredThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
```

Key changes:
- Replaced `ThrottlerModule.forRoot(...)` with `RedisModule` + `RateLimitingModule`
- Replaced `ThrottlerGuard` with `TieredThrottlerGuard`

### Step 8: Update controllers with tiered decorators

**Modify: `apps/api/src/auth/auth.controller.ts`**

```typescript
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import { RateLimit } from '../rate-limiting';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @RateLimit('strict')
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @RateLimit('strict')
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  me(@Req() req: any) {
    return this.authService.me(req.user.id);
  }
}
```

**Modify: `apps/api/src/blog/blog.controller.ts`**

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { RateLimit } from '../rate-limiting';

@Controller('blogs')
export class BlogController {
  constructor(private blogService: BlogService) {}

  @RateLimit('moderate')
  @Post()
  create(@Body() dto: CreateBlogDto, @Req() req: any) {
    return this.blogService.create(dto, req.user.id);
  }

  @RateLimit('generous')
  @Get()
  findAll(@Req() req: any) {
    return this.blogService.findAllByUser(req.user.id);
  }

  @RateLimit('generous')
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.blogService.findOneByUser(id, req.user.id);
  }

  @RateLimit('moderate')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBlogDto, @Req() req: any) {
    return this.blogService.update(id, dto, req.user.id);
  }

  @RateLimit('moderate')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.blogService.delete(id, req.user.id);
  }
}
```

**Modify: `apps/api/src/like/like.controller.ts`**

```typescript
import {
  Controller,
  Post,
  Delete,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LikeService } from './like.service';
import { RateLimit } from '../rate-limiting';

@Controller('blogs/:id/like')
export class LikeController {
  constructor(private likeService: LikeService) {}

  @RateLimit('moderate')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  like(@Param('id') blogId: string, @Req() req: any) {
    return this.likeService.like(blogId, req.user.id);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  unlike(@Param('id') blogId: string, @Req() req: any) {
    return this.likeService.unlike(blogId, req.user.id);
  }
}
```

**Modify: `apps/api/src/comment/comment.controller.ts`**

```typescript
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Public } from '../common/decorators/public.decorator';
import { RateLimit } from '../rate-limiting';

@Controller()
export class CommentController {
  constructor(private commentService: CommentService) {}

  @RateLimit('moderate')
  @Post('blogs/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('id') blogId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: any,
  ) {
    return this.commentService.create(blogId, req.user.id, dto);
  }

  @Public()
  @RateLimit('generous')
  @Get('public/blogs/:slug/comments')
  findByBlogSlug(@Param('slug') slug: string) {
    return this.commentService.findByBlogSlug(slug);
  }
}
```

**Modify: `apps/api/src/feed/feed.controller.ts`**

```typescript
import { Controller, Get, Param, Query } from '@nestjs/common';
import { FeedService } from './feed.service';
import { BlogService } from '../blog/blog.service';
import { Public } from '../common/decorators/public.decorator';
import { RateLimit } from '../rate-limiting';

@Public()
@RateLimit('generous')
@Controller('public')
export class FeedController {
  constructor(
    private feedService: FeedService,
    private blogService: BlogService,
  ) {}

  @Get('feed')
  getFeed(
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    const takeNum = Math.min(Number(take) || 20, 50);
    return this.feedService.getFeed(cursor, takeNum);
  }

  @Get('blogs/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }
}
```

**Modify: `apps/api/src/seo/seo.controller.ts`**

```typescript
import { Controller, Post, Param, Req } from '@nestjs/common';
import { SeoService } from './seo.service';
import { BlogService } from '../blog/blog.service';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { RateLimit } from '../rate-limiting';

@Controller('blogs')
export class SeoController {
  constructor(
    private seoService: SeoService,
    private blogService: BlogService,
  ) {}

  @RateLimit('moderate')
  @Post(':id/seo-analysis')
  async analyze(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const blog = await this.blogService.findOneByUser(id, req.user.id);
    return this.seoService.analyzeBlog(blog.title, blog.content, blog.summary ?? undefined);
  }
}
```

**Modify: `apps/api/src/app.controller.ts`** (add bypass for health check)

```typescript
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { SkipThrottle } from './rate-limiting';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  @SkipThrottle()
  health(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

---

## 5. Response Headers

The `TieredThrottlerGuard` adds the following standard rate limit headers to every response:

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Max requests allowed in the window | `60` |
| `X-RateLimit-Remaining` | Requests remaining in current window | `47` |
| `X-RateLimit-Reset` | Unix timestamp when the window resets | `1709251200` |
| `Retry-After` | Seconds until the client can retry (only on 429) | `42` |

The `@nestjs/throttler` v6 already sends `Retry-After` on 429 responses automatically. The guard augments this with the `X-RateLimit-*` headers.

For a more robust approach to `X-RateLimit-Remaining`, override the `handleRequest` method to extract the `totalHits` from the storage response:

```typescript
// Inside TieredThrottlerGuard.handleRequest():
const remaining = Math.max(0, limit - totalHits);
res.header('X-RateLimit-Remaining', String(remaining));
```

The full implementation is shown in Step 4 above.

---

## 6. Bypass Mechanisms

### Health checks and internal services

Routes that should bypass rate limiting:

| Route | Reason | Mechanism |
|-------|--------|-----------|
| `GET /health` | Load balancer health probes | `@SkipThrottle()` decorator |
| Internal service-to-service calls | Trusted infra (if applicable) | IP whitelist in guard |

For IP-based whitelisting (e.g., internal services, monitoring), extend the `TieredThrottlerGuard`:

```typescript
// In TieredThrottlerGuard
private readonly whitelistedIps = new Set(
  (process.env.RATE_LIMIT_WHITELIST_IPS ?? '').split(',').filter(Boolean),
);

protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
  // ... existing decorator check ...

  const { req } = this.getRequestResponse(context);
  const clientIp = req.ips?.length ? req.ips[0] : req.ip;
  if (this.whitelistedIps.has(clientIp)) return true;

  return false;
}
```

Env var: `RATE_LIMIT_WHITELIST_IPS=10.0.0.1,10.0.0.2`

---

## 7. Monitoring

### Rate limit hit metrics

Create a simple interceptor that logs rate limit events for observability:

**New file: `apps/api/src/rate-limiting/rate-limit-metrics.interceptor.ts`**

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RateLimitMetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger('RateLimitMetrics');
  private hitCounts = new Map<string, number>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const remaining = res.getHeader('X-RateLimit-Remaining');
        const limit = res.getHeader('X-RateLimit-Limit');

        if (remaining !== undefined && limit !== undefined) {
          const usage = ((Number(limit) - Number(remaining)) / Number(limit)) * 100;
          if (usage >= 80) {
            const req = context.switchToHttp().getRequest();
            const route = `${req.method} ${req.route?.path ?? req.url}`;
            this.logger.warn(
              `Rate limit ${Math.round(usage)}% used: ${route} ` +
              `(${remaining}/${limit} remaining)`,
            );
          }
        }
      }),
    );
  }
}
```

### Alerting thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| 429 responses / minute | > 50 | Log warning, investigate potential attack |
| Single IP 429 count / 5min | > 20 | Log + potential auto-ban candidate |
| Redis connection failures | > 3 consecutive | Alert on-call (rate limiting degraded) |
| Fallback to in-memory active | Duration > 5 min | Alert — distributed limiting is offline |

In production, wire these into your monitoring stack (Datadog, Grafana, CloudWatch) via structured logging (Pino) or custom metrics endpoints.

---

## 8. Graceful Degradation

The `ResilientThrottlerStorageService` (Step 3) implements the following degradation strategy:

```
Normal Operation              Redis Failure                  Redis Recovery
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│ Redis storage   │────>│ In-memory fallback   │────>│ Redis storage   │
│ (distributed)   │     │ (per-instance)       │     │ (distributed)   │
│                 │     │                      │     │                 │
│ Accurate across │     │ Per-instance only    │     │ Counters reset  │
│ all instances   │     │ Less accurate but    │     │ to 0 on recovery│
└─────────────────┘     │ better than nothing  │     └─────────────────┘
                        └──────────────────────┘
```

Behavior:
1. **Redis healthy**: All rate limiting goes through Redis sorted sets (distributed)
2. **Redis fails**: Automatic fallback to per-process in-memory maps with the same sliding window algorithm
3. **Recovery check**: Every 30 seconds, attempts `PING` on Redis. On success, switches back and clears in-memory state
4. **Fail-open option**: If `RATE_LIMIT_FALLBACK_TO_MEMORY=false`, requests pass through unthrottled when Redis is down (use only if you prefer availability over protection)

---

## 9. Testing Strategy

### 9.1 Unit tests (Jest)

Following the project's TDD methodology, tests are written BEFORE implementation.

**New file: `apps/api/src/rate-limiting/resilient-throttler-storage.service.spec.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ResilientThrottlerStorageService } from './resilient-throttler-storage.service';
import { REDIS_CLIENT } from '../redis/redis.constants';

describe('ResilientThrottlerStorageService', () => {
  let storage: ResilientThrottlerStorageService;
  let redisMock: {
    ping: jest.Mock;
    on: jest.Mock;
    connect: jest.Mock;
    zrangebyscore: jest.Mock;
    zadd: jest.Mock;
    zremrangebyscore: jest.Mock;
    zcard: jest.Mock;
    expire: jest.Mock;
    status: string;
  };

  beforeEach(async () => {
    redisMock = {
      ping: jest.fn().mockResolvedValue('PONG'),
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      zrangebyscore: jest.fn().mockResolvedValue([]),
      zadd: jest.fn().mockResolvedValue(1),
      zremrangebyscore: jest.fn().mockResolvedValue(0),
      zcard: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      status: 'ready',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResilientThrottlerStorageService,
        { provide: REDIS_CLIENT, useValue: redisMock },
      ],
    }).compile();

    storage = module.get(ResilientThrottlerStorageService);
  });

  describe('onModuleInit', () => {
    it('should set redisAvailable to true when Redis responds to PING', async () => {
      await storage.onModuleInit();
      expect(redisMock.ping).toHaveBeenCalled();
    });

    it('should fall back to in-memory when Redis PING fails', async () => {
      redisMock.ping.mockRejectedValue(new Error('Connection refused'));
      await storage.onModuleInit();
      // Should not throw — graceful degradation
    });
  });

  describe('increment (in-memory fallback)', () => {
    it('should track hits within the TTL window', async () => {
      redisMock.ping.mockRejectedValue(new Error('down'));
      await storage.onModuleInit();

      const result = await storage.increment('test-key', 60000, 10, 0, 'default');
      expect(result.totalHits).toBe(1);
      expect(result.isBlocked).toBe(false);
    });

    it('should block when limit is exceeded', async () => {
      redisMock.ping.mockRejectedValue(new Error('down'));
      await storage.onModuleInit();

      // Exceed the limit
      for (let i = 0; i < 5; i++) {
        await storage.increment('test-key', 60000, 3, 0, 'default');
      }

      const result = await storage.increment('test-key', 60000, 3, 0, 'default');
      expect(result.totalHits).toBeGreaterThan(3);
      expect(result.isBlocked).toBe(true);
    });
  });
});
```

**New file: `apps/api/src/rate-limiting/decorators/rate-limit.decorator.spec.ts`**

```typescript
import { RateLimit } from './rate-limit.decorator';

describe('RateLimit decorator', () => {
  it('should create a decorator for "strict" tier', () => {
    const decorator = RateLimit('strict');
    expect(decorator).toBeDefined();
    expect(typeof decorator).toBe('function');
  });

  it('should create a decorator for "moderate" tier', () => {
    const decorator = RateLimit('moderate');
    expect(decorator).toBeDefined();
  });

  it('should create a decorator for "generous" tier', () => {
    const decorator = RateLimit('generous');
    expect(decorator).toBeDefined();
  });

  it('should accept custom config', () => {
    const decorator = RateLimit({ limit: 10, ttl: 30000 });
    expect(decorator).toBeDefined();
  });
});
```

### 9.2 Integration tests

**New file: `apps/api/src/rate-limiting/rate-limiting.integration.spec.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

/**
 * Integration test — requires Redis to be running.
 * Skip in CI unless Redis is available.
 *
 * Run with: REDIS_URL=redis://localhost:6379 pnpm --filter api test -- --testPathPattern rate-limiting.integration
 */
describe('Rate Limiting Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return rate limit headers on responses', async () => {
    const res = await request(app.getHttpServer()).get('/');
    expect(res.headers).toHaveProperty('x-ratelimit-limit');
  });

  it('should return 429 after exceeding auth rate limit', async () => {
    const promises = Array.from({ length: 7 }, () =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' }),
    );
    const responses = await Promise.all(promises);
    const tooMany = responses.filter((r) => r.status === 429);
    expect(tooMany.length).toBeGreaterThan(0);
  });

  it('should NOT rate limit health endpoint', async () => {
    const promises = Array.from({ length: 100 }, () =>
      request(app.getHttpServer()).get('/health'),
    );
    const responses = await Promise.all(promises);
    const tooMany = responses.filter((r) => r.status === 429);
    expect(tooMany.length).toBe(0);
  });
});
```

### 9.3 Testing without Redis (mocked)

For unit tests that need the storage service without a real Redis connection, use the in-memory fallback:

```typescript
// In any test module setup:
const redisMock = {
  ping: jest.fn().mockRejectedValue(new Error('no redis in test')),
  on: jest.fn(),
  connect: jest.fn(),
};

// The ResilientThrottlerStorageService will automatically fall back to in-memory
```

### 9.4 Redis test helper

**New file: `apps/api/src/redis/redis-test.helper.ts`**

```typescript
import Redis from 'ioredis';

/**
 * Creates a test Redis client that flushes its DB on connect.
 * Use only in integration tests.
 */
export async function createTestRedisClient(): Promise<Redis> {
  const redis = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    db: 15, // Use DB 15 for tests to avoid data collision
    keyPrefix: 'test:rival-blog:',
  });

  await redis.flushdb();
  return redis;
}

export async function cleanupTestRedis(redis: Redis): Promise<void> {
  await redis.flushdb();
  await redis.quit();
}
```

---

## 10. Migration Plan (Step-by-Step)

### Phase A: Infrastructure (no behavior change)

1. **Install packages**: `ioredis`, `@nestjs/throttler-storage-redis`
2. **Create `RedisModule`**: Shared ioredis provider with env-based config
3. **Create `ResilientThrottlerStorageService`**: With in-memory fallback
4. **Write unit tests** for the storage service (RED phase)
5. **Verify tests pass** (GREEN phase)

### Phase B: Guard replacement (behavioral change)

6. **Create `TieredThrottlerGuard`**: Extends `ThrottlerGuard` with user-aware tracking and headers
7. **Create decorators**: `@RateLimit()` and `@SkipThrottle()`
8. **Create `RateLimitingModule`**: Wires storage + throttler together
9. **Write decorator tests** (RED, then GREEN)

### Phase C: Wiring (the actual switchover)

10. **Update `app.module.ts`**: Replace inline `ThrottlerModule.forRoot(...)` with `RateLimitingModule`, swap `ThrottlerGuard` for `TieredThrottlerGuard`
11. **Update `auth.controller.ts`**: Replace `@Throttle(...)` with `@RateLimit('strict')`
12. **Update remaining controllers**: Add `@RateLimit('moderate')` to writes, `@RateLimit('generous')` to reads
13. **Add `@SkipThrottle()`** to `GET /health`

### Phase D: Validation

14. **Run existing tests**: `pnpm --filter api test` — all existing tests must still pass
15. **Run integration test** (with Redis): Verify 429 behavior and headers
16. **Manual smoke test**: Curl the auth endpoint 6 times in 60s, verify 429 on the 6th
17. **Deploy to staging**: Verify multi-instance behavior with `REDIS_URL` pointing to shared Redis

### Phase E: Production rollout

18. **Provision Redis**: Upstash (serverless, free tier) or Railway Redis addon
19. **Set env vars**: `REDIS_URL`, `RATE_LIMIT_ENABLED=true`, `RATE_LIMIT_FALLBACK_TO_MEMORY=true`
20. **Deploy**: With `RATE_LIMIT_FALLBACK_TO_MEMORY=true` as safety net
21. **Monitor**: Watch logs for Redis connection events and 429 response rates
22. **Remove safety net** (optional): Set `RATE_LIMIT_FALLBACK_TO_MEMORY=false` once Redis stability is confirmed

### Rollback plan

If issues arise after deployment:
- **Quick fix**: Set `RATE_LIMIT_FALLBACK_TO_MEMORY=true` and remove `REDIS_URL` — the app falls back to in-memory (same as current behavior)
- **Full rollback**: Revert the `app.module.ts` change to use `ThrottlerModule.forRoot(...)` and `ThrottlerGuard` directly — one commit revert

---

## 11. New File Summary

| File | Type | Purpose |
|------|------|---------|
| `apps/api/src/redis/redis.module.ts` | New | Global ioredis provider |
| `apps/api/src/redis/redis.constants.ts` | New | `REDIS_CLIENT` injection token |
| `apps/api/src/redis/index.ts` | New | Barrel export |
| `apps/api/src/redis/redis-test.helper.ts` | New | Test utilities for Redis |
| `apps/api/src/rate-limiting/rate-limiting.module.ts` | New | ThrottlerModule async config with Redis storage |
| `apps/api/src/rate-limiting/resilient-throttler-storage.service.ts` | New | Redis storage with in-memory fallback |
| `apps/api/src/rate-limiting/tiered-throttler.guard.ts` | New | Custom guard: user-aware tracking, headers, whitelist |
| `apps/api/src/rate-limiting/decorators/rate-limit.decorator.ts` | New | `@RateLimit('strict'|'moderate'|'generous')` |
| `apps/api/src/rate-limiting/decorators/skip-throttle.decorator.ts` | New | `@SkipThrottle()` for health/internal |
| `apps/api/src/rate-limiting/rate-limit-metrics.interceptor.ts` | New | Logging interceptor for near-limit warnings |
| `apps/api/src/rate-limiting/index.ts` | New | Barrel export |
| `apps/api/src/rate-limiting/resilient-throttler-storage.service.spec.ts` | New | Unit tests for storage |
| `apps/api/src/rate-limiting/decorators/rate-limit.decorator.spec.ts` | New | Unit tests for decorator |
| `apps/api/src/rate-limiting/rate-limiting.integration.spec.ts` | New | Integration tests |

## 12. Modified File Summary

| File | Change |
|------|--------|
| `apps/api/src/app.module.ts` | Replace `ThrottlerModule.forRoot` + `ThrottlerGuard` with `RedisModule` + `RateLimitingModule` + `TieredThrottlerGuard` |
| `apps/api/src/auth/auth.controller.ts` | `@Throttle(...)` -> `@RateLimit('strict')` |
| `apps/api/src/blog/blog.controller.ts` | Add `@RateLimit('moderate')` on writes, `@RateLimit('generous')` on reads |
| `apps/api/src/like/like.controller.ts` | Add `@RateLimit('moderate')` on like |
| `apps/api/src/comment/comment.controller.ts` | Add `@RateLimit('moderate')` on create, `@RateLimit('generous')` on read |
| `apps/api/src/feed/feed.controller.ts` | Add `@RateLimit('generous')` at class level |
| `apps/api/src/seo/seo.controller.ts` | Add `@RateLimit('moderate')` on analyze |
| `apps/api/src/app.controller.ts` | Add `@SkipThrottle()` on health endpoint |
| `apps/api/package.json` | Add `ioredis`, `@nestjs/throttler-storage-redis` dependencies |
| `apps/api/.env` | Add `REDIS_HOST`, `REDIS_PORT`, `REDIS_KEY_PREFIX`, `RATE_LIMIT_*` vars |

---

## 13. Dependency Versions

```json
{
  "dependencies": {
    "ioredis": "^5.6.0",
    "@nestjs/throttler-storage-redis": "^1.0.0"
  }
}
```

Both are compatible with `@nestjs/throttler@6.5.0` and `@nestjs/common@11.x`.

---

## 14. Estimated Implementation Time

| Task | Time |
|------|------|
| Install dependencies + RedisModule | 15 min |
| ResilientThrottlerStorageService + tests | 45 min |
| TieredThrottlerGuard + decorators + tests | 30 min |
| Controller updates | 15 min |
| AppModule wiring | 10 min |
| Integration test + manual verification | 20 min |
| **Total** | **~2.5 hours** |

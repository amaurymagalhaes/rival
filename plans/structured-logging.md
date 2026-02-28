# Structured Logging with Pino -- Implementation Plan

## Status: Draft
## Target: `apps/api/`

---

## 1. Current State Analysis

The API currently has **zero logging infrastructure**:

- `apps/api/src/main.ts` calls `NestFactory.create(AppModule)` with no logger option -- uses NestJS's default `ConsoleLogger`.
- No `console.log`, `console.warn`, or `console.error` calls anywhere in the source code.
- No middleware, interceptors, or exception filters exist (`*.middleware.ts`, `*.interceptor.ts`, `*.filter.ts` all absent).
- No existing logging dependency in `apps/api/package.json`.

This makes the integration clean -- there is nothing to migrate away from, only new infrastructure to add.

### Modules and Services in Scope

| Module | Controller | Service | Notes |
|--------|-----------|---------|-------|
| `AppModule` | `AppController` | `AppService` | Health check, root route |
| `AuthModule` | `AuthController` | `AuthService` | Register, login, me -- handles passwords/tokens |
| `BlogModule` | `BlogController` | `BlogService` | CRUD with ownership checks |
| `FeedModule` | `FeedController` | `FeedService` | Public feed with cursor pagination |
| `LikeModule` | `LikeController` | `LikeService` | Like/unlike toggle |
| `CommentModule` | `CommentController` | `CommentService` | Create comment, list by slug |
| `SeoModule` | `SeoController` | `SeoService` | SEO analysis (pure computation) |
| `PrismaModule` | -- | `PrismaService` | Database connection lifecycle |

---

## 2. Package Selection

Install in `apps/api/`:

```bash
cd apps/api
pnpm add nestjs-pino pino pino-http
pnpm add -D pino-pretty
```

| Package | Purpose | Version Range |
|---------|---------|---------------|
| `pino` | Core structured JSON logger | `^9.x` |
| `pino-http` | HTTP request/response auto-logging (used by nestjs-pino internally) | `^10.x` |
| `nestjs-pino` | NestJS integration: `LoggerModule`, `PinoLogger` injectable, replaces default logger | `^4.x` |
| `pino-pretty` | Human-readable dev output (devDependency only) | `^13.x` |

Why these packages:
- `nestjs-pino` wraps `pino-http` and provides `LoggerModule.forRootAsync()`, automatic request context propagation via `AsyncLocalStorage`, and a drop-in replacement for `@nestjs/common Logger`.
- `pino-http` auto-instruments every HTTP request with method, url, status code, response time, and a generated request ID.
- `pino-pretty` is dev-only and loaded dynamically via the `transport` option so it is never bundled in production.

---

## 3. Architecture Overview

```
Request
  |
  v
[pino-http middleware]  <-- auto-logs req/res, assigns reqId, attaches logger to req
  |
  v
[NestJS Guards]         <-- JwtAuthGuard, ThrottlerGuard
  |
  v
[Controller]            <-- inject PinoLogger, log business events
  |
  v
[Service]               <-- inject PinoLogger, log domain operations
  |
  v
[Exception Filter]      <-- log errors with stack traces, error codes, context
  |
  v
[Response]
```

The `pino-http` middleware runs first (before guards) and creates a child logger on `req.log`. `nestjs-pino` uses `AsyncLocalStorage` to make this child logger available anywhere via `PinoLogger` injection -- so every log line within a request automatically carries the `reqId`.

---

## 4. Implementation Steps (File by File)

### Step 0: Install Dependencies (RED prerequisite)

All test files reference `nestjs-pino` and `pino` types, so they need to be installed before tests can even compile.

```bash
cd /home/amaury/rival-assessment/apps/api
pnpm add nestjs-pino pino pino-http
pnpm add -D pino-pretty @types/uuid
```

Note: `nestjs-pino` re-exports `pino-http` types; no separate `@types/pino-http` needed.

---

### Step 1: Logger Configuration Module

**File: `apps/api/src/common/logger/logger.config.ts`** (new)

This centralizes all Pino configuration so it can be reused in tests and overridden per environment.

```typescript
import type { Params } from 'nestjs-pino';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

export const loggerConfig: Params = {
  pinoHttp: {
    // --- Log Level ---
    level: isTest ? 'silent' : isProduction ? 'info' : 'debug',

    // --- Request ID ---
    genReqId: (req, res) => {
      const existingId = req.headers['x-request-id'];
      if (existingId) {
        res.setHeader('x-request-id', existingId);
        return existingId as string;
      }
      // pino-http generates a default reqId (incrementing integer);
      // we override with crypto.randomUUID() for distributed tracing.
      const id = crypto.randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },

    // --- Sensitive Data Redaction ---
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.passwordHash',
        'req.body.token',
        'req.body.accessToken',
        'req.body.refreshToken',
        'res.headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
    },

    // --- Custom Serializers ---
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        query: req.query,
        // Omit headers (already logged by pino-http, redaction handles auth)
        // Omit body (logged selectively by services when needed)
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
      err: (err) => ({
        type: err.constructor?.name || 'Error',
        message: err.message,
        stack: isProduction ? undefined : err.stack,
        code: (err as any).code,
        statusCode: (err as any).statusCode || (err as any).status,
      }),
    },

    // --- Custom Log Properties ---
    customProps: (req: any) => ({
      // Attach userId from JWT (populated by Passport after guard runs)
      userId: req.user?.id,
      context: 'HTTP',
    }),

    // --- Auto-Logging Configuration ---
    autoLogging: {
      // Skip health check noise
      ignore: (req) => req.url === '/health',
    },

    // --- Transport (pretty print in dev) ---
    ...(isProduction
      ? {}
      : {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: false,
              translateTime: 'SYS:HH:MM:ss.l',
              ignore: 'pid,hostname',
            },
          },
        }),
  },
};
```

**Test file: `apps/api/src/common/logger/logger.config.spec.ts`** (new)

```typescript
describe('loggerConfig', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.resetModules();
  });

  it('should set level to silent in test environment', async () => {
    process.env.NODE_ENV = 'test';
    const { loggerConfig } = await import('./logger.config');
    expect((loggerConfig.pinoHttp as any).level).toBe('silent');
  });

  it('should set level to info in production', async () => {
    process.env.NODE_ENV = 'production';
    const { loggerConfig } = await import('./logger.config');
    expect((loggerConfig.pinoHttp as any).level).toBe('info');
  });

  it('should set level to debug in development', async () => {
    process.env.NODE_ENV = 'development';
    const { loggerConfig } = await import('./logger.config');
    expect((loggerConfig.pinoHttp as any).level).toBe('debug');
  });

  it('should include pino-pretty transport in non-production', async () => {
    process.env.NODE_ENV = 'development';
    const { loggerConfig } = await import('./logger.config');
    expect((loggerConfig.pinoHttp as any).transport.target).toBe('pino-pretty');
  });

  it('should NOT include transport in production', async () => {
    process.env.NODE_ENV = 'production';
    const { loggerConfig } = await import('./logger.config');
    expect((loggerConfig.pinoHttp as any).transport).toBeUndefined();
  });

  it('should redact authorization header and password fields', async () => {
    process.env.NODE_ENV = 'development';
    const { loggerConfig } = await import('./logger.config');
    const redactPaths = (loggerConfig.pinoHttp as any).redact.paths;
    expect(redactPaths).toContain('req.headers.authorization');
    expect(redactPaths).toContain('req.body.password');
    expect(redactPaths).toContain('req.body.accessToken');
  });

  it('should generate UUID request IDs', async () => {
    process.env.NODE_ENV = 'development';
    const { loggerConfig } = await import('./logger.config');
    const genReqId = (loggerConfig.pinoHttp as any).genReqId;
    const mockRes = { setHeader: jest.fn() };
    const id = genReqId({ headers: {} }, mockRes);
    // UUID v4 format
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith('x-request-id', id);
  });

  it('should reuse existing X-Request-Id header', async () => {
    process.env.NODE_ENV = 'development';
    const { loggerConfig } = await import('./logger.config');
    const genReqId = (loggerConfig.pinoHttp as any).genReqId;
    const mockRes = { setHeader: jest.fn() };
    const existingId = 'upstream-trace-id-123';
    const id = genReqId({ headers: { 'x-request-id': existingId } }, mockRes);
    expect(id).toBe(existingId);
  });

  it('should skip health check from auto-logging', async () => {
    process.env.NODE_ENV = 'development';
    const { loggerConfig } = await import('./logger.config');
    const ignore = (loggerConfig.pinoHttp as any).autoLogging.ignore;
    expect(ignore({ url: '/health' })).toBe(true);
    expect(ignore({ url: '/auth/login' })).toBe(false);
  });
});
```

---

### Step 2: Register LoggerModule in AppModule

**File: `apps/api/src/app.module.ts`** (modify)

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BlogModule } from './blog/blog.module';
import { FeedModule } from './feed/feed.module';
import { LikeModule } from './like/like.module';
import { CommentModule } from './comment/comment.module';
import { SeoModule } from './seo/seo.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { loggerConfig } from './common/logger/logger.config';

@Module({
  imports: [
    LoggerModule.forRoot(loggerConfig),   // <-- ADD: must be first import
    PrismaModule,
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }]),
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
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
```

**Key change**: `LoggerModule.forRoot(loggerConfig)` is the first import. This ensures the `pino-http` middleware registers before any other middleware. The `LoggerModule` is `@Global()` internally, so `PinoLogger` is injectable everywhere without re-importing.

---

### Step 3: Replace Default NestJS Logger in Bootstrap

**File: `apps/api/src/main.ts`** (modify)

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,  // buffer logs until Pino is ready
  });

  // Replace NestJS default logger with Pino
  app.useLogger(app.get(Logger));

  app.use(helmet());
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
}
bootstrap();
```

**Key changes**:
1. `bufferLogs: true` -- NestJS buffers all bootstrap logs until `app.useLogger()` is called. This means even Nest's own "Nest application successfully started" message goes through Pino.
2. `app.useLogger(app.get(Logger))` -- replaces the global NestJS logger so all internal NestJS logging (module init, route mapping, errors) uses Pino.

---

### Step 4: Global Exception Filter with Structured Error Logging

**File: `apps/api/src/common/filters/http-exception.filter.ts`** (new)

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(AllExceptionsFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const errorBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(typeof errorResponse === 'string'
        ? { message: errorResponse }
        : (errorResponse as object)),
    };

    // Log the error with full context
    if (status >= 500) {
      this.logger.error(
        {
          err: exception,
          statusCode: status,
          method: request.method,
          url: request.url,
          userId: (request as any).user?.id,
        },
        'Unhandled server error',
      );
    } else if (status >= 400) {
      this.logger.warn(
        {
          statusCode: status,
          method: request.method,
          url: request.url,
          errorMessage:
            typeof errorResponse === 'string'
              ? errorResponse
              : (errorResponse as any).message,
        },
        'Client error',
      );
    }

    response.status(status).json(errorBody);
  }
}
```

**Test file: `apps/api/src/common/filters/http-exception.filter.spec.ts`** (new)

```typescript
import { AllExceptionsFilter } from './http-exception.filter';
import {
  HttpException,
  HttpStatus,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockLogger: { error: jest.Mock; warn: jest.Mock };
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockRequest: { url: string; method: string; user?: { id: string } };
  let mockHost: any;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockRequest = {
      url: '/test',
      method: 'GET',
    };
    mockHost = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    };

    filter = new AllExceptionsFilter(mockLogger as any);
  });

  it('should log 5xx errors with logger.error', () => {
    const error = new InternalServerErrorException('DB down');
    filter.catch(error, mockHost);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        err: error,
        statusCode: 500,
        method: 'GET',
        url: '/test',
      }),
      'Unhandled server error',
    );
    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });

  it('should log 4xx errors with logger.warn', () => {
    const error = new NotFoundException('Blog not found');
    filter.catch(error, mockHost);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        method: 'GET',
        url: '/test',
      }),
      'Client error',
    );
    expect(mockResponse.status).toHaveBeenCalledWith(404);
  });

  it('should treat unknown errors as 500', () => {
    const error = new Error('Something unexpected');
    filter.catch(error, mockHost);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
      'Unhandled server error',
    );
    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });

  it('should include userId when available', () => {
    mockRequest.user = { id: 'user-123' };
    const error = new InternalServerErrorException('fail');
    filter.catch(error, mockHost);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-123' }),
      'Unhandled server error',
    );
  });

  it('should include path and timestamp in response body', () => {
    const error = new NotFoundException('Not found');
    filter.catch(error, mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        path: '/test',
        method: 'GET',
        timestamp: expect.any(String),
      }),
    );
  });
});
```

---

### Step 5: Register the Exception Filter Globally

**File: `apps/api/src/main.ts`** (modify -- additional change)

Add the exception filter as a global filter. Since it uses DI (it injects `PinoLogger`), we register it via `APP_FILTER` in `AppModule` rather than `app.useGlobalFilters()`.

**File: `apps/api/src/app.module.ts`** (modify -- add APP_FILTER)

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BlogModule } from './blog/blog.module';
import { FeedModule } from './feed/feed.module';
import { LikeModule } from './like/like.module';
import { CommentModule } from './comment/comment.module';
import { SeoModule } from './seo/seo.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { loggerConfig } from './common/logger/logger.config';

@Module({
  imports: [
    LoggerModule.forRoot(loggerConfig),
    PrismaModule,
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }]),
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
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
```

---

### Step 6: Add Logging to Services

Services that perform significant business operations should log at appropriate levels. Below are the specific additions per service.

#### 6a. AuthService

**File: `apps/api/src/auth/auth.service.ts`** (modify)

```typescript
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
  ) {}

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash: hashedPassword,
          name: dto.name,
        },
        select: { id: true, email: true, name: true, createdAt: true },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        this.logger.warn({ email: dto.email }, 'Registration failed: duplicate email');
        throw new ConflictException('Email already exists');
      }
      throw error;
    }

    this.logger.info({ userId: user.id }, 'User registered');

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return { accessToken, user };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, name: true, passwordHash: true },
    });

    if (!user) {
      this.logger.warn({ email: dto.email }, 'Login failed: user not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      this.logger.warn({ userId: user.id }, 'Login failed: invalid password');
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.info({ userId: user.id }, 'User logged in');

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
```

**Note on security**: The logger never logs passwords or tokens. It logs email only on failure paths (for audit), and userId on success paths. The `redact` configuration in `logger.config.ts` provides a second layer of defense.

#### 6b. BlogService

**File: `apps/api/src/blog/blog.service.ts`** (modify)

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import slugify from 'slugify';
import { nanoid } from 'nanoid';

@Injectable()
export class BlogService {
  constructor(
    private prisma: PrismaService,
    @InjectPinoLogger(BlogService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(dto: CreateBlogDto, userId: string) {
    const baseSlug = slugify(dto.title, { lower: true, strict: true });
    try {
      const blog = await this.prisma.blog.create({
        data: {
          title: dto.title,
          content: dto.content,
          slug: baseSlug,
          isPublished: dto.isPublished ?? false,
          userId,
        },
      });
      this.logger.info({ blogId: blog.id, slug: blog.slug, userId }, 'Blog created');
      return blog;
    } catch (error: any) {
      if (error.code === 'P2002') {
        this.logger.debug({ baseSlug, userId }, 'Slug collision, retrying with suffix');
        const blog = await this.prisma.blog.create({
          data: {
            title: dto.title,
            content: dto.content,
            slug: `${baseSlug}-${nanoid(6)}`,
            isPublished: dto.isPublished ?? false,
            userId,
          },
        });
        this.logger.info({ blogId: blog.id, slug: blog.slug, userId }, 'Blog created (slug retry)');
        return blog;
      }
      throw error;
    }
  }

  async findAllByUser(userId: string) {
    return this.prisma.blog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneByUser(id: string, userId: string) {
    const blog = await this.prisma.blog.findUnique({ where: { id } });
    if (!blog) throw new NotFoundException('Blog not found');
    if (blog.userId !== userId) throw new ForbiddenException('Not the blog owner');
    return blog;
  }

  async findBySlug(slug: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        summary: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    if (!blog || !blog.isPublished) {
      throw new NotFoundException('Blog not found');
    }
    return blog;
  }

  async update(id: string, dto: UpdateBlogDto, userId: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!blog) throw new NotFoundException('Blog not found');
    if (blog.userId !== userId) throw new ForbiddenException('Not the blog owner');

    const updated = await this.prisma.blog.update({
      where: { id },
      data: dto,
    });
    this.logger.info({ blogId: id, userId }, 'Blog updated');
    return updated;
  }

  async delete(id: string, userId: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!blog) throw new NotFoundException('Blog not found');
    if (blog.userId !== userId) throw new ForbiddenException('Not the blog owner');

    const deleted = await this.prisma.blog.delete({ where: { id } });
    this.logger.info({ blogId: id, userId }, 'Blog deleted');
    return deleted;
  }
}
```

#### 6c. LikeService

**File: `apps/api/src/like/like.service.ts`** (modify)

```typescript
import { Injectable, ConflictException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikeService {
  constructor(
    private prisma: PrismaService,
    @InjectPinoLogger(LikeService.name)
    private readonly logger: PinoLogger,
  ) {}

  async like(blogId: string, userId: string) {
    try {
      await this.prisma.like.create({
        data: { blogId, userId },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Already liked');
      }
      throw error;
    }

    const likeCount = await this.prisma.like.count({ where: { blogId } });
    this.logger.debug({ blogId, userId, likeCount }, 'Blog liked');
    return { liked: true, likeCount };
  }

  async unlike(blogId: string, userId: string) {
    try {
      await this.prisma.like.delete({
        where: { userId_blogId: { userId, blogId } },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        // Record not found -- idempotent
      } else {
        throw error;
      }
    }

    const likeCount = await this.prisma.like.count({ where: { blogId } });
    this.logger.debug({ blogId, userId, likeCount }, 'Blog unliked');
    return { liked: false, likeCount };
  }
}
```

#### 6d. PrismaService

**File: `apps/api/src/prisma/prisma.service.ts`** (modify)

Add lifecycle logging so we know when DB connects/disconnects.

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(
    @InjectPinoLogger(PrismaService.name)
    private readonly logger: PinoLogger,
  ) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit() {
    this.logger.info('Connecting to database');
    await this.$connect();
    this.logger.info('Database connected');
  }

  async onModuleDestroy() {
    this.logger.info('Disconnecting from database');
    await this.$disconnect();
    this.logger.info('Database disconnected');
  }
}
```

---

### Step 7: Update Existing Tests

Existing tests that construct services via `Test.createTestingModule` need to provide a mock for `PinoLogger`. Since `nestjs-pino` uses `@InjectPinoLogger(ContextName)` which resolves to a custom injection token, we need to provide mocks using the correct token.

**Create a shared test helper: `apps/api/src/common/logger/logger.test-utils.ts`** (new)

```typescript
import { getLoggerToken } from 'nestjs-pino';

/**
 * Creates a mock PinoLogger provider for testing.
 * Usage: providers: [mockLoggerProvider(MyService.name)]
 */
export function mockLoggerProvider(context: string) {
  return {
    provide: getLoggerToken(context),
    useValue: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      setContext: jest.fn(),
      assign: jest.fn(),
    },
  };
}
```

**Updated test: `apps/api/src/auth/auth.service.spec.ts`** (modify)

Add the mock logger provider to the existing test module:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { mockLoggerProvider } from '../common/logger/logger.test-utils';
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
        mockLoggerProvider(AuthService.name),  // <-- ADD
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ... (all existing tests remain unchanged)
});
```

**Updated test: `apps/api/src/blog/blog.service.spec.ts`** (modify)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { BlogService } from './blog.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { mockLoggerProvider } from '../common/logger/logger.test-utils';

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
        mockLoggerProvider(BlogService.name),  // <-- ADD
      ],
    }).compile();

    service = module.get<BlogService>(BlogService);
  });

  // ... (all existing tests remain unchanged)
});
```

**Updated test: `apps/api/src/like/like.service.spec.ts`** (modify)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { LikeService } from './like.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import { mockLoggerProvider } from '../common/logger/logger.test-utils';

describe('LikeService', () => {
  let service: LikeService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      like: {
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LikeService,
        { provide: PrismaService, useValue: prisma },
        mockLoggerProvider(LikeService.name),  // <-- ADD
      ],
    }).compile();

    service = module.get<LikeService>(LikeService);
  });

  // ... (all existing tests remain unchanged)
});
```

---

### Step 8: Log-Assertion Tests (Verifying Log Output)

Beyond making existing tests pass, we add targeted tests that verify specific log calls happen at the right level with the right data.

**File: `apps/api/src/auth/auth.service.logging.spec.ts`** (new)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { getLoggerToken } from 'nestjs-pino';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService (logging)', () => {
  let service: AuthService;
  let prisma: any;
  let mockLogger: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('tok') } },
        { provide: getLoggerToken(AuthService.name), useValue: mockLogger },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should log info on successful registration', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    prisma.user.create.mockResolvedValue({
      id: 'u1', email: 'a@b.com', name: null, createdAt: new Date(),
    });

    await service.register({ email: 'a@b.com', password: 'Pass1234!' });

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1' }),
      'User registered',
    );
  });

  it('should log warn on duplicate email registration', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    prisma.user.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.register({ email: 'dup@b.com', password: 'Pass1234!' }),
    ).rejects.toThrow();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'dup@b.com' }),
      expect.stringContaining('duplicate email'),
    );
  });

  it('should log warn on failed login (wrong password)', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'a@b.com', passwordHash: 'hashed',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: 'a@b.com', password: 'wrong' }),
    ).rejects.toThrow();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1' }),
      expect.stringContaining('invalid password'),
    );
  });

  it('should log info on successful login', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'a@b.com', name: 'A', passwordHash: 'hashed',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await service.login({ email: 'a@b.com', password: 'correct' });

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1' }),
      'User logged in',
    );
  });

  it('should never log password or token values', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    prisma.user.create.mockResolvedValue({
      id: 'u1', email: 'a@b.com', name: null, createdAt: new Date(),
    });

    await service.register({ email: 'a@b.com', password: 'SuperSecret!' });

    // Check all log calls don't contain the password
    for (const call of mockLogger.info.mock.calls) {
      const logStr = JSON.stringify(call);
      expect(logStr).not.toContain('SuperSecret!');
    }
  });
});
```

---

## 5. Correlation ID Flow (End to End)

The correlation ID (request ID) flows as follows:

1. **Incoming request**: If the client sends `X-Request-Id`, it is reused. Otherwise, `crypto.randomUUID()` generates one.
2. **Response header**: The same ID is set on the response as `X-Request-Id` so the client can correlate logs.
3. **Every log line within the request**: `pino-http` creates a child logger with `reqId` bound. `nestjs-pino` propagates this via `AsyncLocalStorage`, so `PinoLogger` injected in any service automatically includes `reqId` in every log entry.
4. **No manual threading required**: Unlike `cls-hooked` or zone.js approaches, `nestjs-pino` v4 uses Node.js native `AsyncLocalStorage` (no external dependency).

Example log output in production (single JSON line per event):

```json
{
  "level": 30,
  "time": 1709136000000,
  "pid": 1,
  "hostname": "api-pod-abc123",
  "reqId": "550e8400-e29b-41d4-a716-446655440000",
  "context": "AuthService",
  "userId": "clxyz123",
  "msg": "User logged in"
}
```

Example request completion log:

```json
{
  "level": 30,
  "time": 1709136000050,
  "pid": 1,
  "hostname": "api-pod-abc123",
  "reqId": "550e8400-e29b-41d4-a716-446655440000",
  "req": { "id": "550e8400-...", "method": "POST", "url": "/auth/login" },
  "res": { "statusCode": 200 },
  "responseTime": 48,
  "userId": "clxyz123",
  "context": "HTTP",
  "msg": "request completed"
}
```

---

## 6. Log Levels Strategy

| Environment | Default Level | Rationale |
|-------------|---------------|-----------|
| `test` | `silent` | Tests should not produce log output; log assertions use mock logger |
| `development` | `debug` | Full visibility during local development |
| `production` | `info` | Operational visibility without debug noise |

All levels:
- **fatal (60)**: Process is about to crash (uncaught exceptions)
- **error (50)**: 5xx errors, unhandled exceptions, database connection failures
- **warn (40)**: 4xx client errors, rate limiting triggers, duplicate registrations
- **info (30)**: Successful operations: user login, blog created, DB connected
- **debug (20)**: Slug collisions, like/unlike events, cache hits/misses
- **trace (10)**: Not used currently; reserved for request/response body logging in extreme debug scenarios

---

## 7. Sensitive Data Redaction

The `redact` configuration in `logger.config.ts` handles the following paths:

| Path | Why |
|------|-----|
| `req.headers.authorization` | Bearer JWT token |
| `req.headers.cookie` | Session cookies |
| `req.body.password` | Registration and login payloads |
| `req.body.passwordHash` | Should never appear, defense in depth |
| `req.body.token` | Any token field |
| `req.body.accessToken` | JWT access token in response bodies logged accidentally |
| `req.body.refreshToken` | Future refresh token support |
| `res.headers["set-cookie"]` | Cookie values in responses |

Redaction is handled at the Pino serializer level, meaning the data is **never written to the output stream** -- it is replaced with `[REDACTED]` before serialization. This is safer than post-hoc filtering.

**Additionally, the code-level approach**: The `AuthService` intentionally never passes `password` or `accessToken` to the logger. Redaction is a safety net, not the primary defense.

---

## 8. Performance Considerations

### 8.1 Async Logging (Default Pino Behavior)

Pino writes to stdout synchronously by default. This is actually **fast** because:
- Pino does not format logs -- it writes raw JSON, which is ~5x faster than `JSON.stringify` with formatting.
- stdout in Node.js is buffered by the OS kernel pipe.

For this application's scale (blog platform, not high-frequency trading), synchronous stdout is optimal. If needed in the future, Pino supports `pino.destination({ sync: false })` for async writes with a 4KB buffer.

### 8.2 Serialization Cost

- Custom serializers in `logger.config.ts` strip `req` and `res` down to essential fields, avoiding serialization of large objects (headers, body).
- `req.body` is intentionally not logged at the HTTP level -- services log specific fields when needed.

### 8.3 Child Logger Overhead

`pino-http` creates one child logger per request. Child loggers in Pino are extremely cheap -- they share the parent's stream and only add bindings. Benchmarks show ~1 microsecond per child logger creation.

### 8.4 Health Check Suppression

The `autoLogging.ignore` function skips logging for `GET /health` requests. In container orchestration (Kubernetes), health checks fire every 10-30 seconds and would otherwise dominate logs.

---

## 9. Log Transports

### Production (Containers)

No transport configuration. Pino writes JSON to stdout. The container runtime (Docker, ECS, Kubernetes) captures stdout and forwards it to the logging backend (CloudWatch, Datadog, ELK, etc.).

```
NestJS (Pino) → stdout → container runtime → log aggregator
```

### Development (Local)

`pino-pretty` transport is configured via the `transport` option when `NODE_ENV !== 'production'`. Output example:

```
14:32:05.123  INFO (AuthService): User registered
    userId: "clxyz123"
    reqId: "550e8400-e29b-41d4-a716-446655440000"
```

### Optional: File Rotation (Local Dev)

If file logging is needed for local debugging, add a secondary transport:

```typescript
// In logger.config.ts, development block:
transport: {
  targets: [
    {
      target: 'pino-pretty',
      options: { colorize: true, singleLine: false },
      level: 'debug',
    },
    {
      target: 'pino/file',
      options: { destination: './logs/api.log', mkdir: true },
      level: 'debug',
    },
  ],
},
```

This is **not included by default** -- it is documented here for reference. Add `logs/` to `.gitignore` if enabled.

---

## 10. Testing Strategy

### 10.1 Unit Tests: Mock Logger

Every service test provides a mock `PinoLogger` via `mockLoggerProvider()`:

```typescript
// Shared helper at apps/api/src/common/logger/logger.test-utils.ts
import { getLoggerToken } from 'nestjs-pino';

export function mockLoggerProvider(context: string) {
  return {
    provide: getLoggerToken(context),
    useValue: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      setContext: jest.fn(),
      assign: jest.fn(),
    },
  };
}
```

This ensures:
- Tests don't produce log output (no noise in test runner).
- Tests can assert on specific log calls (level, data, message).
- Tests compile and inject correctly with `@InjectPinoLogger()`.

### 10.2 Log Assertion Tests

Dedicated `*.logging.spec.ts` files verify that:
- Correct log level is used (info for success, warn for client errors, error for server errors).
- Correct structured data is attached (userId, blogId, etc.).
- Sensitive data never appears in log calls.

### 10.3 Integration Tests

Integration tests (using `supertest`) can verify:
- `X-Request-Id` header is present in responses.
- The response ID matches the one sent in the request.

**File: `apps/api/src/common/logger/request-id.integration.spec.ts`** (new)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';

describe('Request ID (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return X-Request-Id in response headers', async () => {
    const res = await request(app.getHttpServer()).get('/health');

    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('should echo back client-provided X-Request-Id', async () => {
    const clientId = '12345678-1234-1234-1234-123456789abc';
    const res = await request(app.getHttpServer())
      .get('/health')
      .set('X-Request-Id', clientId);

    expect(res.headers['x-request-id']).toBe(clientId);
  });
});
```

**Note**: This integration test requires a running database. In CI, it should be run with the integration test suite, not the unit test suite. Alternatively, mock PrismaService at the module level.

### 10.4 Silencing Logs in Tests

The `loggerConfig` already sets level to `silent` when `NODE_ENV=test`. This means:
- `pnpm --filter api test` produces no log output.
- Log assertions work through the mock logger, not stdout capture.

---

## 11. Complete File Inventory

### New Files

| File | Type | Purpose |
|------|------|---------|
| `apps/api/src/common/logger/logger.config.ts` | Config | Centralized Pino configuration |
| `apps/api/src/common/logger/logger.config.spec.ts` | Test | Config unit tests |
| `apps/api/src/common/logger/logger.test-utils.ts` | Test Utility | Shared mock logger factory |
| `apps/api/src/common/logger/request-id.integration.spec.ts` | Integration Test | X-Request-Id verification |
| `apps/api/src/common/filters/http-exception.filter.ts` | Filter | Global exception filter with structured logging |
| `apps/api/src/common/filters/http-exception.filter.spec.ts` | Test | Exception filter unit tests |
| `apps/api/src/auth/auth.service.logging.spec.ts` | Test | Auth logging assertion tests |

### Modified Files

| File | Change |
|------|--------|
| `apps/api/package.json` | Add `nestjs-pino`, `pino`, `pino-http`, `pino-pretty` (dev) |
| `apps/api/src/main.ts` | Add `bufferLogs: true`, `app.useLogger(app.get(Logger))` |
| `apps/api/src/app.module.ts` | Import `LoggerModule.forRoot()`, register `AllExceptionsFilter` via `APP_FILTER` |
| `apps/api/src/auth/auth.service.ts` | Inject `PinoLogger`, add info/warn log calls |
| `apps/api/src/blog/blog.service.ts` | Inject `PinoLogger`, add info/debug log calls |
| `apps/api/src/like/like.service.ts` | Inject `PinoLogger`, add debug log calls |
| `apps/api/src/prisma/prisma.service.ts` | Inject `PinoLogger`, add lifecycle log calls |
| `apps/api/src/auth/auth.service.spec.ts` | Add `mockLoggerProvider(AuthService.name)` |
| `apps/api/src/blog/blog.service.spec.ts` | Add `mockLoggerProvider(BlogService.name)` |
| `apps/api/src/like/like.service.spec.ts` | Add `mockLoggerProvider(LikeService.name)` |

### Unchanged Files

These services/controllers do not need logging at this stage -- they have no significant business events beyond what pino-http already captures at the HTTP level:

- `apps/api/src/comment/comment.service.ts` -- Simple CRUD, no complex error handling
- `apps/api/src/feed/feed.service.ts` -- Read-only queries, no side effects
- `apps/api/src/seo/seo.service.ts` -- Pure computation, no IO
- All DTOs, guards, strategies, decorators -- No changes needed

---

## 12. Implementation Order (TDD Sequence)

Following the project's Red-Green-Refactor methodology:

| Step | RED (write failing test) | GREEN (make it pass) | Files |
|------|--------------------------|---------------------|-------|
| 1 | `logger.config.spec.ts` | `logger.config.ts` | Config |
| 2 | `http-exception.filter.spec.ts` | `http-exception.filter.ts` | Exception filter |
| 3 | Update `auth.service.spec.ts` (add mock provider) | Update `auth.service.ts` (inject logger) | Auth |
| 4 | `auth.service.logging.spec.ts` | Already green from step 3 | Auth logging |
| 5 | Update `blog.service.spec.ts` (add mock provider) | Update `blog.service.ts` (inject logger) | Blog |
| 6 | Update `like.service.spec.ts` (add mock provider) | Update `like.service.ts` (inject logger) | Like |
| 7 | -- | Update `prisma.service.ts` (inject logger) | Prisma lifecycle |
| 8 | -- | Update `app.module.ts` (import LoggerModule, APP_FILTER) | Module wiring |
| 9 | -- | Update `main.ts` (bufferLogs, useLogger) | Bootstrap |
| 10 | `request-id.integration.spec.ts` | Already green from steps 8-9 | Integration |

Steps 7-9 have no preceding RED test because they are wiring/configuration changes that are verified by the integration test in step 10 and by the existing test suite continuing to pass.

---

## 13. Verification Checklist

After implementation, verify:

- [ ] `pnpm --filter api test` -- all existing tests pass (no log output in terminal)
- [ ] `pnpm --filter api test -- --testPathPattern logging` -- logging assertion tests pass
- [ ] `NODE_ENV=development pnpm --filter api dev` -- pretty-printed colored logs in terminal
- [ ] `NODE_ENV=production node dist/main.js` -- JSON logs to stdout (one line per event)
- [ ] `curl -v http://localhost:4000/health` -- response includes `X-Request-Id` header
- [ ] `curl -v -H "X-Request-Id: my-trace-id" http://localhost:4000/health` -- echoes `my-trace-id`
- [ ] `POST /auth/login` with wrong password -- warn-level log with userId, no password in log
- [ ] `POST /auth/register` -- info-level log with userId, no password in log
- [ ] `POST /blogs` -- info-level log with blogId and slug
- [ ] Health check requests do not appear in logs
- [ ] 500 errors include stack trace in dev, omit it in production

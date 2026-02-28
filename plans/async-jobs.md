# Async Job Processing — BullMQ + Redis Implementation Plan

## 1. Overview

Add asynchronous job processing to the NestJS blog platform using BullMQ backed by Redis. The primary use case is automatic blog summary generation when a blog is published. The architecture is designed to be extensible for future job types (e.g., SEO analysis, email notifications, image optimization).

### Current State

- **No queue/job infrastructure exists** — confirmed by searching `apps/api/src/` for queue/bull/redis/job/worker references (zero matches).
- The `Blog` model already has a `summary String?` field in `apps/api/prisma/schema.prisma` (line 29), so no Prisma migration is needed for the summary column.
- `BlogService.create()` accepts `isPublished` at creation time, and `BlogService.update()` can toggle `isPublished` via `UpdateBlogDto`.
- The `FeedService.getFeed()` and `BlogService.findBySlug()` already select and return the `summary` field.

### Target Architecture

```
BlogService.create/update (isPublished=true)
        │
        ▼
  Queue: "blog-summary"
  Job: { blogId, title, content }
        │
        ▼
  BlogSummaryProcessor (Worker)
        │
        ├─ Generate summary (extractive text algorithm)
        ├─ prisma.blog.update({ summary })
        └─ On failure: retry with exponential backoff → DLQ after max attempts
```

---

## 2. Package Selection

### Production Dependencies (install in `apps/api/`)

| Package | Version | Purpose |
|---------|---------|---------|
| `bullmq` | `^5.x` | Core queue + worker library (modern, TypeScript-native) |
| `@nestjs/bullmq` | `^11.x` | NestJS integration module (decorators, DI) |
| `ioredis` | `^5.x` | Redis client (required by BullMQ) |
| `@bull-board/api` | `^6.x` | Queue monitoring dashboard API |
| `@bull-board/express` | `^6.x` | Express adapter for Bull Board UI |
| `@bull-board/nestjs` | `^6.x` | NestJS module integration for Bull Board |

### Dev Dependencies

No additional dev dependencies needed — the existing `@nestjs/testing`, `jest`, and `jest-mock-extended` are sufficient.

### Install Command

```bash
pnpm --filter api add bullmq @nestjs/bullmq ioredis @bull-board/api @bull-board/express @bull-board/nestjs
```

---

## 3. Redis Connection Configuration

### 3.1 Environment Variables

Add to `apps/api/.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

Add to `.env.example` (root):

```env
# Redis (async job processing)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 3.2 Redis Connection in AppModule

Register BullMQ at the root module level using `@nestjs/bullmq`'s `BullModule.forRoot()`:

**File: `apps/api/src/app.module.ts`** (modified)

```typescript
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB ?? '0', 10),
        maxRetriesPerRequest: null, // Required by BullMQ
      },
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }]),
    AuthModule,
    BlogModule,
    FeedModule,
    LikeModule,
    CommentModule,
    SeoModule,
    QueueDashboardModule, // New — see Section 8
  ],
  // ... existing controllers, providers
})
export class AppModule {}
```

### 3.3 Redis Health Check

Add a health endpoint to verify Redis connectivity. This reuses the existing `AppController`:

**File: `apps/api/src/app.controller.ts`** (modified — add health endpoint)

```typescript
import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/bullmq';
import { Public } from './common/decorators/public.decorator';
import IORedis from 'ioredis';

@Controller()
export class AppController {
  constructor(
    @InjectConnection() private readonly redis: IORedis,
  ) {}

  @Public()
  @Get('health')
  async health() {
    const redisStatus = this.redis.status;
    return {
      status: 'ok',
      redis: redisStatus === 'ready' ? 'connected' : redisStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
```

---

## 4. Queue Architecture

### 4.1 Queue Naming Convention

Use the pattern `{domain}-{action}`:

| Queue Name | Purpose | Job Types |
|------------|---------|-----------|
| `blog-summary` | Blog summary generation | `generate`, `regenerate` |

Future queues (not in this plan, but the naming convention accommodates them):
- `blog-seo` — automatic SEO analysis
- `notification-email` — email notifications
- `media-optimize` — image processing

### 4.2 Queue Constants

**File: `apps/api/src/queue/queue.constants.ts`** (new)

```typescript
export const QUEUE_NAMES = {
  BLOG_SUMMARY: 'blog-summary',
} as const;

export const JOB_NAMES = {
  GENERATE_SUMMARY: 'generate',
  REGENERATE_SUMMARY: 'regenerate',
} as const;
```

### 4.3 Job Data Schema

**File: `apps/api/src/queue/interfaces/blog-summary-job.interface.ts`** (new)

```typescript
export interface BlogSummaryJobData {
  blogId: string;
  title: string;
  content: string;
}

export interface BlogSummaryJobResult {
  blogId: string;
  summary: string;
  generatedAt: string;
}
```

---

## 5. Queue Module Setup

### 5.1 Queue Module

**File: `apps/api/src/queue/queue.module.ts`** (new)

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from './queue.constants';
import { BlogSummaryProducer } from './producers/blog-summary.producer';
import { BlogSummaryProcessor } from './processors/blog-summary.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.BLOG_SUMMARY,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000, // 2s, 4s, 8s
        },
        removeOnComplete: {
          age: 86400, // Keep completed jobs for 24h
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 604800, // Keep failed jobs for 7 days (DLQ inspection)
        },
      },
    }),
  ],
  providers: [BlogSummaryProducer, BlogSummaryProcessor],
  exports: [BlogSummaryProducer],
})
export class QueueModule {}
```

---

## 6. Producer (Enqueue Jobs)

### 6.1 Blog Summary Producer

**File: `apps/api/src/queue/producers/blog-summary.producer.ts`** (new)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '../queue.constants';
import { BlogSummaryJobData } from '../interfaces/blog-summary-job.interface';

@Injectable()
export class BlogSummaryProducer {
  private readonly logger = new Logger(BlogSummaryProducer.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.BLOG_SUMMARY)
    private readonly summaryQueue: Queue<BlogSummaryJobData>,
  ) {}

  async enqueueSummaryGeneration(data: BlogSummaryJobData): Promise<void> {
    const job = await this.summaryQueue.add(
      JOB_NAMES.GENERATE_SUMMARY,
      data,
      {
        jobId: `summary-${data.blogId}`, // Deduplicate: one job per blog
      },
    );
    this.logger.log(
      `Enqueued summary generation for blog ${data.blogId} (job ${job.id})`,
    );
  }

  async enqueueRegeneration(data: BlogSummaryJobData): Promise<void> {
    // Remove any pending job for this blog, then enqueue fresh
    const existingJobId = `summary-${data.blogId}`;
    const existingJob = await this.summaryQueue.getJob(existingJobId);
    if (existingJob) {
      const state = await existingJob.getState();
      if (state === 'waiting' || state === 'delayed') {
        await existingJob.remove();
        this.logger.log(`Removed pending summary job for blog ${data.blogId}`);
      }
    }

    const job = await this.summaryQueue.add(
      JOB_NAMES.REGENERATE_SUMMARY,
      data,
      {
        jobId: `summary-${data.blogId}-${Date.now()}`, // Unique ID for regeneration
      },
    );
    this.logger.log(
      `Enqueued summary regeneration for blog ${data.blogId} (job ${job.id})`,
    );
  }
}
```

---

## 7. Worker / Processor Design

### 7.1 Design Decision: Inline Processor (not sandboxed)

**Rationale**: Sandboxed processors run in a separate child process via `fork()`, which is useful for CPU-intensive work that blocks the event loop. Blog summary generation is a lightweight text-extraction algorithm (not an LLM call), so an inline processor within the NestJS process is appropriate. This gives full access to NestJS DI (PrismaService) without serialization overhead.

If summary generation is later replaced by an LLM API call (I/O-bound, not CPU-bound), inline remains correct. Switch to sandboxed only if a CPU-intensive NLP library is introduced.

### 7.2 Summary Generation Algorithm

The processor uses an extractive summarization approach: extract the first 2-3 meaningful sentences from the content, stripping HTML, up to 300 characters. This mirrors the style already used by `SeoService.generateMetaDescription()` in `apps/api/src/seo/seo.service.ts` but produces a slightly longer summary suitable for feed cards.

### 7.3 Blog Summary Processor

**File: `apps/api/src/queue/processors/blog-summary.processor.ts`** (new)

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../queue.constants';
import {
  BlogSummaryJobData,
  BlogSummaryJobResult,
} from '../interfaces/blog-summary-job.interface';

@Processor(QUEUE_NAMES.BLOG_SUMMARY, {
  concurrency: 3, // Process up to 3 summary jobs in parallel
})
export class BlogSummaryProcessor extends WorkerHost {
  private readonly logger = new Logger(BlogSummaryProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(
    job: Job<BlogSummaryJobData>,
  ): Promise<BlogSummaryJobResult> {
    this.logger.log(
      `Processing summary for blog ${job.data.blogId} (attempt ${job.attemptsStarted})`,
    );

    const { blogId, content } = job.data;

    // 1. Generate summary
    const summary = this.generateSummary(content);

    // 2. Persist to database
    await this.prisma.blog.update({
      where: { id: blogId },
      data: { summary },
    });

    this.logger.log(
      `Summary generated for blog ${blogId}: "${summary.slice(0, 50)}..."`,
    );

    return {
      blogId,
      summary,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Extractive summary: strips HTML, takes first N sentences
   * up to ~300 characters. Truncates at word boundary.
   */
  generateSummary(content: string, maxLength: number = 300): string {
    // Strip HTML tags
    const plainText = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (plainText.length <= maxLength) {
      return plainText;
    }

    // Split into sentences and accumulate
    const sentences = plainText.match(/[^.!?]+[.!?]+/g) || [plainText];
    let summary = '';

    for (const sentence of sentences) {
      const candidate = summary + sentence.trim() + ' ';
      if (candidate.length > maxLength && summary.length > 0) break;
      summary = candidate;
    }

    summary = summary.trim();

    // If still too long (single long sentence), truncate at word boundary
    if (summary.length > maxLength) {
      const truncated = summary.slice(0, maxLength);
      const lastSpace = truncated.lastIndexOf(' ');
      summary =
        (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
    }

    return summary;
  }
}
```

---

## 8. Blog Summary Generation Flow

### 8.1 When to Enqueue

Summary generation is triggered in two scenarios:

1. **On create with `isPublished: true`** — Blog is published immediately at creation time.
2. **On update where `isPublished` transitions to `true`, or content changes on an already-published blog** — Re-generates the summary.

### 8.2 BlogModule Integration

The `BlogModule` must import `QueueModule` to access `BlogSummaryProducer`:

**File: `apps/api/src/blog/blog.module.ts`** (modified)

```typescript
import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule],
  controllers: [BlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
```

### 8.3 BlogService Modifications

**File: `apps/api/src/blog/blog.service.ts`** (modified)

The key changes are injecting `BlogSummaryProducer` and calling it after successful create/update when the blog is published:

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlogSummaryProducer } from '../queue/producers/blog-summary.producer';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import slugify from 'slugify';
import { nanoid } from 'nanoid';

@Injectable()
export class BlogService {
  constructor(
    private prisma: PrismaService,
    private summaryProducer: BlogSummaryProducer,
  ) {}

  async create(dto: CreateBlogDto, userId: string) {
    const baseSlug = slugify(dto.title, { lower: true, strict: true });
    let blog;
    try {
      blog = await this.prisma.blog.create({
        data: {
          title: dto.title,
          content: dto.content,
          slug: baseSlug,
          isPublished: dto.isPublished ?? false,
          userId,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        blog = await this.prisma.blog.create({
          data: {
            title: dto.title,
            content: dto.content,
            slug: `${baseSlug}-${nanoid(6)}`,
            isPublished: dto.isPublished ?? false,
            userId,
          },
        });
      } else {
        throw error;
      }
    }

    // Enqueue summary generation if published
    if (blog.isPublished) {
      await this.summaryProducer.enqueueSummaryGeneration({
        blogId: blog.id,
        title: blog.title,
        content: blog.content,
      });
    }

    return blog;
  }

  async update(id: string, dto: UpdateBlogDto, userId: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      select: { userId: true, isPublished: true, title: true, content: true },
    });
    if (!blog) throw new NotFoundException('Blog not found');
    if (blog.userId !== userId)
      throw new ForbiddenException('Not the blog owner');

    const updated = await this.prisma.blog.update({
      where: { id },
      data: dto,
    });

    // Enqueue summary (re)generation if:
    // 1. Blog is being published (transition to isPublished=true)
    // 2. Content changed on an already-published blog
    const wasJustPublished = dto.isPublished === true && !blog.isPublished;
    const contentChanged =
      updated.isPublished &&
      (dto.content !== undefined || dto.title !== undefined);

    if (wasJustPublished || contentChanged) {
      await this.summaryProducer.enqueueRegeneration({
        blogId: updated.id,
        title: updated.title,
        content: updated.content,
      });
    }

    return updated;
  }

  // findAllByUser, findOneByUser, findBySlug, delete — unchanged
  // ...
}
```

### 8.4 Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│ BlogService.create(dto, userId)                             │
│   1. Create blog in PostgreSQL                              │
│   2. If isPublished → summaryProducer.enqueueSummaryGeneration()│
│                           │                                 │
│                           ▼                                 │
│                  Redis: "blog-summary" queue                │
│                  Job: { blogId, title, content }            │
│                           │                                 │
│                           ▼                                 │
│              BlogSummaryProcessor.process(job)              │
│                1. generateSummary(content)                  │
│                2. prisma.blog.update({ summary })           │
│                3. Return result                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ BlogService.update(id, dto, userId)                         │
│   1. Fetch current blog state                               │
│   2. Update blog in PostgreSQL                              │
│   3. If published transition OR content changed on published│
│      → summaryProducer.enqueueRegeneration()                │
│        (removes pending job, enqueues fresh)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Retry Strategy

### 9.1 Configuration (set in QueueModule defaultJobOptions)

| Setting | Value | Rationale |
|---------|-------|-----------|
| `attempts` | 3 | Sufficient for transient DB errors; avoids noise |
| `backoff.type` | `exponential` | Prevents thundering herd on shared resources |
| `backoff.delay` | 2000ms | Base delay: 2s → 4s → 8s |
| `removeOnComplete.age` | 86400 (24h) | Debugging window without unbounded growth |
| `removeOnComplete.count` | 1000 | Hard cap on stored completed jobs |
| `removeOnFail.age` | 604800 (7 days) | Failed jobs remain for inspection (acts as DLQ) |

### 9.2 Dead Letter Queue (DLQ) Strategy

BullMQ does not have a native DLQ concept, but failed jobs are retained (per `removeOnFail` settings above) and queryable via Bull Board or the BullMQ API. The `failed` event on the worker handles alerting:

**Added to `BlogSummaryProcessor`** (event listener):

```typescript
import { OnWorkerEvent } from '@nestjs/bullmq';

// Inside BlogSummaryProcessor class:

@OnWorkerEvent('failed')
onFailed(job: Job<BlogSummaryJobData>, error: Error) {
  this.logger.error(
    `Summary generation FAILED for blog ${job.data.blogId} ` +
    `(attempt ${job.attemptsStarted}/${job.opts.attempts}): ${error.message}`,
  );

  if (job.attemptsStarted >= (job.opts.attempts ?? 3)) {
    this.logger.error(
      `Blog ${job.data.blogId} summary exhausted all retries. ` +
      `Job ${job.id} moved to failed state (DLQ). Manual inspection required.`,
    );
    // Future: emit event for notification service (email, Slack webhook, etc.)
  }
}

@OnWorkerEvent('completed')
onCompleted(job: Job<BlogSummaryJobData>) {
  this.logger.log(`Summary job ${job.id} completed for blog ${job.data.blogId}`);
}
```

---

## 10. Monitoring — Bull Board Dashboard

### 10.1 Queue Dashboard Module

**File: `apps/api/src/queue-dashboard/queue-dashboard.module.ts`** (new)

```typescript
import { Module } from '@nestjs/common';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../queue/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.BLOG_SUMMARY }),
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.BLOG_SUMMARY,
      adapter: BullMQAdapter,
    }),
  ],
})
export class QueueDashboardModule {}
```

### 10.2 Route Protection

The dashboard is mounted at `/admin/queues`. Since the application uses a global `JwtAuthGuard`, the dashboard route is protected by default — only authenticated users can access it.

For a production deployment, add an admin role check. For now, JWT authentication provides sufficient access control since all registered users are blog authors (no public registration abuse vector in the current design).

### 10.3 Dashboard Access

Once running, access the dashboard at:
```
http://localhost:4000/admin/queues
```

The dashboard provides:
- Queue overview (waiting, active, completed, failed counts)
- Individual job inspection (data, result, logs, stacktrace on failure)
- Manual retry/remove operations
- Real-time job flow visualization

---

## 11. Error Handling & Graceful Shutdown

### 11.1 Graceful Shutdown

NestJS handles `enableShutdownHooks()` to close connections cleanly. BullMQ workers automatically stop processing when `onModuleDestroy` is called by the NestJS lifecycle.

**File: `apps/api/src/main.ts`** (modified)

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  // Enable graceful shutdown hooks (SIGTERM, SIGINT)
  // Ensures BullMQ workers finish current jobs before exiting
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
```

### 11.2 Error Handling Summary

| Error Scenario | Handling |
|----------------|----------|
| Redis connection fails on startup | BullMQ throws; NestJS fails to bootstrap (fail-fast) |
| Redis connection lost mid-operation | BullMQ auto-reconnects via ioredis; pending jobs resume |
| Blog not found during processing | Processor throws; job retries (blog may have been deleted) |
| Prisma update fails | Processor throws; job retries with exponential backoff |
| All retries exhausted | Job moves to `failed` state; logged as error; visible in Bull Board |
| Application shutdown during processing | `enableShutdownHooks()` waits for active jobs to complete |

---

## 12. Testing Strategy

### 12.1 Testing Philosophy (TDD per CLAUDE.md)

Following the mandatory Red-Green-Refactor cycle:
1. **RED**: Write failing tests for the producer, processor, and integration points.
2. **GREEN**: Implement the minimum code to make tests pass.
3. **REFACTOR**: Clean up while keeping tests green.

### 12.2 Unit Tests — Blog Summary Processor

**File: `apps/api/src/queue/processors/blog-summary.processor.spec.ts`** (new)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { BlogSummaryProcessor } from './blog-summary.processor';
import { PrismaService } from '../../prisma/prisma.service';
import { Job } from 'bullmq';
import { BlogSummaryJobData } from '../interfaces/blog-summary-job.interface';

describe('BlogSummaryProcessor', () => {
  let processor: BlogSummaryProcessor;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      blog: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogSummaryProcessor,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    processor = module.get<BlogSummaryProcessor>(BlogSummaryProcessor);
  });

  describe('generateSummary', () => {
    it('should return full text when under maxLength', () => {
      const content = 'This is a short blog post.';
      const summary = processor.generateSummary(content);
      expect(summary).toBe('This is a short blog post.');
    });

    it('should strip HTML tags', () => {
      const content = '<p>Hello <strong>world</strong></p>';
      const summary = processor.generateSummary(content);
      expect(summary).toBe('Hello world');
      expect(summary).not.toContain('<');
    });

    it('should truncate long content at sentence boundary', () => {
      const content =
        'First sentence. Second sentence. Third sentence that is very long and should push us over the limit when combined with the other sentences in this paragraph.';
      const summary = processor.generateSummary(content, 50);
      expect(summary.length).toBeLessThanOrEqual(53); // 50 + "..."
      expect(summary).toMatch(/\.(\s|$)/); // Ends at sentence boundary
    });

    it('should handle content with no sentence boundaries', () => {
      const content = 'A'.repeat(500);
      const summary = processor.generateSummary(content, 100);
      expect(summary.length).toBeLessThanOrEqual(103); // 100 + "..."
    });
  });

  describe('process', () => {
    it('should generate summary and persist to database', async () => {
      const jobData: BlogSummaryJobData = {
        blogId: 'blog-1',
        title: 'Test Blog',
        content: '<p>This is the blog content. It has multiple sentences.</p>',
      };

      const mockJob = {
        data: jobData,
        attemptsStarted: 1,
      } as unknown as Job<BlogSummaryJobData>;

      const result = await processor.process(mockJob);

      expect(result.blogId).toBe('blog-1');
      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.generatedAt).toBeDefined();

      expect(prisma.blog.update).toHaveBeenCalledWith({
        where: { id: 'blog-1' },
        data: { summary: expect.any(String) },
      });
    });
  });
});
```

### 12.3 Unit Tests — Blog Summary Producer

**File: `apps/api/src/queue/producers/blog-summary.producer.spec.ts`** (new)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { BlogSummaryProducer } from './blog-summary.producer';
import { QUEUE_NAMES } from '../queue.constants';

describe('BlogSummaryProducer', () => {
  let producer: BlogSummaryProducer;
  let mockQueue: any;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
      getJob: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogSummaryProducer,
        {
          provide: getQueueToken(QUEUE_NAMES.BLOG_SUMMARY),
          useValue: mockQueue,
        },
      ],
    }).compile();

    producer = module.get<BlogSummaryProducer>(BlogSummaryProducer);
  });

  it('should enqueue a summary generation job', async () => {
    await producer.enqueueSummaryGeneration({
      blogId: 'blog-1',
      title: 'Test',
      content: 'Content',
    });

    expect(mockQueue.add).toHaveBeenCalledWith(
      'generate',
      { blogId: 'blog-1', title: 'Test', content: 'Content' },
      { jobId: 'summary-blog-1' },
    );
  });

  it('should remove existing pending job before regeneration', async () => {
    const mockExistingJob = {
      getState: jest.fn().mockResolvedValue('waiting'),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    mockQueue.getJob.mockResolvedValue(mockExistingJob);

    await producer.enqueueRegeneration({
      blogId: 'blog-1',
      title: 'Test',
      content: 'Updated',
    });

    expect(mockExistingJob.remove).toHaveBeenCalled();
    expect(mockQueue.add).toHaveBeenCalledWith(
      'regenerate',
      { blogId: 'blog-1', title: 'Test', content: 'Updated' },
      expect.objectContaining({
        jobId: expect.stringContaining('summary-blog-1-'),
      }),
    );
  });
});
```

### 12.4 Integration Test — BlogService with Queue

**File: `apps/api/src/blog/blog.service.integration.spec.ts`** (new)

This test verifies that `BlogService.create()` and `BlogService.update()` correctly enqueue jobs:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { BlogService } from './blog.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlogSummaryProducer } from '../queue/producers/blog-summary.producer';

describe('BlogService (queue integration)', () => {
  let service: BlogService;
  let prisma: any;
  let summaryProducer: any;

  beforeEach(async () => {
    prisma = {
      blog: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    summaryProducer = {
      enqueueSummaryGeneration: jest.fn().mockResolvedValue(undefined),
      enqueueRegeneration: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlogSummaryProducer, useValue: summaryProducer },
      ],
    }).compile();

    service = module.get<BlogService>(BlogService);
  });

  it('should enqueue summary generation when blog is created as published', async () => {
    const blog = {
      id: 'blog-1',
      title: 'My Blog',
      content: 'Blog content here',
      slug: 'my-blog',
      isPublished: true,
      userId: 'user-1',
    };
    prisma.blog.create.mockResolvedValue(blog);

    await service.create(
      { title: 'My Blog', content: 'Blog content here', isPublished: true },
      'user-1',
    );

    expect(summaryProducer.enqueueSummaryGeneration).toHaveBeenCalledWith({
      blogId: 'blog-1',
      title: 'My Blog',
      content: 'Blog content here',
    });
  });

  it('should NOT enqueue summary when blog is created as draft', async () => {
    prisma.blog.create.mockResolvedValue({
      id: 'blog-1',
      title: 'Draft',
      content: 'Content',
      slug: 'draft',
      isPublished: false,
      userId: 'user-1',
    });

    await service.create(
      { title: 'Draft', content: 'Content', isPublished: false },
      'user-1',
    );

    expect(summaryProducer.enqueueSummaryGeneration).not.toHaveBeenCalled();
  });

  it('should enqueue regeneration when published blog content is updated', async () => {
    prisma.blog.findUnique.mockResolvedValue({
      userId: 'user-1',
      isPublished: true,
      title: 'Old Title',
      content: 'Old content',
    });
    prisma.blog.update.mockResolvedValue({
      id: 'blog-1',
      title: 'Old Title',
      content: 'New content',
      isPublished: true,
    });

    await service.update('blog-1', { content: 'New content' }, 'user-1');

    expect(summaryProducer.enqueueRegeneration).toHaveBeenCalledWith({
      blogId: 'blog-1',
      title: 'Old Title',
      content: 'New content',
    });
  });

  it('should enqueue generation when draft is published', async () => {
    prisma.blog.findUnique.mockResolvedValue({
      userId: 'user-1',
      isPublished: false,
      title: 'Draft Blog',
      content: 'Content',
    });
    prisma.blog.update.mockResolvedValue({
      id: 'blog-1',
      title: 'Draft Blog',
      content: 'Content',
      isPublished: true,
    });

    await service.update('blog-1', { isPublished: true }, 'user-1');

    expect(summaryProducer.enqueueRegeneration).toHaveBeenCalled();
  });
});
```

### 12.5 Test Commands

```bash
# Run all queue-related tests
pnpm --filter api test -- --testPathPattern='queue|blog.service.integration'

# Run just processor tests
pnpm --filter api test -- --testPathPattern='blog-summary.processor.spec'

# Run just producer tests
pnpm --filter api test -- --testPathPattern='blog-summary.producer.spec'

# Run full backend suite (includes queue tests)
pnpm --filter api test
```

### 12.6 Existing Test Updates

The existing `apps/api/src/blog/blog.service.spec.ts` must be updated to provide a mock `BlogSummaryProducer`, since `BlogService` now depends on it:

**File: `apps/api/src/blog/blog.service.spec.ts`** (modified)

Add to the `beforeEach` providers:

```typescript
import { BlogSummaryProducer } from '../queue/producers/blog-summary.producer';

// Inside beforeEach:
const summaryProducer = {
  enqueueSummaryGeneration: jest.fn().mockResolvedValue(undefined),
  enqueueRegeneration: jest.fn().mockResolvedValue(undefined),
};

const module: TestingModule = await Test.createTestingModule({
  providers: [
    BlogService,
    { provide: PrismaService, useValue: prisma },
    { provide: BlogSummaryProducer, useValue: summaryProducer },
  ],
}).compile();
```

---

## 13. Migration Plan

### 13.1 Prisma Schema

No migration needed. The `summary String?` field already exists at line 29 of `apps/api/prisma/schema.prisma`. This was part of the original schema design.

### 13.2 Redis Setup (Local Development)

**Option A: Docker (recommended)**

```bash
docker run -d --name redis-blog -p 6379:6379 redis:7-alpine
```

**Option B: Docker Compose**

Add to a `docker-compose.yml` at the project root (if needed):

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

**Option C: System Redis**

```bash
# Ubuntu/WSL
sudo apt-get install redis-server
sudo systemctl start redis-server
```

### 13.3 Production Redis

For production (Railway/Vercel deployment), use a managed Redis provider:

| Provider | How to Set Up |
|----------|--------------|
| **Railway** | Add Redis plugin → copy `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` to env |
| **Upstash** | Create free Redis → use connection details |
| **Redis Cloud** | Free 30MB tier → use connection details |

Set `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` environment variables in the production environment.

---

## 14. File-by-File Implementation Steps

### Step 0: Install Dependencies

```bash
pnpm --filter api add bullmq @nestjs/bullmq ioredis @bull-board/api @bull-board/express @bull-board/nestjs
```

### Step 1: Queue Constants & Interfaces (RED → GREEN)

Write tests first, then create:

| # | Action | File Path |
|---|--------|-----------|
| 1a | Create | `apps/api/src/queue/queue.constants.ts` |
| 1b | Create | `apps/api/src/queue/interfaces/blog-summary-job.interface.ts` |

### Step 2: Blog Summary Processor (RED → GREEN → REFACTOR)

| # | Action | File Path |
|---|--------|-----------|
| 2a | Create test (RED) | `apps/api/src/queue/processors/blog-summary.processor.spec.ts` |
| 2b | Create impl (GREEN) | `apps/api/src/queue/processors/blog-summary.processor.ts` |
| 2c | Run tests, verify pass | `pnpm --filter api test -- --testPathPattern=blog-summary.processor` |

### Step 3: Blog Summary Producer (RED → GREEN → REFACTOR)

| # | Action | File Path |
|---|--------|-----------|
| 3a | Create test (RED) | `apps/api/src/queue/producers/blog-summary.producer.spec.ts` |
| 3b | Create impl (GREEN) | `apps/api/src/queue/producers/blog-summary.producer.ts` |
| 3c | Run tests, verify pass | `pnpm --filter api test -- --testPathPattern=blog-summary.producer` |

### Step 4: Queue Module

| # | Action | File Path |
|---|--------|-----------|
| 4a | Create | `apps/api/src/queue/queue.module.ts` |

### Step 5: Integrate BlogService (RED → GREEN → REFACTOR)

| # | Action | File Path |
|---|--------|-----------|
| 5a | Create integration test (RED) | `apps/api/src/blog/blog.service.integration.spec.ts` |
| 5b | Modify BlogModule to import QueueModule | `apps/api/src/blog/blog.module.ts` |
| 5c | Modify BlogService to inject producer | `apps/api/src/blog/blog.service.ts` |
| 5d | Update existing BlogService spec mocks | `apps/api/src/blog/blog.service.spec.ts` |
| 5e | Run tests, verify all pass | `pnpm --filter api test` |

### Step 6: Queue Dashboard Module

| # | Action | File Path |
|---|--------|-----------|
| 6a | Create | `apps/api/src/queue-dashboard/queue-dashboard.module.ts` |

### Step 7: Root Module & Bootstrap Updates

| # | Action | File Path |
|---|--------|-----------|
| 7a | Modify — add BullModule.forRoot, QueueDashboardModule | `apps/api/src/app.module.ts` |
| 7b | Modify — add enableShutdownHooks() | `apps/api/src/main.ts` |
| 7c | Optionally add health check | `apps/api/src/app.controller.ts` |

### Step 8: Environment Configuration

| # | Action | File Path |
|---|--------|-----------|
| 8a | Add Redis env vars | `apps/api/.env` |
| 8b | Add Redis env vars | `.env.example` |

### Step 9: Final Verification

```bash
# Start Redis
docker run -d --name redis-blog -p 6379:6379 redis:7-alpine

# Run all tests
pnpm --filter api test

# Start the API and verify
pnpm --filter api dev

# Check health endpoint
curl http://localhost:4000/health

# Visit Bull Board
# http://localhost:4000/admin/queues

# Create a published blog via API and verify summary is generated
```

---

## 15. New File Tree Summary

```
apps/api/src/
├── queue/
│   ├── queue.constants.ts                    # Queue & job name constants
│   ├── queue.module.ts                       # BullMQ queue registration
│   ├── interfaces/
│   │   └── blog-summary-job.interface.ts     # Job data/result types
│   ├── producers/
│   │   ├── blog-summary.producer.ts          # Enqueue logic
│   │   └── blog-summary.producer.spec.ts     # Producer tests
│   └── processors/
│       ├── blog-summary.processor.ts         # Worker/consumer logic
│       └── blog-summary.processor.spec.ts    # Processor tests
├── queue-dashboard/
│   └── queue-dashboard.module.ts             # Bull Board dashboard
├── blog/
│   ├── blog.module.ts                        # Modified: imports QueueModule
│   ├── blog.service.ts                       # Modified: injects producer
│   ├── blog.service.spec.ts                  # Modified: mock producer
│   └── blog.service.integration.spec.ts      # New: queue integration tests
├── app.module.ts                             # Modified: BullModule.forRoot
└── main.ts                                   # Modified: enableShutdownHooks
```

**Total new files: 8**
**Total modified files: 5** (`blog.module.ts`, `blog.service.ts`, `blog.service.spec.ts`, `app.module.ts`, `main.ts`)

---

## 16. Future Extensibility

This architecture supports additional queues with minimal effort:

1. **Add a new queue**: Create constant in `queue.constants.ts`, register in `queue.module.ts`.
2. **Add a new producer**: Follow the `BlogSummaryProducer` pattern.
3. **Add a new processor**: Follow the `BlogSummaryProcessor` pattern.
4. **Add to Bull Board**: Register the queue in `queue-dashboard.module.ts`.

Potential future jobs:
- **SEO analysis queue**: Auto-analyze on publish (reuse existing `SeoService`)
- **Email notification queue**: Notify followers when a new blog is published
- **Image optimization queue**: Process uploaded images asynchronously
- **Content moderation queue**: Flag inappropriate content

import { Test, TestingModule } from '@nestjs/testing';
import { BlogService } from './blog.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlogSummaryProducer } from '../queue/producers/blog-summary.producer';
import { ForbiddenException } from '@nestjs/common';
import { mockLoggerProvider } from '../common/logger/logger.test-utils';
import { PrismaBlogRepository } from '../contexts/blog/infrastructure/prisma-blog.repository';
import { BullMqBlogSummaryJobsAdapter } from '../contexts/blog/infrastructure/bullmq-blog-summary-jobs.adapter';
import { CreateBlogUseCase } from '../contexts/blog/application/use-cases/create-blog.use-case';
import { FindUserBlogsUseCase } from '../contexts/blog/application/use-cases/find-user-blogs.use-case';
import { FindUserBlogUseCase } from '../contexts/blog/application/use-cases/find-user-blog.use-case';
import { FindPublishedBlogBySlugUseCase } from '../contexts/blog/application/use-cases/find-published-blog-by-slug.use-case';
import { UpdateBlogUseCase } from '../contexts/blog/application/use-cases/update-blog.use-case';
import { DeleteBlogUseCase } from '../contexts/blog/application/use-cases/delete-blog.use-case';

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

    const summaryProducer = {
      enqueueSummaryGeneration: jest.fn().mockResolvedValue(undefined),
      enqueueRegeneration: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlogSummaryProducer, useValue: summaryProducer },
        {
          provide: PrismaBlogRepository,
          inject: [PrismaService],
          useFactory: (prismaService: PrismaService) =>
            new PrismaBlogRepository(prismaService),
        },
        {
          provide: BullMqBlogSummaryJobsAdapter,
          inject: [BlogSummaryProducer],
          useFactory: (producer: BlogSummaryProducer) =>
            new BullMqBlogSummaryJobsAdapter(producer),
        },
        {
          provide: CreateBlogUseCase,
          inject: [PrismaBlogRepository, BullMqBlogSummaryJobsAdapter],
          useFactory: (
            repository: PrismaBlogRepository,
            summaryJobs: BullMqBlogSummaryJobsAdapter,
          ) => new CreateBlogUseCase(repository, summaryJobs),
        },
        {
          provide: FindUserBlogsUseCase,
          inject: [PrismaBlogRepository],
          useFactory: (repository: PrismaBlogRepository) =>
            new FindUserBlogsUseCase(repository),
        },
        {
          provide: FindUserBlogUseCase,
          inject: [PrismaBlogRepository],
          useFactory: (repository: PrismaBlogRepository) =>
            new FindUserBlogUseCase(repository),
        },
        {
          provide: FindPublishedBlogBySlugUseCase,
          inject: [PrismaBlogRepository],
          useFactory: (repository: PrismaBlogRepository) =>
            new FindPublishedBlogBySlugUseCase(repository),
        },
        {
          provide: UpdateBlogUseCase,
          inject: [PrismaBlogRepository, BullMqBlogSummaryJobsAdapter],
          useFactory: (
            repository: PrismaBlogRepository,
            summaryJobs: BullMqBlogSummaryJobsAdapter,
          ) => new UpdateBlogUseCase(repository, summaryJobs),
        },
        {
          provide: DeleteBlogUseCase,
          inject: [PrismaBlogRepository],
          useFactory: (repository: PrismaBlogRepository) =>
            new DeleteBlogUseCase(repository),
        },
        mockLoggerProvider(BlogService.name),
      ],
    }).compile();

    service = module.get<BlogService>(BlogService);
  });

  // TEST 5: create generates correct slug from title
  it('create should generate slug from title', async () => {
    prisma.blog.create.mockResolvedValue({
      id: 'blog-1', title: 'My First Blog', slug: 'my-first-blog', isPublished: false,
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

  // TEST 6: create retries with nanoid suffix on slug collision
  it('create should append nanoid suffix on slug collision', async () => {
    const uniqueError = { code: 'P2002', meta: { target: ['slug'] } };
    prisma.blog.create
      .mockRejectedValueOnce(uniqueError)
      .mockResolvedValueOnce({
        id: 'blog-1', title: 'My First Blog', slug: 'my-first-blog-abc123', isPublished: false,
      });

    const result = await service.create(
      { title: 'My First Blog', content: 'Content here' },
      'user-1',
    );

    expect(prisma.blog.create).toHaveBeenCalledTimes(2);
    const retryCall = prisma.blog.create.mock.calls[1][0];
    expect(retryCall.data.slug).toMatch(/^my-first-blog-.+/);
  });

  // TEST 7: update throws 403 when non-owner updates
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

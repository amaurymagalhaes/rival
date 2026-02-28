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

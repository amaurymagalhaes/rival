import { Test, TestingModule } from '@nestjs/testing';
import { FeedService } from './feed.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FeedService', () => {
  let service: FeedService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      blog: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FeedService>(FeedService);
  });

  it('should return only published blogs with cursor pagination', async () => {
    const mockBlogs = [
      {
        id: 'b1', title: 'Blog 1', slug: 'blog-1', summary: 'Sum 1',
        createdAt: new Date(), user: { id: 'u1', name: 'Alice' },
        _count: { likes: 2, comments: 3 },
      },
    ];
    prisma.blog.findMany.mockResolvedValue(mockBlogs);

    const result = await service.getFeed();

    expect(prisma.blog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isPublished: true },
        orderBy: { createdAt: 'desc' },
        take: 21,
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.hasNextPage).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('should use cursor when provided', async () => {
    prisma.blog.findMany.mockResolvedValue([]);

    await service.getFeed('cursor-id', 10);

    expect(prisma.blog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 11,
        cursor: { id: 'cursor-id' },
        skip: 1,
      }),
    );
  });

  it('should detect hasNextPage and set nextCursor', async () => {
    const mockBlogs = Array.from({ length: 21 }, (_, i) => ({
      id: `b${i}`, title: `Blog ${i}`, slug: `blog-${i}`, summary: null,
      createdAt: new Date(), user: { id: 'u1', name: 'Alice' },
      _count: { likes: 0, comments: 0 },
    }));
    prisma.blog.findMany.mockResolvedValue(mockBlogs);

    const result = await service.getFeed(undefined, 20);

    expect(result.items).toHaveLength(20);
    expect(result.hasNextPage).toBe(true);
    expect(result.nextCursor).toBe('b19');
  });

  it('should select fields without passwordHash or content', async () => {
    prisma.blog.findMany.mockResolvedValue([]);

    await service.getFeed();

    const call = prisma.blog.findMany.mock.calls[0][0];
    expect(call.select).toBeDefined();
    expect(call.select.id).toBe(true);
    expect(call.select.title).toBe(true);
    expect(call.select.slug).toBe(true);
    expect(call.select.user).toEqual({ select: { id: true, name: true } });
    expect(call.select._count).toEqual({ select: { likes: true, comments: true } });
    // Should NOT include content or passwordHash fields
    expect(call.select.content).toBeUndefined();
    expect(call.select.passwordHash).toBeUndefined();
  });
});

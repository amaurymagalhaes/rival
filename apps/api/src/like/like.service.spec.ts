import { Test, TestingModule } from '@nestjs/testing';
import { LikeService } from './like.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import { mockLoggerProvider } from '../common/logger/logger.test-utils';
import { PrismaLikeRepository } from '../contexts/like/infrastructure/prisma-like.repository';
import { LikeBlogUseCase } from '../contexts/like/application/use-cases/like-blog.use-case';
import { UnlikeBlogUseCase } from '../contexts/like/application/use-cases/unlike-blog.use-case';

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
        {
          provide: PrismaLikeRepository,
          inject: [PrismaService],
          useFactory: (prismaService: PrismaService) =>
            new PrismaLikeRepository(prismaService),
        },
        {
          provide: LikeBlogUseCase,
          inject: [PrismaLikeRepository],
          useFactory: (repository: PrismaLikeRepository) =>
            new LikeBlogUseCase(repository),
        },
        {
          provide: UnlikeBlogUseCase,
          inject: [PrismaLikeRepository],
          useFactory: (repository: PrismaLikeRepository) =>
            new UnlikeBlogUseCase(repository),
        },
        mockLoggerProvider(LikeService.name),
      ],
    }).compile();

    service = module.get<LikeService>(LikeService);
  });

  it('like should create entry and return likeCount', async () => {
    prisma.like.create.mockResolvedValue({ id: 'like-1' });
    prisma.like.count.mockResolvedValue(5);

    const result = await service.like('blog-1', 'user-1');

    expect(prisma.like.create).toHaveBeenCalledWith({
      data: { blogId: 'blog-1', userId: 'user-1' },
    });
    expect(result).toEqual({ liked: true, likeCount: 5 });
  });

  it('like should throw ConflictException on duplicate', async () => {
    prisma.like.create.mockRejectedValue({ code: 'P2002' });

    await expect(service.like('blog-1', 'user-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('unlike should delete entry and return likeCount', async () => {
    prisma.like.delete.mockResolvedValue({ id: 'like-1' });
    prisma.like.count.mockResolvedValue(3);

    const result = await service.unlike('blog-1', 'user-1');

    expect(prisma.like.delete).toHaveBeenCalledWith({
      where: { userId_blogId: { userId: 'user-1', blogId: 'blog-1' } },
    });
    expect(result).toEqual({ liked: false, likeCount: 3 });
  });

  it('unlike should be idempotent when like does not exist', async () => {
    prisma.like.delete.mockRejectedValue({ code: 'P2025' });
    prisma.like.count.mockResolvedValue(0);

    const result = await service.unlike('blog-1', 'user-1');

    expect(result).toEqual({ liked: false, likeCount: 0 });
  });
});

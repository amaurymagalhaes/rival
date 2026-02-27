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

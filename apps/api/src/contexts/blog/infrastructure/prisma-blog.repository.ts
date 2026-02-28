import type { PrismaService } from '../../../prisma/prisma.service';
import type { BlogRepository } from '../domain/blog.repository';
import { DuplicateBlogSlugError } from '../domain/blog.errors';
import type {
  BlogOwnerSnapshot,
  BlogRecord,
  CreateBlogInput,
  PublishedBlogView,
  UpdateBlogInput,
} from '../domain/blog.types';

function isDuplicateSlugError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

export class PrismaBlogRepository implements BlogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateBlogInput): Promise<BlogRecord> {
    try {
      return await this.prisma.blog.create({
        data: {
          title: input.title,
          content: input.content,
          slug: input.slug,
          isPublished: input.isPublished ?? false,
          userId: input.userId,
        },
      });
    } catch (error) {
      if (isDuplicateSlugError(error)) {
        throw new DuplicateBlogSlugError(input.slug);
      }
      throw error;
    }
  }

  findManyByUser(userId: string): Promise<BlogRecord[]> {
    return this.prisma.blog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string): Promise<BlogRecord | null> {
    return this.prisma.blog.findUnique({ where: { id } });
  }

  findOwnerSnapshotById(id: string): Promise<BlogOwnerSnapshot | null> {
    return this.prisma.blog.findUnique({
      where: { id },
      select: { userId: true, isPublished: true, title: true, content: true },
    });
  }

  findPublishedBySlug(slug: string): Promise<PublishedBlogView | null> {
    return this.prisma.blog.findUnique({
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
  }

  update(id: string, input: UpdateBlogInput): Promise<BlogRecord> {
    return this.prisma.blog.update({
      where: { id },
      data: input,
    });
  }

  delete(id: string): Promise<BlogRecord> {
    return this.prisma.blog.delete({ where: { id } });
  }
}

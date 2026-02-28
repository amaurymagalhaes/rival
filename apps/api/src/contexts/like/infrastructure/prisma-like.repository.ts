import type { PrismaService } from '../../../prisma/prisma.service';
import type { LikeRepository } from '../domain/like.repository';
import { DuplicateLikeError } from '../domain/like.errors';

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  return (error as { code?: string }).code;
}

export class PrismaLikeRepository implements LikeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(blogId: string, userId: string): Promise<void> {
    try {
      await this.prisma.like.create({
        data: { blogId, userId },
      });
    } catch (error) {
      if (getErrorCode(error) === 'P2002') {
        throw new DuplicateLikeError(blogId, userId);
      }
      throw error;
    }
  }

  async delete(blogId: string, userId: string): Promise<void> {
    try {
      await this.prisma.like.delete({
        where: { userId_blogId: { userId, blogId } },
      });
    } catch (error) {
      if (getErrorCode(error) !== 'P2025') {
        throw error;
      }
    }
  }

  countByBlogId(blogId: string): Promise<number> {
    return this.prisma.like.count({ where: { blogId } });
  }
}

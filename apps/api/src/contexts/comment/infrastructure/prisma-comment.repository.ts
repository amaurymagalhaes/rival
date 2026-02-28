import type { PrismaService } from '../../../prisma/prisma.service';
import type {
  CommentRepository,
  CommentView,
} from '../domain/comment.repository';

export class PrismaCommentRepository implements CommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPublishedBlogById(blogId: string): Promise<{ id: string } | null> {
    return this.prisma.blog.findFirst({
      where: { id: blogId, isPublished: true },
      select: { id: true },
    });
  }

  findPublishedBlogBySlug(slug: string): Promise<{ id: string } | null> {
    return this.prisma.blog.findFirst({
      where: { slug, isPublished: true },
      select: { id: true },
    });
  }

  createComment(blogId: string, userId: string, content: string): Promise<CommentView> {
    return this.prisma.comment.create({
      data: {
        blogId,
        userId,
        content,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    });
  }

  findCommentsByBlogId(blogId: string): Promise<CommentView[]> {
    return this.prisma.comment.findMany({
      where: { blogId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    });
  }
}

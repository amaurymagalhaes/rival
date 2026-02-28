import type { PrismaService } from '../../../prisma/prisma.service';
import type {
  FeedQueryRepository,
  PublicFeedPage,
} from '../domain/feed-query.repository';

export class PrismaFeedQueryRepository implements FeedQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getPublishedFeed(cursor?: string, take: number = 20): Promise<PublicFeedPage> {
    const blogs = await this.prisma.blog.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    const hasNextPage = blogs.length > take;
    const items = hasNextPage ? blogs.slice(0, take) : blogs;

    return {
      items,
      nextCursor: hasNextPage ? items[items.length - 1].id : null,
      hasNextPage,
    };
  }
}

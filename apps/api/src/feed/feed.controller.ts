import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { RateLimit } from '../rate-limiting';
import { BlogNotFoundError } from '../contexts/blog/domain/blog.errors';
import { FindPublishedBlogBySlugUseCase } from '../contexts/blog/application/use-cases/find-published-blog-by-slug.use-case';
import { GetPublicFeedUseCase } from '../contexts/feed/application/use-cases/get-public-feed.use-case';

@Public()
@RateLimit('generous')
@Controller('public')
export class FeedController {
  constructor(
    private readonly getPublicFeedUseCase: GetPublicFeedUseCase,
    private readonly findPublishedBlogBySlugUseCase: FindPublishedBlogBySlugUseCase,
  ) {}

  @Get('feed')
  getFeed(
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    const takeNum = Math.min(Number(take) || 20, 50);
    return this.getPublicFeedUseCase.execute(cursor, takeNum);
  }

  @Get('blogs/:slug')
  async findBySlug(@Param('slug') slug: string) {
    try {
      return await this.findPublishedBlogBySlugUseCase.execute(slug);
    } catch (error) {
      if (error instanceof BlogNotFoundError) {
        throw new NotFoundException('Blog not found');
      }
      throw error;
    }
  }
}

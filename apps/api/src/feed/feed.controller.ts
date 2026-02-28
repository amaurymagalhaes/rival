import { Controller, Get, Param, Query } from '@nestjs/common';
import { FeedService } from './feed.service';
import { BlogService } from '../blog/blog.service';
import { Public } from '../common/decorators/public.decorator';

@Public()
@Controller('public')
export class FeedController {
  constructor(
    private feedService: FeedService,
    private blogService: BlogService,
  ) {}

  @Get('feed')
  getFeed(
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    const takeNum = Math.min(Number(take) || 20, 50);
    return this.feedService.getFeed(cursor, takeNum);
  }

  @Get('blogs/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }
}

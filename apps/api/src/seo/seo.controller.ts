import { Controller, Post, Param, Req } from '@nestjs/common';
import { SeoService } from './seo.service';
import { BlogService } from '../blog/blog.service';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('blogs')
export class SeoController {
  constructor(
    private seoService: SeoService,
    private blogService: BlogService,
  ) {}

  @Post(':id/seo-analysis')
  async analyze(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const blog = await this.blogService.findOneByUser(id, req.user.id);
    return this.seoService.analyzeBlog(blog.title, blog.content, blog.summary ?? undefined);
  }
}

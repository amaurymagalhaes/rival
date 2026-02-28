import {
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { RateLimit } from '../rate-limiting';
import { AnalyzeBlogSeoUseCase } from '../contexts/seo/application/use-cases/analyze-blog-seo.use-case';
import { FindUserBlogUseCase } from '../contexts/blog/application/use-cases/find-user-blog.use-case';
import { BlogNotFoundError, BlogOwnershipError } from '../contexts/blog/domain/blog.errors';

@Controller('blogs')
export class SeoController {
  constructor(
    private readonly analyzeBlogSeoUseCase: AnalyzeBlogSeoUseCase,
    private readonly findUserBlogUseCase: FindUserBlogUseCase,
  ) {}

  @RateLimit('moderate')
  @Post(':id/seo-analysis')
  async analyze(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    try {
      const blog = await this.findUserBlogUseCase.execute(id, req.user.id);
      return this.analyzeBlogSeoUseCase.execute(
        blog.title,
        blog.content,
        blog.summary ?? undefined,
      );
    } catch (error) {
      if (error instanceof BlogNotFoundError) {
        throw new NotFoundException('Blog not found');
      }
      if (error instanceof BlogOwnershipError) {
        throw new ForbiddenException('Not the blog owner');
      }
      throw error;
    }
  }
}

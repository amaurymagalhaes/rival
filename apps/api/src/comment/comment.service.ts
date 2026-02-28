import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateCommentUseCase } from '../contexts/comment/application/use-cases/create-comment.use-case';
import { GetCommentsByBlogSlugUseCase } from '../contexts/comment/application/use-cases/get-comments-by-blog-slug.use-case';
import { PublishedBlogNotFoundForCommentError } from '../contexts/comment/domain/comment.errors';

@Injectable()
export class CommentService {
  constructor(
    private readonly createCommentUseCase: CreateCommentUseCase,
    private readonly getCommentsByBlogSlugUseCase: GetCommentsByBlogSlugUseCase,
  ) {}

  private toHttpError(error: unknown): never {
    if (error instanceof PublishedBlogNotFoundForCommentError) {
      throw new NotFoundException('Blog not found');
    }
    throw error;
  }

  async create(blogId: string, userId: string, dto: CreateCommentDto) {
    try {
      return await this.createCommentUseCase.execute(blogId, userId, dto.content);
    } catch (error) {
      this.toHttpError(error);
    }
  }

  async findByBlogSlug(slug: string) {
    try {
      return await this.getCommentsByBlogSlugUseCase.execute(slug);
    } catch (error) {
      this.toHttpError(error);
    }
  }
}

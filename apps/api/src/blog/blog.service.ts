import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { CreateBlogUseCase } from '../contexts/blog/application/use-cases/create-blog.use-case';
import { FindUserBlogsUseCase } from '../contexts/blog/application/use-cases/find-user-blogs.use-case';
import { FindUserBlogUseCase } from '../contexts/blog/application/use-cases/find-user-blog.use-case';
import { FindPublishedBlogBySlugUseCase } from '../contexts/blog/application/use-cases/find-published-blog-by-slug.use-case';
import { UpdateBlogUseCase } from '../contexts/blog/application/use-cases/update-blog.use-case';
import { DeleteBlogUseCase } from '../contexts/blog/application/use-cases/delete-blog.use-case';
import { BlogNotFoundError, BlogOwnershipError } from '../contexts/blog/domain/blog.errors';

@Injectable()
export class BlogService {
  constructor(
    @InjectPinoLogger(BlogService.name)
    private readonly logger: PinoLogger,
    private readonly createBlogUseCase: CreateBlogUseCase,
    private readonly findUserBlogsUseCase: FindUserBlogsUseCase,
    private readonly findUserBlogUseCase: FindUserBlogUseCase,
    private readonly findPublishedBlogBySlugUseCase: FindPublishedBlogBySlugUseCase,
    private readonly updateBlogUseCase: UpdateBlogUseCase,
    private readonly deleteBlogUseCase: DeleteBlogUseCase,
  ) {}

  private toHttpError(error: unknown): never {
    if (error instanceof BlogNotFoundError) {
      throw new NotFoundException('Blog not found');
    }
    if (error instanceof BlogOwnershipError) {
      throw new ForbiddenException('Not the blog owner');
    }
    throw error;
  }

  async create(dto: CreateBlogDto, userId: string) {
    const blog = await this.createBlogUseCase.execute(dto, userId);
    this.logger.info({ blogId: blog.id, slug: blog.slug, userId }, 'Blog created');
    return blog;
  }

  async findAllByUser(userId: string) {
    return this.findUserBlogsUseCase.execute(userId);
  }

  async findOneByUser(id: string, userId: string) {
    try {
      return await this.findUserBlogUseCase.execute(id, userId);
    } catch (error) {
      this.toHttpError(error);
    }
  }

  async findBySlug(slug: string) {
    try {
      return await this.findPublishedBlogBySlugUseCase.execute(slug);
    } catch (error) {
      this.toHttpError(error);
    }
  }

  async update(id: string, dto: UpdateBlogDto, userId: string) {
    try {
      const updated = await this.updateBlogUseCase.execute(id, dto, userId);
      this.logger.info({ blogId: id, userId }, 'Blog updated');
      return updated;
    } catch (error) {
      this.toHttpError(error);
    }
  }

  async delete(id: string, userId: string) {
    try {
      const deleted = await this.deleteBlogUseCase.execute(id, userId);
      this.logger.info({ blogId: id, userId }, 'Blog deleted');
      return deleted;
    } catch (error) {
      this.toHttpError(error);
    }
  }
}

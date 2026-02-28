import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { BlogSummaryProducer } from '../queue/producers/blog-summary.producer';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import slugify from 'slugify';
import { nanoid } from 'nanoid';

@Injectable()
export class BlogService {
  constructor(
    private prisma: PrismaService,
    private summaryProducer: BlogSummaryProducer,
    @InjectPinoLogger(BlogService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(dto: CreateBlogDto, userId: string) {
    const baseSlug = slugify(dto.title, { lower: true, strict: true });
    let blog;
    try {
      blog = await this.prisma.blog.create({
        data: {
          title: dto.title,
          content: dto.content,
          slug: baseSlug,
          isPublished: dto.isPublished ?? false,
          userId,
        },
      });
      this.logger.info({ blogId: blog.id, slug: blog.slug, userId }, 'Blog created');
    } catch (error: any) {
      if (error.code === 'P2002') {
        this.logger.debug({ baseSlug, userId }, 'Slug collision, retrying with suffix');
        blog = await this.prisma.blog.create({
          data: {
            title: dto.title,
            content: dto.content,
            slug: `${baseSlug}-${nanoid(6)}`,
            isPublished: dto.isPublished ?? false,
            userId,
          },
        });
        this.logger.info({ blogId: blog.id, slug: blog.slug, userId }, 'Blog created (slug retry)');
      } else {
        throw error;
      }
    }

    if (blog.isPublished) {
      await this.summaryProducer.enqueueSummaryGeneration({
        blogId: blog.id,
        title: blog.title,
        content: blog.content,
      });
    }

    return blog;
  }

  async findAllByUser(userId: string) {
    return this.prisma.blog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneByUser(id: string, userId: string) {
    const blog = await this.prisma.blog.findUnique({ where: { id } });
    if (!blog) throw new NotFoundException('Blog not found');
    if (blog.userId !== userId) throw new ForbiddenException('Not the blog owner');
    return blog;
  }

  async findBySlug(slug: string) {
    const blog = await this.prisma.blog.findUnique({
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
    if (!blog || !blog.isPublished) {
      throw new NotFoundException('Blog not found');
    }
    return blog;
  }

  async update(id: string, dto: UpdateBlogDto, userId: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      select: { userId: true, isPublished: true, title: true, content: true },
    });
    if (!blog) throw new NotFoundException('Blog not found');
    if (blog.userId !== userId) throw new ForbiddenException('Not the blog owner');

    const updated = await this.prisma.blog.update({
      where: { id },
      data: dto,
    });
    this.logger.info({ blogId: id, userId }, 'Blog updated');

    const wasJustPublished = dto.isPublished === true && !blog.isPublished;
    const contentChanged =
      updated.isPublished &&
      (dto.content !== undefined || dto.title !== undefined);

    if (wasJustPublished || contentChanged) {
      await this.summaryProducer.enqueueRegeneration({
        blogId: updated.id,
        title: updated.title,
        content: updated.content,
      });
    }

    return updated;
  }

  async delete(id: string, userId: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!blog) throw new NotFoundException('Blog not found');
    if (blog.userId !== userId) throw new ForbiddenException('Not the blog owner');

    const deleted = await this.prisma.blog.delete({ where: { id } });
    this.logger.info({ blogId: id, userId }, 'Blog deleted');
    return deleted;
  }
}

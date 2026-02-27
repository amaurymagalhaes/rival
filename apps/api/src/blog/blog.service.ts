import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import slugify from 'slugify';
import { nanoid } from 'nanoid';

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBlogDto, userId: string) {
    const baseSlug = slugify(dto.title, { lower: true, strict: true });
    try {
      return await this.prisma.blog.create({
        data: {
          title: dto.title,
          content: dto.content,
          slug: baseSlug,
          isPublished: dto.isPublished ?? false,
          userId,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
        return await this.prisma.blog.create({
          data: {
            title: dto.title,
            content: dto.content,
            slug: `${baseSlug}-${nanoid(6)}`,
            isPublished: dto.isPublished ?? false,
            userId,
          },
        });
      }
      throw error;
    }
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
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!blog || !blog.isPublished) {
      throw new NotFoundException('Blog not found');
    }
    return blog;
  }

  async update(id: string, dto: UpdateBlogDto, userId: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!blog) throw new NotFoundException('Blog not found');
    if (blog.userId !== userId) throw new ForbiddenException('Not the blog owner');

    return this.prisma.blog.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, userId: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!blog) throw new NotFoundException('Blog not found');
    if (blog.userId !== userId) throw new ForbiddenException('Not the blog owner');

    return this.prisma.blog.delete({ where: { id } });
  }
}

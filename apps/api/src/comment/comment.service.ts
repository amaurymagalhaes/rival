import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  async create(blogId: string, userId: string, dto: CreateCommentDto) {
    const blog = await this.prisma.blog.findUnique({
      where: { id: blogId },
      select: { id: true, isPublished: true },
    });
    if (!blog || !blog.isPublished) {
      throw new NotFoundException('Blog not found');
    }

    return this.prisma.comment.create({
      data: {
        blogId,
        userId,
        content: dto.content,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    });
  }

  async findByBlogSlug(slug: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { slug },
      select: { id: true, isPublished: true },
    });

    if (!blog || !blog.isPublished) {
      throw new NotFoundException('Blog not found');
    }

    return this.prisma.comment.findMany({
      where: { blogId: blog.id },
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

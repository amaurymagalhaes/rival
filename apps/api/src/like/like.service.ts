import { Injectable, ConflictException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikeService {
  constructor(
    private prisma: PrismaService,
    @InjectPinoLogger(LikeService.name)
    private readonly logger: PinoLogger,
  ) {}

  async like(blogId: string, userId: string) {
    try {
      await this.prisma.like.create({
        data: { blogId, userId },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Already liked');
      }
      throw error;
    }

    const likeCount = await this.prisma.like.count({ where: { blogId } });
    this.logger.debug({ blogId, userId, likeCount }, 'Blog liked');
    return { liked: true, likeCount };
  }

  async unlike(blogId: string, userId: string) {
    try {
      await this.prisma.like.delete({
        where: { userId_blogId: { userId, blogId } },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        // Record not found — idempotent
      } else {
        throw error;
      }
    }

    const likeCount = await this.prisma.like.count({ where: { blogId } });
    this.logger.debug({ blogId, userId, likeCount }, 'Blog unliked');
    return { liked: false, likeCount };
  }
}

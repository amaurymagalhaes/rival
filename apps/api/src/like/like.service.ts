import { ConflictException, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { LikeBlogUseCase } from '../contexts/like/application/use-cases/like-blog.use-case';
import { UnlikeBlogUseCase } from '../contexts/like/application/use-cases/unlike-blog.use-case';
import { DuplicateLikeError } from '../contexts/like/domain/like.errors';

@Injectable()
export class LikeService {
  constructor(
    @InjectPinoLogger(LikeService.name)
    private readonly logger: PinoLogger,
    private readonly likeBlogUseCase: LikeBlogUseCase,
    private readonly unlikeBlogUseCase: UnlikeBlogUseCase,
  ) {}

  async like(blogId: string, userId: string) {
    try {
      const result = await this.likeBlogUseCase.execute(blogId, userId);
      const likeCount = result.likeCount;
      this.logger.debug({ blogId, userId, likeCount }, 'Blog liked');
      return result;
    } catch (error) {
      if (error instanceof DuplicateLikeError) {
        throw new ConflictException('Already liked');
      }
      throw error;
    }
  }

  async unlike(blogId: string, userId: string) {
    const result = await this.unlikeBlogUseCase.execute(blogId, userId);
    const likeCount = result.likeCount;
    this.logger.debug({ blogId, userId, likeCount }, 'Blog unliked');
    return result;
  }
}

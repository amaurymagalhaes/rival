import { Module } from '@nestjs/common';
import { LikeService } from './like.service';
import { LikeController } from './like.controller';
import { PrismaService } from '../prisma/prisma.service';
import type { LikeRepository } from '../contexts/like/domain/like.repository';
import { LIKE_REPOSITORY } from '../contexts/like/domain/like.tokens';
import { PrismaLikeRepository } from '../contexts/like/infrastructure/prisma-like.repository';
import { LikeBlogUseCase } from '../contexts/like/application/use-cases/like-blog.use-case';
import { UnlikeBlogUseCase } from '../contexts/like/application/use-cases/unlike-blog.use-case';
import { GetLikeStatusUseCase } from '../contexts/like/application/use-cases/get-like-status.use-case';

@Module({
  controllers: [LikeController],
  providers: [
    LikeService,
    {
      provide: LIKE_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => new PrismaLikeRepository(prisma),
    },
    {
      provide: LikeBlogUseCase,
      inject: [LIKE_REPOSITORY],
      useFactory: (repository: LikeRepository) =>
        new LikeBlogUseCase(repository),
    },
    {
      provide: UnlikeBlogUseCase,
      inject: [LIKE_REPOSITORY],
      useFactory: (repository: LikeRepository) =>
        new UnlikeBlogUseCase(repository),
    },
    {
      provide: GetLikeStatusUseCase,
      inject: [LIKE_REPOSITORY],
      useFactory: (repository: LikeRepository) =>
        new GetLikeStatusUseCase(repository),
    },
  ],
})
export class LikeModule {}

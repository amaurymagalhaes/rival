import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { PrismaService } from '../prisma/prisma.service';
import type { CommentRepository } from '../contexts/comment/domain/comment.repository';
import { COMMENT_REPOSITORY } from '../contexts/comment/domain/comment.tokens';
import { PrismaCommentRepository } from '../contexts/comment/infrastructure/prisma-comment.repository';
import { CreateCommentUseCase } from '../contexts/comment/application/use-cases/create-comment.use-case';
import { GetCommentsByBlogSlugUseCase } from '../contexts/comment/application/use-cases/get-comments-by-blog-slug.use-case';

@Module({
  controllers: [CommentController],
  providers: [
    CommentService,
    {
      provide: COMMENT_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => new PrismaCommentRepository(prisma),
    },
    {
      provide: CreateCommentUseCase,
      inject: [COMMENT_REPOSITORY],
      useFactory: (repository: CommentRepository) =>
        new CreateCommentUseCase(repository),
    },
    {
      provide: GetCommentsByBlogSlugUseCase,
      inject: [COMMENT_REPOSITORY],
      useFactory: (repository: CommentRepository) =>
        new GetCommentsByBlogSlugUseCase(repository),
    },
  ],
})
export class CommentModule {}

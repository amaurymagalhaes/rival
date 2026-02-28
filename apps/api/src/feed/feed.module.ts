import { Module } from '@nestjs/common';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';
import { BlogModule } from '../blog/blog.module';
import { PrismaService } from '../prisma/prisma.service';
import type { FeedQueryRepository } from '../contexts/feed/domain/feed-query.repository';
import { FEED_QUERY_REPOSITORY } from '../contexts/feed/domain/feed.tokens';
import { PrismaFeedQueryRepository } from '../contexts/feed/infrastructure/prisma-feed-query.repository';
import { GetPublicFeedUseCase } from '../contexts/feed/application/use-cases/get-public-feed.use-case';

@Module({
  imports: [BlogModule],
  controllers: [FeedController],
  providers: [
    FeedService,
    {
      provide: FEED_QUERY_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaFeedQueryRepository(prisma),
    },
    {
      provide: GetPublicFeedUseCase,
      inject: [FEED_QUERY_REPOSITORY],
      useFactory: (repository: FeedQueryRepository) =>
        new GetPublicFeedUseCase(repository),
    },
  ],
})
export class FeedModule {}

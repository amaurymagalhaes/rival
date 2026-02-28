import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';
import { QueueModule } from '../queue/queue.module';
import { PrismaService } from '../prisma/prisma.service';
import { BlogSummaryProducer } from '../queue/producers/blog-summary.producer';
import type { BlogSummaryJobsPort } from '../contexts/blog/domain/blog-summary-jobs.port';
import type { BlogRepository } from '../contexts/blog/domain/blog.repository';
import { PrismaBlogRepository } from '../contexts/blog/infrastructure/prisma-blog.repository';
import { BullMqBlogSummaryJobsAdapter } from '../contexts/blog/infrastructure/bullmq-blog-summary-jobs.adapter';
import {
  BLOG_REPOSITORY,
  BLOG_SUMMARY_JOBS_PORT,
} from '../contexts/blog/domain/blog.tokens';
import { CreateBlogUseCase } from '../contexts/blog/application/use-cases/create-blog.use-case';
import { FindUserBlogsUseCase } from '../contexts/blog/application/use-cases/find-user-blogs.use-case';
import { FindUserBlogUseCase } from '../contexts/blog/application/use-cases/find-user-blog.use-case';
import { FindPublishedBlogBySlugUseCase } from '../contexts/blog/application/use-cases/find-published-blog-by-slug.use-case';
import { UpdateBlogUseCase } from '../contexts/blog/application/use-cases/update-blog.use-case';
import { DeleteBlogUseCase } from '../contexts/blog/application/use-cases/delete-blog.use-case';

@Module({
  imports: [QueueModule],
  controllers: [BlogController],
  providers: [
    BlogService,
    {
      provide: BLOG_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => new PrismaBlogRepository(prisma),
    },
    {
      provide: BLOG_SUMMARY_JOBS_PORT,
      inject: [BlogSummaryProducer],
      useFactory: (producer: BlogSummaryProducer) =>
        new BullMqBlogSummaryJobsAdapter(producer),
    },
    {
      provide: CreateBlogUseCase,
      inject: [BLOG_REPOSITORY, BLOG_SUMMARY_JOBS_PORT],
      useFactory: (
        repository: BlogRepository,
        summaryJobs: BlogSummaryJobsPort,
      ) => new CreateBlogUseCase(repository, summaryJobs),
    },
    {
      provide: FindUserBlogsUseCase,
      inject: [BLOG_REPOSITORY],
      useFactory: (repository: BlogRepository) =>
        new FindUserBlogsUseCase(repository),
    },
    {
      provide: FindUserBlogUseCase,
      inject: [BLOG_REPOSITORY],
      useFactory: (repository: BlogRepository) =>
        new FindUserBlogUseCase(repository),
    },
    {
      provide: FindPublishedBlogBySlugUseCase,
      inject: [BLOG_REPOSITORY],
      useFactory: (repository: BlogRepository) =>
        new FindPublishedBlogBySlugUseCase(repository),
    },
    {
      provide: UpdateBlogUseCase,
      inject: [BLOG_REPOSITORY, BLOG_SUMMARY_JOBS_PORT],
      useFactory: (
        repository: BlogRepository,
        summaryJobs: BlogSummaryJobsPort,
      ) => new UpdateBlogUseCase(repository, summaryJobs),
    },
    {
      provide: DeleteBlogUseCase,
      inject: [BLOG_REPOSITORY],
      useFactory: (repository: BlogRepository) =>
        new DeleteBlogUseCase(repository),
    },
  ],
  exports: [BlogService, FindUserBlogUseCase, FindPublishedBlogBySlugUseCase],
})
export class BlogModule {}

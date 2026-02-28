import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from './queue.constants';
import { BlogSummaryProducer } from './producers/blog-summary.producer';
import { BlogSummaryProcessor } from './processors/blog-summary.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.BLOG_SUMMARY,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 86400,
          count: 1000,
        },
        removeOnFail: {
          age: 604800,
        },
      },
    }),
  ],
  providers: [BlogSummaryProducer, BlogSummaryProcessor],
  exports: [BlogSummaryProducer],
})
export class QueueModule {}

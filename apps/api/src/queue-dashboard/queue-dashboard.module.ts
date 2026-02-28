import { Module } from '@nestjs/common';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { AdminRouteMiddleware } from './admin-route.middleware';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.BLOG_SUMMARY }),
    BullBoardModule.forRootAsync({
      imports: [AuthModule],
      useFactory: () => ({
        route: '/admin/queues',
        adapter: ExpressAdapter,
        middleware: AdminRouteMiddleware,
      }),
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.BLOG_SUMMARY,
      adapter: BullMQAdapter,
    }),
  ],
})
export class QueueDashboardModule {}

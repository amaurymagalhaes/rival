import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BlogModule } from './blog/blog.module';
import { FeedModule } from './feed/feed.module';
import { LikeModule } from './like/like.module';
import { CommentModule } from './comment/comment.module';
import { SeoModule } from './seo/seo.module';
import { QueueDashboardModule } from './queue-dashboard/queue-dashboard.module';
import { QUEUE_NAMES } from './queue/queue.constants';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB ?? '0', 10),
        maxRetriesPerRequest: null,
      },
    }),
    BullModule.registerQueue({ name: QUEUE_NAMES.BLOG_SUMMARY }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }]),
    AuthModule,
    BlogModule,
    FeedModule,
    LikeModule,
    CommentModule,
    SeoModule,
    QueueDashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}

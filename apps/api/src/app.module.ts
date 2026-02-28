import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BlogModule } from './blog/blog.module';
import { FeedModule } from './feed/feed.module';
import { LikeModule } from './like/like.module';
import { CommentModule } from './comment/comment.module';
import { SeoModule } from './seo/seo.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }]),
    AuthModule,
    BlogModule,
    FeedModule,
    LikeModule,
    CommentModule,
    SeoModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}

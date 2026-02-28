import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ResilientThrottlerStorageService } from './resilient-throttler-storage.service';
import { TieredThrottlerGuard } from './tiered-throttler.guard';
import { RateLimitMetricsInterceptor } from './rate-limit-metrics.interceptor';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { REDIS_THROTTLER_STORAGE } from './rate-limiting.constants';
import Redis from 'ioredis';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 },
    ]),
  ],
  providers: [
    {
      provide: REDIS_THROTTLER_STORAGE,
      useFactory: (redisClient: Redis | null) => {
        if (!redisClient) return null;
        return new ThrottlerStorageRedisService(redisClient);
      },
      inject: [REDIS_CLIENT],
    },
    ResilientThrottlerStorageService,
    TieredThrottlerGuard,
    RateLimitMetricsInterceptor,
  ],
  exports: [
    ResilientThrottlerStorageService,
    TieredThrottlerGuard,
    RateLimitMetricsInterceptor,
    ThrottlerModule,
  ],
})
export class RateLimitingModule {}

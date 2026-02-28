import { Global, Module, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (): Redis | null => {
        const logger = new Logger('RedisModule');
        const url = process.env.REDIS_URL;
        if (!url) {
          logger.warn('REDIS_URL not set — Redis features disabled');
          return null;
        }
        try {
          const client = new Redis(url, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => Math.min(times * 200, 2000),
            enableReadyCheck: true,
            lazyConnect: true,
          });
          client.on('error', (err) =>
            logger.error(`Redis connection error: ${err.message}`),
          );
          client.connect().catch((err) =>
            logger.error(`Redis initial connect failed: ${err.message}`),
          );
          return client;
        } catch (err) {
          logger.error(`Failed to create Redis client: ${(err as Error).message}`);
          return null;
        }
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}

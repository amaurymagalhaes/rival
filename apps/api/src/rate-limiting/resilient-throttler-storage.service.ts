import { Inject, Injectable, Logger, Optional, OnModuleDestroy } from '@nestjs/common';
import {
  ThrottlerStorage,
  ThrottlerStorageRecord,
} from '@nestjs/throttler';
import { REDIS_THROTTLER_STORAGE } from './rate-limiting.constants';

interface RedisStorageLike {
  increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord>;
}

interface InMemoryRecord {
  totalHits: number;
  expiresAt: number;
  blockedUntil: number;
}

const RECOVERY_CHECK_MS = 30_000;

@Injectable()
export class ResilientThrottlerStorageService
  implements ThrottlerStorage, OnModuleDestroy
{
  private readonly logger = new Logger(ResilientThrottlerStorageService.name);
  private readonly memoryStore = new Map<string, InMemoryRecord>();
  private usingFallback = false;
  private lastFailureTime = 0;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Optional()
    @Inject(REDIS_THROTTLER_STORAGE)
    private readonly redisStorage: RedisStorageLike | null,
  ) {
    if (!redisStorage) {
      this.usingFallback = true;
      this.logger.warn('No Redis storage provided — using in-memory fallback');
    }
    this.cleanupInterval = setInterval(() => this.cleanExpired(), 60_000);
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    if (this.redisStorage && !this.shouldUseFallback()) {
      try {
        const result = await this.redisStorage.increment(
          key,
          ttl,
          limit,
          blockDuration,
          throttlerName,
        );
        if (this.usingFallback) {
          this.logger.log('Redis recovered — switching back from in-memory fallback');
          this.usingFallback = false;
          this.memoryStore.clear();
        }
        return result;
      } catch (err) {
        this.logger.error(
          `Redis storage error, falling back to in-memory: ${(err as Error).message}`,
        );
        this.usingFallback = true;
        this.lastFailureTime = Date.now();
      }
    }

    return this.incrementInMemory(key, ttl, limit, blockDuration);
  }

  private shouldUseFallback(): boolean {
    if (!this.usingFallback) return false;
    // Check if enough time has passed to retry Redis
    return Date.now() - this.lastFailureTime < RECOVERY_CHECK_MS;
  }

  private incrementInMemory(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): ThrottlerStorageRecord {
    const now = Date.now();
    let record = this.memoryStore.get(key);

    if (!record || record.expiresAt <= now) {
      record = {
        totalHits: 0,
        expiresAt: now + ttl,
        blockedUntil: 0,
      };
      this.memoryStore.set(key, record);
    }

    record.totalHits++;

    const isBlocked = record.totalHits > limit;
    if (isBlocked && record.blockedUntil === 0 && blockDuration > 0) {
      record.blockedUntil = now + blockDuration;
    }

    const timeToExpire = Math.max(0, record.expiresAt - now);
    const timeToBlockExpire = isBlocked
      ? Math.max(0, record.blockedUntil - now)
      : 0;

    return {
      totalHits: record.totalHits,
      timeToExpire,
      isBlocked,
      timeToBlockExpire,
    };
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, record] of this.memoryStore) {
      if (record.expiresAt <= now) {
        this.memoryStore.delete(key);
      }
    }
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

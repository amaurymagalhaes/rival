import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ThrottlerStorageRecord } from '@nestjs/throttler';
import { ResilientThrottlerStorageService } from './resilient-throttler-storage.service';
import { REDIS_THROTTLER_STORAGE } from './rate-limiting.constants';

describe('ResilientThrottlerStorageService', () => {
  let service: ResilientThrottlerStorageService;
  let redisStorage: { increment: jest.Mock };

  const mockRecord: ThrottlerStorageRecord = {
    totalHits: 1,
    timeToExpire: 60000,
    isBlocked: false,
    timeToBlockExpire: 0,
  };

  beforeEach(async () => {
    redisStorage = {
      increment: jest.fn().mockResolvedValue(mockRecord),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResilientThrottlerStorageService,
        {
          provide: REDIS_THROTTLER_STORAGE,
          useValue: redisStorage,
        },
      ],
    }).compile();

    service = module.get(ResilientThrottlerStorageService);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('increment — Redis healthy', () => {
    it('delegates to Redis storage when available', async () => {
      const result = await service.increment(
        'test-key',
        60000,
        10,
        0,
        'default',
      );

      expect(redisStorage.increment).toHaveBeenCalledWith(
        'test-key',
        60000,
        10,
        0,
        'default',
      );
      expect(result).toEqual(mockRecord);
    });

    it('passes through multiple calls correctly', async () => {
      const secondRecord: ThrottlerStorageRecord = {
        totalHits: 2,
        timeToExpire: 59000,
        isBlocked: false,
        timeToBlockExpire: 0,
      };

      redisStorage.increment
        .mockResolvedValueOnce(mockRecord)
        .mockResolvedValueOnce(secondRecord);

      const r1 = await service.increment('k', 60000, 10, 0, 'default');
      const r2 = await service.increment('k', 60000, 10, 0, 'default');

      expect(r1.totalHits).toBe(1);
      expect(r2.totalHits).toBe(2);
    });
  });

  describe('increment — Redis failure with fallback', () => {
    it('falls back to in-memory storage when Redis throws', async () => {
      redisStorage.increment.mockRejectedValue(new Error('Connection refused'));

      const result = await service.increment(
        'test-key',
        60000,
        10,
        0,
        'default',
      );

      expect(result).toBeDefined();
      expect(result.totalHits).toBe(1);
      expect(result.isBlocked).toBe(false);
    });

    it('increments in-memory counter on repeated calls', async () => {
      redisStorage.increment.mockRejectedValue(new Error('Redis down'));

      const r1 = await service.increment('k', 60000, 10, 0, 'default');
      const r2 = await service.increment('k', 60000, 10, 0, 'default');
      const r3 = await service.increment('k', 60000, 10, 0, 'default');

      expect(r1.totalHits).toBe(1);
      expect(r2.totalHits).toBe(2);
      expect(r3.totalHits).toBe(3);
    });

    it('blocks when limit is exceeded in memory', async () => {
      redisStorage.increment.mockRejectedValue(new Error('Redis down'));

      // Limit is 2
      await service.increment('k', 60000, 2, 30000, 'default');
      await service.increment('k', 60000, 2, 30000, 'default');
      const r3 = await service.increment('k', 60000, 2, 30000, 'default');

      expect(r3.totalHits).toBe(3);
      expect(r3.isBlocked).toBe(true);
      expect(r3.timeToBlockExpire).toBeGreaterThan(0);
    });

    it('uses separate counters for different keys', async () => {
      redisStorage.increment.mockRejectedValue(new Error('Redis down'));

      await service.increment('key-a', 60000, 10, 0, 'default');
      await service.increment('key-a', 60000, 10, 0, 'default');
      const rA = await service.increment('key-a', 60000, 10, 0, 'default');

      const rB = await service.increment('key-b', 60000, 10, 0, 'default');

      expect(rA.totalHits).toBe(3);
      expect(rB.totalHits).toBe(1);
    });
  });

  describe('recovery', () => {
    it('retries Redis after recovery interval', async () => {
      jest.useFakeTimers();

      // First call fails — triggers fallback
      redisStorage.increment.mockRejectedValueOnce(new Error('Redis down'));
      await service.increment('k', 60000, 10, 0, 'default');

      // Fast-forward past recovery check interval (30s)
      jest.advanceTimersByTime(31_000);

      // Next call should try Redis again (recovery window passed)
      redisStorage.increment.mockResolvedValueOnce(mockRecord);
      const result = await service.increment('k', 60000, 10, 0, 'default');

      // Should have used Redis (2 total calls: 1 failed + 1 recovered)
      expect(redisStorage.increment).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockRecord);

      jest.useRealTimers();
    });

    it('stays on fallback within recovery window', async () => {
      jest.useFakeTimers();

      // First call fails — triggers fallback
      redisStorage.increment.mockRejectedValueOnce(new Error('Redis down'));
      await service.increment('k', 60000, 10, 0, 'default');

      // Only 10s later (within 30s window)
      jest.advanceTimersByTime(10_000);

      // Should NOT try Redis, stays on in-memory
      const result = await service.increment('k', 60000, 10, 0, 'default');

      // Only 1 Redis call (the first failed one)
      expect(redisStorage.increment).toHaveBeenCalledTimes(1);
      expect(result.totalHits).toBe(2);

      jest.useRealTimers();
    });
  });

  describe('no Redis storage provided', () => {
    let serviceNoRedis: ResilientThrottlerStorageService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ResilientThrottlerStorageService,
          {
            provide: REDIS_THROTTLER_STORAGE,
            useValue: null,
          },
        ],
      }).compile();

      serviceNoRedis = module.get(ResilientThrottlerStorageService);
    });

    afterEach(() => {
      serviceNoRedis.onModuleDestroy();
    });

    it('uses in-memory fallback when no Redis storage is injected', async () => {
      const result = await serviceNoRedis.increment(
        'test-key',
        60000,
        10,
        0,
        'default',
      );

      expect(result).toBeDefined();
      expect(result.totalHits).toBe(1);
    });
  });
});

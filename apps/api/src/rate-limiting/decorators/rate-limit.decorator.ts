import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_TIER_KEY = 'rate-limit-tier';

export type RateLimitTier = 'strict' | 'moderate' | 'generous';

export const TIER_CONFIG: Record<RateLimitTier, { ttl: number; limit: number }> = {
  strict: { ttl: 60_000, limit: 5 },
  moderate: { ttl: 60_000, limit: 30 },
  generous: { ttl: 60_000, limit: 100 },
};

export const RateLimit = (tier: RateLimitTier): MethodDecorator & ClassDecorator =>
  SetMetadata(RATE_LIMIT_TIER_KEY, tier);

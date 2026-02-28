import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_SKIP_KEY = 'rate-limit-skip';

export const SkipRateLimit = (): MethodDecorator & ClassDecorator =>
  SetMetadata(RATE_LIMIT_SKIP_KEY, true);

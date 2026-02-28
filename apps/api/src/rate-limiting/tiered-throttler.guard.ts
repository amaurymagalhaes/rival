import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import {
  RATE_LIMIT_TIER_KEY,
  RateLimitTier,
  TIER_CONFIG,
} from './decorators/rate-limit.decorator';
import { RATE_LIMIT_SKIP_KEY } from './decorators/skip-throttle.decorator';

@Injectable()
export class TieredThrottlerGuard extends ThrottlerGuard {
  protected override async shouldSkip(
    context: ExecutionContext,
  ): Promise<boolean> {
    const reflector = this.reflector;
    const skip = reflector.getAllAndOverride<boolean>(RATE_LIMIT_SKIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return skip === true;
  }

  protected override async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const { context } = requestProps;
    const reflector = this.reflector;

    const tier = reflector.getAllAndOverride<RateLimitTier>(
      RATE_LIMIT_TIER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (tier && TIER_CONFIG[tier]) {
      const config = TIER_CONFIG[tier];
      requestProps = {
        ...requestProps,
        limit: config.limit,
        ttl: config.ttl,
      };
    }

    return super.handleRequest(requestProps);
  }

  protected override async getTracker(
    req: Record<string, any>,
  ): Promise<string> {
    // Use user ID for authenticated requests, IP for anonymous
    if (req.user?.id) {
      return `user-${req.user.id}`;
    }
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  protected override getRequestResponse(context: ExecutionContext): {
    req: Record<string, any>;
    res: Record<string, any>;
  } {
    const http = context.switchToHttp();
    return {
      req: http.getRequest(),
      res: http.getResponse(),
    };
  }
}

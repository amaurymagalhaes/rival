import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

const HIGH_USAGE_THRESHOLD = 0.8;

@Injectable()
export class RateLimitMetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitMetricsInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const limit = res.getHeader?.('X-RateLimit-Limit');
        const remaining = res.getHeader?.('X-RateLimit-Remaining');

        if (limit != null && remaining != null) {
          const limitNum = Number(limit);
          const remainingNum = Number(remaining);
          const usage = (limitNum - remainingNum) / limitNum;

          if (usage >= HIGH_USAGE_THRESHOLD) {
            const req = context.switchToHttp().getRequest();
            this.logger.warn(
              `Rate limit usage at ${Math.round(usage * 100)}% for ${req.method} ${req.url} (${remainingNum}/${limitNum} remaining)`,
            );
          }
        }
      }),
    );
  }
}

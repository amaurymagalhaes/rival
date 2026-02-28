import { RATE_LIMIT_TIER_KEY, RateLimit, TIER_CONFIG } from './rate-limit.decorator';
import { RATE_LIMIT_SKIP_KEY, SkipRateLimit } from './skip-throttle.decorator';

describe('RateLimit decorator', () => {
  it('sets strict tier metadata', () => {
    @RateLimit('strict')
    class TestController {}

    const tier = Reflect.getMetadata(RATE_LIMIT_TIER_KEY, TestController);
    expect(tier).toBe('strict');
  });

  it('sets moderate tier metadata', () => {
    @RateLimit('moderate')
    class TestController {}

    const tier = Reflect.getMetadata(RATE_LIMIT_TIER_KEY, TestController);
    expect(tier).toBe('moderate');
  });

  it('sets generous tier metadata', () => {
    @RateLimit('generous')
    class TestController {}

    const tier = Reflect.getMetadata(RATE_LIMIT_TIER_KEY, TestController);
    expect(tier).toBe('generous');
  });

  it('works as method decorator', () => {
    class TestController {
      @RateLimit('strict')
      someMethod() {}
    }

    const tier = Reflect.getMetadata(
      RATE_LIMIT_TIER_KEY,
      TestController.prototype.someMethod,
    );
    expect(tier).toBe('strict');
  });

  it('defines correct tier configurations', () => {
    expect(TIER_CONFIG.strict).toEqual({ ttl: 60_000, limit: 5 });
    expect(TIER_CONFIG.moderate).toEqual({ ttl: 60_000, limit: 30 });
    expect(TIER_CONFIG.generous).toEqual({ ttl: 60_000, limit: 100 });
  });
});

describe('SkipRateLimit decorator', () => {
  it('sets skip metadata to true', () => {
    @SkipRateLimit()
    class TestController {}

    const skip = Reflect.getMetadata(RATE_LIMIT_SKIP_KEY, TestController);
    expect(skip).toBe(true);
  });

  it('works as method decorator', () => {
    class TestController {
      @SkipRateLimit()
      someMethod() {}
    }

    const skip = Reflect.getMetadata(
      RATE_LIMIT_SKIP_KEY,
      TestController.prototype.someMethod,
    );
    expect(skip).toBe(true);
  });
});

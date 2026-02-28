import { REDIS_CLIENT } from './redis.constants';

export const mockRedisProvider = {
  provide: REDIS_CLIENT,
  useValue: null,
};

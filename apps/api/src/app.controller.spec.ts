import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QUEUE_NAMES } from './queue/queue.constants';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const mockQueue = {
      client: Promise.resolve({ status: 'ready' }),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: getQueueToken(QUEUE_NAMES.BLOG_SUMMARY), useValue: mockQueue },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should return status ok with redis connected and timestamp', async () => {
      const result = await appController.health();
      expect(result.status).toBe('ok');
      expect(result.redis).toBe('connected');
      expect(result.timestamp).toBeDefined();
    });
  });
});

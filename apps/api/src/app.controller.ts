import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { QUEUE_NAMES } from './queue/queue.constants';
import { SkipRateLimit } from './rate-limiting';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectQueue(QUEUE_NAMES.BLOG_SUMMARY) private readonly summaryQueue: Queue,
  ) {}

  @Get()
  @Public()
  @SkipRateLimit()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  @SkipRateLimit()
  async health() {
    const client = await this.summaryQueue.client;
    const redisStatus = client.status;
    return {
      status: 'ok',
      redis: redisStatus === 'ready' ? 'connected' : redisStatus,
      timestamp: new Date().toISOString(),
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '../queue.constants';
import { BlogSummaryJobData } from '../interfaces/blog-summary-job.interface';

@Injectable()
export class BlogSummaryProducer {
  private readonly logger = new Logger(BlogSummaryProducer.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.BLOG_SUMMARY)
    private readonly summaryQueue: Queue<BlogSummaryJobData>,
  ) {}

  async enqueueSummaryGeneration(data: BlogSummaryJobData): Promise<void> {
    const job = await this.summaryQueue.add(
      JOB_NAMES.GENERATE_SUMMARY,
      data,
      {
        jobId: `summary-${data.blogId}`,
      },
    );
    this.logger.log(
      `Enqueued summary generation for blog ${data.blogId} (job ${job.id})`,
    );
  }

  async enqueueRegeneration(data: BlogSummaryJobData): Promise<void> {
    const existingJobId = `summary-${data.blogId}`;
    const existingJob = await this.summaryQueue.getJob(existingJobId);
    if (existingJob) {
      const state = await existingJob.getState();
      if (state === 'waiting' || state === 'delayed') {
        await existingJob.remove();
        this.logger.log(`Removed pending summary job for blog ${data.blogId}`);
      }
    }

    const job = await this.summaryQueue.add(
      JOB_NAMES.REGENERATE_SUMMARY,
      data,
      {
        jobId: `summary-${data.blogId}-${Date.now()}`,
      },
    );
    this.logger.log(
      `Enqueued summary regeneration for blog ${data.blogId} (job ${job.id})`,
    );
  }
}

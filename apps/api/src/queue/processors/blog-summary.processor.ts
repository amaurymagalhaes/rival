import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../queue.constants';
import {
  BlogSummaryJobData,
  BlogSummaryJobResult,
} from '../interfaces/blog-summary-job.interface';

@Processor(QUEUE_NAMES.BLOG_SUMMARY, {
  concurrency: 3,
})
export class BlogSummaryProcessor extends WorkerHost {
  private readonly logger = new Logger(BlogSummaryProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(
    job: Job<BlogSummaryJobData>,
  ): Promise<BlogSummaryJobResult> {
    this.logger.log(
      `Processing summary for blog ${job.data.blogId} (attempt ${job.attemptsStarted})`,
    );

    const { blogId, content } = job.data;

    const summary = this.generateSummary(content);

    await this.prisma.blog.update({
      where: { id: blogId },
      data: { summary },
    });

    this.logger.log(
      `Summary generated for blog ${blogId}: "${summary.slice(0, 50)}..."`,
    );

    return {
      blogId,
      summary,
      generatedAt: new Date().toISOString(),
    };
  }

  generateSummary(content: string, maxLength: number = 300): string {
    const plainText = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (plainText.length <= maxLength) {
      return plainText;
    }

    const sentences = plainText.match(/[^.!?]+[.!?]+/g) || [plainText];
    let summary = '';

    for (const sentence of sentences) {
      const candidate = summary + sentence.trim() + ' ';
      if (candidate.length > maxLength && summary.length > 0) break;
      summary = candidate;
    }

    summary = summary.trim();

    if (summary.length > maxLength) {
      const truncated = summary.slice(0, maxLength);
      const lastSpace = truncated.lastIndexOf(' ');
      summary =
        (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
    }

    return summary;
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<BlogSummaryJobData>, error: Error) {
    this.logger.error(
      `Summary generation FAILED for blog ${job.data.blogId} ` +
      `(attempt ${job.attemptsStarted}/${job.opts.attempts}): ${error.message}`,
    );

    if (job.attemptsStarted >= (job.opts.attempts ?? 3)) {
      this.logger.error(
        `Blog ${job.data.blogId} summary exhausted all retries. ` +
        `Job ${job.id} moved to failed state (DLQ). Manual inspection required.`,
      );
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<BlogSummaryJobData>) {
    this.logger.log(`Summary job ${job.id} completed for blog ${job.data.blogId}`);
  }
}

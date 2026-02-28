import type { BlogSummaryProducer } from '../../../queue/producers/blog-summary.producer';
import type { BlogSummaryJobsPort } from '../domain/blog-summary-jobs.port';

export class BullMqBlogSummaryJobsAdapter implements BlogSummaryJobsPort {
  constructor(private readonly producer: BlogSummaryProducer) {}

  enqueueSummaryGeneration(payload: {
    blogId: string;
    title: string;
    content: string;
  }): Promise<void> {
    return this.producer.enqueueSummaryGeneration(payload);
  }

  enqueueRegeneration(payload: {
    blogId: string;
    title: string;
    content: string;
  }): Promise<void> {
    return this.producer.enqueueRegeneration(payload);
  }
}

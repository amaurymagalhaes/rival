import type { BlogRepository } from '../../domain/blog.repository';
import type { BlogSummaryJobsPort } from '../../domain/blog-summary-jobs.port';
import { BlogNotFoundError, BlogOwnershipError } from '../../domain/blog.errors';

export class UpdateBlogUseCase {
  constructor(
    private readonly repository: BlogRepository,
    private readonly summaryJobs: BlogSummaryJobsPort,
  ) {}

  async execute(
    id: string,
    input: { title?: string; content?: string; isPublished?: boolean },
    userId: string,
  ) {
    const existing = await this.repository.findOwnerSnapshotById(id);
    if (!existing) {
      throw new BlogNotFoundError(id);
    }

    if (existing.userId !== userId) {
      throw new BlogOwnershipError(id, userId);
    }

    const updated = await this.repository.update(id, input);

    const wasJustPublished = input.isPublished === true && !existing.isPublished;
    const contentChanged =
      updated.isPublished &&
      (input.content !== undefined || input.title !== undefined);

    if (wasJustPublished || contentChanged) {
      await this.summaryJobs.enqueueRegeneration({
        blogId: updated.id,
        title: updated.title,
        content: updated.content,
      });
    }

    return updated;
  }
}

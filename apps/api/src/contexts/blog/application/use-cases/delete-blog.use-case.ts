import type { BlogRepository } from '../../domain/blog.repository';
import { BlogNotFoundError, BlogOwnershipError } from '../../domain/blog.errors';

export class DeleteBlogUseCase {
  constructor(private readonly repository: BlogRepository) {}

  async execute(id: string, userId: string) {
    const existing = await this.repository.findOwnerSnapshotById(id);
    if (!existing) {
      throw new BlogNotFoundError(id);
    }

    if (existing.userId !== userId) {
      throw new BlogOwnershipError(id, userId);
    }

    return this.repository.delete(id);
  }
}

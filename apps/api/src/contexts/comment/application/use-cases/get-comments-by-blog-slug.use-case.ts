import type { CommentRepository } from '../../domain/comment.repository';
import { PublishedBlogNotFoundForCommentError } from '../../domain/comment.errors';

export class GetCommentsByBlogSlugUseCase {
  constructor(private readonly repository: CommentRepository) {}

  async execute(slug: string) {
    const blog = await this.repository.findPublishedBlogBySlug(slug);
    if (!blog) {
      throw new PublishedBlogNotFoundForCommentError(slug);
    }

    return this.repository.findCommentsByBlogId(blog.id);
  }
}

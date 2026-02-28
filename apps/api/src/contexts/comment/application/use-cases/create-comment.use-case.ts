import type { CommentRepository } from '../../domain/comment.repository';
import { PublishedBlogNotFoundForCommentError } from '../../domain/comment.errors';

export class CreateCommentUseCase {
  constructor(private readonly repository: CommentRepository) {}

  async execute(blogId: string, userId: string, content: string) {
    const blog = await this.repository.findPublishedBlogById(blogId);
    if (!blog) {
      throw new PublishedBlogNotFoundForCommentError(blogId);
    }

    return this.repository.createComment(blogId, userId, content);
  }
}

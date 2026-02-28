export type CommentView = {
  id: string;
  content: string;
  createdAt: Date;
  user: { id: string; name: string | null };
};

export interface CommentRepository {
  findPublishedBlogById(blogId: string): Promise<{ id: string } | null>;
  findPublishedBlogBySlug(slug: string): Promise<{ id: string } | null>;
  createComment(blogId: string, userId: string, content: string): Promise<CommentView>;
  findCommentsByBlogId(blogId: string): Promise<CommentView[]>;
}

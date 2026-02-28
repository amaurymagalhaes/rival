export interface LikeRepository {
  create(blogId: string, userId: string): Promise<void>;
  delete(blogId: string, userId: string): Promise<void>;
  countByBlogId(blogId: string): Promise<number>;
}

import type {
  BlogOwnerSnapshot,
  BlogRecord,
  CreateBlogInput,
  PublishedBlogView,
  UpdateBlogInput,
} from './blog.types';

export interface BlogRepository {
  create(input: CreateBlogInput): Promise<BlogRecord>;
  findManyByUser(userId: string): Promise<BlogRecord[]>;
  findById(id: string): Promise<BlogRecord | null>;
  findOwnerSnapshotById(id: string): Promise<BlogOwnerSnapshot | null>;
  findPublishedBySlug(slug: string): Promise<PublishedBlogView | null>;
  update(id: string, input: UpdateBlogInput): Promise<BlogRecord>;
  delete(id: string): Promise<BlogRecord>;
}

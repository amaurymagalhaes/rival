export type BlogRecord = {
  id: string;
  userId: string;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type BlogOwnerSnapshot = {
  userId: string;
  isPublished: boolean;
  title: string;
  content: string;
};

export type PublishedBlogView = {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string | null };
  _count: { likes: number; comments: number };
};

export type CreateBlogInput = {
  title: string;
  content: string;
  isPublished?: boolean;
  userId: string;
  slug: string;
};

export type UpdateBlogInput = {
  title?: string;
  content?: string;
  isPublished?: boolean;
};

export type Blog = {
  id: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BlogMutationInput = {
  title: string;
  content: string;
  isPublished: boolean;
};

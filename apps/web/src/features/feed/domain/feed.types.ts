export type FeedItem = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  createdAt: string;
  user: { id: string; name: string };
  _count: { likes: number; comments: number };
};

export type FeedResponse = {
  items: FeedItem[];
  nextCursor: string | null;
  hasNextPage: boolean;
};

export type BlogDetail = {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  createdAt: string;
  isPublished: boolean;
  user: { id: string; name: string };
  _count: { likes: number; comments: number };
};

export type Comment = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string };
};

export type LikeStatus = {
  liked: boolean;
  likeCount: number;
};

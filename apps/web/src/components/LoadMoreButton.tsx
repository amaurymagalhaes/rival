'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { getFeed, type FeedItem } from '@/app/actions/feed';
import { BlogCard } from '@/components/BlogCard';

type Props = {
  initialCursor: string | null;
};

export function LoadMoreButton({ initialCursor }: Props) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(!!initialCursor);
  const [isPending, startTransition] = useTransition();

  if (!hasMore) return null;

  function handleLoadMore() {
    startTransition(async () => {
      if (!cursor) return;
      const data = await getFeed(cursor);
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setHasMore(data.hasNextPage);
    });
  }

  return (
    <>
      {items.map((blog) => (
        <BlogCard key={blog.id} blog={blog} />
      ))}
      <div className="flex justify-center pt-4">
        <Button
          variant="outline"
          onClick={handleLoadMore}
          disabled={isPending}
        >
          {isPending ? 'Loading...' : 'Load more'}
        </Button>
      </div>
    </>
  );
}

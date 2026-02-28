'use client';

import { useState, useTransition } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FeedItem, FeedResponse } from '@/app/actions/feed';
import { BlogCard } from '@/components/BlogCard';

type Props = {
  initialCursor: string | null;
};

export function LoadMoreButton({ initialCursor }: Props) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(!!initialCursor);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!hasMore) return null;

  function handleLoadMore() {
    startTransition(async () => {
      if (!cursor) return;
      setError(null);

      const params = new URLSearchParams({ cursor, take: '20' });
      const res = await fetch(`/api/feed?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        setError('Could not load more posts. Please try again.');
        return;
      }

      const data = (await res.json()) as FeedResponse;
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
      <div className="flex flex-col items-center gap-2 pt-5">
        <Button
          variant="outline"
          onClick={handleLoadMore}
          disabled={isPending}
          className="min-w-44"
        >
          {isPending ? (
            <>
              <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
              Loading…
            </>
          ) : (
            'Load More'
          )}
        </Button>
        {error && (
          <p className="text-center text-sm text-destructive" aria-live="polite">
            {error}
          </p>
        )}
      </div>
    </>
  );
}

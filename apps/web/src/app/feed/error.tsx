'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function FeedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-lg font-semibold">Failed to load feed</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong while fetching the latest posts.
        </p>
        <Button className="mt-4" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}

'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BlogError({
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
    <main className="page-shell py-8">
      <section className="surface-panel flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-destructive/12 text-destructive">
          <AlertTriangle size={22} aria-hidden="true" />
        </span>
        <h2 className="display-title text-3xl font-semibold">Failed to load blog</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Something went wrong while loading this post. Refresh and try again.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try Again
        </Button>
      </section>
    </main>
  );
}

import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BlogNotFound() {
  return (
    <main className="page-shell py-8">
      <section className="surface-panel flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <SearchX size={22} aria-hidden="true" />
        </span>
        <h2 className="display-title text-3xl font-semibold">Blog not found</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          The blog post you are looking for does not exist or has been removed.
        </p>
        <Button asChild className="mt-6">
          <Link href="/feed">Back to Feed</Link>
        </Button>
      </section>
    </main>
  );
}

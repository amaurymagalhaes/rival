import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function BlogNotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-lg font-semibold">Blog not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The blog post you are looking for does not exist or has been removed.
        </p>
        <Link href="/feed" className="mt-4">
          <Button>Back to Feed</Button>
        </Link>
      </div>
    </main>
  );
}

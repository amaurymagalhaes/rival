import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function EmptyState() {
  return (
    <div className="surface-panel flex flex-col items-center justify-center px-6 py-14 text-center">
      <p className="kicker">Feed Status</p>
      <h2 className="display-title mt-2 text-3xl font-semibold">No blogs published yet</h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Be the first to share your thoughts and set the tone for the community.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard/new">Create Your First Blog</Link>
      </Button>
    </div>
  );
}

import { BlogCardSkeleton } from '@/components/BlogCardSkeleton';

export default function FeedLoading() {
  return (
    <main className="page-shell space-y-7 py-8">
      <section className="surface-panel p-6 sm:p-8">
        <div className="h-3 w-16 rounded-md bg-muted" />
        <div className="mt-3 h-10 w-36 rounded-md bg-muted" />
        <div className="mt-3 h-4 w-72 max-w-full rounded-md bg-muted" />
      </section>
      <section className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <BlogCardSkeleton key={i} />
        ))}
      </section>
    </main>
  );
}

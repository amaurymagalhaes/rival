import { Skeleton } from '@/components/ui/skeleton';

export default function BlogDetailLoading() {
  return (
    <main className="page-shell space-y-6 py-8">
      <section className="surface-panel p-6 sm:p-8">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="mt-4 h-10 w-3/4" />
        <Skeleton className="mt-3 h-4 w-48" />
        <div className="mt-8 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="mt-8 flex gap-3 border-t border-border/75 pt-5">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </section>
      <section className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
      </section>
    </main>
  );
}

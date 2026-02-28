import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <main className="page-shell space-y-7 py-8">
      <section className="surface-panel p-6 sm:p-8">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-10 w-56" />
        <Skeleton className="mt-3 h-4 w-2/3" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-border/75">
            <CardHeader>
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-20" />
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}

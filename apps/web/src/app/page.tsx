import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <section className="flex flex-col items-center text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Rival
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          A modern blogging platform where writers share ideas, readers discover
          stories, and everyone joins the conversation.
        </p>
        <div className="mt-8 flex gap-4">
          <Link href="/feed">
            <Button size="lg">Browse Feed</Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" size="lg">
              Get Started
            </Button>
          </Link>
        </div>
      </section>

      <section className="mt-24 grid gap-8 sm:grid-cols-3">
        <div>
          <h3 className="text-lg font-semibold">Write &amp; Publish</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create blog posts with a clean editor. Save drafts and publish when
            you are ready.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Public Feed</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Discover published posts from the community, sorted by newest first
            with infinite scroll.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Likes &amp; Comments</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Engage with posts through likes and comments. Real-time optimistic
            updates keep it snappy.
          </p>
        </div>
      </section>
    </main>
  );
}

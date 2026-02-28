import { Suspense } from 'react';
import Link from 'next/link';
import {
  IconPencil,
  IconCompass,
  IconMessageDots,
  IconChartBar,
  IconArrowRight,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { LiveFeedPreview } from '@/components/LiveFeedPreview';

const features = [
  {
    icon: IconPencil,
    title: 'Clean Editor',
    description:
      'A distraction-free writing experience. Draft at your pace, publish when you are ready.',
  },
  {
    icon: IconCompass,
    title: 'Discovery',
    description:
      'A public feed where readers find your work. No algorithms, just fresh posts front and center.',
  },
  {
    icon: IconMessageDots,
    title: 'Engagement',
    description:
      'Likes and comments from real readers. Build a conversation around every post you write.',
  },
  {
    icon: IconChartBar,
    title: 'SEO Built In',
    description:
      'AI-powered summaries and meta tags so your posts get found on search engines automatically.',
  },
];

function LiveFeedSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="surface-panel p-5">
          <div className="h-5 w-3/4 rounded-md bg-muted" />
          <div className="mt-3 h-4 w-full rounded-md bg-muted" />
          <div className="mt-1.5 h-4 w-2/3 rounded-md bg-muted" />
          <div className="mt-4 h-3 w-1/3 rounded-md bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main className="space-y-22 pb-16 pt-6 sm:pt-10">
      <section className="page-shell">
        <div className="surface-panel relative overflow-hidden px-6 py-12 sm:px-10 sm:py-16">
          <div className="pointer-events-none absolute -left-14 top-10 h-36 w-36 rounded-full bg-[oklch(0.89_0.07_228/70%)] blur-2xl" />
          <div className="pointer-events-none absolute -right-16 bottom-4 h-40 w-40 rounded-full bg-[oklch(0.9_0.08_58/70%)] blur-2xl" />
          <div className="relative mx-auto max-w-4xl text-center">
            <p className="kicker">The Blogging Platform For Bold Ideas</p>
            <h1 className="display-title mt-5 text-5xl leading-[1.05] font-semibold text-foreground sm:text-7xl">
              Write. Publish. Get read.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              HyperBlog gives you a sharp editor, instant publishing, and a feed
              built for discoverability so your work gets read, not buried.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="min-w-44">
                <Link href="/register">Start Writing — it&apos;s free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/feed" className="inline-flex items-center gap-1.5">
                  Browse All Posts
                  <IconArrowRight size={16} aria-hidden="true" />
                </Link>
              </Button>
            </div>

            <div className="mt-12 grid gap-3 text-left sm:grid-cols-3">
              <div className="rounded-xl border border-border/75 bg-white/65 p-4">
                <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  Publishing Speed
                </p>
                <p className="display-title mt-1 text-2xl font-semibold">Under 1 min</p>
              </div>
              <div className="rounded-xl border border-border/75 bg-white/65 p-4">
                <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  Content Types
                </p>
                <p className="display-title mt-1 text-2xl font-semibold">Draft & Live</p>
              </div>
              <div className="rounded-xl border border-border/75 bg-white/65 p-4">
                <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  Built For
                </p>
                <p className="display-title mt-1 text-2xl font-semibold">Writers & Teams</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell">
        <div className="mb-8 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="kicker">Live Community Pulse</p>
            <h2 className="display-title mt-2 text-3xl font-semibold sm:text-4xl">
              What&apos;s being written right now
            </h2>
            <p className="mt-2 text-muted-foreground">
              Fresh posts from the HyperBlog community
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/feed">Open Full Feed</Link>
          </Button>
        </div>

        <Suspense fallback={<LiveFeedSkeleton />}>
          <LiveFeedPreview />
        </Suspense>
      </section>

      <section className="page-shell">
        <div className="surface-panel px-6 py-10 sm:px-8">
          <h2 className="display-title text-center text-3xl font-semibold sm:text-4xl">
            Everything you need to write and grow
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-border/75 bg-white/72 p-5"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <feature.icon size={20} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell">
        <div className="surface-panel relative overflow-hidden px-6 py-12 text-center sm:px-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_90%_at_50%_100%,oklch(0.88_0.08_228/40%),transparent)]" />
          <div className="relative">
            <h2 className="display-title text-3xl font-semibold sm:text-5xl">
              Your next post is waiting
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Start publishing with a visual style that feels editorial from day one.
            </p>
            <div className="mt-7">
              <Button asChild size="lg" className="min-w-44">
                <Link href="/register">Start Writing — it&apos;s free</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

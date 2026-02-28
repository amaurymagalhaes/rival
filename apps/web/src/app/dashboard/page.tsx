import Link from 'next/link';
import { FileText, Plus, Sparkles } from 'lucide-react';
import { getBlogs } from '@/app/actions/blogs';
import { DeleteBlogButton } from '@/components/DeleteBlogButton';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export default async function DashboardPage() {
  const blogs = await getBlogs();
  const publishedCount = blogs.filter((blog) => blog.isPublished).length;
  const draftCount = blogs.length - publishedCount;

  return (
    <main className="page-shell space-y-7 py-8">
      <section className="surface-panel p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="kicker">Author Workspace</p>
            <h1 className="display-title mt-2 text-4xl font-semibold">My Blogs</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Manage drafts, keep published posts updated, and maintain a
              consistent editorial cadence.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/new" className="inline-flex items-center gap-1.5">
              <Plus size={16} aria-hidden="true" />
              New Blog
            </Link>
          </Button>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/75 bg-white/72 p-4">
            <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
              Total Posts
            </p>
            <p className="display-title mt-1 text-3xl font-semibold">{blogs.length}</p>
          </div>
          <div className="rounded-xl border border-border/75 bg-white/72 p-4">
            <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
              Published
            </p>
            <p className="display-title mt-1 text-3xl font-semibold">{publishedCount}</p>
          </div>
          <div className="rounded-xl border border-border/75 bg-white/72 p-4">
            <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
              Drafts
            </p>
            <p className="display-title mt-1 text-3xl font-semibold">{draftCount}</p>
          </div>
        </div>
      </section>

      {blogs.length === 0 ? (
        <section className="surface-panel flex flex-col items-center px-6 py-14 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Sparkles size={20} aria-hidden="true" />
          </span>
          <h2 className="display-title mt-4 text-3xl font-semibold">No blogs yet</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Create your first post and publish it to the feed.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/new">Create Your First Blog</Link>
          </Button>
        </section>
      ) : (
        <section className="space-y-4">
          {blogs.map((blog) => (
            <Card key={blog.id} className="border-border/75">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{blog.title}</CardTitle>
                    <CardDescription>
                      Created on {dateFormatter.format(new Date(blog.createdAt))}
                    </CardDescription>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-lg border border-border/75 bg-accent/75 px-2.5 py-1 text-xs font-semibold tracking-[0.08em] uppercase text-accent-foreground">
                    <FileText size={13} aria-hidden="true" />
                    {blog.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2.5">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/edit/${blog.id}`}>Edit</Link>
                </Button>
                <DeleteBlogButton blogId={blog.id} />
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}

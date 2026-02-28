import { BlogEditor } from '@/components/BlogEditor';

export default function NewBlogPage() {
  return (
    <main className="page-shell space-y-6 py-8">
      <section className="surface-panel p-6 sm:p-8">
        <p className="kicker">Drafting</p>
        <h1 className="display-title mt-2 text-4xl font-semibold">New Blog</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Create a clear headline, write your perspective, and publish when it is ready.
        </p>
      </section>
      <div className="mx-auto flex max-w-5xl justify-center">
        <BlogEditor />
      </div>
    </main>
  );
}

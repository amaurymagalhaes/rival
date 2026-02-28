import { notFound } from 'next/navigation';
import { getBlog } from '@/app/actions/blogs';
import { BlogEditor } from '@/components/BlogEditor';
import { SeoPanel } from '@/components/SeoPanel';

type EditBlogPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditBlogPage({ params }: EditBlogPageProps) {
  const { id } = await params;
  const blog = await getBlog(id);

  if (!blog) {
    notFound();
  }

  return (
    <main className="page-shell space-y-6 py-8">
      <section className="surface-panel p-6 sm:p-8">
        <p className="kicker">Editing</p>
        <h1 className="display-title mt-2 text-4xl font-semibold">Edit Blog</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Update your article content and tune metadata before publishing updates.
        </p>
      </section>
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6">
        <BlogEditor blog={blog} />
        <SeoPanel blogId={blog.id} />
      </div>
    </main>
  );
}

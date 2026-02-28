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
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-8">
      <BlogEditor blog={blog} />
      <SeoPanel blogId={blog.id} />
    </div>
  );
}

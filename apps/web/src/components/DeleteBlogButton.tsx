'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteBlog } from '@/app/actions/blogs';
import { Button } from '@/components/ui/button';

type DeleteBlogButtonProps = {
  blogId: string;
};

export function DeleteBlogButton({ blogId }: DeleteBlogButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteBlog(blogId);
    if (result.error) {
      alert(result.error);
      setDeleting(false);
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting...' : 'Confirm'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={deleting}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => setConfirming(true)}
    >
      Delete
    </Button>
  );
}

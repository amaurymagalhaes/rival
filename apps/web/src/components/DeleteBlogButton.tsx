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
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const result = await deleteBlog(blogId);
    if (result.error) {
      setError(result.error);
      setDeleting(false);
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Confirm Delete'}
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
        {error && (
          <p className="text-sm text-destructive" aria-live="polite">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        Delete
      </Button>
      {error && (
        <p className="text-sm text-destructive" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}

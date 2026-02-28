'use client';

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toggleLike } from '@/app/actions/feed';

type Props = {
  blogId: string;
  initialLiked: boolean;
  initialCount: number;
};

export function LikeButton({ blogId, initialLiked, initialCount }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount(wasLiked ? count - 1 : count + 1);

    startTransition(async () => {
      await toggleLike(blogId, wasLiked);
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className="gap-1.5"
    >
      <Heart
        className={liked ? 'fill-red-500 text-red-500' : ''}
        size={16}
      />
      <span>{count}</span>
    </Button>
  );
}

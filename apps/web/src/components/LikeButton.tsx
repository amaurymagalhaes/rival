'use client';

import { useState, useTransition } from 'react';
import { Heart, LoaderCircle } from 'lucide-react';
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
    const prevLiked = liked;
    const prevCount = count;
    const newLiked = !prevLiked;

    setLiked(newLiked);
    setCount(newLiked ? prevCount + 1 : prevCount - 1);

    startTransition(async () => {
      try {
        await toggleLike(blogId, newLiked);
      } catch {
        setLiked(prevLiked);
        setCount(prevCount);
      }
    });
  }

  return (
    <Button
      variant={liked ? 'default' : 'outline'}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className="gap-2"
    >
      {isPending ? (
        <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
      ) : (
        <Heart className={liked ? 'fill-current' : ''} size={16} aria-hidden="true" />
      )}
      <span className="tabular-nums">{count}</span>
    </Button>
  );
}

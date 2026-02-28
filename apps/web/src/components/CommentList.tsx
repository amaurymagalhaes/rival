import { getComments } from '@/app/actions/feed';
import { CommentItem } from '@/components/CommentItem';

type Props = {
  slug: string;
};

export async function CommentList({ slug }: Props) {
  const comments = await getComments(slug);

  if (comments.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No comments yet. Be the first to comment.
      </p>
    );
  }

  return (
    <div>
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
}

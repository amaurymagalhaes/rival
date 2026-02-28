import { getComments } from '@/app/actions/feed';
import { CommentItem } from '@/components/CommentItem';

type Props = {
  slug: string;
};

export async function CommentList({ slug }: Props) {
  const comments = await getComments(slug);

  if (comments.length === 0) {
    return (
      <div className="surface-panel px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          No comments yet. Be the first to comment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
}

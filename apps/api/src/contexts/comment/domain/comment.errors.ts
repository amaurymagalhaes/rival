export class PublishedBlogNotFoundForCommentError extends Error {
  constructor(public readonly reference: string) {
    super('Blog not found');
  }
}

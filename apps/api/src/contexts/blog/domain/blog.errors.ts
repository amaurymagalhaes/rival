export class BlogNotFoundError extends Error {
  constructor(public readonly blogId: string) {
    super('Blog not found');
  }
}

export class BlogOwnershipError extends Error {
  constructor(public readonly blogId: string, public readonly userId: string) {
    super('Not the blog owner');
  }
}

export class DuplicateBlogSlugError extends Error {
  constructor(public readonly slug: string) {
    super('Duplicate blog slug');
  }
}

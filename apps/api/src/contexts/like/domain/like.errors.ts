export class DuplicateLikeError extends Error {
  constructor(public readonly blogId: string, public readonly userId: string) {
    super('Already liked');
  }
}

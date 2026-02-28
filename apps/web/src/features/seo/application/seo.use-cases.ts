import type { SeoGateway, SeoAnalysisResult } from '../domain/seo.gateway';

export class SeoUseCases {
  constructor(private readonly gateway: SeoGateway) {}

  analyzeBlogSeo(
    blogId: string,
    headers: Record<string, string>,
  ): Promise<SeoAnalysisResult> {
    const normalizedBlogId = blogId.trim();
    if (!normalizedBlogId) {
      return Promise.resolve({ error: 'Invalid blog id' });
    }

    if (typeof headers.Authorization !== 'string' || !headers.Authorization) {
      return Promise.resolve({ error: 'Authentication required' });
    }

    return this.gateway.analyzeBlogSeo(normalizedBlogId, headers);
  }
}

import { createApiUrl } from '@/lib/api';
import type { SeoGateway, SeoAnalysisResult } from '../domain/seo.gateway';
import type { SeoAnalysis } from '../domain/seo.types';

function parseErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const maybeMessage = (data as { message?: unknown }).message;
  if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
    return maybeMessage;
  }

  return fallback;
}

export class HttpSeoGateway implements SeoGateway {
  async analyzeBlogSeo(
    blogId: string,
    headers: Record<string, string>,
  ): Promise<SeoAnalysisResult> {
    const response = await fetch(createApiUrl(`/blogs/${blogId}/seo-analysis`), {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { error: parseErrorMessage(data, 'Failed to analyze SEO') };
    }

    return { data: (await response.json()) as SeoAnalysis };
  }
}

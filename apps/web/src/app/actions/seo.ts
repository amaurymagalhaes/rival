'use server';

import { createApiUrl } from '@/lib/api';
import { getAuthHeaders } from '@/lib/auth';

export type SeoAnalysis = {
  readability: {
    score: number;
    level: string;
    avgWordsPerSentence: number;
    avgSyllablesPerWord: number;
  };
  keywords: {
    topKeywords: { word: string; count: number; density: number }[];
    totalWords: number;
  };
  metaDescription: string;
  readingTime: {
    minutes: number;
    wordCount: number;
  };
  titleAnalysis: {
    length: number;
    isOptimalLength: boolean;
    hasNumbers: boolean;
    hasPowerWords: boolean;
    suggestions: string[];
  };
  suggestions: string[];
};

export async function analyzeSeo(
  blogId: string,
): Promise<{ data?: SeoAnalysis; error?: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(createApiUrl(`/blogs/${blogId}/seo-analysis`), {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.message || 'Failed to analyze SEO' };
  }

  return { data: await res.json() };
}

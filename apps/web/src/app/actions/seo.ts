'use server';

import { getAuthHeaders } from '@/lib/auth';
import { analyzeBlogSeo } from '@/features/seo';
import type { SeoAnalysis } from '@/features/seo/domain/seo.types';

export type { SeoAnalysis } from '@/features/seo/domain/seo.types';

export async function analyzeSeo(
  blogId: string,
): Promise<{ data?: SeoAnalysis; error?: string }> {
  const headers = await getAuthHeaders();
  return analyzeBlogSeo(blogId, headers);
}

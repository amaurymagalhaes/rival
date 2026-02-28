import type { SeoAnalysis } from './seo.types';

export type SeoAnalysisResult = { data?: SeoAnalysis; error?: string };

export interface SeoGateway {
  analyzeBlogSeo(
    blogId: string,
    headers: Record<string, string>,
  ): Promise<SeoAnalysisResult>;
}

import { SeoUseCases } from './application/seo.use-cases';
import { HttpSeoGateway } from './infrastructure/seo-api.gateway';

const seoUseCases = new SeoUseCases(new HttpSeoGateway());

export const analyzeBlogSeo = seoUseCases.analyzeBlogSeo.bind(seoUseCases);

export type { SeoAnalysisResult } from './domain/seo.gateway';
export type { SeoAnalysis } from './domain/seo.types';

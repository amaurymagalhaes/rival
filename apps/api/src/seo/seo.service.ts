import { Injectable } from '@nestjs/common';
import {
  AnalyzeBlogSeoUseCase,
} from '../contexts/seo/application/use-cases/analyze-blog-seo.use-case';
import type { SeoAnalysis } from '../contexts/seo/domain/seo-analyzer';

@Injectable()
export class SeoService {
  constructor(private readonly analyzeBlogSeoUseCase: AnalyzeBlogSeoUseCase) {}

  analyzeBlog(title: string, content: string, summary?: string): SeoAnalysis {
    return this.analyzeBlogSeoUseCase.execute(title, content, summary);
  }
}

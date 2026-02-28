import type { SeoAnalysis } from '../../domain/seo-analyzer';
import { SeoAnalyzer } from '../../domain/seo-analyzer';

export class AnalyzeBlogSeoUseCase {
  constructor(private readonly analyzer: SeoAnalyzer = new SeoAnalyzer()) {}

  execute(title: string, content: string, summary?: string): SeoAnalysis {
    return this.analyzer.analyze(title, content, summary);
  }
}

import { SeoService } from './seo.service';
import { AnalyzeBlogSeoUseCase } from '../contexts/seo/application/use-cases/analyze-blog-seo.use-case';

describe('SeoService', () => {
  let service: SeoService;

  beforeEach(() => {
    service = new SeoService(new AnalyzeBlogSeoUseCase());
  });

  it('should calculate readability score within valid range', () => {
    const result = service.analyzeBlog(
      'Simple Title',
      'The cat sat on the mat. Dogs are great pets. Birds can fly high.',
    );

    expect(result.readability.score).toBeGreaterThanOrEqual(0);
    expect(result.readability.score).toBeLessThanOrEqual(100);
    expect(['easy', 'moderate', 'hard']).toContain(result.readability.level);
    expect(result.readability.avgWordsPerSentence).toBeGreaterThan(0);
    expect(result.readability.avgSyllablesPerWord).toBeGreaterThan(0);
  });

  it('should score simple text as easy readability', () => {
    const result = service.analyzeBlog(
      'Easy Read',
      'The cat sat on a mat. It was a red mat. The cat was fat. It liked the mat a lot. The dog ran by. The cat did not move.',
    );

    expect(result.readability.level).toBe('easy');
    expect(result.readability.score).toBeGreaterThanOrEqual(60);
  });

  it('should exclude stop words from keyword extraction', () => {
    const result = service.analyzeBlog(
      'Test Post',
      'The the the the the and and and and and JavaScript JavaScript JavaScript React React TypeScript programming programming code code code',
    );

    const keywordWords = result.keywords.topKeywords.map((k) => k.word);
    expect(keywordWords).not.toContain('the');
    expect(keywordWords).not.toContain('and');
    expect(keywordWords).toContain('javascript');
    expect(result.keywords.topKeywords[0].word).toBe('javascript');
    expect(result.keywords.topKeywords[0].count).toBe(3);
  });

  it('should return at most 5 keywords', () => {
    const result = service.analyzeBlog(
      'Keywords Test',
      'alpha alpha beta beta gamma gamma delta delta epsilon epsilon zeta zeta eta eta theta theta',
    );

    expect(result.keywords.topKeywords.length).toBeLessThanOrEqual(5);
  });

  it('should use summary as meta description when provided', () => {
    const result = service.analyzeBlog(
      'Test Title',
      'Some blog content here for testing purposes.',
      'A custom summary for the blog post',
    );

    expect(result.metaDescription).toBe('A custom summary for the blog post');
  });

  it('should truncate meta description to 160 characters', () => {
    const longContent = 'This is a very long sentence that goes on and on. '.repeat(10);
    const result = service.analyzeBlog('Test', longContent);

    expect(result.metaDescription.length).toBeLessThanOrEqual(163); // 160 + '...'
  });

  it('should strip HTML tags before analysis', () => {
    const htmlContent = '<p>Hello <strong>world</strong></p><p>This is a <a href="#">test</a> post.</p>';
    const plainContent = 'Hello world This is a test post.';

    const htmlResult = service.analyzeBlog('Test', htmlContent);
    const plainResult = service.analyzeBlog('Test', plainContent);

    expect(htmlResult.keywords.totalWords).toBe(plainResult.keywords.totalWords);
    expect(htmlResult.readingTime.wordCount).toBe(plainResult.readingTime.wordCount);
  });

  it('should strip HTML from summary in meta description', () => {
    const result = service.analyzeBlog(
      'Test',
      'Content here.',
      '<p>A <strong>bold</strong> summary</p>',
    );

    expect(result.metaDescription).not.toContain('<');
    expect(result.metaDescription).toBe('A bold summary');
  });

  it('should calculate reading time based on 200 WPM', () => {
    // 200 words = 1 minute
    const words = Array(200).fill('word').join(' ');
    const result = service.analyzeBlog('Test', words);

    expect(result.readingTime.minutes).toBe(1);
    expect(result.readingTime.wordCount).toBe(200);
  });

  it('should flag title under 50 chars as suboptimal', () => {
    const result = service.analyzeBlog('Short', 'Some content here for analysis.');

    expect(result.titleAnalysis.isOptimalLength).toBe(false);
    expect(result.titleAnalysis.suggestions.length).toBeGreaterThan(0);
    expect(result.titleAnalysis.suggestions[0]).toContain('50-60');
  });

  it('should mark title in 50-60 char range as optimal', () => {
    const title = 'A Perfectly Sized Blog Post Title for SEO Purposes';
    expect(title.length).toBeGreaterThanOrEqual(50);
    expect(title.length).toBeLessThanOrEqual(60);

    const result = service.analyzeBlog(title, 'Some content here.');

    expect(result.titleAnalysis.isOptimalLength).toBe(true);
  });

  it('should detect power words in title', () => {
    const result = service.analyzeBlog(
      'The Ultimate Guide to Testing',
      'Content about testing.',
    );

    expect(result.titleAnalysis.hasPowerWords).toBe(true);
  });

  it('should generate suggestions for short content', () => {
    const result = service.analyzeBlog('Test', 'Short content.');

    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.stringContaining('300 words'),
      ]),
    );
  });
});

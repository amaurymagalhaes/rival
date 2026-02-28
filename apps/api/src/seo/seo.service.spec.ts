import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;

  beforeEach(() => {
    service = new SeoService();
  });

  it('should analyze a blog post and return the expected structure', () => {
    const result = service.analyzeBlog(
      'How to Build a REST API with NestJS',
      'NestJS is a progressive Node.js framework for building efficient server-side applications. It uses TypeScript by default and combines elements of OOP, FP, and FRP. In this tutorial, we will walk through creating a REST API step by step. First, install NestJS CLI globally. Then scaffold a new project. Controllers handle incoming requests and return responses. Services contain business logic. Modules organize the application structure. Guards protect routes from unauthorized access. Pipes validate and transform input data. Interceptors add extra logic before and after method execution.',
    );

    expect(result).toHaveProperty('readability');
    expect(result.readability).toHaveProperty('score');
    expect(result.readability).toHaveProperty('level');
    expect(result.readability).toHaveProperty('avgWordsPerSentence');
    expect(result.readability).toHaveProperty('avgSyllablesPerWord');

    expect(result).toHaveProperty('keywords');
    expect(result.keywords).toHaveProperty('topKeywords');
    expect(result.keywords).toHaveProperty('totalWords');
    expect(Array.isArray(result.keywords.topKeywords)).toBe(true);
    expect(result.keywords.topKeywords.length).toBeGreaterThan(0);
    expect(result.keywords.topKeywords[0]).toHaveProperty('word');
    expect(result.keywords.topKeywords[0]).toHaveProperty('count');
    expect(result.keywords.topKeywords[0]).toHaveProperty('density');

    expect(result).toHaveProperty('metaDescription');
    expect(typeof result.metaDescription).toBe('string');
    expect(result.metaDescription.length).toBeLessThanOrEqual(160);

    expect(result).toHaveProperty('readingTime');
    expect(result.readingTime).toHaveProperty('minutes');
    expect(result.readingTime).toHaveProperty('wordCount');

    expect(result).toHaveProperty('titleAnalysis');
    expect(result.titleAnalysis).toHaveProperty('length');
    expect(result.titleAnalysis).toHaveProperty('isOptimalLength');
    expect(result.titleAnalysis).toHaveProperty('hasNumbers');
    expect(result.titleAnalysis).toHaveProperty('hasPowerWords');
    expect(result.titleAnalysis).toHaveProperty('suggestions');

    expect(result).toHaveProperty('suggestions');
    expect(Array.isArray(result.suggestions)).toBe(true);
  });

  it('should return a readability score within valid range (0-100)', () => {
    const result = service.analyzeBlog(
      'Simple Title',
      'This is a short sentence. Here is another one. And a third. The cat sat on the mat. Dogs are great pets. Birds can fly high in the sky.',
    );

    expect(result.readability.score).toBeGreaterThanOrEqual(0);
    expect(result.readability.score).toBeLessThanOrEqual(100);
    expect(['easy', 'moderate', 'hard']).toContain(result.readability.level);
  });

  it('should exclude stop words from keyword extraction', () => {
    const result = service.analyzeBlog(
      'Test Post',
      'The the the the the and and and and and JavaScript JavaScript JavaScript React React TypeScript programming programming code code code',
    );

    const keywordWords = result.keywords.topKeywords.map((k) => k.word);
    const stopWords = ['the', 'and', 'is', 'a', 'an', 'in', 'on', 'at', 'to', 'for'];
    for (const stopWord of stopWords) {
      expect(keywordWords).not.toContain(stopWord);
    }
    expect(keywordWords).toContain('javascript');
  });

  it('should handle optional summary parameter', () => {
    const result = service.analyzeBlog(
      'Test Title',
      'Some blog content here for testing purposes. This is the body of the article.',
      'A custom summary for the blog post',
    );

    expect(result.metaDescription).toBe('A custom summary for the blog post');
  });
});

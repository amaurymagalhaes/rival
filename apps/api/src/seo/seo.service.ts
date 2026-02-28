import { Injectable } from '@nestjs/common';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'as', 'was', 'are', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need',
  'not', 'no', 'nor', 'so', 'if', 'then', 'than', 'that', 'this',
  'these', 'those', 'which', 'what', 'where', 'when', 'who', 'whom',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'only', 'own', 'same', 'too', 'very', 'just', 'about',
  'above', 'after', 'again', 'also', 'any', 'because', 'before', 'below',
  'between', 'during', 'into', 'its', 'out', 'over', 'through', 'under',
  'up', 'we', 'he', 'she', 'they', 'them', 'his', 'her', 'our', 'your',
  'my', 'me', 'him', 'us', 'i', 'you',
]);

const POWER_WORDS = new Set([
  'ultimate', 'essential', 'proven', 'powerful', 'complete', 'definitive',
  'comprehensive', 'expert', 'secret', 'amazing', 'incredible', 'easy',
  'simple', 'fast', 'free', 'best', 'top', 'new', 'effective', 'guaranteed',
]);

export interface SeoAnalysis {
  readability: {
    score: number;
    level: 'easy' | 'moderate' | 'hard';
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
}

@Injectable()
export class SeoService {
  analyzeBlog(title: string, content: string, summary?: string): SeoAnalysis {
    const words = this.extractWords(content);
    const sentences = this.extractSentences(content);
    const totalWords = words.length;

    const readability = this.analyzeReadability(words, sentences);
    const keywords = this.analyzeKeywords(words, totalWords);
    const metaDescription = this.generateMetaDescription(content, summary);
    const readingTime = this.calculateReadingTime(totalWords);
    const titleAnalysis = this.analyzeTitle(title);
    const suggestions = this.generateSuggestions(readability, keywords, titleAnalysis, totalWords);

    return {
      readability,
      keywords,
      metaDescription,
      readingTime,
      titleAnalysis,
      suggestions,
    };
  }

  private extractWords(text: string): string[] {
    return text.toLowerCase().match(/[a-z']+/g) || [];
  }

  private extractSentences(text: string): string[] {
    return text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  }

  private countSyllables(word: string): number {
    const w = word.toLowerCase().replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    const matches = w.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  private analyzeReadability(
    words: string[],
    sentences: string[],
  ): SeoAnalysis['readability'] {
    const sentenceCount = Math.max(sentences.length, 1);
    const wordCount = Math.max(words.length, 1);

    const avgWordsPerSentence = Math.round((wordCount / sentenceCount) * 10) / 10;
    const totalSyllables = words.reduce((sum, w) => sum + this.countSyllables(w), 0);
    const avgSyllablesPerWord = Math.round((totalSyllables / wordCount) * 10) / 10;

    // Flesch Reading Ease formula
    const rawScore =
      206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
    const score = Math.round(Math.max(0, Math.min(100, rawScore)));

    let level: 'easy' | 'moderate' | 'hard';
    if (score >= 60) level = 'easy';
    else if (score >= 30) level = 'moderate';
    else level = 'hard';

    return { score, level, avgWordsPerSentence, avgSyllablesPerWord };
  }

  private analyzeKeywords(
    words: string[],
    totalWords: number,
  ): SeoAnalysis['keywords'] {
    const freq = new Map<string, number>();
    for (const word of words) {
      if (word.length < 2 || STOP_WORDS.has(word)) continue;
      freq.set(word, (freq.get(word) || 0) + 1);
    }

    const topKeywords = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({
        word,
        count,
        density: Math.round((count / Math.max(totalWords, 1)) * 10000) / 100,
      }));

    return { topKeywords, totalWords };
  }

  private generateMetaDescription(content: string, summary?: string): string {
    if (summary) return summary.slice(0, 160);

    const cleaned = content.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= 160) return cleaned;
    const truncated = cleaned.slice(0, 157);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
  }

  private calculateReadingTime(
    wordCount: number,
  ): SeoAnalysis['readingTime'] {
    const wordsPerMinute = 200;
    return {
      minutes: Math.max(1, Math.ceil(wordCount / wordsPerMinute)),
      wordCount,
    };
  }

  private analyzeTitle(title: string): SeoAnalysis['titleAnalysis'] {
    const length = title.length;
    const isOptimalLength = length >= 30 && length <= 60;
    const hasNumbers = /\d/.test(title);
    const titleWords = title.toLowerCase().split(/\s+/);
    const hasPowerWords = titleWords.some((w) => POWER_WORDS.has(w));

    const suggestions: string[] = [];
    if (length < 30) suggestions.push('Title is too short. Aim for 30-60 characters.');
    if (length > 60) suggestions.push('Title is too long. Keep it under 60 characters for SEO.');
    if (!hasNumbers) suggestions.push('Consider adding numbers to your title for better CTR.');
    if (!hasPowerWords) suggestions.push('Add power words (e.g., "ultimate", "proven", "essential") to make the title more compelling.');

    return { length, isOptimalLength, hasNumbers, hasPowerWords, suggestions };
  }

  private generateSuggestions(
    readability: SeoAnalysis['readability'],
    keywords: SeoAnalysis['keywords'],
    titleAnalysis: SeoAnalysis['titleAnalysis'],
    totalWords: number,
  ): string[] {
    const suggestions: string[] = [];

    if (readability.score < 30) {
      suggestions.push('Content readability is low. Use shorter sentences and simpler words.');
    }
    if (readability.avgWordsPerSentence > 25) {
      suggestions.push('Sentences are too long on average. Aim for under 20 words per sentence.');
    }
    if (totalWords < 300) {
      suggestions.push('Content is short. Aim for at least 300 words for better SEO.');
    }
    if (keywords.topKeywords.length > 0 && keywords.topKeywords[0].density > 5) {
      suggestions.push('Top keyword density is high. Avoid keyword stuffing.');
    }
    suggestions.push(...titleAnalysis.suggestions);

    return suggestions;
  }
}

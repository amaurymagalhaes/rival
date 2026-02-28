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

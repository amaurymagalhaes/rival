// Blog SEO Analyzer — Cortex One Function
// Analyzes blog post content and returns structured SEO insights including
// readability scoring, keyword density, meta description generation,
// reading time estimation, and title effectiveness analysis.
//
// Zero external dependencies. All text analysis is performed locally.

// ─── Types ───────────────────────────────────────────────────────────────────

interface BlogInput {
  title: string;
  content: string;
  summary?: string;
}

interface ReadabilityResult {
  score: number;
  level: "Easy" | "Moderate" | "Difficult";
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
}

interface KeywordEntry {
  word: string;
  count: number;
  density: number;
}

interface KeywordsResult {
  topKeywords: KeywordEntry[];
  totalWords: number;
}

interface ReadingTimeResult {
  minutes: number;
  wordCount: number;
}

interface TitleAnalysisResult {
  length: number;
  isOptimalLength: boolean;
  hasNumbers: boolean;
  hasPowerWords: boolean;
  suggestions: string[];
}

interface SEOAnalysis {
  readability: ReadabilityResult;
  keywords: KeywordsResult;
  metaDescription: string;
  readingTime: ReadingTimeResult;
  titleAnalysis: TitleAnalysisResult;
  suggestions: string[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to",
  "for", "of", "and", "or", "but", "with", "by", "from", "as", "this",
  "that", "it", "be", "been", "being", "have", "has", "had", "do", "does",
  "did", "will", "would", "could", "should", "may", "might", "shall",
  "can", "need", "dare", "ought", "used", "not", "no", "nor", "so", "yet",
  "both", "each", "few", "more", "most", "other", "some", "such", "than",
  "too", "very", "just", "about", "above", "after", "again", "all", "also",
  "am", "any", "because", "before", "between", "during", "here", "how",
  "i", "if", "into", "its", "let", "me", "my", "myself", "now", "only",
  "our", "out", "own", "same", "she", "he", "her", "him", "his", "hers",
  "they", "them", "their", "then", "there", "these", "those", "through",
  "under", "until", "up", "we", "what", "when", "where", "which", "while",
  "who", "whom", "why", "you", "your", "yours",
]);

const POWER_WORDS = [
  "ultimate", "complete", "essential", "definitive", "comprehensive",
  "proven", "powerful", "best", "top", "guide", "secret", "amazing",
  "incredible",
];

const VOWELS = new Set(["a", "e", "i", "o", "u"]);

// Average reading speed in words per minute
const WPM = 200;

// ─── Text Utilities ──────────────────────────────────────────────────────────

/** Strip HTML tags so we work with plain text. */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Extract words from plain text (lowercase, alphabetic only). */
function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/**
 * Count syllables in a word using a vowel-group heuristic:
 *  1. Count groups of consecutive vowels.
 *  2. Subtract 1 for a silent trailing "e".
 *  3. Minimum of 1 syllable per word.
 */
function countSyllables(word: string): number {
  const lower = word.toLowerCase();
  let count = 0;
  let prevVowel = false;

  for (const ch of lower) {
    const isVowel = VOWELS.has(ch);
    if (isVowel && !prevVowel) {
      count++;
    }
    prevVowel = isVowel;
  }

  // Silent-e: if the word ends in "e" and we counted more than 1 group
  if (lower.endsWith("e") && count > 1) {
    count--;
  }

  return Math.max(1, count);
}

/** Split text into sentences on ., !, or ? followed by whitespace or end-of-string. */
function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+(?:\s|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ─── Analysis Functions ──────────────────────────────────────────────────────

function analyzeReadability(words: string[], sentences: string[]): ReadabilityResult {
  const totalWords = words.length;
  const totalSentences = Math.max(sentences.length, 1);
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const avgWordsPerSentence = totalWords / totalSentences;
  const avgSyllablesPerWord = totalSyllables / Math.max(totalWords, 1);

  // Flesch Reading Ease (0-100, higher = easier to read)
  const rawScore =
    206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  let level: "Easy" | "Moderate" | "Difficult";
  if (score >= 60) {
    level = "Easy";
  } else if (score >= 30) {
    level = "Moderate";
  } else {
    level = "Difficult";
  }

  return {
    score,
    level,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
  };
}

function analyzeKeywords(words: string[]): KeywordsResult {
  const totalWords = words.length;
  const freq: Record<string, number> = {};

  for (const w of words) {
    if (w.length < 2 || STOP_WORDS.has(w)) continue;
    freq[w] = (freq[w] || 0) + 1;
  }

  const topKeywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({
      word,
      count,
      density: Math.round((count / totalWords) * 100 * 100) / 100,
    }));

  return { topKeywords, totalWords };
}

/**
 * Generate a meta description from the content.
 * Takes the first 2-3 sentences and trims to 160 characters at a word boundary.
 */
function generateMetaDescription(plainText: string, summary?: string): string {
  // Prefer the author-provided summary if available
  const source = summary && summary.trim().length > 0 ? summary.trim() : plainText;

  const sentences = splitSentences(source);
  let desc = sentences.slice(0, 3).join(". ");

  // Ensure it ends with a period if original sentences had one
  if (desc.length > 0 && !desc.endsWith(".")) {
    desc += ".";
  }

  if (desc.length <= 160) {
    return desc;
  }

  // Trim to 160 chars at a word boundary
  const truncated = desc.slice(0, 160);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + "...";
  }
  return truncated + "...";
}

function analyzeTitle(title: string): TitleAnalysisResult {
  const length = title.length;
  const isOptimalLength = length >= 50 && length <= 60;
  const hasNumbers = /\d/.test(title);
  const lowerTitle = title.toLowerCase();
  const hasPowerWords = POWER_WORDS.some((pw) => lowerTitle.includes(pw));

  const suggestions: string[] = [];

  if (length < 50) {
    suggestions.push(
      `Title is ${length} chars — consider expanding to 50-60 chars for better SEO visibility.`
    );
  } else if (length > 60) {
    suggestions.push(
      `Title is ${length} chars — search engines may truncate it. Aim for 50-60 chars.`
    );
  }

  if (!hasNumbers) {
    suggestions.push(
      "Adding a number (e.g. \"7 Ways...\") can improve click-through rates."
    );
  }

  if (!hasPowerWords) {
    suggestions.push(
      "Consider a power word like \"Ultimate\", \"Proven\", or \"Essential\" to strengthen the title."
    );
  }

  return { length, isOptimalLength, hasNumbers, hasPowerWords, suggestions };
}

function calculateReadingTime(wordCount: number): ReadingTimeResult {
  return {
    minutes: Math.max(1, Math.ceil(wordCount / WPM)),
    wordCount,
  };
}

/** Collect high-level suggestions based on the combined analysis. */
function buildSuggestions(
  readability: ReadabilityResult,
  keywords: KeywordsResult,
  titleAnalysis: TitleAnalysisResult,
  metaDescription: string,
): string[] {
  const suggestions: string[] = [];

  if (readability.level === "Difficult") {
    suggestions.push(
      "Readability score is low — try shorter sentences and simpler words to reach a wider audience."
    );
  }

  if (readability.avgWordsPerSentence > 25) {
    suggestions.push(
      "Average sentence length is over 25 words. Breaking up long sentences improves scannability."
    );
  }

  if (keywords.totalWords < 300) {
    suggestions.push(
      "Content is under 300 words. Longer posts (1,000+ words) tend to rank better in search."
    );
  }

  if (
    keywords.topKeywords.length > 0 &&
    keywords.topKeywords[0].density > 3
  ) {
    suggestions.push(
      `Top keyword "${keywords.topKeywords[0].word}" appears at ${keywords.topKeywords[0].density}% density — above 3% risks keyword stuffing.`
    );
  }

  if (metaDescription.length < 120) {
    suggestions.push(
      "Meta description is short. Aim for 120-160 characters to maximize search-result real estate."
    );
  }

  // Surface title suggestions at the top level too
  suggestions.push(...titleAnalysis.suggestions);

  return suggestions;
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

function analyzeBlogSEO(input: BlogInput): SEOAnalysis {
  // Input validation
  if (!input || typeof input !== "object") {
    throw new Error("Input must be an object with 'title' and 'content' fields.");
  }
  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    throw new Error("'title' is required and must be a non-empty string.");
  }
  if (typeof input.content !== "string" || input.content.trim().length === 0) {
    throw new Error("'content' is required and must be a non-empty string.");
  }

  const plainText = stripHtml(input.content);
  const words = extractWords(plainText);
  const sentences = splitSentences(plainText);

  const readability = analyzeReadability(words, sentences);
  const keywords = analyzeKeywords(words);
  const metaDescription = generateMetaDescription(plainText, input.summary);
  const readingTime = calculateReadingTime(words.length);
  const titleAnalysis = analyzeTitle(input.title);
  const suggestions = buildSuggestions(readability, keywords, titleAnalysis, metaDescription);

  return {
    readability,
    keywords,
    metaDescription,
    readingTime,
    titleAnalysis,
    suggestions,
  };
}

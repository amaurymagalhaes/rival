# Blog SEO Analyzer — Cortex One Function

A standalone TypeScript function that analyzes blog post content and returns structured SEO insights. Designed to be pasted directly into [Cortex One](https://cortexone.hyperblog.io) as a custom function with zero external dependencies.

## What It Does

Given a blog post title and body, the analyzer returns:

| Analysis | Details |
|---|---|
| **Readability** | Flesch-Kincaid grade level, difficulty label, avg words/sentence, avg syllables/word |
| **Keywords** | Top 5 keywords by frequency with density percentages |
| **Meta Description** | Auto-generated from content (or summary), trimmed to 160 chars at a word boundary |
| **Reading Time** | Estimated minutes at 200 WPM |
| **Title Analysis** | Length check (50-60 char ideal), number detection, power-word detection, actionable suggestions |
| **Suggestions** | Aggregated list of improvements across all dimensions |

## Input / Output

### Input

```typescript
{
  title: string;        // Blog post title (required)
  content: string;      // Blog post body, may contain HTML (required)
  summary?: string;     // Optional author summary — used for meta description if provided
}
```

### Output

```typescript
{
  readability: {
    score: number;                  // Flesch-Kincaid grade level
    level: "Easy" | "Moderate" | "Difficult";
    avgWordsPerSentence: number;
    avgSyllablesPerWord: number;
  };
  keywords: {
    topKeywords: Array<{ word: string; count: number; density: number }>;
    totalWords: number;
  };
  metaDescription: string;
  readingTime: { minutes: number; wordCount: number };
  titleAnalysis: {
    length: number;
    isOptimalLength: boolean;
    hasNumbers: boolean;
    hasPowerWords: boolean;
    suggestions: string[];
  };
  suggestions: string[];
}
```

## Usage on Cortex One

1. Open Cortex One and create a new **Function**.
2. Paste the contents of `blog-seo-analyzer.ts` into the code editor.
3. The entry point is `analyzeBlogSEO(input)` — Cortex One will call it with the input object.
4. Wire the function output to your desired destination (dashboard card, workflow step, etc.).

## Design Decisions

- **Zero dependencies** — All text analysis (syllable counting, sentence splitting, keyword extraction) is implemented from scratch so the function can run in any sandboxed environment without a package manager.
- **HTML stripping** — Content is cleaned of HTML tags before analysis, so the function works whether the input is plain text or rich HTML from a CMS.
- **Summary-first meta descriptions** — If the author provides a `summary`, it is preferred over the auto-extracted first sentences, since the author's intent typically produces a better meta description.
- **Vowel-group syllable heuristic** — A lightweight approximation that counts vowel groups and subtracts silent trailing "e". Not perfect for every English word, but accurate enough for aggregate readability scoring without requiring a dictionary lookup.
- **Conservative keyword filtering** — A broad stop-word list prevents common function words from dominating the keyword results, surfacing the content-specific terms that matter for SEO.
- **Actionable suggestions** — Every analysis dimension can generate concrete, specific suggestions rather than generic advice, so users know exactly what to improve.

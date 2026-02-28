'use client';

import { useState, useTransition } from 'react';
import { analyzeSeo, type SeoAnalysis } from '@/app/actions/seo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type SeoPanelProps = {
  blogId: string;
};

function ScoreBadge({ score }: { score: number }) {
  let color = 'bg-red-100 text-red-800';
  if (score >= 60) color = 'bg-green-100 text-green-800';
  else if (score >= 30) color = 'bg-yellow-100 text-yellow-800';
  return (
    <span className={`inline-block rounded px-2 py-1 text-sm font-medium ${color}`}>
      {score}/100
    </span>
  );
}

function KeywordRow({ word, count, density }: { word: string; count: number; density: number }) {
  return (
    <div className="flex items-center justify-between border-b py-1 last:border-0">
      <span className="font-medium">{word}</span>
      <span className="text-sm text-muted-foreground">
        {count}x ({density}%)
      </span>
    </div>
  );
}

export function SeoPanel({ blogId }: SeoPanelProps) {
  const [analysis, setAnalysis] = useState<SeoAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [isPending, startTransition] = useTransition();

  function handleAnalyze() {
    setError(null);
    startTransition(async () => {
      const result = await analyzeSeo(blogId);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setAnalysis(result.data);
        setIsOpen(true);
      }
    });
  }

  return (
    <div className="w-full max-w-2xl">
      <Button
        type="button"
        variant="outline"
        onClick={handleAnalyze}
        disabled={isPending}
      >
        {isPending ? 'Analyzing...' : 'Analyze SEO'}
      </Button>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {analysis && (
        <Card className="mt-4">
          <CardHeader
            className="cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
          >
            <CardTitle className="flex items-center justify-between text-base">
              <span>SEO Analysis</span>
              <span className="text-sm text-muted-foreground">
                {isOpen ? 'Collapse' : 'Expand'}
              </span>
            </CardTitle>
          </CardHeader>

          {isOpen && (
            <CardContent className="flex flex-col gap-6">
              <section>
                <h3 className="mb-2 font-semibold">Readability</h3>
                <div className="flex items-center gap-3">
                  <ScoreBadge score={analysis.readability.score} />
                  <span className="capitalize">{analysis.readability.level}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Avg {analysis.readability.avgWordsPerSentence} words/sentence,{' '}
                  {analysis.readability.avgSyllablesPerWord} syllables/word
                </p>
              </section>

              <section>
                <h3 className="mb-2 font-semibold">
                  Reading Time: {analysis.readingTime.minutes} min ({analysis.readingTime.wordCount} words)
                </h3>
              </section>

              <section>
                <h3 className="mb-2 font-semibold">Top Keywords</h3>
                <div>
                  {analysis.keywords.topKeywords.map((kw) => (
                    <KeywordRow key={kw.word} {...kw} />
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 font-semibold">Meta Description</h3>
                <p className="rounded bg-muted p-2 text-sm">{analysis.metaDescription}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {analysis.metaDescription.length}/160 characters
                </p>
              </section>

              <section>
                <h3 className="mb-2 font-semibold">Title Analysis</h3>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className={`rounded px-2 py-0.5 ${analysis.titleAnalysis.isOptimalLength ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {analysis.titleAnalysis.length} chars {analysis.titleAnalysis.isOptimalLength ? '(optimal)' : '(suboptimal)'}
                  </span>
                  {analysis.titleAnalysis.hasNumbers && (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">Has numbers</span>
                  )}
                  {analysis.titleAnalysis.hasPowerWords && (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">Has power words</span>
                  )}
                </div>
              </section>

              {analysis.suggestions.length > 0 && (
                <section>
                  <h3 className="mb-2 font-semibold">Suggestions</h3>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {analysis.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </section>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
